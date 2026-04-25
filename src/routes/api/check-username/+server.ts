import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { validate_username } from '$lib/constants/auth'
import { eq } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import {
	consume_rate_limit,
	get_rate_limit_error,
	get_rate_limit_subject,
	peek_rate_limit
} from '$lib/server/rate-limit'
import type { RequestHandler } from './$types'

const CHECK_USERNAME_LIMIT = { limit: 60, windowMs: 60_000 }

export const GET: RequestHandler = async ({ url, locals }) => {
	const username = url.searchParams.get('username')?.trim().toLowerCase() ?? ''

	if (!username) {
		return json({ available: false })
	}

	const username_validation = validate_username(username)
	if (!username_validation.ok) {
		return json({ available: false, message: username_validation.message }, { status: 400 })
	}

	const rate_key = `check-username:${get_rate_limit_subject(locals)}`

	const peeked = await peek_rate_limit({ key: rate_key, ...CHECK_USERNAME_LIMIT })
	if (!peeked.ok) {
		return json(get_rate_limit_error(peeked.retryAfterSeconds), { status: 429 })
	}

	const consumed = await consume_rate_limit({ key: rate_key, ...CHECK_USERNAME_LIMIT })
	if (!consumed.ok) {
		return json(get_rate_limit_error(consumed.retryAfterSeconds), { status: 429 })
	}

	const existing = await db.query.user.findFirst({
		where: eq(user.username, username),
		columns: { id: true }
	})

	const viewer_id = locals.user?.id
	const is_taken = existing !== undefined && existing.id !== viewer_id

	return json({ available: !is_taken })
}
