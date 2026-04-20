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

function resolveAuthBaseUrl(): string | undefined {
  const raw = process.env.NUXT_AUTH_ORIGIN || process.env.AUTH_ORIGIN
  if (raw) {
    const trimmed = raw.trim().replace(/\/$/, '')
    return trimmed.endsWith('/api/auth') ? trimmed : `${trimmed}/api/auth`
  }
  const site = process.env.NUXT_PUBLIC_SITE_URL
  if (site) {
    return `${site.replace(/\/$/, '')}/api/auth`
  }
  const cf = process.env.CF_PAGES
  const onCfPages = cf === 'true' || cf === '1' || String(cf).toLowerCase() === 'true'
  const pagesUrl = process.env.CF_PAGES_URL
  if (onCfPages && pagesUrl) {
    return `${pagesUrl.replace(/\/$/, '')}/api/auth`
  }
  return undefined
}

/**
 * @sidebase/nuxt-auth merges `topLevelDefaults` after user `auth` config, so `auth.baseURL` in
 * `nuxt.config` is overwritten by `/api/auth`. Patch `runtimeConfig.public.auth.baseURL` after
 * the auth module runs so production / Cloudflare deploy validation see an absolute URL.
 */
export default defineNuxtModule({
  meta: { name: 'auth-public-base-url' },
  setup(_options, nuxt) {
    normalizeAuthOriginEnvVars()
    const base = resolveAuthBaseUrl()
    if (!base) {
      return
    }
    const auth = nuxt.options.runtimeConfig.public?.auth as { baseURL?: string } | undefined
    if (auth && typeof auth === 'object') {
      auth.baseURL = base
    }
  }
})
