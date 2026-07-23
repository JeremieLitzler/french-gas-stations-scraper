// Builds and updates the daily price-history CSV content (issue #112,
// business-specifications.md): one row per station/fuel-type combination
// scraped that day, with same-day re-runs replacing (not duplicating) that
// day's rows.
import { toCsvField } from './csvEscaping'

export interface PriceHistoryRow {
  date: string
  stationName: string
  stationUrl: string
  fuelType: string
  price: number
}

const CSV_HEADER = 'date,station_name,station_url,fuel_type,price'
const LINE_SEPARATOR = '\n'

export function toCsvLine(row: PriceHistoryRow): string {
  return [
    row.date,
    toCsvField(row.stationName),
    toCsvField(row.stationUrl),
    toCsvField(row.fuelType),
    String(row.price),
  ].join(',')
}

// The date column is always a plain YYYY-MM-DD string (never quoted, since
// it never contains a comma/quote/formula-trigger character), so finding a
// row's date is a safe prefix match rather than a full CSV re-parse. A
// missing comma (a malformed or unexpected existing line) returns the whole
// line instead of a truncated one, so such a line is always kept as-is
// rather than silently corrupted by an off-by-one slice.
function rowDate(line: string): string {
  const commaIndex = line.indexOf(',')
  if (commaIndex === -1) return line
  return line.slice(0, commaIndex)
}

function existingDataLines(existingCsv: string): string[] {
  const lines = existingCsv.split(LINE_SEPARATOR).filter((line) => line.length > 0)
  return lines.slice(1)
}

function keepOtherDaysRows(existingCsv: string, today: string): string[] {
  return existingDataLines(existingCsv).filter((line) => rowDate(line) !== today)
}

export function updateHistoryCsv(
  existingCsv: string | null,
  today: string,
  todaysRows: PriceHistoryRow[],
): string {
  const keptLines = existingCsv === null ? [] : keepOtherDaysRows(existingCsv, today)
  const newLines = todaysRows.map(toCsvLine)
  return [CSV_HEADER, ...keptLines, ...newLines].join(LINE_SEPARATOR) + LINE_SEPARATOR
}
