import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
	class MockAPIError extends Error {}

	return {
		sign_in_username: vi.fn(),
		peek_rate_limit: vi.fn(),
		consume_rate_limit: vi.fn(),
		get_rate_limit_error: vi.fn((retry_after_seconds: number, message = 'Too many requests.') => ({
			message: `${message} Try again in ${retry_after_seconds} seconds.`
		})),
		APIError: MockAPIError
	}
})

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signInUsername: mocks.sign_in_username
		}
	}
}))

vi.mock('$lib/server/rate-limit', () => ({
	peek_rate_limit: mocks.peek_rate_limit,
	consume_rate_limit: mocks.consume_rate_limit,
	get_rate_limit_error: mocks.get_rate_limit_error
}))

vi.mock('better-auth/api', () => ({
	APIError: mocks.APIError
}))

describe('login actions', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()

		mocks.peek_rate_limit.mockResolvedValue({
			ok: true,
			remaining: 5,
			reset_at: 0,
			retryAfterSeconds: 0
		})
		mocks.consume_rate_limit.mockResolvedValue({
			ok: true,
			remaining: 4,
			reset_at: 0,
			retryAfterSeconds: 0
		})
		mocks.get_rate_limit_error.mockImplementation(
			(retry_after_seconds: number, message = 'Too many requests.') => ({
				message: `${message} Try again in ${retry_after_seconds} seconds.`
			})
		)
	})

	const create_event = (form_fields: Record<string, string>, client_address = '127.0.0.1') => {
		const form_data = new FormData()
		for (const [key, value] of Object.entries(form_fields)) {
			form_data.set(key, value)
		}

		return {
			request: new Request('http://localhost/login', {
				method: 'POST',
				body: form_data
			}),
			locals: {
				clientAddress: client_address
			}
		}
	}

	it('returns a generic message when auth fails', async () => {
		mocks.sign_in_username.mockRejectedValue(new mocks.APIError('User not found'))

		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		const result = await default_action(
			create_event({
				username: 'existing-user',
				password: 'wrong-password'
			}) as never
		)

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Invalid username or password',
				username: 'existing-user',
				should_remember_me: false
			}
		})
		expect(mocks.consume_rate_limit).toHaveBeenCalledTimes(2)
	})

	it('returns a verification message when email is not verified', async () => {
		mocks.sign_in_username.mockRejectedValue(new mocks.APIError('Email not verified'))

		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		const result = await default_action(
			create_event({
				username: 'existing-user',
				password: 'CorrectPassword1!'
			}) as never
		)

		expect(result).toMatchObject({
			status: 400,
			data: {
				message:
					'Please verify your email before signing in. Check your inbox for a verification link.',
				username: 'existing-user',
				should_remember_me: false
			}
		})
		expect(mocks.consume_rate_limit).toHaveBeenCalledTimes(2)
	})

	it('keeps submitted fields when login failures hit the rate limit', async () => {
		mocks.sign_in_username.mockRejectedValue(new mocks.APIError('User not found'))
		mocks.consume_rate_limit
			.mockResolvedValueOnce({
				ok: true,
				remaining: 4,
				reset_at: 0,
				retryAfterSeconds: 0
			})
			.mockResolvedValueOnce({
				ok: false,
				remaining: 0,
				reset_at: 0,
				retryAfterSeconds: 30
			})

		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		const result = await default_action(
			create_event({
				username: 'existing-user',
				password: 'wrong-password',
				should_remember_me: 'on'
			}) as never
		)

		expect(result).toMatchObject({
			status: 429,
			data: {
				message: 'Too many login attempts. Try again in 30 seconds.',
				username: 'existing-user',
				should_remember_me: true
			}
		})
	})

	it('redirects to home when login succeeds', async () => {
		mocks.sign_in_username.mockResolvedValue(undefined)

		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		await expect(
			default_action(
				create_event({
					username: 'existing-user',
					password: 'CorrectPassword1!',
					should_remember_me: 'on'
				}) as never
			)
		).rejects.toMatchObject({
			status: 302,
			location: '/home'
		})
		expect(mocks.sign_in_username).toHaveBeenCalledWith({
			body: {
				username: 'existing-user',
				password: 'CorrectPassword1!',
				rememberMe: true
			}
		})
	})
})
