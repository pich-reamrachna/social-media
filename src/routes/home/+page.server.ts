import { db } from '$lib/server/db'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions'
import {
	consume_rate_limit,
	get_rate_limit_error,
	get_rate_limit_subject
} from '$lib/server/rate-limit'
import { fail, redirect } from '@sveltejs/kit'
import { desc, and, eq, inArray, sql } from 'drizzle-orm'
import type { PageServerLoad, Actions } from './$types'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const UPLOAD_TIMEOUT_MS = 30_000
const CREATE_POST_LIMIT = { limit: 5, windowMs: 60_000 }
const TOGGLE_LIKE_LIMIT = { limit: 30, windowMs: 60_000 }
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
	buffer.length >= 12 &&
	buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
	buffer.subarray(8, 12).toString('ascii') === 'WEBP'

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
					reject(error ?? new Error('Cloudinary upload failed'))
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

	try {
		const { cloudinary } = await import('$lib/server/cloudinary')
		await cloudinary.uploader.destroy(public_id)
	} catch (cleanup_error) {
		console.error('Failed to clean up uploaded post image:', cleanup_error)
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user
	if (!user) {
		throw redirect(302, '/login')
	}

	const posts = await db.query.post.findMany({
		with: {
			author: true
		},
		orderBy: [desc(post.createdAt)]
	})

	const post_ids = posts.map((p) => p.id)
	const viewer_likes = post_ids.length
		? await db
				.select({
					post_id: like.postId
				})
				.from(like)
				.where(and(eq(like.userId, user.id), inArray(like.postId, post_ids)))
		: []
	const liked_post_ids = new Set(viewer_likes.map((entry) => entry.post_id))

	// for now, just return some dummy data for trending
	const trending = [
		{ category: 'TECHNOLOGY · TRENDING', tag: '#NeuralInterface', count: '45.2K' },
		{ category: 'ART · TRENDING', tag: '#DigitalNoir', count: '12.9K' },
		{ category: 'MUSIC · TRENDING', tag: 'Synthetix Core', count: '8.1K' }
	]

	// for now, just return some dummy data for who to follow
	const who_to_follow = [
		{
			name: 'Billie Eilish',
			handle: 'billieeilish',
			avatar_url: 'https://i.pravatar.cc/150?img=5'
		},
		{
			name: 'Bad Bunny',
			handle: 'badbunnypr',
			avatar_url: 'https://i.pravatar.cc/150?img=60'
		}
	]

	return {
		current_user: {
			name: user.name,
			handle: user.username || user.email?.split('@')[0] || 'user',
			avatar_url: user.image || `https://i.pravatar.cc/150?u=${user.id}`
		},
		posts: posts.map((p) => ({
			id: p.id,
			author: {
				name: p.author.name,
				handle: p.author.username ?? p.author.email?.split('@')[0] ?? 'user',
				avatar_url: p.author.image || `https://i.pravatar.cc/150?u=${p.author.id}`
			},
			content: p.content,
			images: p.imageUrl ? [p.imageUrl] : [],
			timestamp: p.createdAt,
			is_liked_by_user: liked_post_ids.has(p.id),
			stats: {
				comments: 0,
				echo_count: p.shareCount,
				likes: p.likeCount
			}
		})),
		trending,
		who_to_follow
	}
}

export const actions: Actions = {
	// post content
	createPost: async ({ request, locals }) => {
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
			return fail(payload.error.status, { message: payload.error.message })
		}

		const validated_image = payload.image_file
			? await validate_post_image(payload.image_file)
			: undefined
		if (validated_image && 'error' in validated_image) {
			return fail(400, { message: validated_image.error })
		}

		let uploaded_image: Awaited<ReturnType<typeof get_post_image_url>>

		try {
			uploaded_image = await get_post_image_url(validated_image)

			await db.insert(post).values({
				content: payload.trimmed_content,
				imageUrl: uploaded_image?.url,
				userId: user.id
			})
		} catch (error) {
			await delete_uploaded_post_image(uploaded_image?.public_id)
			console.error('Failed to create post:', error)
			return fail(500, { message: 'Internal server error' })
		}

		return { success: true }
	},

	// like shows (current have console.log to show if the like is working. can remove after)
	toggleLike: async ({ request, locals }) => {
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
	}
}
