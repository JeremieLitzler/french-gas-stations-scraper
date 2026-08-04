<template>
  Le dépôt choisi se trouve sous une organisation n'autorisant pas l'authentification avec votre
  compte et le dépôt choisi. Veuillez visiter ce
  <AppLink :to="settingsUrl">lien</AppLink>
  pour autoriser l'accès.
</template>

<script setup lang="ts">
/**
 * Renders the fixed org-OAuth-restriction message (business-specifications.md
 * rule 2, issue #108) with a real, clickable link to the configured
 * organization's own OAuth App access settings page. Reuses `AppLink`, which
 * already opens external links in a new tab with `rel="noopener noreferrer"`
 * (security-guidelines.md rule 4), instead of a one-off anchor element.
 *
 * The caller supplies only `owner` — the message text itself is fixed and
 * identical everywhere it is shown (business-specifications.md rule 2's
 * "Out of scope" note), so it is not a prop.
 */
import { computed } from 'vue'
import { buildOrgRestrictionSettingsUrl } from '@/utils/orgRestrictionNotice'

const props = defineProps<{ owner: string }>()
const settingsUrl = computed(() => buildOrgRestrictionSettingsUrl(props.owner))
</script>
