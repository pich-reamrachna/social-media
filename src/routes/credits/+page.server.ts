import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { follow } from '$lib/server/db/interactions'
import { and, eq, inArray } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

type CreditEntry = {
	handle: string
	role: string
	note?: string
	contributions: string[]
}

// Update this list to match your team members' usernames on Y
const CREDITS: CreditEntry[] = [
	{
		handle: 'deerbambii',
		role: 'Creator',
		note: 'I eat ice24/7',
		contributions: [
			'Project Lead',
			'UX/UI: View Post, Credit Page, Toast Messages',
			'Authentication Flow',
			'Search Function',
			'Payload Validation'
		]
	},
	{
		handle: 'umeshu',
		role: 'Creator',
		note: 'I like to sleep',
		contributions: [
			'Project Sub Lead',
			'Create Post Function',
			'Follow Suggestions Function',
			'Database Architecture'
		]
	}
]

export const load: PageServerLoad = async ({ locals }) => {
	const handles = CREDITS.map((c) => c.handle)

	if (handles.length === 0) {
		return {
			contributors: [],
			current_user_id: locals.user?.id ?? undefined,
			is_authenticated: false
		}
	}

	const users = await db.select().from(user).where(inArray(user.username, handles))

	let followed_ids = new Set<string>()

	if (locals.user && users.length > 0) {
		const rows = await db
			.select({ id: follow.followingId })
			.from(follow)
			.where(
				and(
					eq(follow.followerId, locals.user.id),
					inArray(
						follow.followingId,
						users.map((u) => u.id)
					)
				)
			)
		followed_ids = new Set(rows.map((r) => r.id))
	}

	const user_by_handle = new Map(users.map((u) => [u.username, u]))

	const contributors = CREDITS.flatMap((credit) => {
		const db_user = user_by_handle.get(credit.handle)
		if (!db_user) return []
		return [
			{
				id: db_user.id,
				name: db_user.name || db_user.displayUsername || db_user.username!,
				handle: db_user.username!,
				avatar_url: db_user.image || '/profile.png',
				is_following: followed_ids.has(db_user.id),
				role: credit.role,
				note: credit.note || '',
				contributions: credit.contributions
			}
		]
	})

	return {
		contributors,
		current_user_id: locals.user?.id ?? undefined,
		is_authenticated: Boolean(locals.user)
	}
}
