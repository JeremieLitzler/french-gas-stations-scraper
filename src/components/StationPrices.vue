<template>
  <div class="station-prices">
    <h2 class="text-xl font-semibold mb-1">Prix par station</h2>
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
