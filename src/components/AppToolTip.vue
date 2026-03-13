<script setup lang="ts">
const { toolTipText = 'Click the status icon to toggle the value', showToolTip = true } =
  defineProps<{
    toolTipText?: string
    showToolTip?: boolean
  }>()

const displayTooltip = ref(false)
const tooltipIcon = useTemplateRef('tooltip-icon')
const tooltipParagraph = useTemplateRef('tooltip-paragraph')
const tooltipPosition = ref({ top: 0, left: 0 })

const toggleTooltip = (dismiss: boolean = false) => {
  if (dismiss) {
    displayTooltip.value = false
    return
  }
  displayTooltip.value = !displayTooltip.value

  if (tooltipIcon.value && displayTooltip.value) {
    // Access the exposed DOM element
    const domElement = tooltipIcon.value.infoElement
    const domElementBounds = domElement?.getBoundingClientRect()
    if (domElement) {
      tooltipPosition.value = {
        left: (domElementBounds?.x ?? 0) - 216, // Adjust maxWidth below if you change offset
        top: (domElementBounds?.y ?? 0) - 48,
      }
      console.log(tooltipPosition.value)
    }
  }
}
</script>
<template>
  <div class="flex items-center gap-2">
    <p
      v-show="displayTooltip"
      ref="tooltip-paragraph"
      class="bg-green-300 text-slate-700 text-sm rounded px-3 py-2 shadow-lg"
      :style="{
        top: tooltipPosition.top + 'px',
        left: tooltipPosition.left + 'px',
        position: 'fixed',
        zIndex: '999',
        maxWidth: '15em', // 240px
      }"
    >
      {{ toolTipText }}
    </p>
    <Info
      ref="tooltip-icon"
      v-if="showToolTip"
      class="text-slate-500 hover:cursor-pointer relative"
      tabindex="0"
      @focus="toggleTooltip()"
      @focusout="toggleTooltip(true)"
      @pointerover="toggleTooltip()"
      @pointerout="toggleTooltip()"
      @click="toggleTooltip()"
    ></Info>
  </div>
</template>

<style scoped></style>
