/**
 * Builds the link target for an org-OAuth-restriction notice (issue #108):
 * the organization's own OAuth App access policy settings page.
 *
 * The owner segment is percent-encoded (security-guidelines.md rule 3) even
 * though GitHub org/user logins are alphanumeric-and-hyphen only today —
 * building a URL by concatenating unencoded input is the kind of pattern
 * that becomes a bug the day that assumption changes.
 */
export function buildOrgRestrictionSettingsUrl(owner: string): string {
  const encodedOwner = encodeURIComponent(owner)
  return `https://github.com/organizations/${encodedOwner}/settings/oauth_application_policy`
}
