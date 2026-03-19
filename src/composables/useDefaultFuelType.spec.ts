/**
 * Tests for useDefaultFuelType composable — Issue #28.
 *
 * useDefaultFuelType is a singleton composable (ADR-002): the module-level ref
 * is shared across all consumers. vi.resetModules() + dynamic import() is used
 * to get a fresh module instance (and therefore fresh reactive state) for each
 * test.
 *
 * IndexedDB is mocked with an in-memory Map via vi.mock, following the pattern
 * established in useStationStorage.spec.ts.
 *
 * Scenarios covered:
 *   TC-06  — saveDefaultFuelType persists and reflects the label in reactive state
 *   TC-09  — loadDefaultFuelType reads a stored value and sets defaultFuelType
 *   TC-10  — loadDefaultFuelType sets defaultFuelType to null when nothing is stored
 *   TC-11  — loadDefaultFuelType sets defaultFuelType to null when the stored value is absent
 *            (not present in the derived list — validated at component level, not here)
 *   TC-16  — corrupted (non-string) IndexedDB value is rejected; defaultFuelType stays null
 *   TC-18  — saveDefaultFuelType writes a plain string to IndexedDB, not an object
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

const store = new Map<string, unknown>()

vi.mock('@/utils/indexedDb', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve()
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useDefaultFuelType')
  return mod.useDefaultFuelType()
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// TC-06 — "Save as default" stores the selected fuel type
// ---------------------------------------------------------------------------

describe('TC-06: saveDefaultFuelType persists the label and updates reactive state', () => {
  it('sets defaultFuelType.value to the saved label and writes it to IndexedDB', async () => {
    const { defaultFuelType, saveDefaultFuelType } = await freshComposable()

    expect(defaultFuelType.value).toBeNull()

    await saveDefaultFuelType('SP95')

    expect(defaultFuelType.value).toBe('SP95')
    expect(store.get('defaultFuelType')).toBe('SP95')
  })
})

// ---------------------------------------------------------------------------
// TC-09 — Stored default is pre-selected when the price view loads
// ---------------------------------------------------------------------------

describe('TC-09: loadDefaultFuelType reads the stored value into defaultFuelType', () => {
  it('sets defaultFuelType.value to the stored string after loading', async () => {
    store.set('defaultFuelType', 'Gasoil')

    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()

    expect(defaultFuelType.value).toBeNull()

    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBe('Gasoil')
  })
})

// ---------------------------------------------------------------------------
// TC-10 — No stored default: defaultFuelType stays null
// ---------------------------------------------------------------------------

describe('TC-10: loadDefaultFuelType leaves defaultFuelType as null when nothing is stored', () => {
  it('keeps defaultFuelType.value as null when IndexedDB has no entry', async () => {
    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()

    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-11 / TC-16 — Corrupted or empty IndexedDB value is rejected
// ---------------------------------------------------------------------------

describe('TC-11 / TC-16: loadDefaultFuelType rejects non-string and empty-string values', () => {
  it('sets defaultFuelType to null when the stored value is a number', async () => {
    store.set('defaultFuelType', 42)

    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()
    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
  })

  it('sets defaultFuelType to null when the stored value is an empty string', async () => {
    store.set('defaultFuelType', '')

    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()
    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
  })

  it('sets defaultFuelType to null when the stored value is an object', async () => {
    store.set('defaultFuelType', { type: 'SP95' })

    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()
    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
  })

  it('sets defaultFuelType to null when the stored value is null', async () => {
    store.set('defaultFuelType', null)

    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()
    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-18 — Saving a default stores only a plain string, not a structured object
// ---------------------------------------------------------------------------

describe('TC-18: saveDefaultFuelType writes a plain string to IndexedDB', () => {
  it('stores a string primitive, not a JSON object or wrapper', async () => {
    const { saveDefaultFuelType } = await freshComposable()

    await saveDefaultFuelType('E10')

    const stored = store.get('defaultFuelType')
    expect(typeof stored).toBe('string')
    expect(stored).toBe('E10')
  })
})
