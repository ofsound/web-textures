import { useRuntimeConfig } from '#imports'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createError } from 'h3'
import * as schema from '~~/server/db/schema'

let pool: Pool | null = null

/** Resolve DB URL from Nuxt runtime config first (Cloudflare), then plain env (CLI / Drizzle). */
function resolveDatabaseUrl(): string | undefined {
  try {
    const fromRuntime = useRuntimeConfig().databaseUrl
    if (typeof fromRuntime === 'string' && fromRuntime.trim()) {
      return fromRuntime.trim()
    }
  } catch {
    // Not in a Nuxt/Nitro context (e.g. some tooling imports this file).
  }
  const fromEnv =
    process.env.NUXT_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim()
  return fromEnv || undefined
}

export function hasDatabaseConnection(): boolean {
  return Boolean(resolveDatabaseUrl())
}

export function getDatabase() {
  const databaseUrl = resolveDatabaseUrl()

  if (!databaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'DATABASE_URL is not configured' })
  }

  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 5 })
  }

  return drizzle(pool, { schema })
}
