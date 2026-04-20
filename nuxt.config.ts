import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Resolve public auth base URL at build time so it can be written into `wrangler.json` `vars`. */
function wranglerPlaintextAuthOrigin(): Record<string, string> | undefined {
  const explicit = process.env.NUXT_AUTH_ORIGIN?.trim()
  const site = process.env.NUXT_PUBLIC_SITE_URL?.trim()
  const cf = process.env.CF_PAGES
  const onCfPages = cf === 'true' || cf === '1' || String(cf).toLowerCase() === 'true'
  const pagesUrl = process.env.CF_PAGES_URL?.trim()

  let v =
    explicit ||
    (site ? `${site.replace(/\/$/, '')}/api/auth` : '') ||
    (onCfPages && pagesUrl ? `${pagesUrl.replace(/\/$/, '')}/api/auth` : '')

  if (!v) {
    return undefined
  }
  v = v.replace(/\/$/, '')
  if (!v.endsWith('/api/auth')) {
    v = `${v}/api/auth`
  }
  return { NUXT_AUTH_ORIGIN: v }
}

const cfAuthVars = wranglerPlaintextAuthOrigin()

export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@sidebase/nuxt-auth', './nuxt-modules/auth-public-base-url'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    authSecret: process.env.NUXT_AUTH_SECRET,
    adminEmails: process.env.NUXT_ADMIN_EMAILS,
    adminPassword: process.env.NUXT_ADMIN_PASSWORD,
    public: {
      appName: 'TextureLab',
      /** Canonical browser origin (no path); optional auth base is derived in `nuxt-modules/auth-public-base-url` */
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL
    }
  },
  auth: {
    provider: {
      type: 'authjs',
      // Custom host (e.g. svg.ofsound.net) + Cloudflare: use forwarded Host/Proto for Auth.js
      trustHost: true
    },
    // Default module key is AUTH_ORIGIN; align with Nuxt-style NUXT_AUTH_ORIGIN in .env
    originEnvKey: 'NUXT_AUTH_ORIGIN',
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
      nodeCompat: true,
      // Bakes `NUXT_AUTH_ORIGIN` into wrangler `vars` when it can be resolved at build time
      // (helps Sidebase `assertOrigin` during the upload-time worker run).
      wrangler: {
        ...(cfAuthVars ? { vars: cfAuthVars } : {})
      }
    }
  }
})
