// Guards for the daily price-history scheduled function (issue #112,
// ADR-014). The cron trigger fires twice a day (19:00 and 20:00 UTC) to
// cover both daylight-saving offsets of 21:00 French local time — only the
// firing that actually lands on the target local hour should do real work.
// isScheduledInvocation is defense-in-depth (security-guidelines.md rule 4):
// Netlify's own `schedule()` invocation is documented as not reachable via
// a direct HTTP call, but this check still confirms the expected payload
// shape before any GitHub write is attempted.
const TARGET_LOCAL_HOUR = 21
const PARIS_TIME_ZONE = 'Europe/Paris'

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

export function isTargetLocalHour(now: Date): boolean {
  return parisHour(now) === TARGET_LOCAL_HOUR
}

function parisHour(now: Date): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  })
  return Number(formatter.format(now))
}
