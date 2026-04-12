import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	env: {
		RESEND_API_KEY: 'test-api-key',
		EMAIL_FROM: 'noreply@example.com',
		EMAIL_REPLY_TO: 'support@example.com',
		RESEND_TIMEOUT_MS: '25'
	},
	abort_error: Object.assign(new Error('The operation was aborted.'), {
		name: 'AbortError'
	})
}))

vi.mock('$app/environment', () => ({
	dev: false
}))

vi.mock('$env/dynamic/private', () => ({
	env: mocks.env
}))

describe('send_email', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.stubGlobal('fetch', vi.fn())
		mocks.env.RESEND_API_KEY = 'test-api-key'
		mocks.env.EMAIL_FROM = 'noreply@example.com'
		mocks.env.EMAIL_REPLY_TO = 'support@example.com'
		mocks.env.RESEND_TIMEOUT_MS = '25'
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it('passes an abort signal to fetch and clears the timeout after success', async () => {
		const response = {
			ok: true
		} satisfies Partial<Response>

		vi.mocked(fetch).mockResolvedValue(response as Response)

		const { send_email } = await import('./email')
		await send_email({
			to: 'user@example.com',
			subject: 'Subject',
			html: '<p>Hello</p>',
			text: 'Hello'
		})

		expect(fetch).toHaveBeenCalledWith(
			'https://api.resend.com/emails',
			expect.objectContaining({
				method: 'POST',
				signal: expect.any(AbortSignal)
			})
		)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('throws a timeout-specific error when the resend request is aborted', async () => {
		const console_error = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.mocked(fetch).mockImplementation(
			(_input, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(mocks.abort_error), { once: true })
				}) as Promise<Response>
		)

		const { send_email } = await import('./email')
		const send_promise = send_email({
			to: 'user@example.com',
			subject: 'Subject',
			html: '<p>Hello</p>',
			text: 'Hello'
		})
		const expectation = expect(send_promise).rejects.toThrow('Resend request timed out after 25ms.')

		await vi.advanceTimersByTimeAsync(25)

		await expectation
		expect(console_error).toHaveBeenCalledWith('[email] Resend request timed out.', {
			timeout_ms: 25,
			to: 'user@example.com',
			subject: 'Subject'
		})
	})

	it('uses the default timeout when RESEND_TIMEOUT_MS is invalid', async () => {
		mocks.env.RESEND_TIMEOUT_MS = 'invalid'

		vi.mocked(fetch).mockImplementation(
			(_input, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(mocks.abort_error), { once: true })
				}) as Promise<Response>
		)

		const { send_email } = await import('./email')
		const send_promise = send_email({
			to: 'user@example.com',
			subject: 'Subject',
			html: '<p>Hello</p>',
			text: 'Hello'
		})
		const expectation = expect(send_promise).rejects.toThrow(
			'Resend request timed out after 10000ms.'
		)

		await vi.advanceTimersByTimeAsync(10_000)

		await expectation
	})
})
