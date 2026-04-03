import { db } from '$lib/server/db'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions'
import { fail, redirect } from '@sveltejs/kit'
import { desc, and, eq } from 'drizzle-orm'
import type { PageServerLoad, Actions } from './$types'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const UPLOAD_TIMEOUT_MS = 30_000

type UploadedPostImage = {
	url: string
	public_id: string
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

	if (image_file && !image_file.type.startsWith('image/')) {
		return { error: { status: 400, message: 'Only image uploads are supported' } }
	}

	if (image_file && image_file.size > MAX_IMAGE_SIZE_BYTES) {
		return { error: { status: 400, message: 'Image must be smaller than 5MB' } }
	}

	return {
		trimmed_content,
		image_file
	}
}

const upload_post_image = async (file: File) => {
	const { cloudinary } = await import('$lib/server/cloudinary')
	const bytes = await file.arrayBuffer()
	const buffer = Buffer.from(bytes)

	return new Promise<UploadedPostImage>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('Image upload timed out'))
		}, UPLOAD_TIMEOUT_MS)

		const stream = cloudinary.uploader.upload_stream(
			{
				folder: 'social-media/posts',
				resource_type: 'image',
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

		stream.end(buffer)
	})
}

const get_post_image_url = async (file: File | undefined) => {
	return file ? upload_post_image(file) : undefined
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
			author: true,
			likes: true
		},
		orderBy: [desc(post.createdAt)]
	})

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
			is_liked_by_user: p.likes.some((l) => l.userId === user.id),
			stats: {
				comments: 0,
				echo_count: 0,
				likes: p.likes.length
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

		const form_data = await request.formData()
		const payload = get_post_payload(form_data)
		if ('error' in payload) {
			return fail(payload.error.status, { message: payload.error.message })
		}

		let uploaded_image: Awaited<ReturnType<typeof get_post_image_url>>

		try {
			uploaded_image = await get_post_image_url(payload.image_file)

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
			console.warn('toggleLike: No user found')
			return fail(401)
		}

		const form_data = await request.formData()
		const post_id = form_data.get('postId') as string

		console.info('toggleLike: Received post_id:', post_id, 'for user:', user.id)

		if (!post_id) return fail(400)

		const existing_likes = await db
			.select()
			.from(like)
			.where(and(eq(like.postId, post_id), eq(like.userId, user.id)))
			.limit(1)

		const existing_like = existing_likes[0]

		console.info('toggleLike: existing_like found:', !!existing_like)

		try {
			if (existing_like) {
				console.info('toggleLike: Deleting like')
				await db.delete(like).where(and(eq(like.postId, post_id), eq(like.userId, user.id)))
			} else {
				console.info('toggleLike: Inserting like')
				await db.insert(like).values({ userId: user.id, postId: post_id })
			}
		} catch (error) {
			console.error('toggleLike: DATABASE ERROR:', error)
			return fail(500)
		}

		return { success: true }
	}
}
