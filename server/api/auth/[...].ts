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
        const email = typeof credentials?.email === 'string' ? credentials.email : ''
        const submittedPassword = typeof credentials?.password === 'string' ? credentials.password : ''

        if (!email || !submittedPassword) {
          return null
        }

        const allowlist = resolveAdminEmailsList()

        const password = resolveAdminPassword()

        if (!allowlist.includes(email.toLowerCase())) {
          return null
        }

        if (submittedPassword !== password) {
          return null
        }

        return {
          id: email.toLowerCase(),
          email: email.toLowerCase(),
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
