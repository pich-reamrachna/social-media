import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

type EmailPayload = {
	to: string
	subject: string
	html: string
	text: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'
const DEFAULT_RESEND_TIMEOUT_MS = 10_000

const get_required_env = (key: 'EMAIL_FROM' | 'RESEND_API_KEY') => {
	const value = env[key]?.trim()
	return value ? value : undefined
}

const get_resend_timeout_ms = () => {
	const value = env.RESEND_TIMEOUT_MS?.trim()
	const timeout_ms = value ? Number.parseInt(value, 10) : DEFAULT_RESEND_TIMEOUT_MS

	return Number.isFinite(timeout_ms) && timeout_ms > 0 ? timeout_ms : DEFAULT_RESEND_TIMEOUT_MS
}

export const send_email = async ({ to, subject, html, text }: EmailPayload) => {
	const api_key = get_required_env('RESEND_API_KEY')
	const from = get_required_env('EMAIL_FROM')
	const timeout_ms = get_resend_timeout_ms()

	if (!api_key || !from) {
		if (dev) {
			console.info(
				[
					`[email:dev-fallback] No RESEND_API_KEY/EMAIL_FROM — printing email instead of sending.`,
					`  To: ${to}`,
					`  Subject: ${subject}`,
					`  Body:\n${text}`
				].join('\n')
			)
			return
		}

		throw new Error('Email sending is not configured. Set RESEND_API_KEY and EMAIL_FROM.')
	}

	const controller = new AbortController()
	const timeout_id = setTimeout(() => controller.abort(), timeout_ms)

	let response: Response

	try {
		response = await fetch(RESEND_API_URL, {
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
			}),
			signal: controller.signal
		})
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			const timeout_error = new Error(`Resend request timed out after ${timeout_ms}ms.`)
			console.error('[email] Resend request timed out.', {
				timeout_ms,
				to,
				subject
			})
			throw timeout_error
		}

		throw error
	} finally {
		clearTimeout(timeout_id)
	}

	if (!response.ok) {
		throw new Error(`Resend request failed with status ${response.status}`)
	}
}
