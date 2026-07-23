/**
 * Tests for csvEscaping — issue #112, test-cases.md scenarios 15-16.
 */

import { describe, expect, it } from 'vitest'
import { toCsvField } from './csvEscaping'

// ---------------------------------------------------------------------------
// Scenario 15: Station name contains a formula-triggering character
// ---------------------------------------------------------------------------

describe('Scenario 15: a formula-triggering leading character is neutralized', () => {
  it.each(['=', '+', '-', '@'])('prefixes a value starting with "%s" with a literal quote', (char) => {
    expect(toCsvField(`${char}SUM(A1:A10)`)).toBe(`'${char}SUM(A1:A10)`)
  })

  it('leaves a value with no formula-triggering character unchanged', () => {
    expect(toCsvField('Station Total')).toBe('Station Total')
  })
})

// ---------------------------------------------------------------------------
// Scenario 16: Station name contains a comma or quotation mark
// ---------------------------------------------------------------------------

describe('Scenario 16: a comma or quote is quoted/escaped so the field stays intact', () => {
  it('wraps a value containing a comma in double quotes', () => {
    expect(toCsvField('Station, Annex')).toBe('"Station, Annex"')
  })

  it('wraps a value containing a quotation mark in double quotes and doubles the quote', () => {
    expect(toCsvField('Station "Le Relais"')).toBe('"Station ""Le Relais"""')
  })

  it('applies both the formula guard and the quoting when both conditions apply', () => {
    expect(toCsvField('=Station, Annex')).toBe('"\'=Station, Annex"')
  })
})
