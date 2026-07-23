/**
 * Tests for scheduleGuards — issue #112, test-cases.md scenarios 1-4 and 18.
 */

import { describe, expect, it } from 'vitest'
import { isScheduledInvocation, isTargetLocalHour } from './scheduleGuards'

// ---------------------------------------------------------------------------
// Scenario 1: Correct local time in summer (CEST) — 19:00 UTC is 21:00 French local time
// ---------------------------------------------------------------------------

describe('Scenario 1: 19:00 UTC in summer (CEST) is the target French local hour', () => {
  it('returns true for 2026-07-15T19:00:00Z', () => {
    expect(isTargetLocalHour(new Date('2026-07-15T19:00:00Z'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Scenario 2: Off-hour invocation skipped in summer — 20:00 UTC is 22:00 French local time
// ---------------------------------------------------------------------------

describe('Scenario 2: 20:00 UTC in summer (CEST) is not the target French local hour', () => {
  it('returns false for 2026-07-15T20:00:00Z', () => {
    expect(isTargetLocalHour(new Date('2026-07-15T20:00:00Z'))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Scenario 3: Correct local time in winter (CET) — 20:00 UTC is 21:00 French local time
// ---------------------------------------------------------------------------

describe('Scenario 3: 20:00 UTC in winter (CET) is the target French local hour', () => {
  it('returns true for 2026-01-15T20:00:00Z', () => {
    expect(isTargetLocalHour(new Date('2026-01-15T20:00:00Z'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Scenario 4: Off-hour invocation skipped in winter — 19:00 UTC is 20:00 French local time
// ---------------------------------------------------------------------------

describe('Scenario 4: 19:00 UTC in winter (CET) is not the target French local hour', () => {
  it('returns false for 2026-01-15T19:00:00Z', () => {
    expect(isTargetLocalHour(new Date('2026-01-15T19:00:00Z'))).toBe(false)
  })
})

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
