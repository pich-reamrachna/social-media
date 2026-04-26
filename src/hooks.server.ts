import type { Handle } from '@sveltejs/kit'
import { normalizeUrl } from '@sveltejs/kit'
import { building, dev } from '$app/environment'
import { auth } from '$lib/server/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'

const SECURITY_HEADERS = {
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Resource-Policy': 'same-origin',
	'X-Content-Type-Options': 'nosniff'
} as const

const AUTH_ROUTES = new Set(['/login', '/register'])
const PROTECTED_ROUTE_PREFIXES = ['/home', '/profile', '/api']

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

const get_first_forwarded_address = (value: string | null) => {
	if (!value) return undefined

	const [first_address] = value.split(',')
	return first_address?.trim() || undefined
}

const get_client_address = (event: Parameters<Handle>[0]['event']) => {
	const vercel_forwarded_for = get_first_forwarded_address(
		event.request.headers.get('x-vercel-forwarded-for')
	)
	if (vercel_forwarded_for) return vercel_forwarded_for

	const forwarded_for = get_first_forwarded_address(event.request.headers.get('x-forwarded-for'))
	if (forwarded_for) return forwarded_for

	const real_ip = event.request.headers.get('x-real-ip')
	if (real_ip) {
		return real_ip.trim()
	}

	try {
		return event.getClientAddress()
	} catch {
		return undefined
	}
}

const apply_security_headers = (response: Response, url: URL) => {
	for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(header)) {
			response.headers.set(header, value)
		}
	}

	if (url.protocol === 'https:' && !response.headers.has('Strict-Transport-Security')) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
	}
}

const load_session_if_needed = async (
	event: Parameters<Handle>[0]['event'],
	pathname: string,
	request_label: string,
	cookie_header: string
) => {
	if (should_load_session(pathname)) {
		if (dev) {
			console.info(
				`[auth] incoming cookies for ${request_label}: ${cookie_header ? 'present' : 'missing'}`
			)
		}

		const session_started_at = dev ? performance.now() : 0
		const session = await auth.api.getSession({
			headers: event.request.headers,
			query: is_protected_route(pathname) ? { disableCookieCache: true } : undefined
		})
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
}

const handle_better_auth: Handle = async ({ event, resolve }) => {
	const request_label = `${event.request.method} ${event.url.pathname}`
	const request_started_at = dev ? performance.now() : 0
	const { url: normalized_url } = normalizeUrl(event.url)
	const pathname = normalized_url.pathname
	const cookie_header = event.request.headers.get('cookie') ?? ''
	const client_address = get_client_address(event)
	if (client_address) {
		event.locals.clientAddress = client_address
	}

	await load_session_if_needed(event, pathname, request_label, cookie_header)

	const response = await svelteKitHandler({ event, resolve, auth, building })
	apply_security_headers(response, event.url)

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
