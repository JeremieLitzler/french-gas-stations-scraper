<template>
  <div class="station-prices">
    <h2 class="text-xl font-semibold mb-1">Prix</h2>
    <p class="mb-4">Choisissez le type de carburant selon vos besoins</p>
    <Suspense>
      <StationPricesContent />
      <template #fallback>
        <AppLoader />
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.station-prices {
  margin: 1rem 0;
}
</style>
