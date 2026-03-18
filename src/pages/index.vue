<template>
  <div class="flex flex-col w-full">
    <Suspense>
      <StationPrices />
      <template #fallback-prices>
        <AppLoader />
      </template>
    </Suspense>
    <Suspense>
      <StationManager />
      <template #fallback-manager>
        <AppLoader />
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import AppLoader from '@/components/AppLoader.vue'
import StationManager from '@/components/StationManager.vue'
import StationPrices from '@/components/StationPrices.vue'
</script>
