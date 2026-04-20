import { useRuntimeConfig } from '#imports'
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres'
import { neon } from '@neondatabase/serverless'
import { Pool } from 'pg'
import { createError } from 'h3'
import * as schema from '~~/server/db/schema'

type Database = ReturnType<typeof drizzleNodePg>

let pool: Pool | null = null
let neonDb: Database | null = null
let nodePgDb: Database | null = null

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

function shouldUseNeonHttp(databaseUrl: string): boolean {
  return /(?:^|\/\/).*neon\.tech(?:[:/?]|$)/i.test(databaseUrl)
}

export function getDatabase() {
  const databaseUrl = resolveDatabaseUrl()

  if (!databaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'DATABASE_URL is not configured' })
  }

  if (shouldUseNeonHttp(databaseUrl)) {
    if (!neonDb) {
      neonDb = drizzleNeonHttp(neon(databaseUrl), { schema }) as unknown as Database
    }

    return neonDb
  }

  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 5 })
  }

  if (!nodePgDb) {
    nodePgDb = drizzleNodePg(pool, { schema })
  }

  return nodePgDb
}
