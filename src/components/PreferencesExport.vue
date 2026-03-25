<script setup lang="ts">
import { usePreferencesExport } from '@/composables/usePreferencesExport'

const { isExporting, exportPreferences } = usePreferencesExport()
</script>

<template>
  <Button :disabled="isExporting" @click="exportPreferences">
    {{ isExporting ? 'Export en cours…' : 'Exporter mes préférences' }}
  </Button>
</template>
