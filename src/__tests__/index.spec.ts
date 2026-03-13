import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useArticleState } from '@/composables/useArticleState'
import IndexPage from '@/pages/index.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: IndexPage }],
})

describe('IndexPage — state reset on mount', () => {
  afterEach(() => {
    const { resetState } = useArticleState()
    resetState()
  })

  it('resets extraction state to idle on mount when status is success', async () => {
    const { extractionState, resetState: _ } = useArticleState()
    extractionState.value.status = 'success'

    const wrapper = mount(IndexPage, {
      global: { plugins: [router] },
    })

    await wrapper.vm.$nextTick()

    expect(extractionState.value.status).toBe('idle')
  })

  it('resets extraction state to idle on mount when status is error', async () => {
    const { extractionState } = useArticleState()
    extractionState.value.status = 'error'
    extractionState.value.error = 'Something went wrong'

    const wrapper = mount(IndexPage, {
      global: { plugins: [router] },
    })

    await wrapper.vm.$nextTick()

    expect(extractionState.value.status).toBe('idle')
    expect(extractionState.value.error).toBeNull()
  })

  it('resets extraction state to idle on mount when status is missing-introduction', async () => {
    const { extractionState } = useArticleState()
    extractionState.value.status = 'missing-introduction'
    extractionState.value.manualIntroduction = 'Some intro'

    const wrapper = mount(IndexPage, {
      global: { plugins: [router] },
    })

    await wrapper.vm.$nextTick()

    expect(extractionState.value.status).toBe('idle')
    expect(extractionState.value.manualIntroduction).toBe('')
  })

  it('shows ArticleInput when status is idle after mount', async () => {
    const { extractionState } = useArticleState()
    extractionState.value.status = 'success'

    const wrapper = mount(IndexPage, {
      global: { plugins: [router] },
    })

    await wrapper.vm.$nextTick()

    expect(extractionState.value.status).toBe('idle')
  })

  it('is a no-op when status is already idle on mount', async () => {
    const { extractionState } = useArticleState()
    expect(extractionState.value.status).toBe('idle')

    mount(IndexPage, {
      global: { plugins: [router] },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(extractionState.value.status).toBe('idle')
  })
})
