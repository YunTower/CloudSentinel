import '@/shared/styles/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from '@/public/App.vue'
import PublicPageView from '@/public/views/PublicPageView.vue'
import { useTheme } from '@/shared/composables/useTheme'

const { initializeTheme, setupThemeListener } = useTheme()
initializeTheme()
setupThemeListener()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/public' },
    { path: '/public/:pathMatch(.*)*', component: PublicPageView },
  ],
})

createApp(App).use(router).mount('#app')
