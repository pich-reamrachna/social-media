import { v2 as cloudinary } from 'cloudinary'
import { env } from '$env/dynamic/private'

const require_env = (value: string | undefined, name: string): string => {
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

cloudinary.config({
	cloud_name: require_env(env.CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME'),
	api_key: require_env(env.CLOUDINARY_API_KEY, 'CLOUDINARY_API_KEY'),
	api_secret: require_env(env.CLOUDINARY_API_SECRET, 'CLOUDINARY_API_SECRET')
})

async function upload_cloudinary(file: File, folder: string) {
	const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB
	if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
		throw new Error('Invalid file size')
	}
	const array_buffer = await file.arrayBuffer()
	const buffer = Buffer.from(array_buffer)

	return new Promise<string>((resolve, reject) => {
		cloudinary.uploader
			.upload_stream({ folder }, (error, result) => {
				if (error || !result) {
					reject(error || new Error('Upload failed'))
					return
				}
				resolve(result.secure_url)
			})
			.end(buffer)
	})
}

export { cloudinary, upload_cloudinary }
