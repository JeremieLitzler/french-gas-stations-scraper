/**
 * Tests for the MentionsLegales page component.
 *
 * TC-04: Page renders a visible <h1> heading from the Markdown asset
 * TC-05: External links rendered from Markdown have rel="noopener noreferrer"
 * TC-06: No raw Markdown syntax is visible in the rendered DOM
 */

import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MentionsLegales from './mentions-legales.vue'

// ---------------------------------------------------------------------------
// TC-04: Page renders a visible <h1> heading from the Markdown asset
// ---------------------------------------------------------------------------

describe('TC-04: Page renders a visible <h1> heading from the Markdown asset', () => {
  it('renders at least one <h1> element after mounting', async () => {
    const wrapper = mount(MentionsLegales)
    await flushPromises()

    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text().length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// TC-05: External links rendered from Markdown have rel="noopener noreferrer"
// ---------------------------------------------------------------------------

describe('TC-05: External links in the rendered output have rel="noopener noreferrer"', () => {
  it('every <a> element in the rendered output has rel="noopener noreferrer"', async () => {
    const wrapper = mount(MentionsLegales)
    await flushPromises()

    const anchors = wrapper.findAll('a')
    expect(anchors.length).toBeGreaterThan(0)

    anchors.forEach((anchor) => {
      expect(anchor.attributes('rel')).toBe('noopener noreferrer')
    })
  })
})

// ---------------------------------------------------------------------------
// TC-06: No raw Markdown syntax is visible in the rendered DOM
// ---------------------------------------------------------------------------

describe('TC-06: No raw Markdown syntax is visible in the rendered DOM', () => {
  it('does not contain "## " heading syntax as visible text', async () => {
    const wrapper = mount(MentionsLegales)
    await flushPromises()

    expect(wrapper.text()).not.toContain('## ')
  })

  it('does not contain "**" bold syntax as visible text', async () => {
    const wrapper = mount(MentionsLegales)
    await flushPromises()

    expect(wrapper.text()).not.toContain('**')
  })

  it('does not contain "[text](url)" link syntax as visible text', async () => {
    const wrapper = mount(MentionsLegales)
    await flushPromises()

    // Link syntax would look like "](https://..."
    expect(wrapper.text()).not.toMatch(/\]\(https?:/)
  })
})
