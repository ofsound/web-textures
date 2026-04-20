import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Sidebase nuxt-auth runs `assertOrigin` at Nitro startup (no request yet). In production it
 * requires an absolute auth base URL (protocol + host). Cloudflare deploy validation runs the
 * worker the same way, so rely on explicit env or CF Pages build vars.
 *
 * @see https://sidebase.io/nuxt-auth/resources/errors
 */
function resolveAuthBaseUrl(): string | undefined {
  const raw = process.env.NUXT_AUTH_ORIGIN || process.env.AUTH_ORIGIN
  if (raw) {
    const trimmed = raw.replace(/\/$/, '')
    return trimmed.endsWith('/api/auth') ? trimmed : `${trimmed}/api/auth`
  }
  if (process.env.CF_PAGES && process.env.CF_PAGES_URL) {
    return `${process.env.CF_PAGES_URL.replace(/\/$/, '')}/api/auth`
  }
  return undefined
}

const authBaseUrl = resolveAuthBaseUrl()

export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@sidebase/nuxt-auth'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    authSecret: process.env.NUXT_AUTH_SECRET,
    adminEmails: process.env.NUXT_ADMIN_EMAILS,
    adminPassword: process.env.NUXT_ADMIN_PASSWORD,
    public: {
      appName: 'TextureLab'
    }
  },
  auth: {
    provider: {
      type: 'authjs'
    },
    // Default module key is AUTH_ORIGIN; align with Nuxt-style NUXT_AUTH_ORIGIN in .env
    originEnvKey: 'NUXT_AUTH_ORIGIN',
    ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
    sessionRefresh: {
      enableOnWindowFocus: true,
      enablePeriodically: false
    }
  },
  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  },
  // Cloudflare Workers/Pages: pure-js `pg` still references optional `pg-native`;
  // Nitro must enable node compat + generated wrangler flags or the bundle fails.
  nitro: {
    alias: {
      'pg-native': resolve(__dirname, 'server/db/pg-native-stub.cjs')
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  }
})
