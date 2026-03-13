<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

interface Props {
  text: string
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Copy',
})

const { copy, copied } = useClipboard()
</script>

<template>
  <Button @click="copy(props.text)">
    {{ copied ? 'Copied!' : props.label }}
  </Button>
</template>
