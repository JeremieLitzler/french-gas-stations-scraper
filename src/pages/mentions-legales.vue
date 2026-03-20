<template>
  <div class="mentions-legales prose max-w-none" v-html="parsedContent" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import mentionsLegalesRaw from '@/assets/mentions-legales.md?raw'
import { parseMarkdown } from '@/utils/markdownParser'

const parsedContent = ref('')

onMounted(async () => {
  parsedContent.value = await parseMarkdown(mentionsLegalesRaw)
})
</script>
