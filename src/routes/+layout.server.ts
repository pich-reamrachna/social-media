import { redirect } from '@sveltejs/kit'
import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { follow } from '$lib/server/db/interactions'
import { and, desc, eq, isNotNull, ne, notInArray } from 'drizzle-orm'
import type { LayoutServerLoad } from './$types'

const AUTH_ROUTES = new Set(['/login', '/register'])
const PROTECTED_ROUTE_PREFIXES = ['/home', '/profile']
const WHO_TO_FOLLOW_LIMIT = 6

const is_protected_route = (pathname: string) =>
	PROTECTED_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	)

const load_who_to_follow = async (viewer_id: string) => {
	const current_following = await db
		.select({ id: follow.followingId })
		.from(follow)
		.where(eq(follow.followerId, viewer_id))

	const following_ids = current_following.map((f) => f.id)
	const exclude_ids = [viewer_id, ...following_ids]

	const suggestions = await db.query.user.findMany({
		where: and(ne(user.id, viewer_id), isNotNull(user.username), notInArray(user.id, exclude_ids)),
		orderBy: [desc(user.createdAt)],
		limit: WHO_TO_FOLLOW_LIMIT
	})

	return suggestions.map((u) => ({
		id: u.id,
		name: u.name,
		handle: u.username!,
		avatar_url: u.image || '/profile.png',
		is_following: false
	}))
}

const handle_route_guards = (pathname: string, has_session: boolean, has_username: boolean) => {
	if (pathname === '/') throw redirect(302, has_session ? '/home' : '/login')
	if (AUTH_ROUTES.has(pathname) && has_session)
		throw redirect(302, has_username ? '/home' : '/profile/setup')
	if (is_protected_route(pathname) && !has_session) throw redirect(302, '/login')
	if (
		is_protected_route(pathname) &&
		has_session &&
		!has_username &&
		pathname !== '/profile/setup'
	) {
		throw redirect(302, '/profile/setup')
	}
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const pathname = url.pathname
	const has_session = Boolean(locals.session && locals.user)
	handle_route_guards(pathname, has_session, Boolean(locals.user?.username))

	const who_to_follow = locals.user ? await load_who_to_follow(locals.user.id) : []

	return {
		session: locals.session,
		user: locals.user,
		who_to_follow
	}
}
