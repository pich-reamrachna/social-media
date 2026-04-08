import { and, eq, lte, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { rate_limit } from '$lib/server/db/schema'

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

type RateLimitWindow = {
	window_id: number
	reset_at: number
	reset_at_date: Date
}

const get_reset_at_timestamp = (value: unknown, fallback: number) => {
	if (value instanceof Date) {
		return value.getTime()
	}

	const parsed = new Date(String(value)).getTime()
	return Number.isNaN(parsed) ? fallback : parsed
}

const get_retry_after_seconds = (reset_at: number, now: number) =>
	Math.max(1, Math.ceil((reset_at - now) / 1000))

const get_rate_limit_window = (windowMs: number, now: number): RateLimitWindow => {
	const window_id = Math.floor(now / windowMs)
	const reset_at = (window_id + 1) * windowMs

	return {
		window_id,
		reset_at,
		reset_at_date: new Date(reset_at)
	}
}

const cleanup_expired_rate_limits = async (key: string, now: Date): Promise<void> => {
	await db.delete(rate_limit).where(and(eq(rate_limit.key, key), lte(rate_limit.resetAt, now)))
}

const get_rate_limit_entry = async (
	key: string,
	window_id: number
): Promise<RateLimitEntry | undefined> => {
	const existing_entry = await db.query.rate_limit.findFirst({
		where: and(eq(rate_limit.key, key), eq(rate_limit.windowId, window_id)),
		columns: {
			count: true,
			resetAt: true
		}
	})

	if (!existing_entry) {
		return undefined
	}

	return {
		count: existing_entry.count,
		reset_at: existing_entry.resetAt.getTime()
	}
}

const increment_rate_limit = async (
	key: string,
	window: RateLimitWindow
): Promise<RateLimitEntry> => {
	const rows = await db
		.insert(rate_limit)
		.values({
			key,
			windowId: window.window_id,
			count: 1,
			resetAt: window.reset_at_date
		})
		.onConflictDoUpdate({
			target: [rate_limit.key, rate_limit.windowId],
			set: {
				count: sql`${rate_limit.count} + 1`
			}
		})
		.returning({
			count: rate_limit.count,
			reset_at: rate_limit.resetAt
		})

	const row = rows[0]

	if (!row) {
		throw new Error('Failed to increment the rate limit counter.')
	}

	return {
		count: Number(row.count),
		reset_at: get_reset_at_timestamp(row.reset_at, window.reset_at)
	}
}

export const get_rate_limit_subject = (locals: RateLimitSubjectLocals) =>
	locals.user ? `user:${locals.user.id}` : `ip:${locals.clientAddress ?? 'unknown'}`

export const get_rate_limit_error = (
	retry_after_seconds: number,
	message = 'Too many requests.'
) => ({
	message: `${message} Try again in ${retry_after_seconds} seconds.`
})

const get_rate_limit_status = async ({
	key,
	limit,
	windowMs
}: RateLimitOptions): Promise<RateLimitResult> => {
	const now = Date.now()
	const window = get_rate_limit_window(windowMs, now)
	try {
		await cleanup_expired_rate_limits(key, new Date(now))

		const current_entry = await get_rate_limit_entry(key, window.window_id)

		if (current_entry && current_entry.count >= limit) {
			return {
				ok: false,
				remaining: 0,
				reset_at: current_entry.reset_at,
				retryAfterSeconds: get_retry_after_seconds(current_entry.reset_at, now)
			}
		}

		return {
			ok: true,
			remaining: limit - (current_entry?.count ?? 0),
			reset_at: current_entry?.reset_at ?? window.reset_at,
			retryAfterSeconds: 0
		}
	} catch (error) {
		console.error('[rate-limit] Failed to read rate limit', { key, error })

		return {
			ok: true,
			remaining: limit,
			reset_at: window.reset_at,
			retryAfterSeconds: 0
		}
	}
}

export const peek_rate_limit = get_rate_limit_status

export const consume_rate_limit = async ({
	key,
	limit,
	windowMs
}: RateLimitOptions): Promise<RateLimitResult> => {
	const now = Date.now()
	const window = get_rate_limit_window(windowMs, now)
	try {
		const current_status = await get_rate_limit_status({ key, limit, windowMs })

		if (!current_status.ok) {
			return current_status
		}

		const next_entry = await increment_rate_limit(key, window)

		if (next_entry.count > limit) {
			return {
				ok: false,
				remaining: 0,
				reset_at: next_entry.reset_at,
				retryAfterSeconds: get_retry_after_seconds(next_entry.reset_at, now)
			}
		}

		return {
			ok: true,
			remaining: Math.max(0, limit - next_entry.count),
			reset_at: next_entry.reset_at,
			retryAfterSeconds: 0
		}
	} catch (error) {
		console.error('[rate-limit] Failed to consume rate limit', { key, error })

		return {
			ok: true,
			remaining: limit,
			reset_at: window.reset_at,
			retryAfterSeconds: 0
		}
	}
}
