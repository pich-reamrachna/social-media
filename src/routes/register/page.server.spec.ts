import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
	class MockAPIError extends Error {}

	return {
		sign_up_email: vi.fn(),
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
			signUpEmail: mocks.sign_up_email
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

describe('register actions', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()

		mocks.peek_rate_limit.mockResolvedValue({
			ok: true,
			remaining: 3,
			reset_at: 0,
			retryAfterSeconds: 0
		})
		mocks.consume_rate_limit.mockResolvedValue({
			ok: true,
			remaining: 2,
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
			request: new Request('http://localhost/register', {
				method: 'POST',
				body: form_data
			}),
			locals: {
				clientAddress: client_address
			}
		}
	}

	it('keeps password mismatch errors specific', async () => {
		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		const result = await default_action(
			create_event({
				username: 'new-user',
				email: 'new@example.com',
				password: 'ValidPassword1!',
				confirm_password: 'DifferentPassword1!'
			}) as never
		)

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Passwords do not match',
				username: 'new-user',
				email: 'new@example.com'
			}
		})
		expect(mocks.sign_up_email).not.toHaveBeenCalled()
	})

	it('returns a generic message when sign up fails on existing credentials', async () => {
		mocks.sign_up_email.mockRejectedValue(new mocks.APIError('Username already exists'))

		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		const result = await default_action(
			create_event({
				username: 'existing-user',
				email: 'existing@example.com',
				password: 'ValidPassword1!',
				confirm_password: 'ValidPassword1!'
			}) as never
		)

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Unable to create account with those credentials',
				username: 'existing-user',
				email: 'existing@example.com'
			}
		})
	})

	it('redirects to login when sign up succeeds', async () => {
		mocks.sign_up_email.mockResolvedValue(undefined)

		const { actions } = await import('./+page.server')
		const default_action = actions.default!
		await expect(
			default_action(
				create_event({
					username: 'new-user',
					email: 'new@example.com',
					password: 'ValidPassword1!',
					confirm_password: 'ValidPassword1!'
				}) as never
			)
		).rejects.toMatchObject({
			status: 302,
			location: '/login'
		})
		expect(mocks.sign_up_email).toHaveBeenCalledWith({
			body: {
				email: 'new@example.com',
				password: 'ValidPassword1!',
				name: 'new-user',
				username: 'new-user'
			}
		})
	})
})
