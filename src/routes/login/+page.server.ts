import { fail, redirect } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { auth } from '$lib/server/auth'
import { consume_rate_limit, get_rate_limit_error, peek_rate_limit } from '$lib/server/rate-limit'
import type { Actions, PageServerLoad } from './$types'

const LOGIN_LIMIT = { limit: 5, windowMs: 60_000 }

const get_string = (formData: FormData, key: string) => {
	const value = formData.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

const get_login_rate_limit_failure = async (key: string) => {
	const failed_attempt_rate_limit = await consume_rate_limit({
		key,
		...LOGIN_LIMIT
	})

	return failed_attempt_rate_limit.ok
		? undefined
		: fail(
				429,
				get_rate_limit_error(
					failed_attempt_rate_limit.retryAfterSeconds,
					'Too many login attempts.'
				)
			)
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/home')
}

export const actions: Actions = {
	default: async (event) => {
		const rate_limit_key = `login:${event.locals.clientAddress ?? 'unknown'}`
		const rate_limit = await peek_rate_limit({
			key: rate_limit_key,
			...LOGIN_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(
				429,
				get_rate_limit_error(rate_limit.retryAfterSeconds, 'Too many login attempts.')
			)
		}

		const form_data = await event.request.formData()
		const username = get_string(form_data, 'username')
		const password = get_string(form_data, 'password')
		const should_remember_me = form_data.get('should_remember_me') === 'on'

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

			const rate_limit_failure = await get_login_rate_limit_failure(rate_limit_key)
			if (rate_limit_failure) return rate_limit_failure

			return fail(400, { message: error.message, username })
		}

		return redirect(302, '/home')
	}
}
