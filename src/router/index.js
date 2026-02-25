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
  {
    path: '/ai-studio',
    name: 'AIStudio',
    component: () => import('../views/AIStudio.vue'),
  },
  {
    path: '/watermark-removal',
    name: 'WatermarkRemoval',
    component: () => import('../views/WatermarkRemoval.vue'),
  },
  {
    path: '/doc-convert',
    name: 'DocConvert',
    component: () => import('../views/DocConvert.vue'),
  },
  {
    path: '/image-compress',
    name: 'ImageCompress',
    component: () => import('../views/ImageCompress.vue'),
  },
  {
    path: '/screen-record',
    name: 'ScreenRecord',
    component: () => import('../views/ScreenRecord.vue'),
  },
  {
    path: '/id-photo',
    name: 'IdPhoto',
    component: () => import('../views/IdPhoto.vue'),
  },
  {
    path: '/qr-code',
    name: 'QrCode',
    component: () => import('../views/QrCode.vue'),
  },
  {
    path: '/ocr',
    name: 'OcrRecognition',
    component: () => import('../views/OcrRecognition.vue'),
  },
  {
    path: '/remove-bg',
    name: 'RemoveBg',
    component: () => import('../views/RemoveBg.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPassword.vue'),
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
