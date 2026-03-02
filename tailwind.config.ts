import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue'
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f6f3',
        ink: '#1b1f22',
        accent: '#076a8c',
        accentSoft: '#d8eef5'
      },
      boxShadow: {
        panel: '0 10px 30px rgba(10, 14, 20, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config
