import { get, set } from './indexedDb'

/**
 * Tracks when the user's stations/default-fuel data was last known to match
 * the remote GitHub repo copy (Sub-Issue C, issue #64) — either because it
 * was just read from there, or because a local change was just made and the
 * remote copy is about to go stale until the next write (Sub-Issue D).
 */

const SYNC_TIMESTAMP_KEY = 'preferencesLastSyncedAt'
const MS_PER_DAY = 24 * 60 * 60 * 1000

export async function markPreferencesSynced(): Promise<void> {
  await set(SYNC_TIMESTAMP_KEY, Date.now())
}

export async function isPreferencesStale(revalidateCacheDays: number): Promise<boolean> {
  const lastSyncedAt = await get<number>(SYNC_TIMESTAMP_KEY)
  if (lastSyncedAt === undefined) return true
  const thresholdMs = revalidateCacheDays * MS_PER_DAY
  return Date.now() - lastSyncedAt > thresholdMs
}
