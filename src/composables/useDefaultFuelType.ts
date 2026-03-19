/**
 * Singleton composable for persisting the user's preferred default fuel type.
 *
 * The reactive default is declared at module level so all consumers share the
 * same reference (ADR-002 singleton pattern).
 *
 * Persistence is handled via the thin IndexedDB wrapper (ADR-008).
 * Only plain strings are stored; every value read back is validated before use
 * (security-guidelines.md rules 1 and 3).
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import { get, set, del } from '@/utils/indexedDb'

const DEFAULT_FUEL_TYPE_KEY = 'defaultFuelType'

// Module-level ref — all consumers share the same reactive state (ADR-002).
const defaultFuelType: Ref<string | null> = ref(null)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function useDefaultFuelType() {
  const loadDefaultFuelType = async (): Promise<void> => {
    const stored = await get<unknown>(DEFAULT_FUEL_TYPE_KEY)
    if (!isNonEmptyString(stored)) {
      defaultFuelType.value = null
      return
    }
    defaultFuelType.value = stored
  }

  const saveDefaultFuelType = async (label: string): Promise<void> => {
    await set(DEFAULT_FUEL_TYPE_KEY, label)
    defaultFuelType.value = label
  }

  const updateDefaultFuelType = async (label: string): Promise<void> => {
    await set(DEFAULT_FUEL_TYPE_KEY, label)
    defaultFuelType.value = label
  }

  const clearDefaultFuelType = async (): Promise<void> => {
    await del(DEFAULT_FUEL_TYPE_KEY)
    defaultFuelType.value = null
  }

  return {
    defaultFuelType,
    loadDefaultFuelType,
    saveDefaultFuelType,
    updateDefaultFuelType,
    clearDefaultFuelType,
  }
}
