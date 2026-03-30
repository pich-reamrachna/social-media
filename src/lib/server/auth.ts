import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { username } from 'better-auth/plugins'
import { env } from '$env/dynamic/private'
import { getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'

const plugins = [username(), sveltekitCookies(getRequestEvent)]

type AuthPlugin = (typeof plugins)[number]

let dash_plugin: AuthPlugin | undefined
try {
	const load_infra = new Function("return import('@better-auth/infra')") as () => Promise<{
		dash?: () => AuthPlugin
	}>
	const infra = await load_infra()
	dash_plugin = infra.dash?.()
} catch {
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
