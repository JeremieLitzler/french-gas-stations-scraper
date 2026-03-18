<template>
  <div :class="cssClass">
    <span>Loading...</span>
    <iconify-icon icon="lucide:loader-circle" class="text-6xl animate-spin brand-color" />
  </div>
</template>
<script setup lang="ts">
const {
  cssClass = 'flex justify-center items-center gap-2 py-8',
} = defineProps<{ cssClass?: string }>()
</script>
