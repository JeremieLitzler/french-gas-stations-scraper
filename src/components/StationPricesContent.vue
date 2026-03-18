<template>
  <div>
    <p v-if="showFetchSuccess" class="fetch-success" role="status">Scraping complete.</p>
    <ul v-if="warnings.length > 0" class="station-warnings" aria-label="Station fetch warnings">
      <li v-for="warning in warnings" :key="warning.url" class="station-warning-item">
        Could not load prices for <strong>{{ warning.stationName }}</strong> (<a
          :href="warning.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ warning.url }}</a
        >).
      </li>
    </ul>
    <template v-if="availableFuelTypes.length > 0">
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

<script async setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
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
import type { PriceRow } from '@/types/price-row'
import type { Station } from '@/types/station'

const SUCCESS_DISMISS_DELAY_MS = 3000

const { stations, loadStations } = useStationStorage()
const { results, warnings, fetchCompleted, loadAllStationPrices, removeStationPrice, addStationPrice, renameStation } = useStationPrices()

const showFetchSuccess = ref(false)
const selectedFuelType = ref('')
let dismissTimer: ReturnType<typeof setTimeout> | null = null
let isInitialized = false

const availableFuelTypes = computed<string[]>(() => deriveFuelTypes(results.value))

const priceRows = computed<PriceRow[]>(() => {
  if (selectedFuelType.value === '') return []
  return buildPriceRows(results.value, selectedFuelType.value)
})

watch(availableFuelTypes, (fuelTypes: string[]) => {
  if (fuelTypes.includes(selectedFuelType.value)) return
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

function indexByUrl(stationList: Station[]): Map<string, Station> {
  const map = new Map<string, Station>()
  for (const station of stationList) {
    map.set(station.url, station)
  }
  return map
}

function applyRemovals(oldByUrl: Map<string, Station>, newByUrl: Map<string, Station>): void {
  for (const [url] of oldByUrl) {
    if (!newByUrl.has(url)) removeStationPrice(url)
  }
}

function applyAdditionOrRename(
  url: string,
  station: Station,
  oldByUrl: Map<string, Station>,
): void {
  if (!oldByUrl.has(url)) {
    addStationPrice(station)
    return
  }
  const previousStation = oldByUrl.get(url) as Station
  if (previousStation.name !== station.name) renameStation(url, station.name)
}

function applyStationListChange(newStations: Station[], oldStations: Station[]): void {
  const oldByUrl = indexByUrl(oldStations)
  const newByUrl = indexByUrl(newStations)
  applyRemovals(oldByUrl, newByUrl)
  for (const [url, station] of newByUrl) {
    applyAdditionOrRename(url, station, oldByUrl)
  }
}

watch(stations, (newStations: Station[], oldStations: Station[]) => {
  if (!isInitialized) return
  applyStationListChange(newStations, oldStations)
})

await loadStations()
await loadAllStationPrices(stations.value)
isInitialized = true

onUnmounted(() => {
  clearDismissTimer()
})
</script>

<style scoped>
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
