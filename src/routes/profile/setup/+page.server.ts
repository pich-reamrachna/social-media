import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { validate_username } from '$lib/constants/auth'
import { upload_cloudinary } from '$lib/server/cloudinary'
import { eq } from 'drizzle-orm'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

const get_string = (form_data: FormData, key: string) => {
	const value = form_data.get(key)
	return typeof value === 'string' ? value.trim() : ''
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login')
	if (locals.user.username) throw redirect(302, '/home')

	return {
		current_user: {
			name: locals.user.name,
			email: locals.user.email,
			banner_url:
				locals.user.banner ||
				'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
			avatar_url: locals.user.image || `https://i.pravatar.cc/150?u=${locals.user.id}`
		}
	}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const viewer = locals.user
		if (!viewer) return fail(401, { message: 'Unauthorized' })

		const form_data = await request.formData()
		const name = get_string(form_data, 'name')
		const username = get_string(form_data, 'username').toLowerCase()
		const bio = get_string(form_data, 'bio')
		const banner_file = form_data.get('banner') as File | null
		const avatar_file = form_data.get('avatar') as File | null
		const submitted_values = { name, username, bio }

		if (!name) {
			return fail(400, { message: 'Displayed name is required', ...submitted_values })
		}
		if (name.length > 50) {
			return fail(400, {
				message: 'Displayed name must be under 50 characters',
				...submitted_values
			})
		}

		const username_validation = validate_username(username)
		if (!username_validation.ok) {
			return fail(400, { message: username_validation.message, ...submitted_values })
		}

		const existing_user = await db.query.user.findFirst({
			where: eq(user.username, username),
			columns: { id: true }
		})
		if (existing_user && existing_user.id !== viewer.id) {
			return fail(400, { message: 'Username already taken', ...submitted_values })
		}

		const update_payload: Partial<typeof user.$inferSelect> = {
			name,
			username,
			displayUsername: username,
			bio
		}

		try {
			if (avatar_file && avatar_file instanceof File && avatar_file.size > 0) {
				const avatar_url = await upload_cloudinary(avatar_file, 'avatars')
				update_payload.image = avatar_url
			}

			if (banner_file && banner_file instanceof File && banner_file.size > 0) {
				const banner_url = await upload_cloudinary(banner_file, 'banners')
				update_payload.banner = banner_url
			}

			await db.update(user).set(update_payload).where(eq(user.id, viewer.id))
		} catch (err) {
			console.error('Profile setup failed: ', err)
			return fail(500, { message: 'Failed to update profile', ...submitted_values })
		}

		throw redirect(302, `/profile/${username}`)
	}
}
