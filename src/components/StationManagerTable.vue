<template>
  <Table class="table-auto">
    <TableHeader>
      <TableRow :disable-hover="true">
        <TableHead class="w-auto">Name</TableHead>
        <TableHead class="w-auto">URL</TableHead>
        <TableHead class="w-px whitespace-nowrap"></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow :disable-hover="true">
        <TableCell>
          <input
            class="station-input"
            type="text"
            :value="newName"
            placeholder="Station name"
            @input="onNewNameInput($event)"
            @blur="onNewRowBlur"
          />
          <span v-if="newNameError" class="field-error">{{ newNameError }}</span>
        </TableCell>
        <TableCell>
          <input
            class="station-input"
            type="text"
            :value="newUrl"
            placeholder="https://www.prix-carburants.gouv.fr/station/..."
            @input="onNewUrlInput($event)"
            @blur="onNewRowBlur"
          />
          <span v-if="newUrlError" class="field-error">{{ newUrlError }}</span>
        </TableCell>
        <TableCell class="w-px whitespace-nowrap"></TableCell>
      </TableRow>
      <TableRow v-for="(draft, index) in rowDrafts" :key="draft.originalUrl" :disable-hover="true">
        <TableCell>
          <input
            class="station-input"
            type="text"
            :value="draft.name"
            @input="onExistingNameInput(index, $event)"
            @blur="onExistingNameBlur(index)"
          />
          <span v-if="draft.nameError" class="field-error">{{ draft.nameError }}</span>
        </TableCell>
        <TableCell>
          <input
            class="station-input"
            type="text"
            :value="draft.url"
            @input="onExistingUrlInput(index, $event)"
            @blur="onExistingUrlBlur(index)"
          />
          <span v-if="draft.urlError" class="field-error">{{ draft.urlError }}</span>
        </TableCell>
        <TableCell class="w-px whitespace-nowrap">
          <button class="delete-button" type="button" @click="onDelete(draft.originalUrl)">
            ✕
          </button>
          <span v-if="draft.rowError" class="field-error">{{ draft.rowError }}</span>
          <span v-if="rowSuccessMap[draft.originalUrl]" class="field-success">Saved</span>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>

<script async setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStationStorage } from '@/composables/useStationStorage'
import type { Station } from '@/types/station'

const SUCCESS_DISMISS_DELAY_MS = 2000
const ALLOWED_ORIGIN = 'https://www.prix-carburants.gouv.fr'
const ALLOWED_PATH_PREFIX = '/station/'

interface RowDraft {
  originalUrl: string
  name: string
  url: string
  nameError: string
  urlError: string
  rowError: string
}

const { stations, loadStations, addStation, removeStation, updateStation } = useStationStorage()

await loadStations()

const rowDrafts: Ref<RowDraft[]> = ref([])

/**
 * Per-row success visibility map, keyed by originalUrl.
 * Kept separate from RowDraft so the watch rebuild does not wipe a
 * success message that was just set after a successful updateStation call.
 */
const rowSuccessMap = reactive<Record<string, boolean>>({})

const newName = ref('')
const newUrl = ref('')
const newNameError = ref('')
const newUrlError = ref('')

function buildDrafts(list: Station[]): RowDraft[] {
  return list.map((station) => ({
    originalUrl: station.url,
    name: station.name,
    url: station.url,
    nameError: '',
    urlError: '',
    rowError: '',
  }))
}

watch(
  stations,
  (list) => {
    rowDrafts.value = buildDrafts(list)
  },
  { immediate: true },
)

function isValidUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return parsed.origin === ALLOWED_ORIGIN && parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)
  } catch {
    return false
  }
}

function isDuplicateUrl(candidateUrl: string, excludeOriginalUrl?: string): boolean {
  return stations.value.some(
    (station) => station.url === candidateUrl && station.url !== excludeOriginalUrl,
  )
}

function onExistingNameInput(index: number, event: Event): void {
  const draft = rowDrafts.value[index]
  draft.name = (event.target as HTMLInputElement).value
  draft.nameError = ''
}

function onExistingUrlInput(index: number, event: Event): void {
  const draft = rowDrafts.value[index]
  draft.url = (event.target as HTMLInputElement).value
  draft.urlError = ''
}

