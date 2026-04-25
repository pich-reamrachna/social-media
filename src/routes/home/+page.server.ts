import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { type SideNavUser, type ProfilePost } from '$lib/types'
import { post } from '$lib/server/db/post'
import { like, follow } from '$lib/server/db/interactions'
import {
	consume_rate_limit,
	get_rate_limit_error,
	get_rate_limit_subject
} from '$lib/server/rate-limit'
import { FEED_LIMIT } from '$lib/constants/post'
import { fail, redirect } from '@sveltejs/kit'
import { desc, and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { PageServerLoad, Actions } from './$types'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const UPLOAD_TIMEOUT_MS = 30_000
const CREATE_POST_LIMIT = { limit: 5, windowMs: 60_000 }
const TOGGLE_LIKE_LIMIT = { limit: 30, windowMs: 60_000 }
const TOGGLE_FOLLOW_LIMIT = { limit: 15, windowMs: 60_000 }
const WHO_TO_FOLLOW_LIMIT = 6
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

type UploadedPostImage = {
	url: string
	public_id: string
}

type ValidatedImageUpload = {
	buffer: Buffer
	mime_type: string
}

const get_post_payload = (form_data: FormData) => {
	const content = form_data.get('content')
	const image = form_data.get('image')
	const trimmed_content = typeof content === 'string' ? content.trim() : ''

	if (trimmed_content.length > 280) {
		return { error: { status: 400, message: 'Post is too long' } }
	}

	const image_file = image instanceof File && image.size > 0 ? image : undefined

	if (!trimmed_content && !image_file) {
		return { error: { status: 400, message: 'Post must include text or an image' } }
	}

	if (image_file && image_file.size > MAX_IMAGE_SIZE_BYTES) {
		return { error: { status: 400, message: 'Image must be smaller than 5MB' } }
	}

	return {
		trimmed_content,
		image_file
	}
}

const is_png = (buffer: Buffer) =>
	buffer.length >= 8 &&
	buffer[0] === 0x89 &&
	buffer[1] === 0x50 &&
	buffer[2] === 0x4e &&
	buffer[3] === 0x47 &&
	buffer[4] === 0x0d &&
	buffer[5] === 0x0a &&
	buffer[6] === 0x1a &&
	buffer[7] === 0x0a

const is_jpeg = (buffer: Buffer) =>
	buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff

const is_gif = (buffer: Buffer) => {
	if (buffer.length < 6) return false

	const header = buffer.subarray(0, 6).toString('ascii')
	return header === 'GIF87a' || header === 'GIF89a'
}

const is_webp = (buffer: Buffer) =>
	buffer.length >= 16 &&
	buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
	buffer.subarray(8, 12).toString('ascii') === 'WEBP' &&
	['VP8 ', 'VP8L', 'VP8X'].includes(buffer.subarray(12, 16).toString('ascii'))

const get_image_mime_type = (buffer: Buffer) => {
	if (is_png(buffer)) return 'image/png'
	if (is_jpeg(buffer)) return 'image/jpeg'
	if (is_gif(buffer)) return 'image/gif'
	if (is_webp(buffer)) return 'image/webp'

	return undefined
}

const validate_post_image = async (
	file: File
): Promise<ValidatedImageUpload | { error: string }> => {
	if (file.type && !file.type.startsWith('image/')) {
		return { error: 'Only image uploads are supported' }
	}

	const bytes = await file.arrayBuffer()
	const buffer = Buffer.from(bytes)
	const mime_type = get_image_mime_type(buffer)

	if (!mime_type || !ALLOWED_IMAGE_MIME_TYPES.has(mime_type)) {
		return { error: 'Only JPEG, PNG, GIF, and WebP images are supported' }
	}

	if (file.type && file.type !== mime_type) {
		return { error: 'Image type does not match the uploaded file contents' }
	}

	return {
		buffer,
		mime_type
	}
}

const upload_post_image = async (image: ValidatedImageUpload) => {
	const { cloudinary } = await import('$lib/server/cloudinary')

	return new Promise<UploadedPostImage>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('Image upload timed out'))
		}, UPLOAD_TIMEOUT_MS)

		const stream = cloudinary.uploader.upload_stream(
			{
				folder: 'social-media/posts',
				resource_type: 'image',
				format: image.mime_type.replace('image/', ''),
				timeout: UPLOAD_TIMEOUT_MS
			},
			(error, result) => {
				clearTimeout(timeout)
				if (error || !result?.secure_url || !result.public_id) {
					reject(
						error instanceof Error ? error : new Error(error?.message ?? 'Cloudinary upload failed')
					)
					return
				}

				resolve({
					url: result.secure_url,
					public_id: result.public_id
				})
			}
		)

		stream.end(image.buffer)
	})
}

