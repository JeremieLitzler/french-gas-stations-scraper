import type { Station } from '@/types/station'

/**
 * The exact shape of the JSON file synced to the user's GitHub repository
 * (Sub-Issue C/D, issue #64). Never carries `owner`, `repo`, or
 * `revalidateCacheDays` — those stay exclusively in IndexedDB
 * (see `RepoConfigDraft`).
 */
export interface RemotePreferencesFile {
  stations: Station[]
  defaultFuel: string | null
}
