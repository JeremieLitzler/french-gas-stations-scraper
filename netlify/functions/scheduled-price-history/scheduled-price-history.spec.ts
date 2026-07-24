/**
 * Tests for scheduled-price-history's trigger-time randomization — issue #115,
 * test-cases.md scenarios 1-10.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions'
import {
  handler,
  pickRandomParisLocalTime,
  resolveTriggerCronExpression,
  toCronExpression,
  toUtcClockTime,
} from './scheduled-price-history'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTEXT = {} as HandlerContext
const SAMPLE_COUNT = 300

function buildEvent(body: string | null): HandlerEvent {
  return {
    rawUrl: 'http://localhost:8888/.netlify/functions/scheduled-price-history',
    rawQuery: '',
    path: '/.netlify/functions/scheduled-price-history',
    httpMethod: 'POST',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body,
    isBase64Encoded: false,
  }
}

function expectResponse(result: HandlerResponse | void): HandlerResponse {
  if (!result) {
    throw new Error('handler did not return a response')
  }
  return result
}

function sampleParisLocalTimes(sampleCount: number) {
  return Array.from({ length: sampleCount }, () => pickRandomParisLocalTime())
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Scenario 1: Lower bound respected
// ---------------------------------------------------------------------------

describe('Scenario 1: the resolved trigger time never falls before the window\'s lower bound', () => {
  it('never resolves an hour earlier than 20 across many picks', () => {
    const samples = sampleParisLocalTimes(SAMPLE_COUNT)

    expect(samples.every((sample) => sample.hour >= 20)).toBe(true)
  })

  it('resolves to exactly 20:00 when the randomness lands on the window\'s lower edge', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0)

    expect(pickRandomParisLocalTime()).toEqual({ hour: 20, minute: 0 })
  })
})

// ---------------------------------------------------------------------------
// Scenario 2: Upper bound respected
// ---------------------------------------------------------------------------

describe('Scenario 2: the resolved trigger time never exceeds the window\'s upper bound', () => {
  it('never resolves an hour later than 22, nor a minute past :59, across many picks', () => {
    const samples = sampleParisLocalTimes(SAMPLE_COUNT)

    expect(samples.every((sample) => sample.hour <= 22)).toBe(true)
    expect(samples.every((sample) => sample.minute <= 59)).toBe(true)
  })

  it('resolves to exactly 22:59 when the randomness lands on the window\'s upper edge', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.999999).mockReturnValueOnce(0.999999)

    expect(pickRandomParisLocalTime()).toEqual({ hour: 22, minute: 59 })
  })
})

// ---------------------------------------------------------------------------
// Scenario 3: Minute is not fixed to the hour
// ---------------------------------------------------------------------------

describe('Scenario 3: the resolved minute is not fixed to the hour', () => {
  it('produces more than one distinct minute across many picks', () => {
    const samples = sampleParisLocalTimes(SAMPLE_COUNT)
    const distinctMinutes = new Set(samples.map((sample) => sample.minute))

    expect(distinctMinutes.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// Scenario 4: Actual randomness across picks
// ---------------------------------------------------------------------------

describe('Scenario 4: repeated resolutions are not all identical', () => {
  it('produces more than one distinct resolved time across many picks', () => {
    const samples = sampleParisLocalTimes(SAMPLE_COUNT)
    const distinctTimes = new Set(samples.map((sample) => `${sample.hour}:${sample.minute}`))

    expect(distinctTimes.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// Scenario 5: Resolution during standard time (CET, UTC+1)
// ---------------------------------------------------------------------------

describe('Scenario 5: conversion during CET (UTC+1)', () => {
  it('converts a Paris-local trigger time to exactly one hour earlier in UTC', () => {
    const winterNow = new Date('2026-01-15T12:00:00Z')

    expect(toUtcClockTime({ hour: 21, minute: 37 }, winterNow)).toEqual({ hour: 20, minute: 37 })
  })
})

// ---------------------------------------------------------------------------
// Scenario 6: Resolution during daylight saving time (CEST, UTC+2)
// ---------------------------------------------------------------------------

describe('Scenario 6: conversion during CEST (UTC+2)', () => {
  it('converts a Paris-local trigger time to exactly two hours earlier in UTC', () => {
    const summerNow = new Date('2026-07-15T12:00:00Z')

    expect(toUtcClockTime({ hour: 21, minute: 37 }, summerNow)).toEqual({ hour: 19, minute: 37 })
  })
})

// ---------------------------------------------------------------------------
// Scenario 7: Registration receives a concrete value
// ---------------------------------------------------------------------------

describe('Scenario 7: the resolved cron expression is always a concrete, valid value', () => {
  it('formats a clock time into the expected 5-field cron string', () => {
    expect(toCronExpression({ hour: 5, minute: 9 })).toBe('9 5 * * *')
  })

  it('never resolves to a missing, pending, or malformed value across many picks', () => {
    const cronExpressionPattern = /^([0-9]|[1-5][0-9]) ([0-9]|1[0-9]|2[0-3]) \* \* \*$/
    const resolvedExpressions = Array.from({ length: SAMPLE_COUNT }, () =>
      resolveTriggerCronExpression(new Date()),
    )

    expect(resolvedExpressions.every((expression) => cronExpressionPattern.test(expression))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Scenario 8: Same resolved time reused for the module's lifetime
// ---------------------------------------------------------------------------

describe('Scenario 8: the trigger time is resolved once per module load, not per invocation', () => {
  it('does not call Math.random again when the handler runs after module load', async () => {
    vi.resetModules()
    const randomSpy = vi.spyOn(Math, 'random')

    const freshModule = await import('./scheduled-price-history')
    expect(randomSpy).toHaveBeenCalled()
    randomSpy.mockClear()

    await freshModule.handler(buildEvent(null), CONTEXT)
    await freshModule.handler(buildEvent(JSON.stringify({ next_run: '2026-03-10T20:00:00Z' })), CONTEXT)

    expect(randomSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Scenario 9: Genuine scheduled invocation always proceeds, at any hour
// ---------------------------------------------------------------------------

describe('Scenario 9: a genuine scheduled invocation always proceeds, at any hour', () => {
  it('attempts the daily snapshot instead of returning the invocation-shape rejection', async () => {
    vi.stubEnv('HISTORY_GITHUB_PAT', '')
    vi.stubEnv('HISTORY_GITHUB_OWNER', '')
    vi.stubEnv('HISTORY_GITHUB_REPO', '')
    vi.stubEnv('HISTORY_PREFS_FILE_PATH', '')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T02:00:00Z'))
    const event = buildEvent(JSON.stringify({ next_run: '2026-03-10T20:00:00Z' }))

    const response = expectResponse(await handler(event, CONTEXT))

    expect(response.statusCode).toBe(500)
    expect(response.body).toContain('Missing history configuration')
  })
})

// ---------------------------------------------------------------------------
// Scenario 10: Invocation-shape guard still rejects non-scheduler calls
// ---------------------------------------------------------------------------

describe('Scenario 10: the invocation-shape guard still rejects non-scheduler calls', () => {
  it('rejects a request with no body and performs no snapshot work', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const response = expectResponse(await handler(buildEvent(null), CONTEXT))

    expect(response.statusCode).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a request whose body lacks a next_run field and performs no snapshot work', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const response = expectResponse(await handler(buildEvent(JSON.stringify({ foo: 'bar' })), CONTEXT))

    expect(response.statusCode).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
