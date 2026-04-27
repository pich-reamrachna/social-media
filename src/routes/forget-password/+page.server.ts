import { fail, redirect } from '@sveltejs/kit'
import { consume_rate_limit, peek_rate_limit } from '$lib/server/rate-limit'
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
		const client_id =
			event.locals.clientAddress ??
			(() => {
				try {
					return event.getClientAddress()
				} catch {
					return crypto.randomUUID()
				}
			})()
		const rate_limit_key = `forget_pw:${client_id}`
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
			await auth.api.requestPasswordReset({
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
