import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

const AUTH_ROUTES = new Set(['/login', '/register'])
const PROTECTED_ROUTE_PREFIXES = ['/home', '/explore', '/notifications', '/messages', '/profile']

const is_protected_route = (pathname: string) =>
	PROTECTED_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	)

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const pathname = url.pathname
	const has_session = Boolean(locals.session && locals.user)

	if (pathname === '/') {
		throw redirect(302, has_session ? '/home' : '/login')
	}

	if (AUTH_ROUTES.has(pathname) && has_session) {
		throw redirect(302, '/home')
	}

	if (is_protected_route(pathname) && !has_session) {
		throw redirect(302, '/login')
	}

	return {
		session: locals.session,
		user: locals.user
	}
}
