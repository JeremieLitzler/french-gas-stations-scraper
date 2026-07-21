<script setup lang="ts">
import type { StationDiffRow, FuelTypeDiff } from '@/types/preferences'
import { usePreferencesImport } from '@/composables/usePreferencesImport'
import { useRemotePreferencesWrite } from '@/composables/useRemotePreferencesWrite'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { useGitHubAuth } from '@/composables/useGitHubAuth'
import { computed } from 'vue'

const {
  diff,
  doOpenDialog: isDialogOpen,
  fuelTypeWarning,
  applyDiff,
  cancelImport,
} = usePreferencesImport()
const { writeDiff, isWriteDialogOpen, isWriting, confirmWrite, cancelWrite } =
  useRemotePreferencesWrite()
const { addStation, updateStation } = useStationStorage()
const { saveDefaultFuelType, clearDefaultFuelType } = useDefaultFuelType()
const { handleUnauthorized } = useGitHubAuth()

/**
 * Confirmation is blocked until every conflict is resolved:
 * - All 'conflict' station rows must have a chosenName.
 * - The fuelTypeDiff (when present) must have a chosen value.
 */
const isConfirmEnabled = computed((): boolean => {
  if (diff.value === null) return false
  const allStationsResolved = diff.value.stationRows.every(isRowResolved)
  const fuelTypeResolved = isFuelTypeDiffResolved(diff.value.fuelTypeDiff)
  return allStationsResolved && fuelTypeResolved
})

function isRowResolved(row: StationDiffRow): boolean {
  if (row.kind === 'new') return true
  return row.chosenName !== null
}

function isFuelTypeDiffResolved(fuelTypeDiff: FuelTypeDiff | null): boolean {
  if (fuelTypeDiff === null) return true
  return fuelTypeDiff.chosen !== null
}

const onConfirm = async (): Promise<void> => {
  await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)
}

const onChooseName = (row: StationDiffRow, choice: 'file' | 'stored'): void => {
  row.chosenName = choice
}

const onToggleNew = (row: StationDiffRow): void => {
  row.selected = !row.selected
}

const onChooseFuelType = (fuelTypeDiff: FuelTypeDiff, choice: 'file' | 'stored'): void => {
  fuelTypeDiff.chosen = choice
}

const onConfirmWrite = async (): Promise<void> => {
  await confirmWrite(handleUnauthorized)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isDialogOpen && diff"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-dialog-title"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
      >
        <h2 id="diff-dialog-title" class="text-lg font-semibold">
          Aperçu des changements à importer
        </h2>

        <!-- Fuel type warning: shown when the file's fuelTypeDefault was not recognised -->
        <p v-if="fuelTypeWarning" role="alert" class="text-sm text-amber-600">
          {{ fuelTypeWarning }}
        </p>

        <!-- Station diff table -->
        <div v-if="diff.stationRows.length > 0">
          <h3 class="text-sm font-medium mb-2">Stations</h3>
          <Table>
            <TableHeader>
              <TableRow :disable-hover="true">
                <TableHead>Statut</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Nom (fichier)</TableHead>
                <TableHead>Nom (actuel)</TableHead>
                <TableHead>Choix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in diff.stationRows" :key="row.url" :disable-hover="true">
                <TableCell>
                  <span v-if="row.kind === 'new'" class="text-green-600 text-sm font-medium"
                    >Ajoutée</span
                  >
                  <span v-else class="text-amber-600 text-sm font-medium">Conflit</span>
                </TableCell>
                <TableCell class="text-xs break-all max-w-xs">{{ row.url }}</TableCell>
                <TableCell class="text-sm">{{ row.fileStation.name }}</TableCell>
                <TableCell class="text-sm">{{ row.storedStation?.name ?? '—' }}</TableCell>
                <TableCell>
                  <!-- New station: checkbox to include/exclude -->
                  <label
                    v-if="row.kind === 'new'"
                    class="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input type="checkbox" :checked="row.selected" @change="onToggleNew(row)" />
                    Inclure
                  </label>
                  <!-- Conflict: radio buttons to choose which name to keep -->
                  <div v-else class="flex flex-col gap-1 text-sm">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        :name="`name-${row.url}`"
                        value="file"
                        :checked="row.chosenName === 'file'"
                        @change="onChooseName(row, 'file')"
                      />
                      Fichier
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        :name="`name-${row.url}`"
                        value="stored"
                        :checked="row.chosenName === 'stored'"
                        @change="onChooseName(row, 'stored')"
                      />
                      Actuel
                    </label>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Fuel type diff -->
        <div v-if="diff.fuelTypeDiff" class="border rounded p-3 flex flex-col gap-2">
          <h3 class="text-sm font-medium">Carburant par défaut</h3>
          <div class="flex gap-6 text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fuel-type-choice"
                value="file"
                :checked="diff.fuelTypeDiff.chosen === 'file'"
                @change="onChooseFuelType(diff.fuelTypeDiff, 'file')"
              />
              Fichier : {{ diff.fuelTypeDiff.fileValue ?? 'aucun' }}
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fuel-type-choice"
                value="stored"
                :checked="diff.fuelTypeDiff.chosen === 'stored'"
                @change="onChooseFuelType(diff.fuelTypeDiff, 'stored')"
              />
              Actuel : {{ diff.fuelTypeDiff.storedValue ?? 'aucun' }}
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <Button variant="outline" @click="cancelImport">Annuler</Button>
          <Button :disabled="!isConfirmEnabled" @click="onConfirm">Confirmer l'import</Button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Write-confirm mode (Sub-Issue D, issue #64): before/after preview of the
       remote file, a single confirm/cancel — the local state already written
       to IndexedDB is already the value being pushed, so there is nothing to
       merge (business-specifications.md Sub-Issue D rule 2). Every value below
       renders through Vue's default text interpolation, never v-html
       (security-guidelines.md rule 8). -->
  <Teleport to="body">
    <div
      v-if="isWriteDialogOpen && writeDiff"
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-diff-dialog-title"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
      >
        <h2 id="write-diff-dialog-title" class="text-lg font-semibold">
          Aperçu des changements à enregistrer sur GitHub
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-medium mb-2">Actuel (GitHub)</h3>
            <pre class="text-xs bg-gray-50 rounded p-3 overflow-x-auto">{{ writeDiff.beforeJson }}</pre>
          </div>
          <div>
            <h3 class="text-sm font-medium mb-2">Nouveau</h3>
            <pre class="text-xs bg-gray-50 rounded p-3 overflow-x-auto">{{ writeDiff.afterJson }}</pre>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button variant="outline" :disabled="isWriting" @click="cancelWrite">Annuler</Button>
          <Button :disabled="isWriting" @click="onConfirmWrite">Confirmer l'envoi</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
