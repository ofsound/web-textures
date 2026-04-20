<script setup lang="ts">
const email = ref('')
const password = ref('')
const errorText = ref('')

const { signIn, status } = useAuth()

async function submit() {
  errorText.value = ''

  try {
    const result = await signIn('credentials', {
      email: email.value,
      password: password.value,
      redirect: false
    })

    if (result?.error) {
      errorText.value = 'Invalid credentials'
      return
    }

    await navigateTo('/admin')
  } catch {
    // e.g. auth POST 500 + malformed client handling in useAuth, or network failure
    errorText.value = 'Sign-in failed (server error). Try again or check deployment logs.'
  }
}
</script>

<template>
  <section class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-panel">
    <h2 class="mb-4 text-xl font-semibold">Admin Sign In</h2>

    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Email</span>
        <input v-model="email" type="email" class="w-full rounded-lg border border-slate-300 px-3 py-2" required />
      </label>

      <label class="block text-sm">
        <span class="mb-1 block font-medium">Password</span>
        <input v-model="password" type="password" class="w-full rounded-lg border border-slate-300 px-3 py-2" required />
      </label>

      <button type="submit" class="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
        {{ status === 'loading' ? 'Signing in...' : 'Sign in' }}
      </button>

      <p v-if="errorText" class="text-sm text-rose-600">{{ errorText }}</p>
    </form>
  </section>
</template>
