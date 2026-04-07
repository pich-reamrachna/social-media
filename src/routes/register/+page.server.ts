// src/routes/register/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { auth } from '$lib/server/auth'
import { consume_rate_limit, get_rate_limit_error } from '$lib/server/rate-limit'
import type { Actions, PageServerLoad } from './$types'
import { MIN_PASSWORD_LENGTH } from '$lib/constants/auth'

const REGISTER_LIMIT = { limit: 3, windowMs: 60_000 }

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

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/home')
}

export const actions: Actions = {
	default: async (event) => {
		const rate_limit = consume_rate_limit({
			key: `register:${event.locals.clientAddress ?? 'unknown'}`,
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

		const password_strength_errors = validate_password_strength(password)
		if (password_strength_errors.length > 0) {
			return fail(400, {
				message: `Password must include ${password_strength_errors.join(', ')}`,
				username,
				email
			})
		}

		if (password !== confirm_password) {
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
			if (error instanceof APIError) {
				return fail(400, { message: error.message, username, email })
			}
			return fail(500, { message: 'Unexpected error', username, email })
		}

		throw redirect(302, '/login')
	}
}
