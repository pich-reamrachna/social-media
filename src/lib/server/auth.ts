import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { username } from 'better-auth/plugins'
import { env } from '$env/dynamic/private'
import { getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH } from '$lib/constants/auth'
import { send_email } from '$lib/server/email'

const plugins = [
	username({
		minUsernameLength: MIN_USERNAME_LENGTH,
		maxUsernameLength: MAX_USERNAME_LENGTH,
		usernameNormalization: (username) => username.toLowerCase(),
		usernameValidator: (username) => /^[a-z0-9._]+$/.test(username)
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
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			void send_email({
				to: user.email,
				subject: 'Verify your email for Y',
				text: `Verify your email for Y by opening this link: ${url}`,
				html: `
					<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
						<h1 style="margin-bottom: 16px;">Verify your email</h1>
						<p style="margin-bottom: 16px;">
							Click the link below to verify your Y account and finish signing in.
						</p>
						<p style="margin-bottom: 24px;">
							<a href="${url}" style="color: #db2777;">Verify email</a>
						</p>
						<p>If you did not create this account, you can ignore this email.</p>
					</div>
				`
			})
		}
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
			refreshCache: true
		}
	},
	plugins
})
