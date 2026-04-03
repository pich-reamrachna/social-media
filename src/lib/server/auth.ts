import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { username } from 'better-auth/plugins'
import { env } from '$env/dynamic/private'
import { getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH } from '$lib/constants/auth'

const plugins = [
	username({
		minUsernameLength: MIN_USERNAME_LENGTH,
		maxUsernameLength: MAX_USERNAME_LENGTH,
		usernameNormalization: false,
		usernameValidator: (username) => /^[A-Za-z0-9._]+$/.test(username)
	}),
	sveltekitCookies(getRequestEvent)
]

type AuthPlugin = (typeof plugins)[number]

const is_module_not_found_error = (error: unknown): boolean => {
	if (!(error instanceof Error)) return false

	return (
		('code' in error && error.code === 'ERR_MODULE_NOT_FOUND') ||
		error.message.includes('Cannot find module')
	)
}

let dash_plugin: AuthPlugin | undefined
try {
	const load_infra = new Function("return import('@better-auth/infra')") as () => Promise<{
		dash?: () => AuthPlugin
	}>
	const infra = await load_infra()
	dash_plugin = infra.dash?.()
} catch (error) {
	if (!is_module_not_found_error(error)) {
		throw error
	}

	// @better-auth/infra is optional in this setup; continue without dash
	dash_plugin = undefined
}

if (dash_plugin) {
	plugins.splice(1, 0, dash_plugin)
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	plugins
})
