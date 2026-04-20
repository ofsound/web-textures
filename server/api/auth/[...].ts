import CredentialsProvider from '@auth/core/providers/credentials'
import { NuxtAuthHandler } from '#auth'
import { createError, eventHandler } from 'h3'
import { resolveAdminEmailsList, resolveAdminPassword, resolveAuthSecret } from '~~/server/utils/admin-env'
import { decodeAuthJwt, encodeAuthJwt } from '~~/server/utils/auth-jwt'

function createAuthHandler(secret: string) {
  return NuxtAuthHandler({
    // Resolve secret during the request lifecycle so Cloudflare runtime bindings are available.
    secret,
    pages: {
      signIn: '/login'
    },
    providers: [
      CredentialsProvider({
        name: 'TextureLab Admin',
        credentials: {
          email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
          password: { label: 'Password', type: 'password' }
        },
        authorize(credentials) {
          const raw =
            credentials && typeof credentials === 'object'
              ? (credentials as Record<string, unknown>)
              : {}
          const emailRaw =
            (typeof raw.email === 'string' ? raw.email : '') ||
            (typeof raw.username === 'string' ? raw.username : '')
          const email = emailRaw.trim().toLowerCase()
          const submittedPassword =
            typeof raw.password === 'string' ? raw.password.trim() : ''

          if (!email || !submittedPassword) {
            return null
          }

          const allowlist = resolveAdminEmailsList()
          const password = resolveAdminPassword().trim()

          if (!allowlist.includes(email)) {
            return null
          }

          if (submittedPassword !== password) {
            return null
          }

          return {
            id: email,
            email,
            name: 'TextureLab Admin'
          }
        }
      }) as never
    ],
    callbacks: {
      session({ session, token }) {
        if (session.user && token && typeof token.email === 'string') {
          session.user.email = token.email
        }

        return session
      }
    },
    jwt: {
      encode: encodeAuthJwt,
      decode: decodeAuthJwt
    }
  })
}

let authHandler: ReturnType<typeof createAuthHandler> | null = null

export default eventHandler(async (event) => {
  if (!authHandler) {
    const secret = resolveAuthSecret()
    if (!secret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Auth misconfigured: missing NUXT_AUTH_SECRET'
      })
    }
    authHandler = createAuthHandler(secret)
  }

  return authHandler(event)
})
