<template>
  <footer class="border-t flex flex-wrap justify-center items-center gap-4 px-4 py-3 text-sm">
    <span>
      Fait 🛠️ par
      <AppLink to="https://iamjeremie.me/">Jeremie</AppLink>
      et
      <AppLink to="https://claude.ai/code">Claude</AppLink>
    </span>
    <span>|</span>
    <AppLink to="https://github.com/JeremieLitzler/french-gas-stations-scraper/blob/main/LICENSE">
      Licence
    </AppLink>
    <span>|</span>
    <AppLink to="https://www.netlify.com/">Hébergé sur Netlify</AppLink>
    <span>|</span>
    <AppLink to="/mentions-legales">Mentions légales</AppLink>
    <span>|</span>
    <AppLink to="https://app.netlify.com/projects/coup-de-pompe/deploys">
      <img
        src="https://api.netlify.com/api/v1/badges/36800925-289c-4bed-9ee5-6aaec9dcfdf9/deploy-status"
        alt="Statut du déploiement Netlify"
        class="inline-block h-5 align-middle"
      />
    </AppLink>
  </footer>
</template>
