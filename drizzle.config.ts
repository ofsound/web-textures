import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { defineConfig } from 'drizzle-kit'

for (const fileName of ['.env.local', '.env']) {
  const filePath = resolve(process.cwd(), fileName)
  if (existsSync(filePath)) {
    loadEnvFile(filePath)
  }
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Add it to .env or .env.local before running Drizzle commands.')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl
  },
  verbose: true,
  strict: true
})
