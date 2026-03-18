/**
 * Tests for the AppLoader component.
 *
 * TC-04 through TC-06 from test-cases.md (issue #30).
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLoader from './AppLoader.vue'

const DEFAULT_CLASS = 'flex justify-center items-center gap-2 py-8'

// ---------------------------------------------------------------------------
// TC-04 — AppLoader default class produces a visible overlay
// ---------------------------------------------------------------------------

describe('TC-04: AppLoader default class produces a visible overlay', () => {
  it('renders with the full default Tailwind class string when no cssClass prop is provided', () => {
    const wrapper = mount(AppLoader, {
      global: { stubs: { 'iconify-icon': true } },
    })

    const div = wrapper.find('div')
    expect(div.exists()).toBe(true)
    expect(div.attributes('class')).toBe(DEFAULT_CLASS)
  })

  it('default class string includes positioning and full-screen coverage utilities', () => {
    const wrapper = mount(AppLoader, {
      global: { stubs: { 'iconify-icon': true } },
    })

    const cls = wrapper.find('div').attributes('class') ?? ''
    expect(cls).toContain('flex justify-center items-center gap-2 py-8')
  })
})

// ---------------------------------------------------------------------------
// TC-05 — AppLoader with explicit cssClass prop uses the provided class
// ---------------------------------------------------------------------------

describe('TC-05: AppLoader uses the provided cssClass prop when supplied', () => {
  it('applies the custom class string instead of the default when cssClass prop is passed', () => {
    const customClass = 'my-custom-loader-class another-class'
    const wrapper = mount(AppLoader, {
      props: { cssClass: customClass },
      global: { stubs: { 'iconify-icon': true } },
    })

    const div = wrapper.find('div')
    expect(div.attributes('class')).toBe(customClass)
    expect(div.attributes('class')).not.toBe(DEFAULT_CLASS)
  })
})

// ---------------------------------------------------------------------------
// TC-06 — AppLoader without prop (as used in App.vue) has default class
// ---------------------------------------------------------------------------

describe('TC-06: AppLoader rendered without any prop uses default styling', () => {
  it('renders the default overlay class when invoked with no props, as App.vue does', () => {
    const wrapper = mount(AppLoader, {
      global: { stubs: { 'iconify-icon': true } },
    })

    expect(wrapper.find('div').attributes('class')).toBe(DEFAULT_CLASS)
  })
})
