// src/routes/register/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { auth } from '$lib/server/auth'
import { consume_rate_limit, get_rate_limit_error, peek_rate_limit } from '$lib/server/rate-limit'
import type { Actions, PageServerLoad } from './$types'
import { MIN_PASSWORD_LENGTH } from '$lib/constants/auth'

const REGISTER_LIMIT = { limit: 3, windowMs: 60_000 }
const DUPLICATE_ACCOUNT_ERROR = 'Account already exists'
const DUPLICATE_USERNAME_ERROR = 'Username already taken'

const get_string = (formData: FormData, key: string) => {
	const value = formData.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

const validate_password_strength = (password: string) => {
	const errors: string[] = []

	if (password.length < MIN_PASSWORD_LENGTH) {
		errors.push(`at least ${MIN_PASSWORD_LENGTH} characters`)
	}
	if (!/[a-z]/.test(password)) errors.push('one lowercase letter')
	if (!/[A-Z]/.test(password)) errors.push('one uppercase letter')
	if (!/\d/.test(password)) errors.push('one number')
	if (!/[^A-Za-z0-9]/.test(password)) errors.push('one special character')

	return errors
}

const get_register_error_message = (error_message: string | undefined) => {
	const normalized_error = error_message?.toLowerCase() || ''

	// Keep email-related failures generic for privacy, including mixed username+email conflicts.
	if (normalized_error.includes('email')) {
		return DUPLICATE_ACCOUNT_ERROR
	}

	return normalized_error.includes('username') ? DUPLICATE_USERNAME_ERROR : DUPLICATE_ACCOUNT_ERROR
}

const get_register_rate_limit_failure = async (
	consume_failed_attempt: () => ReturnType<typeof consume_rate_limit>
) => {
	const failed_attempt_rate_limit = await consume_failed_attempt()

	return failed_attempt_rate_limit.ok
		? undefined
		: fail(
				429,
				get_rate_limit_error(
					failed_attempt_rate_limit.retryAfterSeconds,
					'Too many registration attempts.'
				)
			)
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/home')
}

export const actions: Actions = {
	default: async (event) => {
		const rate_limit_key = `register:${event.locals.clientAddress ?? 'unknown'}`
		const rate_limit = await peek_rate_limit({
			key: rate_limit_key,
			...REGISTER_LIMIT
		})
		if (!rate_limit.ok) {
			return fail(
				429,
				get_rate_limit_error(rate_limit.retryAfterSeconds, 'Too many registration attempts.')
			)
		}

		const form_data = await event.request.formData()
		const username = get_string(form_data, 'username')
		const email = get_string(form_data, 'email')
		const password = get_string(form_data, 'password')
		const confirm_password = get_string(form_data, 'confirm_password')
		const consume_failed_attempt = async () =>
			consume_rate_limit({
				key: rate_limit_key,
				...REGISTER_LIMIT
			})

		const password_strength_errors = validate_password_strength(password)
		if (password_strength_errors.length > 0) {
			const rate_limit_failure = await get_register_rate_limit_failure(consume_failed_attempt)
			if (rate_limit_failure) return rate_limit_failure

			return fail(400, {
				message: `Password must include ${password_strength_errors.join(', ')}`,
				username,
				email
			})
		}

		if (password !== confirm_password) {
			const rate_limit_failure = await get_register_rate_limit_failure(consume_failed_attempt)
			if (rate_limit_failure) return rate_limit_failure

			return fail(400, { message: 'Passwords do not match', username, email })
		}

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name: username,
					username
				}
			})
		} catch (error) {
			if (!(error instanceof APIError)) {
				return fail(500, { message: 'Unexpected error', username, email })
			}

			const rate_limit_failure = await get_register_rate_limit_failure(consume_failed_attempt)
			if (rate_limit_failure) return rate_limit_failure

			return fail(400, {
				message: get_register_error_message(error.message),
				username,
				email
			})
		}

		throw redirect(302, '/login')
	}
}
