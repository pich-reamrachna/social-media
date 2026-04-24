import { v2 as cloudinary_sdk } from 'cloudinary'
import { env } from '$env/dynamic/private'

const require_env = (value: string | undefined, name: string): string => {
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

const cloudinary = cloudinary_sdk

cloudinary.config({
	cloud_name: require_env(env.CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME'),
	api_key: require_env(env.CLOUDINARY_API_KEY, 'CLOUDINARY_API_KEY'),
	api_secret: require_env(env.CLOUDINARY_API_SECRET, 'CLOUDINARY_API_SECRET')
})

async function upload_cloudinary(file: File, folder: string) {
	const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB
	const UPLOAD_TIMEOUT_MS = 25_000
	const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
	const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

	if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
		throw new Error('Invalid file size')
	}
	if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
		throw new Error('Invalid file type')
	}

	const array_buffer = await file.arrayBuffer()
	const buffer = Buffer.from(array_buffer)

	return new Promise<string>((resolve, reject) => {
		let has_settled = false

		const fail = (error: Error) => {
			if (has_settled) return
			has_settled = true
			clearTimeout(timeout)
			reject(error)
		}

		const upload_stream = cloudinary.uploader.upload_stream(
			{ folder, resource_type: 'image', allowed_formats: ALLOWED_FORMATS },
			(error, result) => {
				if (error || !result) {
					fail(error || new Error('Upload failed'))
					return
				}
				if (has_settled) return
				has_settled = true
				clearTimeout(timeout)
				resolve(result.secure_url)
			}
		)

		const timeout = setTimeout(() => {
			if (has_settled) return
			has_settled = true
			const timeout_error = new Error('Upload timed out')
			upload_stream.destroy(timeout_error)
			reject(timeout_error)
		}, UPLOAD_TIMEOUT_MS)

		upload_stream.on('error', fail)
		upload_stream.end(buffer)
	})
}

export { cloudinary, upload_cloudinary }
