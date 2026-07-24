/**
 * Tests for scheduleGuards — issue #112/#115, test-cases.md scenario 18.
 */

import { describe, expect, it } from 'vitest'
import { isScheduledInvocation } from './scheduleGuards'

// ---------------------------------------------------------------------------
// Scenario 18: Direct call to the function's endpoint (not the Netlify scheduler)
// ---------------------------------------------------------------------------

describe('Scenario 18: a direct HTTP call is not recognized as a scheduled invocation', () => {
  it('returns false when the request body is null (typical of a direct GET)', () => {
    expect(isScheduledInvocation(null)).toBe(false)
  })

  it('returns false when the body is not JSON', () => {
    expect(isScheduledInvocation('not json')).toBe(false)
  })

  it('returns false when the body is JSON but lacks a next_run field', () => {
    expect(isScheduledInvocation(JSON.stringify({ foo: 'bar' }))).toBe(false)
  })

  it('returns true when the body carries the scheduler-supplied next_run field', () => {
    expect(isScheduledInvocation(JSON.stringify({ next_run: '2026-07-16T19:00:00Z' }))).toBe(true)
  })
})
