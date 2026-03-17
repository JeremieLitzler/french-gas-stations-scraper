<template>
  <div class="flex flex-col w-full">
    <StationManager />
    <StationPrices />
  </div>
</template>

<script setup lang="ts">
import StationManager from '@/components/StationManager.vue'
import StationPrices from '@/components/StationPrices.vue'
</script>
