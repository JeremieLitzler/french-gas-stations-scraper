<template>
  <div class="flex flex-col w-full">
    <h1 class="text-2xl font-bold mb-4 text-center">Coup de pompe</h1>
    <h2 class="text-xl font-bold mb-4 text-center">
      Comparez les prix des carburants dans vos stations préférées.
    </h2>
    <StationPrices />
    <StationManager />
  </div>
</template>

<script setup lang="ts">
import StationManager from '@/components/StationManager.vue'
import StationPrices from '@/components/StationPrices.vue'
</script>
