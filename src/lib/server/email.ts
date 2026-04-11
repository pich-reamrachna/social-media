import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

type EmailPayload = {
	to: string
	subject: string
	html: string
	text: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

const get_required_env = (key: 'EMAIL_FROM' | 'RESEND_API_KEY') => {
	const value = env[key]?.trim()
	return value ? value : undefined
}

export const send_email = async ({ to, subject, html, text }: EmailPayload) => {
	const api_key = get_required_env('RESEND_API_KEY')
	const from = get_required_env('EMAIL_FROM')

	if (!api_key || !from) {
		if (dev) {
			console.info(
				`[email:dev-fallback] Missing RESEND_API_KEY or EMAIL_FROM. Verification email for ${to}: ${text}`
			)
			return
		}

		throw new Error('Email sending is not configured. Set RESEND_API_KEY and EMAIL_FROM.')
	}

	const response = await fetch(RESEND_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${api_key}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to,
			subject,
			html,
			text,
			reply_to: env.EMAIL_REPLY_TO?.trim() || undefined
		})
	})

	if (!response.ok) {
		throw new Error(`Resend request failed with status ${response.status}`)
	}
}
