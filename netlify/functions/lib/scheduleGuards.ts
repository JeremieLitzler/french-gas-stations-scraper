// Guards for the daily price-history scheduled function (issue #112,
// ADR-014; trigger time randomized in issue #115). isScheduledInvocation is
// defense-in-depth (security-guidelines.md rule 4): Netlify's own
// `schedule()` invocation is documented as not reachable via a direct HTTP
// call, but this check still confirms the expected payload shape before any
// GitHub write is attempted.

export function isScheduledInvocation(body: string | null): boolean {
  if (body === null) return false
  return hasNextRunField(parseJson(body))
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function hasNextRunField(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  return typeof (value as Record<string, unknown>).next_run === 'string'
}
