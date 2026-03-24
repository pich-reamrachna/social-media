import prettier from 'eslint-config-prettier'
import path from 'node:path'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import ts from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

const gitignore_path = path.resolve(import.meta.dirname, '.gitignore')

export default defineConfig(
	includeIgnoreFile(gitignore_path),
	{
		ignores: [
			'src/app.d.ts',
			'*.config.{ts,js,cjs,mjs}',
			'src/routes/**/+layout.svelte',
			'src/routes/**/+layout.ts',
			'src/routes/demo/**/+page.svelte',
			'src/hooks.ts'
		]
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'no-var': 'error',
			'prefer-const': 'error',
			'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
			'no-debugger': 'error',
			complexity: ['error', 20],
			'max-depth': ['error', 3],
			'no-commented-code/no-commented-code': 'warn',
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Literal[value=null]',
					message: 'Use undefined instead of null.'
				}
			],
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variable',
					format: ['snake_case', 'UPPER_CASE'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				},
				{
					selector: 'function',
					format: ['snake_case'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	}
)
