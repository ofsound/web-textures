import { randomUUID } from 'node:crypto'

export default defineEventHandler((event) => {
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'Permissions-Policy', 'geolocation=(), camera=(), microphone=()')

  // CSP is for HTML documents only; API routes (e.g. /api/auth/session) must not get a strict
  // script-src meant for pages, and the nonce rewriter only runs for text/html responses.
  const path = event.path ?? ''
  if (path.startsWith('/api/')) {
    return
  }

  const nonce = randomUUID().replace(/-/g, '')
  event.context.cspNonce = nonce

  setHeader(
    event,
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // strict-dynamic: scripts created by a nonce-bearing script are allowed (helps Nuxt chunks)
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  )
})
