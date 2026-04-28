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
		role: 'Project Lead',
		note: 'I eat ice24/7 - ラチナ',
		contributions: [
			'UX/UI: View Post, Credit Page, Toast Messages',
			'Authentication Flow',
			'Search Function',
			'Payload Validation'
		]
	},
	{
		handle: 'umeshu',
		role: 'Project Sub Lead',
		note: 'I like to sleep - ラタナ',
		contributions: [
			'Create Post Function',
			'Follow & Unfollow Function',
			'Like & Unlike Function',
			'Database Architecture'
		]
	},
	{
		handle: 'roza_ah',
		role: 'Project Member',
		note: 'I am Roza - ロザ',
		contributions: ['User Feed UI', 'Responsiveness', 'Refactoring']
	},
	{
		handle: 'bird',
		role: 'Project Creator',
		note: 'I am Kimlay - キムライ',
		contributions: [
			'Sign Up and Sign In UI',
			'Profile Page UI',
			'Edit Profile Function',
			'Forget Password Function'
		]
	}
]

export const load: PageServerLoad = async ({ locals }) => {
	const handles = CREDITS.map((c) => c.handle)

	if (handles.length === 0) {
		return {
			contributors: [],
			current_user_id: locals.user?.id ?? undefined,
			is_authenticated: Boolean(locals.user)
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
				name: db_user.name || db_user.displayUsername || db_user.username || credit.handle,
				handle: db_user.username ?? credit.handle,
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
