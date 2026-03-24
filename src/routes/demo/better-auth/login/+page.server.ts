import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { auth } from '$lib/server/auth'
import { APIError } from 'better-auth/api'

const get_form_string = (form_data: FormData, key: string): string => {
	const value = form_data.get(key)
	return typeof value === 'string' ? value : ''
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/better-auth')
	}
	return {}
}

export const actions: Actions = {
	signInEmail: async (event) => {
		const form_data = await event.request.formData()
		const email = get_form_string(form_data, 'email')
		const password = get_form_string(form_data, 'password')

		try {
			await auth.api.signInEmail({
				body: {
					email,
					password,
					callbackURL: '/auth/verification-success'
				}
			})
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Signin failed' })
			}
			return fail(500, { message: 'Unexpected error' })
		}

		return redirect(302, '/demo/better-auth')
	},
	signUpEmail: async (event) => {
		const form_data = await event.request.formData()
		const email = get_form_string(form_data, 'email')
		const password = get_form_string(form_data, 'password')
		const name = get_form_string(form_data, 'name')

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
					callbackURL: '/auth/verification-success'
				}
			})
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed' })
			}
			return fail(500, { message: 'Unexpected error' })
		}

		return redirect(302, '/demo/better-auth')
	}
}
