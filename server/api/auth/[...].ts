import CredentialsProvider from '@auth/core/providers/credentials'
import { useRuntimeConfig } from '#imports'
import { NuxtAuthHandler } from '#auth'

const runtimeConfig = useRuntimeConfig()

export default NuxtAuthHandler({
  // Use runtimeConfig (not raw process.env) so Cloudflare / Nitro can inject secrets at runtime.
  secret: runtimeConfig.authSecret as string,
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
        const config = useRuntimeConfig()
        const email = typeof credentials?.email === 'string' ? credentials.email : ''
        const submittedPassword = typeof credentials?.password === 'string' ? credentials.password : ''

        if (!email || !submittedPassword) {
          return null
        }

        const allowlist = String(config.adminEmails ?? '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)

        const password = String(config.adminPassword ?? '')

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
