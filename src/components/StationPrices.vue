<template>
  <div class="station-prices">
    <h2 class="text-xl font-semibold mb-1">Prices</h2>
    <p class="mb-4">Change fuel type to your need</p>
    <AppLoader v-if="isLoading" />
    <p v-if="showFetchSuccess" class="fetch-success" role="status">
      Scraping complete.
    </p>
    <ul v-if="warnings.length > 0" class="station-warnings" aria-label="Station fetch warnings">
      <li v-for="warning in warnings" :key="warning.url" class="station-warning-item">
        Could not load prices for <strong>{{ warning.stationName }}</strong>
        (<a :href="warning.url" target="_blank" rel="noopener noreferrer">{{ warning.url }}</a>).
      </li>
    </ul>
    <template v-if="!isLoading && availableFuelTypes.length > 0">
      <div class="fuel-type-selector" role="group" aria-label="Fuel type selector">
        <button
          v-for="fuelType in availableFuelTypes"
          :key="fuelType"
          :class="['fuel-type-button', { active: fuelType === selectedFuelType }]"
          type="button"
          @click="selectedFuelType = fuelType"
        >
          {{ fuelType }}
        </button>
      </div>
      <Table>
        <TableHeader>
          <TableRow :disable-hover="true">
            <TableHead>Station Name</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in priceRows" :key="row.stationName" :disable-hover="true">
            <TableCell>{{ row.stationName }}</TableCell>
            <TableCell>{{ row.resolvedPrice !== null ? row.resolvedPrice : '—' }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppLoader from '@/components/AppLoader.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStationPrices } from '@/composables/useStationPrices'
import { useStationStorage } from '@/composables/useStationStorage'
import { buildPriceRows, deriveFuelTypes } from '@/utils/fuelTypeUtils'
import type { PriceRow } from '@/types'

const SUCCESS_DISMISS_DELAY_MS = 3000

const { stations, loadStations } = useStationStorage()
const { isLoading, results, warnings, fetchCompleted, loadAllStationPrices } = useStationPrices()

const showFetchSuccess = ref(false)
const selectedFuelType = ref('')
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const availableFuelTypes = computed<string[]>(() => deriveFuelTypes(results.value))

const priceRows = computed<PriceRow[]>(() => {
  if (selectedFuelType.value === '') return []
  return buildPriceRows(results.value, selectedFuelType.value)
})

watch(availableFuelTypes, (fuelTypes: string[]) => {
  selectedFuelType.value = fuelTypes[0] ?? ''
})

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
  margin: 1rem 0;
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

.fuel-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.fuel-type-button {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--cta-light);
  border-radius: 0.375rem;
  background-color: var(--cta-lighter);
  color: var(--cta-neutral-dark);
  cursor: pointer;
  font-size: 0.875rem;
}

.fuel-type-button.active {
  background-color: var(--cta-base);
  color: var(--cta-neutral-light);
  border-color: var(--cta-darker);
}

</style>
