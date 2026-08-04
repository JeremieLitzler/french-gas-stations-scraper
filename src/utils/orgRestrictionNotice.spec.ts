/**
 * Tests for buildOrgRestrictionSettingsUrl — issue #108.
 *
 * Scenarios covered (test-cases.md, issue #108 — org OAuth 403 restriction):
 *   18 — the link points to the configured owner's own OAuth App access settings page
 *   19 — the link is built only from the owner, never from the response body's documentation_url
 *   security-guidelines.md rule 3 — the owner segment is percent-encoded
 */

import { describe, expect, it } from 'vitest'
import { buildOrgRestrictionSettingsUrl } from './orgRestrictionNotice'

describe('Scenario 18: the link points to the configured owner\'s own OAuth App access settings page', () => {
  it('builds the organizations/<owner>/settings/oauth_application_policy URL for the given owner', () => {
    expect(buildOrgRestrictionSettingsUrl('acme-corp')).toBe(
      'https://github.com/organizations/acme-corp/settings/oauth_application_policy',
    )
  })

  it('builds a different URL for a different owner, not a generic GitHub docs page', () => {
    const url = buildOrgRestrictionSettingsUrl('other-org')

    expect(url).toBe('https://github.com/organizations/other-org/settings/oauth_application_policy')
    expect(url).not.toContain('docs.github.com')
  })
})

describe('security-guidelines.md rule 3: the owner is percent-encoded before insertion into the URL', () => {
  it('percent-encodes characters that would otherwise break the URL structure', () => {
    const url = buildOrgRestrictionSettingsUrl('acme/corp #1')

    expect(url).toBe(
      `https://github.com/organizations/${encodeURIComponent('acme/corp #1')}/settings/oauth_application_policy`,
    )
    expect(url).not.toContain('acme/corp #1')
  })
})
