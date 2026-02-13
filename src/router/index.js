import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/travel',
    name: 'Travel',
    component: () => import('../views/Travel.vue'),
  },
  {
    path: '/writer',
    name: 'Writer',
    component: () => import('../views/Writer.vue'),
  },
  {
    path: '/translator',
    name: 'Translator',
    component: () => import('../views/Translator.vue'),
  },
  {
    path: '/mind',
    name: 'Mind',
    component: () => import('../views/Mind.vue'),
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
