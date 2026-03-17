<template>
  <div class="station-prices">
    <h2>Prices</h2>
    <AppLoader v-if="isLoading" css-class="fetch-loader" />
    <p v-if="showFetchSuccess" class="fetch-success" role="status">
      Scraping complete.
    </p>
    <ul v-if="warnings.length > 0" class="station-warnings" aria-label="Station fetch warnings">
      <li v-for="warning in warnings" :key="warning.url" class="station-warning-item">
        Could not load prices for <strong>{{ warning.stationName }}</strong>
        (<a :href="warning.url" target="_blank" rel="noopener noreferrer">{{ warning.url }}</a>).
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import AppLoader from '@/components/AppLoader.vue'
import { useStationPrices } from '@/composables/useStationPrices'
import { useStationStorage } from '@/composables/useStationStorage'

const SUCCESS_DISMISS_DELAY_MS = 3000

const { stations, loadStations } = useStationStorage()
const { isLoading, warnings, fetchCompleted, loadAllStationPrices } = useStationPrices()

const showFetchSuccess = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

function clearDismissTimer(): void {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function scheduleDismiss(): void {
  clearDismissTimer()
  dismissTimer = setTimeout(() => {
    showFetchSuccess.value = false
    dismissTimer = null
  }, SUCCESS_DISMISS_DELAY_MS)
}

watch(fetchCompleted, (completed) => {
  if (!completed) {
    showFetchSuccess.value = false
    clearDismissTimer()
    return
  }
  showFetchSuccess.value = true
  scheduleDismiss()
})

onMounted(async () => {
  await loadStations();
  await loadAllStationPrices(stations.value)
})

onUnmounted(() => {
  clearDismissTimer()
})
</script>

<style scoped>
.station-prices {
  margin-top: 1rem;
}

.fetch-success {
  font-size: 0.875rem;
  color: #16a34a;
  margin-bottom: 0.5rem;
}

.station-warnings {
  padding: 0;
  list-style: none;
}

.station-warning-item {
  font-size: 0.875rem;
  color: #b45309;
  padding: 0.25rem 0;
}
</style>
