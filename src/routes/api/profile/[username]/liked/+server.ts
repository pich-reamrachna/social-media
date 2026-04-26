import { db } from '$lib/server/db'
import { like } from '$lib/server/db/interactions'
import { user as userTable } from '$lib/server/db/auth.schema'
import { desc, and, eq, inArray, lt } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { ProfilePost } from '$lib/types'

const LIKED_LIMIT = 20

export const GET: RequestHandler = async ({ url, params, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 })

	const target_user = await db.query.user.findFirst({
		where: eq(userTable.username, params.username),
		columns: { id: true }
	})
	if (!target_user) return new Response('Not Found', { status: 404 })

	const cursor_raw = url.searchParams.get('cursor')
	let cursor_date: Date | undefined
	if (cursor_raw) {
		cursor_date = new Date(cursor_raw)
		if (Number.isNaN(cursor_date.getTime())) {
			return new Response('Invalid cursor', { status: 400 })
		}
	}

	const user_likes = await db.query.like.findMany({
		where: and(
			eq(like.userId, target_user.id),
			cursor_date ? lt(like.createdAt, cursor_date) : undefined
		),
		with: { post: { with: { author: true } } },
		orderBy: [desc(like.createdAt)],
		limit: LIKED_LIMIT + 1
	})

	const has_more = user_likes.length > LIKED_LIMIT
	const page_likes = user_likes.slice(0, LIKED_LIMIT)
	const liked_posts_raw = page_likes.map((entry) => entry.post)

	const post_ids = liked_posts_raw.map((p) => p.id)
	let viewer_liked_ids = new Set<string>()

	if (post_ids.length > 0) {
		if (locals.user.id === target_user.id) {
			viewer_liked_ids = new Set(post_ids)
		} else {
			const likes_raw = await db
				.select({ post_id: like.postId })
				.from(like)
				.where(and(eq(like.userId, locals.user.id), inArray(like.postId, post_ids)))
			viewer_liked_ids = new Set(likes_raw.map((l) => l.post_id))
		}
	}

	const posts: ProfilePost[] = liked_posts_raw.map((p) => ({
		id: p.id,
		author: {
			id: p.author.id,
			name: p.author.name,
			handle: p.author.username ?? p.author.email?.split('@')[0] ?? 'user',
			avatar_url: p.author.image || '/profile.png'
		},
		content: p.content,
		images: p.imageUrl ? [p.imageUrl] : [],
		timestamp: p.createdAt,
		is_liked_by_user: viewer_liked_ids.has(p.id),
		stats: { likes: p.likeCount }
	}))

	const last_like = page_likes.at(-1)
	const next_cursor = last_like ? last_like.createdAt.toISOString() : undefined

	return json({ posts, has_more, next_cursor })
}
