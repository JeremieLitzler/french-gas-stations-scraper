import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GuestLayout from './GuestLayout.vue'
import AppFooter from './AppFooter.vue'
import AppLink from '@/components/AppLink.vue'
import { createRouter, createMemoryHistory } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

const globalConfig = {
  global: {
    plugins: [router],
    components: { AppFooter, AppLink },
  },
}

describe('GuestLayout', () => {
  it('renders the slot content', () => {
    const wrapper = mount(GuestLayout, {
      ...globalConfig,
      slots: {
        default: '<p id="slot-content">Page content</p>',
      },
    })
    expect(wrapper.find('#slot-content').exists()).toBe(true)
    expect(wrapper.find('#slot-content').text()).toBe('Page content')
  })

  it('renders AppFooter below the slot content', () => {
    const wrapper = mount(GuestLayout, {
      ...globalConfig,
      slots: {
        default: '<p id="slot-content">Page content</p>',
      },
    })
    expect(wrapper.findComponent(AppFooter).exists()).toBe(true)
  })

  it('renders a <footer> element', () => {
    const wrapper = mount(GuestLayout, {
      ...globalConfig,
      slots: {
        default: '<p>Some page</p>',
      },
    })
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('footer appears after slot content in the DOM', () => {
    const wrapper = mount(GuestLayout, {
      ...globalConfig,
      slots: {
        default: '<p id="slot-content">Page content</p>',
      },
    })
    const layoutDiv = wrapper.find('.layout-guest')
    const children = layoutDiv.element.children
    // The last child should be the footer
    const lastChild = children[children.length - 1]
    expect(lastChild.tagName.toLowerCase()).toBe('footer')
  })

  it('renders AppFooter even when slot is empty', () => {
    const wrapper = mount(GuestLayout, globalConfig)
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('renders AppFooter with different slot content (error state)', () => {
    const wrapper = mount(GuestLayout, {
      ...globalConfig,
      slots: {
        default: '<div class="error-state">Error occurred</div>',
      },
    })
    expect(wrapper.find('footer').exists()).toBe(true)
    expect(wrapper.find('.error-state').exists()).toBe(true)
  })

  it('renders AppFooter with different slot content (success state)', () => {
    const wrapper = mount(GuestLayout, {
      ...globalConfig,
      slots: {
        default: '<div class="success-state">Article extracted</div>',
      },
    })
    expect(wrapper.find('footer').exists()).toBe(true)
    expect(wrapper.find('.success-state').exists()).toBe(true)
  })

  it('root element has layout-guest class', () => {
    const wrapper = mount(GuestLayout, globalConfig)
    expect(wrapper.find('.layout-guest').exists()).toBe(true)
  })

  it('root element uses flex-col layout', () => {
    const wrapper = mount(GuestLayout, globalConfig)
    const layoutDiv = wrapper.find('.layout-guest')
    expect(layoutDiv.classes()).toContain('flex-col')
  })
})
