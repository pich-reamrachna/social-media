import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sveltekit } from '@sveltejs/kit/vite'

const local_chrome_path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser_executable_path =
	typeof process !== 'undefined' && process.env.VITEST_BROWSER_EXECUTABLE_PATH
		? process.env.VITEST_BROWSER_EXECUTABLE_PATH
		: process.platform === 'win32' && existsSync(local_chrome_path)
			? local_chrome_path
			: undefined

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(
							browser_executable_path
								? {
										launchOptions: {
											executablePath: browser_executable_path
										}
									}
								: {}
						),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
})
