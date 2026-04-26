import { db } from '$lib/server/db'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions'
import { desc, and, eq, inArray, lt } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import { FEED_LIMIT } from '$lib/constants/post'
import type { RequestHandler } from './$types'
import type { ProfilePost } from '$lib/types'

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 })

	const cursor = url.searchParams.get('cursor')

	const posts_raw = await db.query.post.findMany({
		with: { author: true },
		where: cursor ? lt(post.createdAt, new Date(cursor)) : undefined,
		orderBy: [desc(post.createdAt)],
		limit: FEED_LIMIT + 1
	})

	const has_more = posts_raw.length > FEED_LIMIT
	const page_posts = posts_raw.slice(0, FEED_LIMIT)

	const post_ids = page_posts.map((p) => p.id)
	let liked_ids = new Set<string>()

	if (post_ids.length > 0) {
		const likes_raw = await db
			.select({ post_id: like.postId })
			.from(like)
			.where(and(eq(like.userId, locals.user.id), inArray(like.postId, post_ids)))
		liked_ids = new Set(likes_raw.map((l) => l.post_id))
	}

	const posts: ProfilePost[] = page_posts.map((p) => ({
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
		is_liked_by_user: liked_ids.has(p.id),
		stats: { likes: p.likeCount }
	}))

	return json({ posts, has_more })
}
