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
 *   TC-09  — saveDefaultFuelType persists and reflects the label in reactive state
 *   TC-13  — loadDefaultFuelType reads a stored value and sets defaultFuelType
 *   TC-14  — loadDefaultFuelType sets defaultFuelType to null when nothing is stored
 *   TC-20  — updateDefaultFuelType replaces the stored default
 *   TC-25  — clearDefaultFuelType deletes the key from IndexedDB
 *   TC-33  — corrupted (non-string) IndexedDB value is rejected; defaultFuelType stays null
 *   TC-35  — saveDefaultFuelType writes a plain string to IndexedDB, not an object
 *   TC-36  — clearDefaultFuelType uses key deletion, not overwrite with empty value
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
  del: vi.fn((key: string) => {
    store.delete(key)
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
// TC-09 — "Save as default" stores the selected fuel type
// ---------------------------------------------------------------------------

describe('TC-09: saveDefaultFuelType persists the label and updates reactive state', () => {
  it('sets defaultFuelType.value to the saved label and writes it to IndexedDB', async () => {
    const { defaultFuelType, saveDefaultFuelType } = await freshComposable()

    expect(defaultFuelType.value).toBeNull()

    await saveDefaultFuelType('SP95')

    expect(defaultFuelType.value).toBe('SP95')
    expect(store.get('defaultFuelType')).toBe('SP95')
  })
})

// ---------------------------------------------------------------------------
// TC-13 — Stored default is pre-selected when the price view loads
// ---------------------------------------------------------------------------

describe('TC-13: loadDefaultFuelType reads the stored value into defaultFuelType', () => {
  it('sets defaultFuelType.value to the stored string after loading', async () => {
    store.set('defaultFuelType', 'Gasoil')

    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()

    expect(defaultFuelType.value).toBeNull()

    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBe('Gasoil')
  })
})

// ---------------------------------------------------------------------------
// TC-14 — No stored default: defaultFuelType stays null
// ---------------------------------------------------------------------------

describe('TC-14: loadDefaultFuelType leaves defaultFuelType as null when nothing is stored', () => {
  it('keeps defaultFuelType.value as null when IndexedDB has no entry', async () => {
    const { defaultFuelType, loadDefaultFuelType } = await freshComposable()

    await loadDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-20 — "Update default" replaces the stored default
// ---------------------------------------------------------------------------

describe('TC-20: updateDefaultFuelType replaces the stored default and updates reactive state', () => {
  it('overwrites the existing entry in IndexedDB and sets defaultFuelType.value', async () => {
    store.set('defaultFuelType', 'SP95')

    const { defaultFuelType, updateDefaultFuelType } = await freshComposable()

    // Simulate load: set the reactive state to reflect the stored value
    defaultFuelType.value = 'SP95'

    await updateDefaultFuelType('Gasoil')

    expect(defaultFuelType.value).toBe('Gasoil')
    expect(store.get('defaultFuelType')).toBe('Gasoil')
  })

  it('writes a plain string, not a structured object', async () => {
    const { updateDefaultFuelType } = await freshComposable()

    await updateDefaultFuelType('E10')

    const stored = store.get('defaultFuelType')
    expect(typeof stored).toBe('string')
    expect(stored).toBe('E10')
  })
})

// ---------------------------------------------------------------------------
// TC-25 — Clicking "Clear default" removes the key from IndexedDB
// ---------------------------------------------------------------------------

describe('TC-25: clearDefaultFuelType removes the stored key entirely', () => {
  it('deletes the IndexedDB entry and sets defaultFuelType.value to null', async () => {
    store.set('defaultFuelType', 'SP95')

    const { defaultFuelType, clearDefaultFuelType } = await freshComposable()
    defaultFuelType.value = 'SP95'

    await clearDefaultFuelType()

    expect(defaultFuelType.value).toBeNull()
    expect(store.has('defaultFuelType')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-33 — Corrupted or empty IndexedDB value is rejected
// ---------------------------------------------------------------------------

describe('TC-33: loadDefaultFuelType rejects non-string and empty-string values', () => {
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
// TC-35 — Saving a default stores only a plain string, not a structured object
// ---------------------------------------------------------------------------

describe('TC-35: saveDefaultFuelType writes a plain string to IndexedDB', () => {
  it('stores a string primitive, not a JSON object or wrapper', async () => {
    const { saveDefaultFuelType } = await freshComposable()

    await saveDefaultFuelType('E10')

    const stored = store.get('defaultFuelType')
    expect(typeof stored).toBe('string')
    expect(stored).toBe('E10')
  })
})

// ---------------------------------------------------------------------------
// TC-36 — Clearing a default uses key deletion, not overwrite with empty value
// ---------------------------------------------------------------------------

describe('TC-36: clearDefaultFuelType deletes the key rather than overwriting with an empty value', () => {
  it('removes the key from IndexedDB entirely — not setting it to empty string, null, or undefined', async () => {
    store.set('defaultFuelType', 'SP95')

    const { clearDefaultFuelType } = await freshComposable()

    await clearDefaultFuelType()

    expect(store.has('defaultFuelType')).toBe(false)
  })
})
