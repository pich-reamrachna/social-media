import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { follow } from '$lib/server/db/interactions'
import { and, eq } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import {
	consume_rate_limit,
	get_rate_limit_error,
	get_rate_limit_subject
} from '$lib/server/rate-limit'
import type { RequestHandler } from './$types'

const TOGGLE_FOLLOW_LIMIT = { limit: 15, windowMs: 60_000 }

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 })
	}

	const rate_limit = await consume_rate_limit({
		key: `toggle-follow:${get_rate_limit_subject(locals)}`,
		...TOGGLE_FOLLOW_LIMIT
	})
	if (!rate_limit.ok) {
		return json(get_rate_limit_error(rate_limit.retryAfterSeconds), { status: 429 })
	}

	const body = await request.json().catch(() => undefined)
	const target_user_id = typeof body?.userId === 'string' ? body.userId : undefined

	if (!target_user_id || target_user_id === locals.user.id) {
		return json({ message: 'Invalid user' }, { status: 400 })
	}

	const target = await db.query.user.findFirst({ where: eq(user.id, target_user_id) })
	if (!target) {
		return json({ message: 'User not found' }, { status: 404 })
	}

	const existing = await db
		.select()
		.from(follow)
		.where(and(eq(follow.followerId, locals.user.id), eq(follow.followingId, target_user_id)))
		.limit(1)

	const is_following = existing.length > 0

	try {
		if (is_following) {
			await db
				.delete(follow)
				.where(and(eq(follow.followerId, locals.user.id), eq(follow.followingId, target_user_id)))
		} else {
			await db
				.insert(follow)
				.values({ followerId: locals.user.id, followingId: target_user_id })
				.onConflictDoNothing()
		}
	} catch (error) {
		console.error('follow API error:', error)
		return json({ message: 'Server error' }, { status: 500 })
	}

	return json({ is_following: !is_following })
}