const get_post_image_url = async (image: ValidatedImageUpload | undefined) => {
	return image ? upload_post_image(image) : undefined
}

const delete_uploaded_post_image = async (public_id: string | undefined) => {
	if (!public_id) return
	const { cloudinary } = await import('$lib/server/cloudinary')
	try {
		await cloudinary.uploader.destroy(public_id)
	} catch (error) {
		console.error('Failed to cleanup Cloudinary image:', error)
	}
}

const map_home_post = (
	p: {
		id: string
		author: {
			id: string
			name: string
			username: string | null
			email: string | null
			image: string | null
		}
		content: string
		imageUrl: string | null
		createdAt: Date
		shareCount: number
		likeCount: number
	},
	liked_post_ids: Set<string>
): ProfilePost => ({
	id: p.id,
	author: {
		id: p.author.id,
		name: p.author.name,
		handle: p.author.username ?? p.author.email?.split('@')[0] ?? 'user',
		avatar_url: p.author.image || `https://i.pravatar.cc/150?u=${p.author.id}`
	},
	content: p.content,
	images: p.imageUrl ? [p.imageUrl] : [],
	timestamp: p.createdAt,
	is_liked_by_user: liked_post_ids.has(p.id),
	stats: {
		likes: p.likeCount
	}
})

const load_home_follow_counts = async (user_id: string) => {
	const [followers] = await db
		.select({ count: sql<number>`count(*)` })
		.from(follow)
		.where(eq(follow.followingId, user_id))
	const [following] = await db
		.select({ count: sql<number>`count(*)` })
		.from(follow)
		.where(eq(follow.followerId, user_id))
	return {
		followers: Number(followers?.count ?? 0),
		following: Number(following?.count ?? 0)
	}
}

const load_suggested_users = async (user_id: string) => {
	const current_following = await db
		.select({ id: follow.followingId })
		.from(follow)
		.where(eq(follow.followerId, user_id))
	const following_ids = current_following.map((entry) => entry.id)
	const suggestion_conditions = [sql`${user.id} != ${user_id}`, sql`${user.username} is not null`]

	if (following_ids.length > 0) {
		suggestion_conditions.push(notInArray(user.id, following_ids))
	}

	const suggestions = await db.query.user.findMany({
		where: and(...suggestion_conditions),
		orderBy: [desc(user.createdAt)],
		limit: WHO_TO_FOLLOW_LIMIT
	})

	return suggestions.map(
		(suggested_user): SideNavUser => ({
			id: suggested_user.id,
			name: suggested_user.name,
			handle: suggested_user.username!,
			avatar_url: suggested_user.image || `https://i.pravatar.cc/150?u=${suggested_user.id}`,
			is_following: false
		})
	)
}

export const load: PageServerLoad = async ({ locals }) => {
	const user_local = locals.user
	if (!user_local) throw redirect(302, '/login')

	const posts_raw = await db.query.post.findMany({
		with: { author: true },
		orderBy: [desc(post.createdAt)],
		limit: FEED_LIMIT
	})

	const post_ids = posts_raw.map((p) => p.id)
	let liked_ids = new Set<string>()

	if (post_ids.length > 0) {
		const likes_raw = await db
			.select({ post_id: like.postId })
			.from(like)
			.where(and(eq(like.userId, user_local.id), inArray(like.postId, post_ids)))
		liked_ids = new Set(likes_raw.map((l) => l.post_id))
	}

	const stats = await load_home_follow_counts(user_local.id)
	const who_to_follow = await load_suggested_users(user_local.id)

	const current_user = {
		id: user_local.id,
		name: user_local.name,
		handle: user_local.username || user_local.email?.split('@')[0] || 'user',
		avatar_url: user_local.image || `https://i.pravatar.cc/150?u=${user_local.id}`,
		stats
	} as SideNavUser

	return {
		current_user,
		posts: posts_raw.map((p) => map_home_post(p, liked_ids)),
		who_to_follow
	}
}

const insert_post = async (content: string, image_url: string | undefined, user_id: string) => {
	await db.insert(post).values({
		content,
		imageUrl: image_url,
		userId: user_id
	})
}

