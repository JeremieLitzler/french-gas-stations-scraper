<template>
  <div class="station-manager">
    <h2 class="text-xl font-semibold mb-1">Station List</h2>
    <p class="mb-4">
      Edit the list of station by giving a name and the link from
      <AppLink href="https://www.prix-carburants.gouv.fr/" target="_blank" rel="noopener"
        >https://www.prix-carburants.gouv.fr/</AppLink
      >
    </p>
    <Suspense>
      <StationManagerTable />
      <template #fallback>
        <AppLoader />
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.station-manager {
  width: 100%;
}
</style>
