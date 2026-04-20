import CredentialsProvider from '@auth/core/providers/credentials'
import { NuxtAuthHandler } from '#auth'
import { resolveAdminEmailsList, resolveAdminPassword, resolveAuthSecret } from '~~/server/utils/admin-env'

export default NuxtAuthHandler({
  // Getter: read env each request so Cloudflare bindings are not captured only at module load.
  get secret() {
    return resolveAuthSecret()
  },
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
    jwt({ token, user }) {
      if (user && typeof user.email === 'string') {
        token.email = user.email
        token.name = typeof user.name === 'string' ? user.name : token.name
        if (user.id != null) {
          token.sub = String(user.id)
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token && typeof token.email === 'string') {
        session.user.email = token.email
      }

      return session
    }
  }
})
