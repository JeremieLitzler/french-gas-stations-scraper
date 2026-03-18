<template>
  <div class="station-prices">
    <h2 class="text-xl font-semibold mb-1">Prices</h2>
    <p class="mb-4">Change fuel type to your need</p>
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
