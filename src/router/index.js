import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../views/Home.vue')
const Travel = () => import('../views/Travel.vue')
const Writer = () => import('../views/Writer.vue')
const Translator = () => import('../views/Translator.vue')
const Mind = () => import('../views/Mind.vue')
const AIStudio = () => import('../views/AIStudio.vue')
const WatermarkRemoval = () => import('../views/WatermarkRemoval.vue')
const DocConvert = () => import('../views/DocConvert.vue')
const ImageCompress = () => import('../views/ImageCompress.vue')
const MediaTools = () => import('../views/MediaTools.vue')
const VideoCompress = () => import('../views/VideoCompress.vue')
const ScreenRecord = () => import('../views/ScreenRecord.vue')
const AudioConvert = () => import('../views/AudioConvert.vue')
const IdPhoto = () => import('../views/IdPhoto.vue')
const QrCode = () => import('../views/QrCode.vue')
const OcrRecognition = () => import('../views/OcrRecognition.vue')
const RemoveBg = () => import('../views/RemoveBg.vue')
const IdGenerator = () => import('../views/IdGenerator.vue')
const ResumeBuilder = () => import('../views/ResumeBuilder.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/travel',
    name: 'Travel',
    component: Travel,
  },
  {
    path: '/writer',
    name: 'Writer',
    component: Writer,
  },
  {
    path: '/translator',
    name: 'Translator',
    component: Translator,
  },
  {
    path: '/mind',
    name: 'Mind',
    component: Mind,
  },
  {
    path: '/ai-studio',
    name: 'AIStudio',
    component: AIStudio,
  },
  {
    path: '/watermark-removal',
    name: 'WatermarkRemoval',
    component: WatermarkRemoval,
  },
  {
    path: '/doc-convert',
    name: 'DocConvert',
    component: DocConvert,
  },
  {
    path: '/image-compress',
    name: 'ImageCompress',
    component: ImageCompress,
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
      },
      {
        path: 'record',
        name: 'ScreenRecord',
        component: ScreenRecord,
      },
      {
        path: 'audio-convert',
        name: 'AudioConvert',
        component: AudioConvert,
      },
    ]
  },
  {
    path: '/id-photo',
    name: 'IdPhoto',
    component: IdPhoto,
  },
  {
    path: '/qr-code',
    name: 'QrCode',
    component: QrCode,
  },
  {
    path: '/ocr',
    name: 'OcrRecognition',
    component: OcrRecognition,
  },
  {
    path: '/remove-bg',
    name: 'RemoveBg',
    component: RemoveBg,
  },
  {
    path: '/id-generator',
    name: 'IdGenerator',
    component: IdGenerator,
  },
  {
    path: '/resume-builder',
    name: 'ResumeBuilder',
    component: ResumeBuilder,
  },
]

export default createRouter({
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
