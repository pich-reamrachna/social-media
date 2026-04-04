import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions'
import { error, fail } from '@sveltejs/kit'
import { and, desc, eq } from 'drizzle-orm'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
	const viewer = locals.user
	const target_username = params.username

	const profile_user = await db.query.user.findFirst({
		where: eq(user.username, target_username)
	})

	if (!profile_user) {
		throw error(404, { message: 'Profile not found' })
	}

	const is_owner = viewer ? viewer.id === profile_user.id : false

	// Fetch post that the user made
	const profile_posts = await db.query.post.findMany({
		where: eq(post.userId, profile_user.id),
		with: {
			author: true,
			likes: true,
			shares: true
		},
		orderBy: [desc(post.createdAt)]
	})

	// Fetch liked posts by the user
	const user_likes = await db.query.like.findMany({
		where: eq(like.userId, profile_user.id),
		with: {
			post: {
				with: {
					author: true,
					likes: true,
					shares: true
				}
			}
		},
		orderBy: [desc(like.createdAt)]
	})

	// Get posts from the like relation
	const liked_posts = user_likes.map((l) => l.post)

	const trending = [
		{ category: 'TECHNOLOGY · TRENDING', tag: '#NeuralInterface', count: '45.2K' },
		{ category: 'ART · TRENDING', tag: '#DigitalNoir', count: '12.9K' },
		{ category: 'MUSIC · TRENDING', tag: 'Synthetix Core', count: '8.1K' }
	]

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

	type DbPost = (typeof profile_posts)[0]

	// Render post - helper renamed to snake_case
	const map_post_for_frontend = (p: DbPost) => ({
		id: p.id,
		author: {
			name: p.author.name,
			handle: p.author.username ?? p.author.email?.split('@')[0] ?? 'user',
			avatar_url: p.author.image || `https://i.pravatar.cc/150?u=${p.author.id}`
		},
		content: p.content,
		images: p.imageUrl ? [p.imageUrl] : [],
		timestamp: p.createdAt,
		is_liked_by_user: viewer ? p.likes.some((l) => l.userId === viewer.id) : false,
		stats: {
			comments: 0,
			echo_count: p.shares?.length ?? 0,
			likes: p.likes?.length ?? 0
		}
	})

	return {
		current_user: viewer
			? {
					name: viewer.name,
					handle: viewer.username,
					avatar_url: viewer.image || `https://i.pravatar.cc/150?u=${viewer.id}`
				}
			: undefined,
		is_owner,
		profile: {
			id: profile_user.id,
			name: profile_user.name,
			handle: profile_user.username,
			bio: profile_user.bio || 'This user has no bio yet.',
			banner_url:
				profile_user.banner ||
				'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
			avatar_url: profile_user.image || `https://i.pravatar.cc/150?u=${profile_user.id}`,
			joined_date: profile_user.createdAt
		},
		posts: profile_posts.map(map_post_for_frontend),
		liked_posts: liked_posts.map(map_post_for_frontend),
		trending,
		who_to_follow
	}
}

export const actions: Actions = {
	toggleLike: async ({ request, locals }) => {
		const viewer = locals.user
		if (!viewer) {
			return fail(401, { message: 'Unauthorized' })
		}

		const form_data = await request.formData()
		const post_id = form_data.get('postId')

		if (typeof post_id !== 'string' || !post_id) {
			return fail(400, { message: 'Invalid post id' })
		}

		try {
			const existing_like = await db.query.like.findFirst({
				where: and(eq(like.postId, post_id), eq(like.userId, viewer.id))
			})

			if (existing_like) {
				await db.delete(like).where(and(eq(like.postId, post_id), eq(like.userId, viewer.id)))
			} else {
				await db.insert(like).values({ userId: viewer.id, postId: post_id })
			}
		} catch {
			return fail(500, { message: 'Failed to update like' })
		}

		return { success: true }
	}
}
