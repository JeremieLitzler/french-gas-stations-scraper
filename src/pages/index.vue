<template>
  <div class="flex flex-col w-full">
    <StationPrices />
    <StationManager />
  </div>
</template>

<script setup lang="ts">
import StationManager from '@/components/StationManager.vue'
import StationPrices from '@/components/StationPrices.vue'
</script>
