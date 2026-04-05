import type { Handle } from '@sveltejs/kit'
import { normalizeUrl } from '@sveltejs/kit'
import { building, dev } from '$app/environment'
import { auth } from '$lib/server/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'

const AUTH_ROUTES = new Set(['/login', '/register'])
const PROTECTED_ROUTE_PREFIXES = ['/home', '/explore', '/notifications', '/messages', '/profile']

const is_protected_route = (pathname: string) =>
	PROTECTED_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	)

const should_load_session = (pathname: string) => {
	if (pathname === '/' || AUTH_ROUTES.has(pathname) || is_protected_route(pathname)) {
		return true
	}

	// Skip auth work for app internals and static assets.
	if (pathname.startsWith('/_app/') || /\.[A-Za-z0-9]+$/.test(pathname)) {
		return false
	}

	return false
}

const handle_better_auth: Handle = async ({ event, resolve }) => {
	const request_label = `${event.request.method} ${event.url.pathname}`
	const request_started_at = dev ? performance.now() : 0
	const { url: normalized_url } = normalizeUrl(event.url)
	const pathname = normalized_url.pathname
	const cookie_header = event.request.headers.get('cookie') ?? ''

	if (should_load_session(pathname)) {
		if (dev) {
			console.info(
				`[auth] incoming cookies for ${request_label}: ${cookie_header ? 'present' : 'missing'}`
			)
		}

		const session_started_at = dev ? performance.now() : 0
		const session = await auth.api.getSession({ headers: event.request.headers })
		if (dev) {
			console.info(
				`[auth] getSession ${request_label} took ${Math.round(performance.now() - session_started_at)}ms`
			)
		}

		if (session) {
			event.locals.session = session.session
			event.locals.user = session.user
		}
	} else if (dev) {
		console.info(`[auth] skipped getSession for ${request_label}`)
	}

	const response = await svelteKitHandler({ event, resolve, auth, building })

	if (dev) {
		const set_cookie = response.headers.get('set-cookie')
		console.info(`[auth] set-cookie on ${request_label}: ${set_cookie ? 'present' : 'missing'}`)
		console.info(
			`[auth] total handle ${request_label} took ${Math.round(performance.now() - request_started_at)}ms`
		)
	}

	return response
}

export const handle: Handle = handle_better_auth
