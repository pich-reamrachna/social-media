import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error('DATABASE_URL_MIGRATION or DATABASE_URL must be set')
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
})
