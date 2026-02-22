import '@/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { role, auth } from './directives/permission'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

app.directive('role', role)
app.directive('auth', auth)

const pinia = createPinia()
app.use(pinia)
app.use(router)

const authStore = useAuthStore()
authStore
  .bootstrap()
  .then(() => app.mount('#app'))
  .catch((error) => {
    console.error('Failed to initialize auth state:', error)
    app.mount('#app')
  })