async function onExistingNameBlur(index: number): Promise<void> {
  const draft = rowDrafts.value[index]
  const trimmed = draft.name.trim()

  if (trimmed.length === 0) {
    draft.nameError = 'Name must not be empty.'
    revertDraftName(index)
    return
  }

  const original = stations.value.find((s) => s.url === draft.originalUrl)
  if (original && trimmed === original.name && draft.url.trim() === original.url) return

  await saveExistingRow(index, trimmed, draft.url.trim())
}

async function onExistingUrlBlur(index: number): Promise<void> {
  const draft = rowDrafts.value[index]
  const trimmedUrl = draft.url.trim()

  if (!isValidUrl(trimmedUrl)) {
    draft.urlError = 'URL must be a valid prix-carburants.gouv.fr station URL.'
    revertDraftUrl(index)
    return
  }

  if (isDuplicateUrl(trimmedUrl, draft.originalUrl)) {
    draft.urlError = 'This URL already exists in the list.'
    revertDraftUrl(index)
    return
  }

  const original = stations.value.find((s) => s.url === draft.originalUrl)
  if (original && draft.name.trim() === original.name && trimmedUrl === original.url) return

  await saveExistingRow(index, draft.name.trim(), trimmedUrl)
}

function revertDraftName(index: number): void {
  const original = stations.value.find(
    (station) => station.url === rowDrafts.value[index].originalUrl,
  )
  if (original) rowDrafts.value[index].name = original.name
}

function revertDraftUrl(index: number): void {
  rowDrafts.value[index].url = rowDrafts.value[index].originalUrl
}

function scheduleSuccessDismiss(savedUrl: string): void {
  setTimeout(() => {
    delete rowSuccessMap[savedUrl]
  }, SUCCESS_DISMISS_DELAY_MS)
}

async function saveExistingRow(index: number, name: string, url: string): Promise<void> {
  const draft = rowDrafts.value[index]
  const originalUrl = draft.originalUrl
  try {
    await updateStation(originalUrl, { name, url })
    rowSuccessMap[originalUrl] = true
    scheduleSuccessDismiss(originalUrl)
  } catch {
    draft.rowError = 'Could not save changes. Please try again.'
  }
}

async function onDelete(originalUrl: string): Promise<void> {
  const draft = rowDrafts.value.find((row) => row.originalUrl === originalUrl)
  try {
    await removeStation(originalUrl)
  } catch {
    if (draft) draft.rowError = 'Could not delete station. Please try again.'
  }
}

function onNewNameInput(event: Event): void {
  newName.value = (event.target as HTMLInputElement).value
  newNameError.value = ''
}

function onNewUrlInput(event: Event): void {
  newUrl.value = (event.target as HTMLInputElement).value
  newUrlError.value = ''
}

async function onNewRowBlur(): Promise<void> {
  const trimmedName = newName.value.trim()
  const trimmedUrl = newUrl.value.trim()

  const namePresent = trimmedName.length > 0
  const urlPresent = trimmedUrl.length > 0

  if (!namePresent && !urlPresent) return
  if (namePresent && !urlPresent) return

  let hasError = false

  if (!namePresent) {
    newNameError.value = 'Name must not be empty.'
    hasError = true
  }

  if (!isValidUrl(trimmedUrl)) {
    newUrlError.value = 'URL must be a valid prix-carburants.gouv.fr station URL.'
    hasError = true
  } else if (isDuplicateUrl(trimmedUrl)) {
    newUrlError.value = 'This URL already exists in the list.'
    hasError = true
  }

  if (hasError) return

  try {
    await addStation({ name: trimmedName, url: trimmedUrl })
    newName.value = ''
    newUrl.value = ''
    newNameError.value = ''
    newUrlError.value = ''
  } catch {
    newUrlError.value = 'Could not save station. Please try again.'
  }
}
</script>

<style scoped>
.station-input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.station-input:focus {
  outline: none;
  border-color: var(--ring, #6366f1);
}

.field-error {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.field-success {
  display: block;
  font-size: 0.75rem;
  color: #22c55e;
  margin-top: 0.25rem;
}

.delete-button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #ef4444;
  background: transparent;
  border: 1px solid #ef4444;
  border-radius: 0.25rem;
  cursor: pointer;
}

.delete-button:hover {
  background: #ef4444;
  color: white;
}
</style>
