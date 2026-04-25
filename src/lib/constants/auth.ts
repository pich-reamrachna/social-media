export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 20
export const MIN_PASSWORD_LENGTH = 12
export const MAX_BIO_LENGTH = 160
export const VALID_USERNAME_REGEX = /^[a-z0-9._]+$/

export type UsernameValidationResult = { ok: true; message: '' } | { ok: false; message: string }

export const validate_username = (username: string): UsernameValidationResult => {
	if (!username) return { ok: false, message: 'Username is required' }
	if (!VALID_USERNAME_REGEX.test(username)) {
		return {
			ok: false,
			message: 'Username allows only lowercase letters, numbers, dots, and underscores'
		}
	}
	if (username.length < MIN_USERNAME_LENGTH) {
		return {
			ok: false,
			message: `Username must be at least ${MIN_USERNAME_LENGTH} characters`
		}
	}
	if (username.length > MAX_USERNAME_LENGTH) {
		return {
			ok: false,
			message: `Username must be less than ${MAX_USERNAME_LENGTH} characters`
		}
	}

	return { ok: true, message: '' }
}
