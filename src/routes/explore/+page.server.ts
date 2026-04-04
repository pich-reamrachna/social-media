import { db } from '$lib/server/db'
import { user as user_table } from '$lib/server/db/auth.schema'
import { redirect } from '@sveltejs/kit'
import { asc, ilike, or } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user
	if (!user) {
		throw redirect(302, '/login')
	}

	const raw_query = url.searchParams.get('q')?.trim() ?? ''
	const normalized_query = raw_query.toLowerCase()
	const username_query = normalized_query.startsWith('@')
		? normalized_query.slice(1)
		: normalized_query

	const users = username_query
		? await db
				.select({
					id: user_table.id,
					name: user_table.name,
					email: user_table.email,
					username: user_table.username,
					image: user_table.image
				})
				.from(user_table)
				.where(
					or(
						ilike(user_table.username, `%${username_query}%`),
						ilike(user_table.name, `%${normalized_query}%`)
					)
				)
				.orderBy(asc(user_table.username), asc(user_table.name))
				.limit(100)
		: await db.query.user.findMany({
				orderBy: (table, { asc: order_asc }) => [order_asc(table.username), order_asc(table.name)],
				limit: 100
			})

	return {
		query: raw_query,
		current_user: {
			name: user.name,
			handle: user.username || user.email?.split('@')[0] || 'user',
			avatar_url: user.image || `https://i.pravatar.cc/150?u=${user.id}`
		},
		users: users.map((u) => ({
			id: u.id,
			name: u.name,
			username: u.username ?? u.email.split('@')[0] ?? 'user',
			avatar_url: u.image || `https://i.pravatar.cc/150?u=${u.id}`
		}))
	}
}
