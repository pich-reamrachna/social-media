import { fail, redirect } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { auth } from '$lib/server/auth'
import { consume_rate_limit, get_rate_limit_error, peek_rate_limit } from '$lib/server/rate-limit'
import type { Actions, PageServerLoad } from './$types'

const LOGIN_LIMIT = { limit: 5, windowMs: 60_000 }
const GENERIC_LOGIN_ERROR = 'Invalid username or password'
const EMAIL_NOT_VERIFIED_ERROR =
	'Please verify your email before signing in. Check your inbox for a verification link.'

const get_string = (formData: FormData, key: string) => {
	const value = formData.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

const get_login_user_rate_limit_key = (username: string) =>
	`login:user:${username.toLowerCase() || 'unknown'}`

const get_login_ip_rate_limit_key = (client_address: string | undefined) =>
	`login:ip:${client_address ?? 'unknown'}`

const get_login_error_message = (error_message: string | undefined) => {
	const normalized_error = error_message?.toLowerCase() || ''
	return normalized_error.includes('email not verified')
		? EMAIL_NOT_VERIFIED_ERROR
		: GENERIC_LOGIN_ERROR
}

const get_login_rate_limit_failure = async (keys: string[]) => {
	for (const key of keys) {
		const failed_attempt_rate_limit = await consume_rate_limit({
			key,
			...LOGIN_LIMIT
		})

		if (!failed_attempt_rate_limit.ok) {
			return fail(
				429,
				get_rate_limit_error(
					failed_attempt_rate_limit.retryAfterSeconds,
					'Too many login attempts.'
				)
			)
		}
	}

	return undefined
}

const get_blocked_login_rate_limit_failure = async (keys: string[]) => {
	for (const key of keys) {
		const rate_limit = await peek_rate_limit({
			key,
			...LOGIN_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(
				429,
				get_rate_limit_error(rate_limit.retryAfterSeconds, 'Too many login attempts.')
			)
		}
	}

	return undefined
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(302, '/home')

	return {
		verification_sent: url.searchParams.get('verification') === 'sent'
	}
}

export const actions: Actions = {
	default: async (event) => {
		const form_data = await event.request.formData()
		const username = get_string(form_data, 'username')
		const password = get_string(form_data, 'password')
		const should_remember_me = form_data.get('should_remember_me') === 'on'
		const rate_limit_keys = [
			get_login_user_rate_limit_key(username),
			get_login_ip_rate_limit_key(event.locals.clientAddress)
		]
		const blocked_rate_limit = await get_blocked_login_rate_limit_failure(rate_limit_keys)
		if (blocked_rate_limit) return blocked_rate_limit

		try {
			await auth.api.signInUsername({
				body: {
					username,
					password,
					rememberMe: should_remember_me
				}
			})
		} catch (error) {
			if (!(error instanceof APIError)) return fail(500, { message: 'Unexpected error', username })

			const rate_limit_failure = await get_login_rate_limit_failure(rate_limit_keys)
			if (rate_limit_failure) return rate_limit_failure

			return fail(400, { message: get_login_error_message(error.message), username })
		}

		return redirect(302, '/home')
	}
}
