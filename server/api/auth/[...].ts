import CredentialsProvider from '@auth/core/providers/credentials'
import { NuxtAuthHandler } from '#auth'
import { resolveAdminEmailsList, resolveAdminPassword, resolveAuthSecret } from '~~/server/utils/admin-env'

export default NuxtAuthHandler({
  // Sidebase reads `secret` once at init; resolve here (env + runtimeConfig) for Workers.
  secret: resolveAuthSecret(),
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
  }
})
