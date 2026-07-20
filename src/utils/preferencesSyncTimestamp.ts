import { del, get, set } from './indexedDb'

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

export async function getPreferencesSyncedAt(): Promise<number | undefined> {
  return get<number>(SYNC_TIMESTAMP_KEY)
}

/**
 * Restores a previously-read timestamp (review-results.md, sub-issue-85):
 * used to undo the premature `markPreferencesSynced()` a failed remote merge
 * left behind, since a rolled-back merge is neither a successful read nor a
 * user-triggered update and must not count as one.
 */
export async function restorePreferencesSyncedAt(timestamp: number | undefined): Promise<void> {
  if (timestamp === undefined) {
    await del(SYNC_TIMESTAMP_KEY)
    return
  }
  await set(SYNC_TIMESTAMP_KEY, timestamp)
}

export async function isPreferencesStale(revalidateCacheDays: number): Promise<boolean> {
  const lastSyncedAt = await get<number>(SYNC_TIMESTAMP_KEY)
  if (lastSyncedAt === undefined) return true
  const thresholdMs = revalidateCacheDays * MS_PER_DAY
  return Date.now() - lastSyncedAt > thresholdMs
}
