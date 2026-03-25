<template>
  <div class="station-manager">
    <h2 class="text-xl font-semibold mb-1">Liste des stations</h2>
    <p class="mb-4">
      Gérez votre liste de stations en renseignant un nom et le lien depuis
      <AppLink href="https://www.prix-carburants.gouv.fr/" target="_blank" rel="noopener"
        >https://www.prix-carburants.gouv.fr/</AppLink
      >
    </p>
    <div class="flex gap-3 mb-4">
      <PreferencesExport />
      <PreferencesImport />
    </div>
    <details>
      <summary class="cursor-pointer mb-2">Afficher / masquer la liste</summary>
      <Suspense>
        <StationManagerTable />
        <template #fallback>
          <AppLoader />
        </template>
      </Suspense>
    </details>
    <PreferencesDiffDialog />
  </div>
</template>

<style scoped>
.station-manager {
  width: 100%;
}
</style>
