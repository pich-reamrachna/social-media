import { db } from '$lib/server/db'
import { user as userTable } from '$lib/server/db/auth.schema'
import { type SideNavUser, type ProfileData, type ProfilePost } from '$lib/types'
import { post } from '$lib/server/db/post'
import { like, follow } from '$lib/server/db/interactions'
import {
	consume_rate_limit,
	get_rate_limit_error,
	get_rate_limit_subject
} from '$lib/server/rate-limit'
import { dev } from '$app/environment'
import { PROFILE_POSTS_LIMIT } from '$lib/constants/post'
import { error, fail } from '@sveltejs/kit'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Actions, PageServerLoad } from './$types'

const PROFILE_LIKED_POSTS_LIMIT = 20
const TOGGLE_LIKE_LIMIT = { limit: 30, windowMs: 60_000 }
const TOGGLE_FOLLOW_LIMIT = { limit: 15, windowMs: 60_000 }

const log_dev_duration = (label: string, started_at: number) => {
	if (dev) {
		console.info(`${label} ${Math.round(performance.now() - started_at)}ms`)
	}
}

const load_profile_user = async (target_username: string) => {
	const started_at = dev ? performance.now() : 0
	const profile_user = await db.query.user.findFirst({
		where: eq(userTable.username, target_username)
	})
	log_dev_duration('[profile.load] profile user query took', started_at)
	return profile_user
}

const load_follow_counts = async (user_id: string) => {
	const [follower_res] = await db
		.select({ count: sql<number>`count(*)` })
		.from(follow)
		.where(eq(follow.followingId, user_id))
	const [following_res] = await db
		.select({ count: sql<number>`count(*)` })
		.from(follow)
		.where(eq(follow.followerId, user_id))
	return {
		followers: follower_res?.count ?? 0,
		following: following_res?.count ?? 0
	}
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

const map_post_for_frontend = (
	post_row: {
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
	},
	liked_post_ids: Set<string>
): ProfilePost => ({
	id: post_row.id,
	author: {
		id: post_row.author.id,
		name: post_row.author.name,
		handle: post_row.author.username || 'user',
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

const load_who_to_follow = async (viewer_id: string) => {
	const current_following = await db
		.select({ id: follow.followingId })
		.from(follow)
		.where(eq(follow.followerId, viewer_id))
	const following_set = new Set(current_following.map((f) => f.id))

	const suggestions = await db.query.user.findMany({
		where: sql`${userTable.id} != ${viewer_id}`,
		limit: 15
	})

	return suggestions.map((u) => ({
		id: u.id,
		name: u.name,
		handle: u.username || u.email?.split('@')[0] || 'user',
		avatar_url: u.image || `https://i.pravatar.cc/150?u=${u.id}`,
		is_following: following_set.has(u.id)
	}))
}

const load_profile_and_stats = async (target_username: string) => {
	const user = await load_profile_user(target_username)
	if (!user) throw error(404, { message: 'Profile not found' })
	const stats = await load_follow_counts(user.id)
	return { user, stats }
}

const map_current_user = (
	viewer: App.Locals['user'],
	stats: { followers: number; following: number }
): SideNavUser | undefined => {
	if (!viewer) return undefined
	return {
		id: viewer.id,
		name: viewer.name,
		handle: viewer.username || viewer.email?.split('@')[0] || 'user',
		avatar_url: viewer.image || `https://i.pravatar.cc/150?u=${viewer.id}`,
		stats
	}
}

const map_profile_data = (
	user: {
		id: string
		name: string
		username: string | null
		email: string | null
		image: string | null
		bio: string | null
		banner: string | null
		createdAt: Date
	},
	stats: { followers: number; following: number }
): ProfileData => ({
	id: user.id,
	name: user.name,
	handle: user.username || user.email?.split('@')[0] || 'user',
	bio: user.bio || 'This user has no bio yet.',
	banner_url:
		user.banner ||
		'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
	avatar_url: user.image || `https://i.pravatar.cc/150?u=${user.id}`,
	joined_date: user.createdAt,
	stats
})

const load_viewer_context = async (viewer: App.Locals['user'], profile_id: string) => {
	if (!viewer) return { stats: { followers: 0, following: 0 }, is_following: false }
	const stats = await load_follow_counts(viewer.id)
	const f_check = await db.query.follow.findFirst({
		where: and(eq(follow.followerId, viewer.id), eq(follow.followingId, profile_id))
	})
	return { stats, is_following: !!f_check }
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const started = dev ? performance.now() : 0
	const viewer = locals.user
	const { user: profile_user, stats: profile_stats } = await load_profile_and_stats(params.username)

	const is_owner = viewer?.id === profile_user.id
	const { stats: v_stats, is_following } = await load_viewer_context(viewer, profile_user.id)

	const posts_raw = await load_profile_posts(profile_user.id)
	const liked_ids = await load_viewer_likes(
		posts_raw.map((p) => p.id),
		viewer?.id
	)

	const who_to_follow = viewer ? await load_who_to_follow(viewer.id) : []
	const trending = [
		{ category: 'TECHNOLOGY · TRENDING', tag: '#NeuralInterface', count: '45.2K' },
		{ category: 'ART · TRENDING', tag: '#DigitalNoir', count: '12.9K' },
		{ category: 'MUSIC · TRENDING', tag: 'Synthetix Core', count: '8.1K' }
	]

	if (dev) log_dev_duration('[profile.load] total load took', started)

	return {
		current_user: map_current_user(viewer, v_stats),
		is_owner,
		is_following,
		profile: map_profile_data(profile_user, profile_stats),
		posts: posts_raw.map((entry) => map_post_for_frontend(entry, liked_ids)),
		trending,
		who_to_follow
	}
}

export const actions: Actions = {
	load_liked_posts_action: async ({ params, locals }) => {
		const viewer = locals.user
		const target_username = params.username

		const profile_user = await db.query.user.findFirst({
			where: eq(userTable.username, target_username)
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
	toggle_like: async ({ request, locals }) => {
		const viewer = locals.user
		if (!viewer) {
			return fail(401, { message: 'Unauthorized' })
		}

		const rate_limit = await consume_rate_limit({
			key: `toggle-like:${get_rate_limit_subject(locals)}`,
			...TOGGLE_LIKE_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(429, get_rate_limit_error(rate_limit.retryAfterSeconds))
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
	},
	toggle_follow: async ({ request, locals }) => {
		const viewer = locals.user
		if (!viewer) {
			return fail(401, { message: 'Unauthorized' })
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

		if (!target_user_id || target_user_id === viewer.id) {
			return fail(400, { message: 'Invalid follow request' })
		}

		// Double-check target user existence for security
		const target_user = await db.query.user.findFirst({
			where: eq(userTable.id, target_user_id)
		})
		if (!target_user) return fail(404, { message: 'User not found' })

		try {
			const existing_follow = await db.query.follow.findFirst({
				where: and(eq(follow.followerId, viewer.id), eq(follow.followingId, target_user_id))
			})

			if (existing_follow) {
				await db
					.delete(follow)
					.where(and(eq(follow.followerId, viewer.id), eq(follow.followingId, target_user_id)))
			} else {
				await db.insert(follow).values({
					followerId: viewer.id,
					followingId: target_user_id
				})
			}
		} catch {
			return fail(500, { message: 'Failed to update follow' })
		}

		return { success: true }
	}
}
