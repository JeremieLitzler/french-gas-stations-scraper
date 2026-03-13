<template>
  <!-- 
    `fixed` bring the `aside` on the side of nav and main elements 
    `h-screen` make the `aside` take the full height
    `flex` and the related bring the child div content within the viewport
   -->
  <aside
    class="border-r fixed h-screen flex flex-col gap-2"
    :class="{ 'w-52': menuOpen, 'w-16': !menuOpen }"
  >
    <div class="h-20 w-full flex justify-center items-center gap-1">
      <Button
        tabindex="0"
        variant="invisible"
        size="outline"
        class="m-2 flex justify-center items-center"
        @click="toggleMenu"
      >
        <div v-if="menuOpen" class="p-2 rounded-md flex items-center gap-4">
          <ChevonsLeft /><span>Collapse</span>
        </div>
        <div v-else class="p-2 rounded-md">
          <ChevronsRight />
        </div>
      </Button>
    </div>
    <!-- 
      `h-full` make the `nav` take the full height, thanks to h-screen above
      `flex` and related allow the child divs to be at each end of the nav
      -->
    <nav class="h-full flex flex-col justify-between">
      <div class="px-2">
        <!-- <SideBarLinks :links="topLinks" /> -->
      </div>

      <div class="border-y px-2">
        <SideBarLinks :links="sideBarLinks" />
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { LinkProp } from '@/types/LinkProp'
import { RouterPathEnum } from '@/types/RouterPathEnum'
import { useWindowSize } from '@vueuse/core'
import Home from '../ui/icon/Home.vue'
import Files from '../ui/icon/Files.vue'

console.log('SideBar>script:setup...')

defineEmits<{ (event: '@createTask'): void; (event: '@createProject'): void }>()

const sideBarLinks: LinkProp[] = [
  {
    to: RouterPathEnum.Home,
    icon: Home,
    label: 'Dashboard',
  },
  { to: RouterPathEnum.X, icon: Files, label: 'X' },
  { to: RouterPathEnum.LinkedIn, icon: Files, label: 'LinkedIn' },
  { to: RouterPathEnum.Medium, icon: Files, label: 'Medium' },
  { to: RouterPathEnum.Substack, icon: Files, label: 'Substack' },
]

const { menuOpen, toggleMenu } = useMenu()

const { width: windowWidth } = useWindowSize()
watchEffect(() => {
  if (windowWidth.value > 1024) {
    menuOpen.value = true
  } else {
    menuOpen.value = false
  }
})
</script>
<style scoped></style>
