import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { username } from 'better-auth/plugins'
import type { BetterAuthPlugin } from '@better-auth/core'
import { env } from '$env/dynamic/private'
import { getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'

let dash_plugin: undefined | (() => BetterAuthPlugin)
try {
	const infra = await import('@better-auth/infra')
	dash_plugin = infra.dash as () => BetterAuthPlugin
} catch {
	// @better-auth/infra is optional in this setup; continue without dash
	dash_plugin = undefined
}

const plugins = [username(), sveltekitCookies(getRequestEvent)]
if (dash_plugin) {
	plugins.splice(1, 0, dash_plugin())
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	plugins
})
