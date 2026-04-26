import { fail, redirect } from '@sveltejs/kit'
import { consume_rate_limit, get_rate_limit_error, peek_rate_limit } from '$lib/server/rate-limit'
import { auth } from '$lib/server/auth' // Bring the auth instance back
import { env } from '$env/dynamic/private'
import type { Actions, PageServerLoad } from './$types'

const FORGET_PASSWORD_LIMIT = { limit: 1, windowMs: 60_000 }

const get_string = (form_data: FormData, key: string) => {
	const value = form_data.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/home')
}

export const actions: Actions = {
	default: async (event) => {
		const rate_limit_key = `forget_pw:${event.locals.clientAddress ?? 'unknown'}`
		const rate_limit = await peek_rate_limit({
			key: rate_limit_key,
			...FORGET_PASSWORD_LIMIT
		})

		if (!rate_limit.ok) {
			return fail(429, {
				error_message: 'Too many requests. Please wait.',
				retry_after: rate_limit.retryAfterSeconds
			})
		}

		const form_data = await event.request.formData()
		const email = get_string(form_data, 'email')

		await consume_rate_limit({ key: rate_limit_key, ...FORGET_PASSWORD_LIMIT })

		if (!email) {
			return fail(400, { error_message: 'Email is required', email })
		}

		try {
			// THE FIX: Better Auth renamed this method to requestPasswordReset
			// This safely finds and calls whichever method exists in your installed version
			// @ts-expect-error - bypassing strict types for a dynamic check
			const reset_method =
				auth.api.requestPasswordReset || auth.api.forgetPassword || auth.api.forgotPassword

			if (typeof reset_method !== 'function') {
				console.error('[forget-password] Missing method. Available APIs:', Object.keys(auth.api))
				return fail(500, { error_message: 'Server auth misconfiguration.' })
			}

			// Call the correct method directly on the server
			// @ts-expect-error - dynamic invocation
			await reset_method({
				body: {
					email,
					redirectTo: `${env.ORIGIN}/reset-password`
				},
				headers: event.request.headers
			})
		} catch (error) {
			console.error('[forget-password] Better Auth error:', error)
		}

		return {
			success_message:
				'If an account exists for that email, a reset link has been sent to your inbox.',
			retry_after: 60,
			timestamp: Date.now()
		}
	}
}
