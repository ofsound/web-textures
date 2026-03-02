import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createError } from 'h3'
import * as schema from '~~/server/db/schema'

let pool: Pool | null = null

export function hasDatabaseConnection(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'DATABASE_URL is not configured' })
  }

  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 5 })
  }

  return drizzle(pool, { schema })
}
