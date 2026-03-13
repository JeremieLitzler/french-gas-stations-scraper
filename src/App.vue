<script setup lang="ts">
const GuestLayout = defineAsyncComponent(() => import('@/components/layout/GuestLayout.vue'))
</script>

<template>
  <Suspense>
    <Component :is="GuestLayout">
      <RouterView />
    </Component>
    <template #fallback>
      <AppLoader />
    </template>
  </Suspense>
</template>
