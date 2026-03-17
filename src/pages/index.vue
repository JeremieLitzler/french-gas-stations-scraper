<template>
  <StationManager />
  <AppLoader v-if="isLoading" css-class="fetch-loader" />
  <ul v-if="warnings.length > 0" class="station-warnings" aria-label="Station fetch warnings">
    <li v-for="warning in warnings" :key="warning.url" class="station-warning-item">
      Could not load prices for <strong>{{ warning.stationName }}</strong>
      (<a :href="warning.url" target="_blank" rel="noopener noreferrer">{{ warning.url }}</a>).
    </li>
  </ul>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import StationManager from '@/components/StationManager.vue'
import AppLoader from '@/components/AppLoader.vue'
import { useStationPrices } from '@/composables/useStationPrices'

const { isLoading, warnings, loadAllStationPrices } = useStationPrices()

onMounted(async () => {
  await loadAllStationPrices()
})
</script>

<style scoped>
.station-warnings {
  margin-top: 1rem;
  padding: 0;
  list-style: none;
}

.station-warning-item {
  font-size: 0.875rem;
  color: #b45309;
  padding: 0.25rem 0;
}
</style>
