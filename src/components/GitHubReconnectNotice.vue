<template>
  <div
    role="status"
    class="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 mb-2 sm:flex-row sm:items-center"
  >
    <p class="flex-1">{{ message }}</p>
    <div class="flex items-center gap-2">
      <Button v-if="state === 'countdown'" size="sm" variant="outline" @click="emit('cancel')">
        Annuler
      </Button>
      <template v-else>
        <Button size="sm" @click="emit('reconnect')">Se reconnecter à GitHub</Button>
        <Button size="icon" variant="ghost" aria-label="Masquer" @click="emit('dismiss')">
          <X class="size-4" aria-hidden="true" />
        </Button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Reconnect notice for a previously-authenticated user whose GitHub session
 * expired (issue #158). Owns copy and events only: the 2-second timer, the
 * navigation and the dismissal memory live in HomePageContent.vue.
 */
import { AUTO_RECONNECT_DELAY_MS, SESSION_EXPIRED_MESSAGE } from '@/composables/useGitHubAuth'
import type { ReconnectNoticeState } from '@/types/github-reconnect'

const COUNTDOWN_MESSAGE = `Votre session GitHub a expiré. Reconnexion automatique dans ${AUTO_RECONNECT_DELAY_MS / 1000} secondes…`

const props = defineProps<{ state: ReconnectNoticeState }>()
const emit = defineEmits<{ cancel: []; reconnect: []; dismiss: [] }>()

const message = computed(() =>
  props.state === 'countdown' ? COUNTDOWN_MESSAGE : SESSION_EXPIRED_MESSAGE,
)
</script>
