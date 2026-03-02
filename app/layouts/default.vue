<script setup lang="ts">
const route = useRoute()

const links = [
  { label: 'Textures', to: '/' },
  { label: 'Test View', to: '/test' },
  { label: 'Admin', to: '/admin' }
]
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="mb-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-panel backdrop-blur-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">TextureLab</h1>
          <p class="text-sm text-slate-600">Portable CSS/SVG texture authoring and showcase</p>
        </div>
        <nav class="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
            :class="route.path === link.to ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