export const actions: Actions = {
	// post content
	create_post: async ({ request, locals }) => {
		const user = locals.user
		if (!user) {
			return fail(401, { message: 'Unauthorized' })
		}

		const rate_limit = await consume_rate_limit({
			key: `create-post:${get_rate_limit_subject(locals)}`,
			...CREATE_POST_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(429, get_rate_limit_error(rate_limit.retryAfterSeconds))
		}

		const form_data = await request.formData()
		const payload = get_post_payload(form_data)
		if ('error' in payload) {
			console.warn('[createPost] payload rejected', {
				reason: payload.error.message
			})
			return fail(payload.error.status, { message: payload.error.message })
		}

		const validated_image = payload.image_file
			? await validate_post_image(payload.image_file)
			: undefined
		if (validated_image && 'error' in validated_image) {
			console.warn('[createPost] image validation rejected', {
				file_name: payload.image_file?.name,
				file_type: payload.image_file?.type,
				file_size: payload.image_file?.size,
				reason: validated_image.error
			})
			return fail(400, { message: validated_image.error })
		}

		let uploaded_image: Awaited<ReturnType<typeof get_post_image_url>>

		try {
			uploaded_image = await get_post_image_url(validated_image)
			await insert_post(payload.trimmed_content, uploaded_image?.url, user.id)
		} catch (error) {
			await delete_uploaded_post_image(uploaded_image?.public_id)
			console.error('Failed to create post:', error)
			return fail(500, { message: 'Internal server error' })
		}

		return { success: true }
	},

	// like shows (current have console.log to show if the like is working. can remove after)
	toggle_like: async ({ request, locals }) => {
		const user = locals.user
		if (!user) {
			return fail(401)
		}

		const rate_limit = await consume_rate_limit({
			key: `toggle-like:${get_rate_limit_subject(locals)}`,
			...TOGGLE_LIKE_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(429, get_rate_limit_error(rate_limit.retryAfterSeconds))
		}

		const form_data = await request.formData()
		const post_id = form_data.get('postId') as string

		if (!post_id) return fail(400)

		const existing_likes = await db
			.select()
			.from(like)
			.where(and(eq(like.postId, post_id), eq(like.userId, user.id)))
			.limit(1)

		const existing_like = existing_likes[0]
		const current_post = await db.query.post.findFirst({
			where: eq(post.id, post_id),
			columns: {
				likeCount: true
			}
		})
		if (!current_post) return fail(404)

		try {
			if (existing_like) {
				await db.delete(like).where(and(eq(like.postId, post_id), eq(like.userId, user.id)))
				await db
					.update(post)
					.set({
						likeCount: sql`greatest(${post.likeCount} - 1, 0)`
					})
					.where(eq(post.id, post_id))
			} else {
				await db.insert(like).values({ userId: user.id, postId: post_id })
				await db
					.update(post)
					.set({
						likeCount: sql`${post.likeCount} + 1`
					})
					.where(eq(post.id, post_id))
			}
		} catch (error) {
			console.error('toggleLike database error:', error)
			return fail(500)
		}

		return {
			success: true,
			post_id,
			is_liked: !existing_like,
			likes: existing_like ? Math.max(0, current_post.likeCount - 1) : current_post.likeCount + 1
		}
	},

	toggle_follow: async ({ request, locals }) => {
		const user_locals = locals.user
		if (!user_locals) {
			return fail(401)
		}

		const rate_limit = await consume_rate_limit({
			key: `toggle-follow:${get_rate_limit_subject(locals)}`,
			...TOGGLE_FOLLOW_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(429, get_rate_limit_error(rate_limit.retryAfterSeconds))
		}

		const form_data = await request.formData()
		const target_user_id = form_data.get('userId') as string

		if (!target_user_id || target_user_id === user_locals.id) {
			return fail(400)
		}

		// Check if the target user actually exists
		const target_user = await db.query.user.findFirst({
			where: eq(user.id, target_user_id)
		})
		if (!target_user) return fail(404)

		const existing_follows = await db
			.select()
			.from(follow)
			.where(and(eq(follow.followerId, user_locals.id), eq(follow.followingId, target_user_id)))
			.limit(1)

		const is_following = existing_follows.length > 0

		try {
			if (is_following) {
				await db
					.delete(follow)
					.where(and(eq(follow.followerId, user_locals.id), eq(follow.followingId, target_user_id)))
			} else {
				await db
					.insert(follow)
					.values({
						followerId: user_locals.id,
						followingId: target_user_id
					})
					.onConflictDoNothing()
			}
		} catch (error) {
			console.error('toggleFollow database error:', error)
			return fail(500)
		}

		return {
			success: true,
			target_user_id,
			is_following: !is_following
		}
	}
}
