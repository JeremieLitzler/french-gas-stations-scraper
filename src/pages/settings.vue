<template>
  <div class="flex flex-col w-full">
    <RouterLink
      to="/"
      class="fixed top-4 left-4 z-10 inline-flex items-center bg-white border border-gray-300 rounded-full px-3 py-1 text-sm shadow hover:bg-gray-50"
    >
      ← Accueil
    </RouterLink>

    <div class="max-w-2xl mx-auto px-4 py-8 pt-16 w-full">
      <h1 class="text-2xl font-bold mb-4 text-center">Paramètres</h1>
      <Suspense>
        <GitHubSyncSettings />
        <template #fallback>
          <AppLoader />
        </template>
      </Suspense>
    </div>
  </div>
</template>

<script setup lang="ts">
import GitHubSyncSettings from '@/components/GitHubSyncSettings.vue'
</script>
