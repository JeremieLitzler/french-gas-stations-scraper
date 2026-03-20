import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
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
    components: { AppLink },
  },
}

describe('AppFooter', () => {
  it('renders a <footer> element', () => {
    const wrapper = mount(AppFooter, globalConfig)
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('renders exactly four external anchor elements (Jeremie, Claude, License, Netlify)', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const links = wrapper.findAll('a.external-link')
    // Three logical sections: attribution (2 links: Jeremie + Claude), license, Netlify hosting
    expect(links).toHaveLength(4)
  })

  // TC-08 — Mentions légales link
  it('renders a RouterLink to /mentions-legales with text "Mentions légales"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const internalLinks = wrapper.findAll('a.internal-link')
    const mentionsLink = internalLinks.find((a) => a.text().includes('Mentions'))
    expect(mentionsLink).toBeDefined()
    expect(mentionsLink!.text()).toContain('Mentions')
  })

  it('renders an AppLink pointing to https://iamjeremie.me/ with text "Jeremie"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const jeremieLink = wrapper
      .findAll('a.external-link')
      .find((a) => a.attributes('href') === 'https://iamjeremie.me/')
    expect(jeremieLink).toBeDefined()
    expect(jeremieLink!.text()).toBe('Jeremie')
  })

  it('renders an AppLink pointing to https://claude.ai/code with text "Claude"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const claudeLink = wrapper
      .findAll('a.external-link')
      .find((a) => a.attributes('href') === 'https://claude.ai/code')
    expect(claudeLink).toBeDefined()
    expect(claudeLink!.text()).toBe('Claude')
  })

  it('renders a license AppLink pointing to the GitHub LICENSE file', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const licenseLink = wrapper
      .findAll('a.external-link')
      .find((a) =>
        a
          .attributes('href')
          ?.includes(
            'https://github.com/JeremieLitzler/french-gas-stations-scraper/blob/main/LICENSE',
          ),
      )
    expect(licenseLink).toBeDefined()
  })

  it('renders an AppLink pointing to https://www.netlify.com/ with text "Hébergé sur Netlify"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const netlifyLink = wrapper
      .findAll('a.external-link')
      .find((a) => a.attributes('href') === 'https://www.netlify.com/')
    expect(netlifyLink).toBeDefined()
    expect(netlifyLink!.text()).toBe('Hébergé sur Netlify')
  })

  it('all links have target="_blank"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const links = wrapper.findAll('a.external-link')
    links.forEach((link) => {
      expect(link.attributes('target')).toBe('_blank')
    })
  })

  it('all links have rel="noopener"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    const links = wrapper.findAll('a.external-link')
    links.forEach((link) => {
      expect(link.attributes('rel')).toBe('noopener')
    })
  })

  it('footer text contains "Fait 🛠️ par"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    expect(wrapper.find('footer').text()).toContain('Fait 🛠️ par')
  })

  it('footer text contains "et"', () => {
    const wrapper = mount(AppFooter, globalConfig)
    expect(wrapper.find('footer').text()).toContain('et')
  })
})
