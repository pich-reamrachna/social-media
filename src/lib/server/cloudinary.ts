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

export { cloudinary }
