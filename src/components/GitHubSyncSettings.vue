<script async setup lang="ts">
/**
 * Settings-page section for GitHub sync (Sub-Issue E, issue #64): renders the
 * login/logout control and the `owner/repo`, file path, and
 * `revalidate-cache-days` fields, wiring Sub-Issue A's `useGitHubAuth` and
 * Sub-Issue B's `useRepoConfig` composables together.
 *
 * Per the composable-caller-responsibility convention, both composables are
 * called only here, at the top level of `setup()`; `handleUnauthorized` is
 * passed into `saveRepoConfig` so a 401 during validation also updates the
 * shared auth state, without `useRepoConfig` ever calling `useGitHubAuth`
 * itself.
 *
 * Object Calisthenics exception: four `ref`/`computed` bindings are declared
 * at module scope of this `setup()` (beyond the two-instance-variable
 * guideline) because Vue's Composition API requires each piece of reactive
 * form state to be its own binding — documented framework exception, as in
 * StationManagerTable.vue.
 */

import { ref, computed } from 'vue'
import { useGitHubAuth } from '@/composables/useGitHubAuth'
import { useRepoConfig } from '@/composables/useRepoConfig'
import type { RepoConfigDraft } from '@/types/repo-config'

const CACHE_DAYS_ERROR_MESSAGE = 'Le nombre de jours doit être un entier positif.'

const {
  isAuthenticated,
  authError,
  initializeAuthState,
  canInitiateLogin,
  login,
  logout,
  handleUnauthorized,
} = useGitHubAuth()
const { repoConfig, validationError, loadRepoConfig, saveRepoConfig } = useRepoConfig()

// The auth flag and the repo config live under separate IndexedDB keys with
// no data dependency between them, so loading them in parallel halves the
// wait before this component resolves compared to sequential awaits.
await Promise.all([initializeAuthState(), loadRepoConfig()])

const ownerRepoDraft = ref(repoConfig.value.ownerRepo)
const filePathDraft = ref(repoConfig.value.filePath)
const cacheDaysDraft = ref(
  repoConfig.value.revalidateCacheDays === null ? '' : String(repoConfig.value.revalidateCacheDays),
)

function parseCacheDays(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : null
}

const currentDraft = computed<RepoConfigDraft>(() => ({
  ownerRepo: ownerRepoDraft.value,
  filePath: filePathDraft.value,
  revalidateCacheDays: parseCacheDays(cacheDaysDraft.value),
}))

// An empty field is treated as "not yet set" (no error, but login-readiness
// still gates on it via `currentDraft`) — only a non-empty value that fails
// to parse as a positive integer (garbage text, "0", a negative number) is
// reported as an inline error.
const cacheDaysError = computed<string>(() => {
  if (cacheDaysDraft.value.trim() === '') return ''
  const parsed = currentDraft.value.revalidateCacheDays
  if (parsed !== null && parsed > 0) return ''
  return CACHE_DAYS_ERROR_MESSAGE
})

const loginReady = computed(() => canInitiateLogin(currentDraft.value))
const isSaving = ref(false)

async function onSave(): Promise<void> {
  if (cacheDaysError.value !== '' || isSaving.value) return
  isSaving.value = true
  try {
    await saveRepoConfig(currentDraft.value, isAuthenticated.value, handleUnauthorized)
  } finally {
    isSaving.value = false
  }
}

// Logging in navigates the browser away to GitHub (ADR-011's Authorization
// Code flow) and never returns to this component instance — any unsaved
// draft still only in these refs would be lost. The login button is only
// enabled once the draft is already complete and valid (`loginReady`), so
// persisting it here before navigating is safe and expected, not a surprise
// side effect.
async function onLogin(): Promise<void> {
  if (!loginReady.value || isSaving.value) return
  isSaving.value = true
  try {
    await saveRepoConfig(currentDraft.value, isAuthenticated.value, handleUnauthorized)
  } finally {
    isSaving.value = false
  }
  login()
}

async function onLogout(): Promise<void> {
  await logout()
}
</script>

<template>
  <section class="flex flex-col gap-4 w-full">
    <h2 class="text-xl font-semibold">Synchronisation GitHub</h2>

    <p v-if="authError" role="alert" class="text-sm text-red-600">{{ authError }}</p>
    <p v-if="validationError" role="alert" class="text-sm text-red-600">{{ validationError }}</p>

    <div class="flex flex-col gap-1">
      <Label for="ownerRepo">Dépôt (owner/repo)</Label>
      <Input
        id="ownerRepo"
        type="text"
        placeholder="alice/mes-stations"
        v-model="ownerRepoDraft"
        :disabled="isAuthenticated"
      />
    </div>

    <div class="flex flex-col gap-1">
      <Label for="filePath">Chemin du fichier</Label>
      <Input
        id="filePath"
        type="text"
        placeholder="stations.json"
        v-model="filePathDraft"
        :disabled="isAuthenticated"
      />
    </div>

    <p v-if="isAuthenticated" class="text-sm text-gray-600">
      Déconnectez-vous pour modifier le dépôt et le chemin du fichier.
    </p>

    <div class="flex flex-col gap-1">
      <Label for="revalidateCacheDays">Fréquence de synchronisation (jours)</Label>
      <Input id="revalidateCacheDays" type="number" min="1" v-model="cacheDaysDraft" />
      <span v-if="cacheDaysError" role="alert" class="text-xs text-red-500">{{
        cacheDaysError
      }}</span>
    </div>

    <div class="flex gap-3">
      <Button :disabled="cacheDaysError !== '' || isSaving" @click="onSave">
        {{ isAuthenticated ? 'Enregistrer la fréquence' : 'Enregistrer les paramètres' }}
      </Button>
      <Button v-if="!isAuthenticated" :disabled="!loginReady || isSaving" @click="onLogin">
        Se connecter avec GitHub
      </Button>
      <Button v-else variant="outline" @click="onLogout">Se déconnecter</Button>
    </div>
  </section>
</template>
