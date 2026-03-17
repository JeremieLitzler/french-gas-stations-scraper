<template>
  <Suspense>
    <div class="flex flex-col w-full">
      <StationPrices />
      <StationManager />
    </div>
    <template #fallback>
      <AppLoader />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import AppLoader from '@/components/AppLoader.vue'
import StationManager from '@/components/StationManager.vue'
import StationPrices from '@/components/StationPrices.vue'
</script>
