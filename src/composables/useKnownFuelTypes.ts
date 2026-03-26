/**
 * Composable that derives the set of known fuel type strings from station
 * fetch results. Accepts the results list from useStationPrices as input and
 * exposes a reactive computed list. Does not perform network calls itself.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception.
 */

import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { StationData } from '@/types/station-data'
import { deriveFuelTypes } from '@/utils/fuelTypeUtils'

export function useKnownFuelTypes(results: MaybeRefOrGetter<StationData[]>) {
  const knownFuelTypes = computed<string[]>(() => deriveFuelTypes(toValue(results)))

  return { knownFuelTypes }
}
