import { auth } from '$lib/server/auth'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		await auth.api.signOut({ headers: request.headers })
	} catch (e) {
		console.error('[logout] signOut error:', e)
	}

	const delete_auth_cookie = (name: string, secure = false) => {
		cookies.delete(name, { path: '/', secure })
	}

	delete_auth_cookie('better-auth.session_token')
	delete_auth_cookie('better-auth.session_data')
	delete_auth_cookie('__Secure-better-auth.session_token', true)
	delete_auth_cookie('__Secure-better-auth.session_data', true)
	delete_auth_cookie('__Host-better-auth.session_token', true)
	delete_auth_cookie('__Host-better-auth.session_data', true)

	throw redirect(303, '/login')
}
