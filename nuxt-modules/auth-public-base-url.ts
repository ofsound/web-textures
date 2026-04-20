import { defineNuxtModule } from '@nuxt/kit'

/**
 * Sidebase reads `NUXT_AUTH_ORIGIN` / `AUTH_ORIGIN` directly in `resolveApiBaseURL`. If the value
 * is only an origin (no `/api/auth`), `returnOnlyPathname` becomes `/` and session fetches hit
 * `/session` instead of `/api/auth/session`. Normalize env so Sidebase always sees the full base.
 */
function normalizeAuthOriginEnvVars() {
  for (const key of ['NUXT_AUTH_ORIGIN', 'AUTH_ORIGIN'] as const) {
    const raw = process.env[key]
    if (!raw || typeof raw !== 'string') {
      continue
    }
    const trimmed = raw.trim().replace(/\/$/, '')
    if (trimmed && !trimmed.endsWith('/api/auth')) {
      process.env[key] = `${trimmed}/api/auth`
    }
  }
}

/**
 * Absolute auth URL for Sidebase `resolveApiBaseURL(..., false)` / assertOrigin — must come from
 * env, not `public.auth.baseURL`. NextAuth receives `basePath` from `public.auth.baseURL` and
 * expects a pathname only (e.g. `/api/auth`). Setting an absolute URL there breaks `/session`.
 */
function ensureSyntheticAuthOrigin() {
  if (process.env.NUXT_AUTH_ORIGIN || process.env.AUTH_ORIGIN) {
    return
  }
  const site = process.env.NUXT_PUBLIC_SITE_URL?.trim()
  if (site) {
    process.env.NUXT_AUTH_ORIGIN = `${site.replace(/\/$/, '')}/api/auth`
    return
  }
  const cf = process.env.CF_PAGES
  const onCfPages = cf === 'true' || cf === '1' || String(cf).toLowerCase() === 'true'
  const pagesUrl = process.env.CF_PAGES_URL?.trim()
  if (onCfPages && pagesUrl) {
    process.env.NUXT_AUTH_ORIGIN = `${pagesUrl.replace(/\/$/, '')}/api/auth`
  }
}

export default defineNuxtModule({
  meta: { name: 'auth-public-base-url' },
  setup() {
    normalizeAuthOriginEnvVars()
    ensureSyntheticAuthOrigin()
  }
})
