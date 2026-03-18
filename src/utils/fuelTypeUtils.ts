/**
 * Pure utility functions for deriving fuel type lists and building sorted
 * price rows from StationData results.
 *
 * No Vue dependencies. Safe to call from components and unit tests.
 *
 * Security: all string values are treated as opaque display text — never
 * passed to innerHTML, v-html, eval, or any API that interprets content as
 * markup or code (security-guidelines.md rules 1 and 2).
 */

import type { FuelPrice } from '@/types/fuel-price'
import type { PriceRow } from '@/types/price-row'
import type { StationData } from '@/types/station-data'

function addUnique(accumulator: string[], fuelType: string): string[] {
  if (accumulator.includes(fuelType)) return accumulator
  return [...accumulator, fuelType]
}

function extractFuelTypes(station: StationData): string[] {
  return station.fuels.map((fuel: FuelPrice) => fuel.type)
}

/**
 * Derive the list of available fuel types from all station results.
 * Types appear in first-encountered order, deduplicated.
 * Types with null prices are included if the type key is present.
 */
export function deriveFuelTypes(stations: StationData[]): string[] {
  const allTypes = stations.flatMap(extractFuelTypes)
  return allTypes.reduce(addUnique, [] as string[])
}

function findFuelEntry(station: StationData, fuelType: string): FuelPrice | undefined {
  return station.fuels.find((fuel: FuelPrice) => fuel.type === fuelType)
}

/**
 * Resolve the price for a given fuel type in a station's fuel list.
 * Returns null if the station does not carry the type or the price is null.
 */
export function resolvePrice(station: StationData, fuelType: string): number | null {
  const fuelEntry = findFuelEntry(station, fuelType)
  if (fuelEntry === undefined) return null
  return fuelEntry.price
}

function toPriceRow(station: StationData, fuelType: string): PriceRow {
  return {
    stationName: station.stationName,
    resolvedPrice: resolvePrice(station, fuelType),
  }
}

function comparePriceRows(rowA: PriceRow, rowB: PriceRow): number {
  if (rowA.resolvedPrice === null && rowB.resolvedPrice === null) return 0
  if (rowA.resolvedPrice === null) return 1
  if (rowB.resolvedPrice === null) return -1
  return rowA.resolvedPrice - rowB.resolvedPrice
}

/**
 * Build a sorted list of price rows for the given fuel type.
 * Rows are sorted ascending by price; stations without the type sort last.
 */
export function buildPriceRows(stations: StationData[], fuelType: string): PriceRow[] {
  return stations
    .map((station: StationData) => toPriceRow(station, fuelType))
    .sort(comparePriceRows)
}
