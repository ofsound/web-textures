import { useRuntimeConfig } from '#imports'

/**
 * Prefer `process.env` first: on Cloudflare Workers, bindings are often visible here before
 * or without the same values on `useRuntimeConfig()` (especially at module load).
 */
function envAuthSecret(): string {
  return (
    process.env.NUXT_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ''
  )
}

function envAdminEmailsRaw(): string {
  return process.env.NUXT_ADMIN_EMAILS?.trim() || process.env.ADMIN_EMAILS?.trim() || ''
}

function envAdminPassword(): string {
  return process.env.NUXT_ADMIN_PASSWORD?.trim() || process.env.ADMIN_PASSWORD?.trim() || ''
}

export function resolveAuthSecret(): string {
  const fromEnv = envAuthSecret()
  if (fromEnv) {
    return fromEnv
  }
  try {
    const s = useRuntimeConfig().authSecret
    if (typeof s === 'string' && s.trim()) {
      return s.trim()
    }
  } catch {
    /* outside Nitro */
  }
  return ''
}

export function resolveAdminEmailsList(): string[] {
  const pieces: string[] = []
  const fromEnv = envAdminEmailsRaw()
  if (fromEnv) {
    pieces.push(fromEnv)
  }
  try {
    const raw = String(useRuntimeConfig().adminEmails ?? '').trim()
    if (raw) {
      pieces.push(raw)
    }
  } catch {
    /* outside Nitro */
  }
  const merged = pieces.join(',')
  const list = merged
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(list)]
}

export function resolveAdminPassword(): string {
  const fromEnv = envAdminPassword()
  if (fromEnv) {
    return fromEnv
  }
  try {
    const p = useRuntimeConfig().adminPassword
    if (typeof p === 'string' && p.length > 0) {
      return p
    }
  } catch {
    /* outside Nitro */
  }
  return ''
}
