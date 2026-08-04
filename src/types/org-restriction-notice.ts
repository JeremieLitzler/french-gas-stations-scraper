/**
 * A GitHub org-OAuth-restriction 403 (issue #108): carries only the repo
 * owner the user already configured, never any text read from GitHub's
 * response body (security-guidelines.md rule 2). The fixed, owner-linked
 * message text itself lives in `OrgRestrictionNotice.vue`, not here.
 */
export interface OrgRestrictionNotice {
  owner: string
}
