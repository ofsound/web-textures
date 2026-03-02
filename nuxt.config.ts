export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@sidebase/nuxt-auth'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    authSecret: process.env.NUXT_AUTH_SECRET,
    adminEmails: process.env.NUXT_ADMIN_EMAILS,
    adminPassword: process.env.NUXT_ADMIN_PASSWORD,
    public: {
      appName: 'TextureLab'
    }
  },
  auth: {
    provider: {
      type: 'authjs'
    },
    sessionRefresh: {
      enableOnWindowFocus: true,
      enablePeriodically: false
    }
  },
  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
})
