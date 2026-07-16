/**
 * Draft values of the GitHub repo-sync configuration (Sub-Issue B, issue #64),
 * as entered in the Settings UI (Sub-Issue E) before or after persistence.
 * Shared by Sub-Issue A's login-readiness check (`canInitiateLogin`) and any
 * future composable/component that reads or writes these fields.
 */
export interface RepoConfigDraft {
  ownerRepo: string
  filePath: string
  revalidateCacheDays: number | null
}
