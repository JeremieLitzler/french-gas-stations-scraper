/**
 * Tests for stationUrlAllowlist — issue #112, test-cases.md scenario 17.
 */

import { describe, expect, it } from 'vitest'
import { isAllowedStationUrl } from './stationUrlAllowlist'

// ---------------------------------------------------------------------------
// Scenario 17: Remote file lists a URL outside the allowed domain
// ---------------------------------------------------------------------------

describe('Scenario 17: a station URL outside the allowed domain is rejected', () => {
  it('accepts a URL on the allowed origin and path prefix', () => {
    expect(isAllowedStationUrl('https://www.prix-carburants.gouv.fr/station/12345')).toBe(true)
  })

  it('rejects a URL on a different host', () => {
    expect(isAllowedStationUrl('https://evil.example.com/station/12345')).toBe(false)
  })

  it('rejects a URL on the allowed host but outside the allowed path prefix', () => {
    expect(isAllowedStationUrl('https://www.prix-carburants.gouv.fr/carte')).toBe(false)
  })

  it('rejects a URL using a different scheme on the allowed host', () => {
    expect(isAllowedStationUrl('http://www.prix-carburants.gouv.fr/station/12345')).toBe(false)
  })

  it('rejects a value that is not a valid URL', () => {
    expect(isAllowedStationUrl('not a url')).toBe(false)
  })
})
