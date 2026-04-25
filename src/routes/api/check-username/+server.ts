import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { eq } from 'drizzle-orm'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals }) => {
	const username = url.searchParams.get('username')?.trim().toLowerCase() ?? ''

	if (!username) {
		return json({ available: false })
	}

	const existing = await db.query.user.findFirst({
		where: eq(user.username, username),
		columns: { id: true }
	})

	const viewer_id = locals.user?.id
	const is_taken = existing !== undefined && existing.id !== viewer_id

	return json({ available: !is_taken })
}
