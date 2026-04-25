import adapter from '@sveltejs/adapter-vercel'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'base-uri': ['self'],
				'object-src': ['none'],
				'frame-ancestors': ['none'],
				'form-action': ['self'],
				'script-src': ['self'],
				'style-src': ['self'],
				'img-src': [
					'self',
					'data:',
					'blob:',
					'https://res.cloudinary.com',
					'https://images.unsplash.com'
				],
				'font-src': ['self', 'data:'],
				'connect-src': ['self']
			}
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
}

export default config
