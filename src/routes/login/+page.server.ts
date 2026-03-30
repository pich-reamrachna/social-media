import { fail, redirect } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { auth } from '$lib/server/auth'
import type { Actions, PageServerLoad } from './$types'

const get_string = (formData: FormData, key: string) => {
	const value = formData.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/')
}

export const actions: Actions = {
	default: async (event) => {
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
			if (error instanceof APIError) {
				return fail(400, { message: error.message, username })
			}
			return fail(500, { message: 'Unexpected error', username })
		}

		redirect(302, '/')
	}
}
