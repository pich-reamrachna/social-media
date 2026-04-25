import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { follow } from '$lib/server/db/interactions'
import { and, desc, eq, isNotNull, ne, notInArray } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { FollowUser } from '$lib/types'

const SUGGESTIONS_LIMIT = 6

export const GET: RequestHandler = async ({ url, locals }) => {
	const viewer = locals.user
	if (!viewer) {
		return json({ error: 'Unauthorized' }, { status: 401 })
	}

	const exclude_param = url.searchParams.get('exclude') ?? ''
	const client_exclude_ids =
		exclude_param.length > 0 ? exclude_param.split(',').filter(Boolean) : []

	const current_following = await db
		.select({ id: follow.followingId })
		.from(follow)
		.where(eq(follow.followerId, viewer.id))

	const following_ids = current_following.map((f) => f.id)
	const all_exclude_ids = [...new Set([viewer.id, ...following_ids, ...client_exclude_ids])]

	const suggestions = await db.query.user.findMany({
		where: and(
			ne(user.id, viewer.id),
			isNotNull(user.username),
			notInArray(user.id, all_exclude_ids)
		),
		orderBy: [desc(user.createdAt)],
		limit: SUGGESTIONS_LIMIT
	})

	const users: FollowUser[] = suggestions.map((u) => ({
		id: u.id,
		name: u.name,
		handle: u.username!,
		avatar_url: u.image || '/profile.png',
		is_following: false
	}))

	return json({ users })
}
