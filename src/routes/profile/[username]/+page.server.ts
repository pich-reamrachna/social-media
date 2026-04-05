import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions'
import { dev } from '$app/environment'
import { error, fail } from '@sveltejs/kit'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Actions, PageServerLoad } from './$types'

const PROFILE_POSTS_LIMIT = 20
const PROFILE_LIKED_POSTS_LIMIT = 20

const log_dev_duration = (label: string, started_at: number) => {
	if (dev) {
		console.info(`${label} ${Math.round(performance.now() - started_at)}ms`)
	}
}

const load_profile_user = async (target_username: string) => {
	const started_at = dev ? performance.now() : 0
	const profile_user = await db.query.user.findFirst({
		where: eq(user.username, target_username)
	})
	log_dev_duration('[profile.load] profile user query took', started_at)
	return profile_user
}

const load_profile_posts = async (user_id: string) => {
	const started_at = dev ? performance.now() : 0
	const profile_posts = await db.query.post.findMany({
		where: eq(post.userId, user_id),
		with: {
			author: true
		},
		orderBy: [desc(post.createdAt)],
		limit: PROFILE_POSTS_LIMIT
	})
	log_dev_duration('[profile.load] profile posts query took', started_at)
	return profile_posts
}

const load_liked_posts = async (user_id: string) => {
	const started_at = dev ? performance.now() : 0
	const user_likes = await db.query.like.findMany({
		where: eq(like.userId, user_id),
		with: {
			post: {
				with: {
					author: true
				}
			}
		},
		orderBy: [desc(like.createdAt)],
		limit: PROFILE_LIKED_POSTS_LIMIT
	})
	log_dev_duration('[profile.load] liked posts query took', started_at)
	return user_likes.map((entry) => entry.post)
}

const load_viewer_likes = async (post_ids: string[], viewer_id?: string) => {
	const started_at = dev ? performance.now() : 0
	const viewer_likes =
		post_ids.length && viewer_id
			? await db
					.select({
						post_id: like.postId
					})
					.from(like)
					.where(and(eq(like.userId, viewer_id), inArray(like.postId, post_ids)))
			: []

	log_dev_duration('[profile.load] viewer likes query took', started_at)
	return new Set(viewer_likes.map((entry) => entry.post_id))
}

const map_post_for_frontend = <
	TPost extends {
		id: string
		content: string
		imageUrl: string | null
		likeCount: number
		shareCount: number
		createdAt: Date
		author: {
			id: string
			name: string
			username: string | null
			image: string | null
		}
	}
>(
	post_row: TPost,
	liked_post_ids: Set<string>
) => ({
	id: post_row.id,
	author: {
		name: post_row.author.name,
		handle: post_row.author.username,
		avatar_url: post_row.author.image || `https://i.pravatar.cc/150?u=${post_row.author.id}`
	},
	content: post_row.content,
	images: post_row.imageUrl ? [post_row.imageUrl] : [],
	timestamp: post_row.createdAt,
	is_liked_by_user: liked_post_ids.has(post_row.id),
	stats: {
		comments: 0,
		echo_count: post_row.shareCount,
		likes: post_row.likeCount
	}
})

export const load: PageServerLoad = async ({ params, locals }) => {
	const load_started_at = dev ? performance.now() : 0
	const viewer = locals.user
	const target_username = params.username

	const profile_user = await load_profile_user(target_username)

	if (!profile_user) {
		throw error(404, { message: 'Profile not found' })
	}

	const is_owner = viewer ? viewer.id === profile_user.id : false

	const profile_posts = await load_profile_posts(profile_user.id)
	const all_post_ids = profile_posts.map((p) => p.id)

	const liked_post_ids = await load_viewer_likes(all_post_ids, viewer?.id)

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

	const result = {
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
		posts: profile_posts.map((entry) => map_post_for_frontend(entry, liked_post_ids)),
		trending,
		who_to_follow
	}

	if (dev) {
		console.info(
			`[profile.load] total load took ${Math.round(performance.now() - load_started_at)}ms`
		)
	}

	return result
}

export const actions: Actions = {
	loadLikedPosts: async ({ params, locals }) => {
		const viewer = locals.user
		const target_username = params.username

		const profile_user = await db.query.user.findFirst({
			where: eq(user.username, target_username)
		})

		if (!profile_user) {
			return fail(404, { message: 'Profile not found' })
		}

		const liked_posts = await load_liked_posts(profile_user.id)
		const post_ids = liked_posts.map((entry) => entry.id)
		const liked_post_ids = await load_viewer_likes(post_ids, viewer?.id)

		return {
			success: true,
			liked_posts: liked_posts.map((entry) => map_post_for_frontend(entry, liked_post_ids))
		}
	},
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
			const current_post = await db.query.post.findFirst({
				where: eq(post.id, post_id),
				columns: {
					likeCount: true
				}
			})
			if (!current_post) {
				return fail(404, { message: 'Post not found' })
			}

			if (existing_like) {
				await db.delete(like).where(and(eq(like.postId, post_id), eq(like.userId, viewer.id)))
				await db
					.update(post)
					.set({
						likeCount: sql`greatest(${post.likeCount} - 1, 0)`
					})
					.where(eq(post.id, post_id))
			} else {
				await db.insert(like).values({ userId: viewer.id, postId: post_id })
				await db
					.update(post)
					.set({
						likeCount: sql`${post.likeCount} + 1`
					})
					.where(eq(post.id, post_id))
			}
		} catch {
			return fail(500, { message: 'Failed to update like' })
		}

		return { success: true }
	}
}
