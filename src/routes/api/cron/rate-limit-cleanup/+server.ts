import { env } from '$env/dynamic/private'
import { json } from '@sveltejs/kit'
import { cleanup_expired_rate_limits } from '$lib/server/rate-limit'

const is_authorized = (request: Request) => {
	const cron_secret = env.CRON_SECRET
	if (!cron_secret) {
		throw new Error('CRON_SECRET is not configured.')
	}

	return request.headers.get('authorization') === `Bearer ${cron_secret}`
}

export const GET = async ({ request }) => {
	if (!is_authorized(request)) {
		return json({ message: 'Unauthorized' }, { status: 401 })
	}

	const deleted_count = await cleanup_expired_rate_limits(new Date())

	return json({
		ok: true,
		deleted_count
	})
}
