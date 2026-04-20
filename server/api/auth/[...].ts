import CredentialsProvider from '@auth/core/providers/credentials'
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  secret: process.env.NUXT_AUTH_SECRET,
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

        const allowlist = String(process.env.NUXT_ADMIN_EMAILS ?? '')
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)

        const password = String(process.env.NUXT_ADMIN_PASSWORD ?? '')

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
