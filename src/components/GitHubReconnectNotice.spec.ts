/**
 * Tests for GitHubReconnectNotice.vue — issue #158.
 *
 * The notice has two states: `countdown` (shown for 2 seconds before the
 * automatic redirect to GitHub) and `fallback` (the banner shown once the
 * automatic attempt is used up, or after a mid-session 401). It owns copy
 * and events only; the timer and the navigation live in HomePageContent.vue.
 *
 * Copy is asserted verbatim from the grilling summary
 * (docs/grillings/2026-09-09-auto-github-auth-on-load/GRILLING-SUMMARY.md).
 */

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GitHubReconnectNotice from './GitHubReconnectNotice.vue'

const COUNTDOWN_MESSAGE = 'Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…'
const SESSION_EXPIRED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((button) => {
    return button.text() === label || button.attributes('aria-label') === label
  })
}

describe('countdown state', () => {
  it('announces the automatic reconnect and offers only a cancel button', () => {
    const wrapper = mount(GitHubReconnectNotice, { props: { state: 'countdown' } })

    expect(wrapper.get('[role="status"]').text()).toContain(COUNTDOWN_MESSAGE)
    expect(findButton(wrapper, 'Annuler')).toBeDefined()
    expect(findButton(wrapper, 'Se reconnecter à GitHub')).toBeUndefined()
    expect(findButton(wrapper, 'Masquer')).toBeUndefined()
  })

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mount(GitHubReconnectNotice, { props: { state: 'countdown' } })

    await findButton(wrapper, 'Annuler')!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})

describe('fallback state', () => {
  it('shows the session-expired message with reconnect and dismiss controls', () => {
    const wrapper = mount(GitHubReconnectNotice, { props: { state: 'fallback' } })

    expect(wrapper.get('[role="status"]').text()).toContain(SESSION_EXPIRED_MESSAGE)
    expect(findButton(wrapper, 'Se reconnecter à GitHub')).toBeDefined()
    expect(findButton(wrapper, 'Masquer')).toBeDefined()
    expect(findButton(wrapper, 'Annuler')).toBeUndefined()
  })

  it('emits reconnect when the reconnect button is clicked', async () => {
    const wrapper = mount(GitHubReconnectNotice, { props: { state: 'fallback' } })

    await findButton(wrapper, 'Se reconnecter à GitHub')!.trigger('click')

    expect(wrapper.emitted('reconnect')).toHaveLength(1)
  })

  it('emits dismiss when the dismiss control is clicked', async () => {
    const wrapper = mount(GitHubReconnectNotice, { props: { state: 'fallback' } })

    await findButton(wrapper, 'Masquer')!.trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})
