import './assets/index.css'

import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)
app.config.errorHandler = (error) => {
  // TODO > improve the custom handler
  console.error(error)
}

app.mount('#app')
