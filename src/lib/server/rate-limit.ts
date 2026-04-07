type RateLimitOptions = {
	key: string
	limit: number
	windowMs: number
}

type RateLimitSubjectLocals = {
	user?: {
		id: string
	}
	clientAddress?: string
}

type RateLimitSuccess = {
	ok: true
	remaining: number
	reset_at: number
	retryAfterSeconds: 0
}

type RateLimitFailure = {
	ok: false
	remaining: 0
	reset_at: number
	retryAfterSeconds: number
}

type RateLimitResult = RateLimitSuccess | RateLimitFailure

type RateLimitEntry = {
	count: number
	reset_at: number
}

const rate_limit_store = new Map<string, RateLimitEntry>()

const get_retry_after_seconds = (reset_at: number, now: number) =>
	Math.max(1, Math.ceil((reset_at - now) / 1000))

export const get_rate_limit_subject = (locals: RateLimitSubjectLocals) =>
	locals.user ? `user:${locals.user.id}` : `ip:${locals.clientAddress ?? 'unknown'}`

export const get_rate_limit_error = (
	retry_after_seconds: number,
	message = 'Too many requests.'
) => ({
	message: `${message} Try again in ${retry_after_seconds} seconds.`
})

export const consume_rate_limit = ({ key, limit, windowMs }: RateLimitOptions): RateLimitResult => {
	const now = Date.now()
	const current_entry = rate_limit_store.get(key)

	if (!current_entry || current_entry.reset_at <= now) {
		const reset_at = now + windowMs
		rate_limit_store.set(key, { count: 1, reset_at })

		return {
			ok: true,
			remaining: limit - 1,
			reset_at,
			retryAfterSeconds: 0
		}
	}

	if (current_entry.count >= limit) {
		return {
			ok: false,
			remaining: 0,
			reset_at: current_entry.reset_at,
			retryAfterSeconds: get_retry_after_seconds(current_entry.reset_at, now)
		}
	}

	current_entry.count += 1
	rate_limit_store.set(key, current_entry)

	return {
		ok: true,
		remaining: limit - current_entry.count,
		reset_at: current_entry.reset_at,
		retryAfterSeconds: 0
	}
}
