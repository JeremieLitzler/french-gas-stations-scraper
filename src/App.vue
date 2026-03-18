<script setup lang="ts">
const GuestLayout = defineAsyncComponent(() => import('@/components/layout/GuestLayout.vue'))
</script>

<template>
  <Component :is="GuestLayout">
    <RouterView />
  </Component>
</template>
