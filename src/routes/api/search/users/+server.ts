import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { follow } from '$lib/server/db/interactions'
import { and, eq, ilike, isNotNull, or } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { FollowUser } from '$lib/types'

const SEARCH_LIMIT = 8

export const GET: RequestHandler = async ({ url, locals }) => {
	const q = url.searchParams.get('q')?.trim() ?? ''
	if (q.length < 1) return json({ users: [] })

	const viewer = locals.user

	const results = await db.query.user.findMany({
		where: and(
			isNotNull(user.username),
			or(ilike(user.name, `%${q}%`), ilike(user.username, `%${q}%`))
		),
		columns: { id: true, name: true, username: true, image: true },
		limit: SEARCH_LIMIT
	})

	const following_ids = new Set<string>()
	if (viewer) {
		const follows = await db
			.select({ id: follow.followingId })
			.from(follow)
			.where(eq(follow.followerId, viewer.id))
		for (const f of follows) following_ids.add(f.id)
	}

	const users: FollowUser[] = results.map((u) => ({
		id: u.id,
		name: u.name,
		handle: u.username!,
		avatar_url: u.image || '/profile.png',
		is_following: following_ids.has(u.id)
	}))

	return json({ users })
}
