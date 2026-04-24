import { createRouter, createWebHistory } from 'vue-router'
import { getAuthToken } from '../services/apiClient'

const Home = () => import('../views/Home.vue')
const AuthCenter = () => import('../views/AuthCenter.vue')
const AccountCenter = () => import('../views/AccountCenter.vue')
const Travel = () => import('../views/Travel.vue')
const Writer = () => import('../views/Writer.vue')
const Translator = () => import('../views/Translator.vue')
const Mind = () => import('../views/Mind.vue')
const WatermarkRemoval = () => import('../views/WatermarkRemoval.vue')
const DocConvert = () => import('../views/DocConvert.vue')
const ImageCompress = () => import('../views/ImageCompress.vue')
const MediaTools = () => import('../views/MediaTools.vue')
const VideoCompress = () => import('../views/VideoCompress.vue')
const ScreenRecord = () => import('../views/ScreenRecord.vue')
const AudioConvert = () => import('../views/AudioConvert.vue')
const GifTools = () => import('../views/GifTools.vue')
const IdPhoto = () => import('../views/IdPhoto.vue')
const QrCode = () => import('../views/QrCode.vue')
const QrScan = () => import('../views/QrScan.vue')
const OcrRecognition = () => import('../views/OcrRecognition.vue')
const RemoveBg = () => import('../views/RemoveBg.vue')
const IdGenerator = () => import('../views/IdGenerator.vue')
const ResumeBuilder = () => import('../views/ResumeBuilder.vue')
const DataConvert = () => import('../views/DataConvert.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/auth',
    name: 'AuthCenter',
    component: AuthCenter,
  },
  {
    path: '/account',
    name: 'AccountCenter',
    component: AccountCenter,
    meta: { requiresAuth: true },
  },
  {
    path: '/travel',
    name: 'Travel',
    component: Travel,
    meta: { featureCode: 'travel' },
  },
  {
    path: '/writer',
    name: 'Writer',
    component: Writer,
    meta: { featureCode: 'writer' },
  },
  {
    path: '/translator',
    name: 'Translator',
    component: Translator,
    meta: { featureCode: 'translator' },
  },
  {
    path: '/mind',
    name: 'Mind',
    component: Mind,
    meta: { featureCode: 'mind' },
  },
  {
    path: '/watermark-removal',
    name: 'WatermarkRemoval',
    component: WatermarkRemoval,
    meta: { featureCode: 'watermark-removal' },
  },
  {
    path: '/doc-convert',
    name: 'DocConvert',
    component: DocConvert,
    meta: { featureCode: 'doc-convert' },
  },
  {
    path: '/image-compress',
    name: 'ImageCompress',
    component: ImageCompress,
    meta: { featureCode: 'image-compress' },
  },
  {
    path: '/media',
    name: 'MediaTools',
    redirect: '/media/compress',
    component: MediaTools,
    children: [
      {
        path: 'compress',
        name: 'VideoCompress',
        component: VideoCompress,
        meta: { featureCode: 'video-compress' },
      },
      {
        path: 'record',
        name: 'ScreenRecord',
        component: ScreenRecord,
        meta: { featureCode: 'screen-record' },
      },
      {
        path: 'audio-convert',
        name: 'AudioConvert',
        component: AudioConvert,
        meta: { featureCode: 'audio-convert' },
      },
      {
        path: 'gif',
        name: 'GifTools',
        component: GifTools,
        meta: { featureCode: 'gif-tools' },
      },
    ]
  },
  {
    path: '/data-convert',
    name: 'DataConvert',
    component: DataConvert,
    meta: { featureCode: 'data-convert' },
  },
  {
    path: '/id-photo',
    name: 'IdPhoto',
    component: IdPhoto,
    meta: { featureCode: 'id-photo' },
  },
  {
    path: '/qr-code',
    name: 'QrCode',
    component: QrCode,
    meta: { featureCode: 'qr-code' },
  },
  {
    path: '/qr-scan',
    name: 'QrScan',
    component: QrScan,
    meta: { featureCode: 'qr-scan' },
  },
  {
    path: '/ocr',
    name: 'OcrRecognition',
    component: OcrRecognition,
    meta: { featureCode: 'ocr' },
  },
  {
    path: '/remove-bg',
    name: 'RemoveBg',
    component: RemoveBg,
    meta: { featureCode: 'remove-bg' },
  },
  {
    path: '/id-generator',
    name: 'IdGenerator',
    component: IdGenerator,
    meta: { featureCode: 'id-generator' },
  },
  {
    path: '/resume-builder',
    name: 'ResumeBuilder',
    component: ResumeBuilder,
    meta: { featureCode: 'resume-builder' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      // 使用平滑滚动，以避免与页面过渡动画冲突
      return { top: 0, behavior: 'smooth' }
    }
  },
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getAuthToken()) {
    return {
      name: 'AuthCenter',
      query: { redirect: to.fullPath },
    }
  }
  return true
})

export default router
