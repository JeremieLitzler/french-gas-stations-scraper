/**
 * Tests for OrgRestrictionNotice.vue — issue #108.
 *
 * Reuses AppLink (already covered by AppFooter.test.ts for its own
 * rel/target behavior) rather than stubbing it, so the rendered `<a>` seen
 * here is the real external-link markup AppLink produces.
 *
 * Scenarios covered (test-cases.md, issue #108 — org OAuth 403 restriction):
 *   17 — the message is exactly the fixed sentence, "lien" rendered as a clickable link
 *   18 — the link points to the configured owner's own settings page
 *   21 — the link opens in a new tab without navigating the app away
 *   22 — the same owner always renders byte-identical output (no call-site variation)
 */

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import OrgRestrictionNotice from './OrgRestrictionNotice.vue'
import AppLink from './AppLink.vue'

const FIXED_SENTENCE =
  "Le dépôt choisi se trouve sous une organisation n'autorisant pas l'authentification avec votre compte et le dépôt choisi. Veuillez visiter ce lien pour autoriser l'accès."

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

function mountNotice(owner: string) {
  return mount(OrgRestrictionNotice, {
    props: { owner },
    global: { plugins: [router], components: { AppLink } },
  })
}

describe('Scenario 17: the message is exactly the fixed sentence, "lien" rendered as a clickable link', () => {
  it('renders the fixed sentence verbatim, with a real <a> link whose text is "lien"', () => {
    const wrapper = mountNotice('acme-corp')

    expect(wrapper.text().replace(/\s+/g, ' ').trim()).toBe(FIXED_SENTENCE)
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('lien')
  })
})

describe('Scenario 18: the link points to the configured owner\'s own OAuth App access settings page', () => {
  it('builds the href from the acme-corp owner', () => {
    const wrapper = mountNotice('acme-corp')

    expect(wrapper.find('a').attributes('href')).toBe(
      'https://github.com/organizations/acme-corp/settings/oauth_application_policy',
    )
  })

  it('builds a different href for a different owner', () => {
    const wrapper = mountNotice('other-org')

    expect(wrapper.find('a').attributes('href')).toBe(
      'https://github.com/organizations/other-org/settings/oauth_application_policy',
    )
  })
})

describe('Scenario 21: the link opens in a new tab without navigating the app away', () => {
  it('carries target="_blank" and rel="noopener noreferrer"', () => {
    const wrapper = mountNotice('acme-corp')
    const link = wrapper.find('a')

    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })
})

describe('Scenario 22: the same owner always renders byte-identical output', () => {
  it('produces the same markup across independent mounts for the same owner', () => {
    const first = mountNotice('acme-corp')
    const second = mountNotice('acme-corp')

    expect(first.html()).toBe(second.html())
  })
})
