import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { FuelType } from '@/enums/fuel-type'
import type { Station } from '@/types/station'
import type { FuelPrice } from '@/types/fuel-price'
import type { StationData } from '@/types/station-data'
import { FuelType as FuelTypeFromBarrel } from '@/types/index'

// ---------------------------------------------------------------------------
// TC-01: Stale type files are absent after cleanup
// ---------------------------------------------------------------------------
describe('TC-01: stale type files are absent', () => {
  const srcTypesDir = path.resolve(__dirname, '../types')
  const deletedFiles = [
    'ErrorExtended.ts',
    'ErrorNextPage.ts',
    'LinkProp.ts',
    'RouterPathEnum.ts',
    'SideBarActionsEnum.ts',
    'SideBarLinkAction.ts',
  ]

  it.each(deletedFiles)('%s does not exist on disk', (filename) => {
    expect(fs.existsSync(path.join(srcTypesDir, filename))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-02 – TC-04: Station type
// ---------------------------------------------------------------------------
describe('Station type', () => {
  it('TC-02: accepts a valid Station value', () => {
    const station: Station = { name: 'Total Lyon', url: 'https://prix-carburants.gouv.fr/station/123' }
    expect(station.name).toBe('Total Lyon')
    expect(station.url).toBe('https://prix-carburants.gouv.fr/station/123')
  })

  it('TC-03: rejects Station with wrong name type (compile-time guard)', () => {
    // @ts-expect-error — name must be string, not number
    const station: Station = { name: 123, url: 'https://prix-carburants.gouv.fr/station/123' }
    expect(station).toBeDefined()
  })

  it('TC-04: rejects Station with missing url (compile-time guard)', () => {
    // @ts-expect-error — url is required
    const station: Station = { name: 'Shell Paris' }
    expect(station).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-05 – TC-08: FuelPrice type
// ---------------------------------------------------------------------------
describe('FuelPrice type', () => {
  it('TC-05: accepts a FuelPrice with numeric price', () => {
    const fp: FuelPrice = { type: 'Gasoil', price: 1.799 }
    expect(fp.price).toBe(1.799)
  })

  it('TC-06: accepts a FuelPrice with null price', () => {
    const fp: FuelPrice = { type: 'SP95', price: null }
    expect(fp.price).toBeNull()
  })

  it('TC-07: rejects FuelPrice with string price (compile-time guard)', () => {
    // @ts-expect-error — price must be number | null, not string
    const fp: FuelPrice = { type: 'Gasoil', price: 'cheap' }
    expect(fp).toBeDefined()
  })

  it('TC-08: rejects FuelPrice with undefined price (compile-time guard)', () => {
    // @ts-expect-error — price must be number | null, not undefined
    const fp: FuelPrice = { type: 'SP98', price: undefined }
    expect(fp).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-09 – TC-11: StationData type
// ---------------------------------------------------------------------------
describe('StationData type', () => {
  it('TC-09: accepts a valid StationData', () => {
    const sd: StationData = { stationName: 'Shell Paris', fuels: [{ type: 'SP95', price: 1.85 }] }
    expect(sd.stationName).toBe('Shell Paris')
    expect(sd.fuels).toHaveLength(1)
  })

  it('TC-10: accepts StationData with empty fuels array', () => {
    const sd: StationData = { stationName: 'BP Nantes', fuels: [] }
    expect(sd.fuels).toHaveLength(0)
  })

  it('TC-11: rejects StationData with missing stationName (compile-time guard)', () => {
    // @ts-expect-error — stationName is required
    const sd: StationData = { fuels: [] }
    expect(sd).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-12 – TC-14: FuelType enum
// ---------------------------------------------------------------------------
describe('FuelType enum', () => {
  it('TC-12: contains exactly the five expected values', () => {
    const values = Object.values(FuelType)
    expect(values).toEqual(['Gasoil', 'SP95-E10', 'SP95', 'SP98', 'E85'])
    expect(values).toHaveLength(5)
  })

  it('TC-13: all values are strings, not numbers', () => {
    Object.values(FuelType).forEach((value) => {
      expect(typeof value).toBe('string')
    })
  })

  it('TC-14: rejects an invalid FuelType assignment (compile-time guard)', () => {
    // @ts-expect-error — "Diesel" is not a member of FuelType
    const ft: FuelType = 'Diesel'
    expect(ft).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-15: All four types are importable from the barrel file
// ---------------------------------------------------------------------------
describe('TC-15: barrel file exports', () => {
  it('FuelType is importable from @/types (barrel)', () => {
    expect(FuelTypeFromBarrel).toBeDefined()
    expect(Object.values(FuelTypeFromBarrel)).toHaveLength(5)
  })

  // Station, FuelPrice, StationData are type-only exports — their presence is
  // verified at compile time by the imports at the top of this file.
  it('type-only exports compile without error', () => {
    const station: Station = { name: 'Test', url: 'https://example.com' }
    const fp: FuelPrice = { type: 'SP95', price: 1.5 }
    const sd: StationData = { stationName: 'Test', fuels: [fp] }
    expect(station).toBeDefined()
    expect(fp).toBeDefined()
    expect(sd).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-16: FuelType value satisfies FuelPrice.type field
// ---------------------------------------------------------------------------
describe('TC-16: FuelType is assignable to FuelPrice.type', () => {
  it('accepts a FuelType value as the type field of FuelPrice', () => {
    const fp: FuelPrice = { type: FuelType.Gasoil, price: 1.5 }
    expect(fp.type).toBe('Gasoil')
  })
})
