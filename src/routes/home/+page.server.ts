import { db } from '$lib/server/db'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions'
import { fail, redirect } from '@sveltejs/kit'
import { desc, and, eq } from 'drizzle-orm'
import type { PageServerLoad, Actions } from './$types'

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
				avatar_url: p.author.image || `https://i.pravatar.cc/150?u=${p.author.id}`,
				is_verified: true, // Placeholder
				role: '' // Placeholder
			},
			content: p.content,
			images: [],
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
		const content = form_data.get('content') as string

		if (!content || content.trim().length === 0) {
			return fail(400, { message: 'Post cannot be empty' })
		}

		if (content.length > 280) {
			return fail(400, { message: 'Post is too long' })
		}

		const trimmed_content = content.trim()

		try {
			await db.insert(post).values({
				content: trimmed_content,
				userId: user.id
			})
		} catch (error) {
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
