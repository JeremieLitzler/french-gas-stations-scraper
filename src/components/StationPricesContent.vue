<template>
  <div>
    <p v-if="showFetchSuccess" class="fetch-success" role="status">Récupération terminée.</p>
    <ul v-if="warnings.length > 0" class="station-warnings" aria-label="Avertissements de récupération des stations">
      <li v-for="warning in warnings" :key="warning.url" class="station-warning-item">
        Impossible de charger les prix pour <strong>{{ warning.stationName }}</strong> (<a
          :href="warning.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ warning.url }}</a
        >).
      </li>
    </ul>
    <template v-if="availableFuelTypes.length > 0">
      <div class="fuel-type-selector" role="group" aria-label="Sélecteur de type de carburant">
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
      <div class="default-fuel-actions">
        <span v-if="isCurrentDefault" class="default-indicator" aria-label="Ceci est votre carburant par défaut">Par défaut</span>
        <button
          v-if="showSaveDefault"
          type="button"
          class="default-fuel-button"
          @click="onSaveDefault"
        >
          Définir par défaut
        </button>
        <button
          v-if="showUpdateDefault"
          type="button"
          class="default-fuel-button"
          @click="onUpdateDefault"
        >
          Mettre à jour le défaut
        </button>
        <button
          v-if="showClearDefault"
          type="button"
          class="default-fuel-button"
          @click="onClearDefault"
        >
          Effacer le défaut
        </button>
      </div>
      <Table>
        <TableHeader>
          <TableRow :disable-hover="true">
            <TableHead>Nom de la station</TableHead>
            <TableHead>Prix</TableHead>
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
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { buildPriceRows, deriveFuelTypes, orderFuelTypes } from '@/utils/fuelTypeUtils'
import type { PriceRow } from '@/types/price-row'
import type { Station } from '@/types/station'

const SUCCESS_DISMISS_DELAY_MS = 3000

const { stations, loadStations } = useStationStorage()
const { results, warnings, fetchCompleted, loadAllStationPrices, removeStationPrice, addStationPrice, renameStation } = useStationPrices()
const { defaultFuelType, loadDefaultFuelType, saveDefaultFuelType, updateDefaultFuelType, clearDefaultFuelType } = useDefaultFuelType()

const showFetchSuccess = ref(false)
const selectedFuelType = ref('')
let dismissTimer: ReturnType<typeof setTimeout> | null = null
let isInitialized = false

const derivedFuelTypes = computed<string[]>(() => deriveFuelTypes(results.value))

/**
 * Cross-validates the stored default against the live derived list (security-guidelines.md rule 1).
 * The composable accepts any non-empty string from IndexedDB; the component is responsible
 * for checking the value against the currently available fuel types before treating it as valid.
 * Returns null when the stored default is absent from the derived list — without clearing
 * the persisted value (TC-15: stored default is left intact when fuel types change).
 */
const validatedDefaultFuelType = computed<string | null>(() => {
  const stored = defaultFuelType.value
  if (stored === null) return null
  return derivedFuelTypes.value.includes(stored) ? stored : null
})

const availableFuelTypes = computed<string[]>(() =>
  orderFuelTypes(derivedFuelTypes.value, validatedDefaultFuelType.value),
)

const priceRows = computed<PriceRow[]>(() => {
  if (selectedFuelType.value === '') return []
  return buildPriceRows(results.value, selectedFuelType.value)
})

const isCurrentDefault = computed<boolean>(
  () => validatedDefaultFuelType.value !== null && selectedFuelType.value === validatedDefaultFuelType.value,
)

/**
 * Button visibility matrix (business-specifications.md):
 *
 * | Condition                                       | Save | Update | Clear |
 * |-------------------------------------------------|------|--------|-------|
 * | No default stored                               |  ✓   |   —    |   —   |
 * | Default stored, selection = default             |  —   |   —    |   ✓   |
 * | Default stored, selection ≠ default             |  —   |   ✓    |   ✓   |
 */
const hasStoredDefault = computed<boolean>(() => defaultFuelType.value !== null)

const showSaveDefault = computed<boolean>(() => !hasStoredDefault.value)

const showUpdateDefault = computed<boolean>(
  () =>
    hasStoredDefault.value &&
    selectedFuelType.value !== '' &&
    selectedFuelType.value !== validatedDefaultFuelType.value,
)

const showClearDefault = computed<boolean>(() => hasStoredDefault.value)

function resolveInitialSelection(fuelTypes: string[]): string {
  if (fuelTypes.length === 0) return ''
  const validDefault = validatedDefaultFuelType.value
  if (validDefault !== null && fuelTypes.includes(validDefault)) return validDefault
  return fuelTypes[0]
}

watch(derivedFuelTypes, (fuelTypes: string[]) => {
  if (fuelTypes.includes(selectedFuelType.value)) return
  selectedFuelType.value = resolveInitialSelection(fuelTypes)
})

async function onSaveDefault(): Promise<void> {
  if (selectedFuelType.value === '') return
  await saveDefaultFuelType(selectedFuelType.value)
}

async function onUpdateDefault(): Promise<void> {
  if (selectedFuelType.value === '') return
  await updateDefaultFuelType(selectedFuelType.value)
}

async function onClearDefault(): Promise<void> {
  await clearDefaultFuelType()
}

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
await loadDefaultFuelType()
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

/*
 * .default-fuel-actions: Custom CSS required because Tailwind has no utility for
 * CSS custom properties used as design-token references. The layout itself
 * (flex, gap, margin) could use Tailwind, but keeping all button-group styles
 * in the same rule set avoids splitting related declarations across template
 * attributes and the style block.
 */
.default-fuel-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

/*
 * .default-indicator: Custom CSS required to apply the stone-200/stone-800
 * design tokens (var(--color-stone-200), var(--color-stone-800)) from the
 * business spec. Tailwind arbitrary-value syntax for CSS custom properties
 * is intentionally avoided to keep design-token references centralised in
 * the scoped style block.
 */
.default-indicator {
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  background-color: var(--color-stone-200);
  color: var(--color-stone-800);
  font-size: 0.75rem;
  font-weight: 600;
}

/*
 * .default-fuel-button: Custom CSS required because the button appearance relies
 * on CSS custom properties (var(--color-stone-200), var(--color-stone-800))
 * defined in the global design token stylesheet per business-specifications.md.
 * Tailwind's arbitrary-value syntax (e.g. bg-[var(--color-stone-200)]) is
 * intentionally avoided to keep design-token references centralised in the
 * scoped style block rather than scattered across template attributes.
 */
.default-fuel-button {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-stone-400);
  border-radius: 0.375rem;
  background-color: var(--color-stone-200);
  color: var(--color-stone-800);
  cursor: pointer;
  font-size: 0.875rem;
}
</style>
