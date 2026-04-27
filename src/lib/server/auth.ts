import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { username } from 'better-auth/plugins'
import { env } from '$env/dynamic/private'
import { getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH, VALID_USERNAME_REGEX } from '$lib/constants/auth'
import { send_email } from '$lib/server/email'

const plugins = [
	username({
		minUsernameLength: MIN_USERNAME_LENGTH,
		maxUsernameLength: MAX_USERNAME_LENGTH,
		usernameNormalization: (username) => username.toLowerCase(),
		usernameValidator: (username) => VALID_USERNAME_REGEX.test(username)
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
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			if (!user.emailVerified) {
				console.info(
					'[auth] sendResetPassword: unverified account, sending verify-first email: recipient=%s',
					user.email
				)
				await send_email({
					to: user.email,
					subject: 'Verify your Y account first',
					text: 'We received a password reset request, but your Y account email has not been verified yet. Sign in to Y and we will send you a verification link to activate your account.',
					html: `
						<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
							<h1 style="margin-bottom: 16px;">Verify your account first</h1>
							<p style="margin-bottom: 16px;">
								We received a password reset request for your Y account, but your email address has not been verified yet.
							</p>
							<p style="margin-bottom: 24px;">
								Please sign in to Y and we will send you a verification link to activate your account. Once verified, you can reset your password from your account settings.
							</p>
							<p>If you did not request this, you can safely ignore this email.</p>
						</div>
					`
				}).catch((e) => console.error('[auth] sendVerifyFirst failed:', e))
				return
			}

			console.info('[auth] sendResetPassword: recipient=%s', user.email)

			await send_email({
				to: user.email,
				subject: 'Reset your Y password',
				text: `Reset your Y password by opening this link: ${url}`,
				html: `
					<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
						<h1 style="margin-bottom: 16px;">Reset your password</h1>
						<p style="margin-bottom: 16px;">
							Click the link below to reset your Y password.
						</p>
						<p style="margin-bottom: 24px;">
							<a href="${url}" style="color: #db2777;">Reset password</a>
						</p>
						<p>If you did not request a password reset, you can ignore this email.</p>
					</div>
				`
			}).catch((e) => console.error('[auth] sendPasswordResetToken failed:', e))
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await send_email({
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
			}).catch((e) => console.error('[auth] sendVerificationEmail failed:', e))
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
