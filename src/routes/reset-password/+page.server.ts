import { fail, redirect } from '@sveltejs/kit'
import { consume_rate_limit, get_rate_limit_error, peek_rate_limit } from '$lib/server/rate-limit'
import { MIN_PASSWORD_LENGTH } from '$lib/constants/auth'
import { verifyPassword } from 'better-auth/crypto'
import { db } from '$lib/server/db'
import { account, verification } from '$lib/server/db/auth.schema'
import { and, eq } from 'drizzle-orm'
import type { Actions, PageServerLoad } from './$types'

const RESET_LIMIT = { limit: 5, windowMs: 60_000 }

const get_string = (form_data: FormData, key: string) => {
	const value = form_data.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

const validate_password_strength = (password: string): string | undefined => {
	const errors: string[] = []
	if (password.length < MIN_PASSWORD_LENGTH)
		errors.push(`be at least ${MIN_PASSWORD_LENGTH} characters`)
	if (!/[a-z]/.test(password)) errors.push('contain lowercase')
	if (!/[A-Z]/.test(password)) errors.push('contain uppercase')
	if (!/\d/.test(password)) errors.push('contain a number')
	if (!/[^A-Za-z0-9]/.test(password)) errors.push('contain a symbol')
	return errors.length > 0 ? `Password must ${errors.join(', ')}` : undefined
}

const is_same_as_current_password = async (token: string, password: string): Promise<boolean> => {
	const token_row = await db.query.verification.findFirst({
		where: eq(verification.identifier, `reset-password:${token}`)
	})
	if (!token_row) return false
	const credential = await db.query.account.findFirst({
		where: and(eq(account.userId, token_row.value), eq(account.providerId, 'credential'))
	})
	if (!credential?.password) return false
	return verifyPassword({ hash: credential.password, password })
}

export const load: PageServerLoad = async ({ url, locals }) => {
	// Prevent logged-in users from resetting passwords here
	if (locals.user) throw redirect(302, '/home')

	const token = url.searchParams.get('token')

	// If they manually navigate here without a token, send them back to login
	if (!token) {
		throw redirect(302, '/login?error=missing_token')
	}

	return { token }
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
		const rate_limit_key = `reset_pw:${client_id}`
		const rate_limit = await peek_rate_limit({
			key: rate_limit_key,
			...RESET_LIMIT
		})

		if (!rate_limit.ok) {
			return fail(429, {
				error_message: get_rate_limit_error(rate_limit.retryAfterSeconds, 'Too many attempts.')
					.message
			})
		}

		const form_data = await event.request.formData()
		const password = get_string(form_data, 'password')
		const confirm_password = get_string(form_data, 'confirm_password')
		const token = get_string(form_data, 'token')

		await consume_rate_limit({ key: rate_limit_key, ...RESET_LIMIT })

		if (!token) return fail(400, { error_message: 'Invalid or missing token.' })

		if (password !== confirm_password) {
			return fail(400, { error_message: 'Passwords do not match.' })
		}

		const strength_error = validate_password_strength(password)
		if (strength_error) return fail(400, { error_message: strength_error })

		if (await is_same_as_current_password(token, password)) {
			return fail(400, {
				error_message: 'New password must be different from your current password.'
			})
		}

		try {
			// Using the native Better Auth fetch approach to prevent the TypeError
			const response = await event.fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newPassword: password,
					token
				})
			})

			if (!response.ok) {
				const error_data = await response.json().catch(() => ({}))
				return fail(400, { error_message: error_data.message || 'Invalid or expired token.' })
			}
		} catch (error) {
			console.error('[reset-password] Fetch error:', error)
			return fail(500, { error_message: 'An unexpected error occurred.' })
		}

		// On success, redirect to login so they can use their new password
		throw redirect(302, '/login?reset=success')
	}
}
