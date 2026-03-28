<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import {
  Plane, PenTool, Globe, Lightbulb, Sparkles,
  Eraser, FileText, ImageDown, MonitorPlay,
  Image, Wrench, Bot, Camera, QrCode, ScanLine, Scissors, CreditCard, Video, ScrollText,
  ArrowRight, Wand2, Zap
} from 'lucide-vue-next'
import UiverseCard from '../components/UiverseCard.vue'

const router = useRouter()
const homeRef = ref(null)
const heroSceneRef = ref(null)
const gridCols = ref(4)

let resizeObserver = null
let scene = null
let camera = null
let renderer = null
let gridGroup = null
let animationFrameId = 0

const updateGridCols = () => {
  const width = homeRef.value?.clientWidth ?? window.innerWidth
  const idealCols = Math.floor(width / 280)
  gridCols.value = Math.min(4, Math.max(2, idealCols))
}

const createHeroScene = () => {
  if (!heroSceneRef.value) return

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xffffff, 10, 38)

  const width = heroSceneRef.value.clientWidth || window.innerWidth
  const height = heroSceneRef.value.clientHeight || Math.max(window.innerHeight * 0.72, 560)

  camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100)
  camera.position.set(0, 7.5, 15.5)
  camera.lookAt(0, 0, -16)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
  renderer.setSize(width, height)
  renderer.setClearColor(0xffffff, 0)
  heroSceneRef.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.15)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(2, 8, 6)
  scene.add(directionalLight)

  gridGroup = new THREE.Group()

  const horizontalMaterial = new THREE.LineBasicMaterial({
    color: 0xd7dbe3,
    transparent: true,
    opacity: 0.9,
  })

  const verticalMaterial = new THREE.LineBasicMaterial({
    color: 0xe1e4ea,
    transparent: true,
    opacity: 0.72,
  })

  const depth = 44
  const widthSpan = 36
  const segments = 30

  for (let i = 0; i <= segments; i += 1) {
    const x = -widthSpan / 2 + (widthSpan / segments) * i
    const points = [
      new THREE.Vector3(x, 0, 2),
      new THREE.Vector3(x, 0, -depth),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geometry, verticalMaterial)
    gridGroup.add(line)
  }

  for (let i = 0; i <= 18; i += 1) {
    const z = 2 - i * 2.35
    const points = [
      new THREE.Vector3(-widthSpan / 2, 0, z),
      new THREE.Vector3(widthSpan / 2, 0, z),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geometry, horizontalMaterial)
    gridGroup.add(line)
  }

  gridGroup.position.y = -2.6
  gridGroup.rotation.x = -0.01
  scene.add(gridGroup)

  const animate = () => {
    animationFrameId = window.requestAnimationFrame(animate)
    if (gridGroup) {
      gridGroup.position.x = Math.sin(Date.now() * 0.00012) * 0.18
    }
    renderer?.render(scene, camera)
  }

  animate()
}

const resizeHeroScene = () => {
  updateGridCols()
  if (!heroSceneRef.value || !camera || !renderer) return

  const width = heroSceneRef.value.clientWidth || window.innerWidth
  const height = heroSceneRef.value.clientHeight || Math.max(window.innerHeight * 0.72, 560)

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
  renderer.setSize(width, height)
}

const destroyHeroScene = () => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }

  if (gridGroup) {
    gridGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose())
        else child.material.dispose()
      }
    })
  }

  if (renderer) {
    renderer.dispose()
    renderer.domElement?.remove()
  }

  scene = null
  camera = null
  renderer = null
  gridGroup = null
}

onMounted(() => {
  updateGridCols()
  createHeroScene()

  if ('ResizeObserver' in window && homeRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeHeroScene()
    })
    resizeObserver.observe(homeRef.value)
  }

  window.addEventListener('resize', resizeHeroScene, { passive: true })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', resizeHeroScene)
  destroyHeroScene()
})

const toolCategories = [
  {
    id: 'image',
    label: '处理图片',
    icon: Image,
    desc: '去水印、压缩、证件照、抠图这些高频任务，尽量一步直达。',
    tone: 'mint',
    tools: [
      {
        id: 'watermark-removal',
        path: '/watermark-removal',
        icon: Eraser,
        name: '图片去水印',
        desc: '智能识别并去除复杂水印，一键还原清晰图片',
        gradient: 'linear-gradient(145deg, #34d399, #14b8a6)',
        shadowColor: 'rgba(52, 211, 153, 0.22)',
      },
      {
        id: 'image-compress',
        path: '/image-compress',
        icon: ImageDown,
        name: '图片压缩',
        desc: '多种压缩方式可选，体积和画质平衡更聪明',
        gradient: 'linear-gradient(145deg, #38bdf8, #22c55e)',
        shadowColor: 'rgba(56, 189, 248, 0.22)',
      },
      {
        id: 'id-photo',
        path: '/id-photo',
        icon: Camera,
        name: '证件照制作',
        desc: '标准尺寸、换底色、裁剪排版，一站搞定',
        gradient: 'linear-gradient(145deg, #14b8a6, #10b981)',
        shadowColor: 'rgba(20, 184, 166, 0.22)',
      },
      {
        id: 'remove-bg',
        path: '/remove-bg',
        icon: Scissors,
        name: 'AI 抠图',
        desc: '自动识别主体，一键去背景，干净利落',
        gradient: 'linear-gradient(145deg, #8b5cf6, #ec4899)',
        shadowColor: 'rgba(139, 92, 246, 0.22)',
      },
    ],
  },
  {
    id: 'media',
    label: '音视频处理',
    icon: Video,
    desc: '压缩、录制、转换都放在一起，减少来回折腾。',
    tone: 'sunset',
    tools: [
      {
        id: 'video-compress',
        path: '/media/compress',
        icon: Video,
        name: '视频压缩',
        desc: '浏览器端 FFmpeg 压缩视频，多种预设和分辨率可选',
        gradient: 'linear-gradient(145deg, #fb7185, #f97316)',
        shadowColor: 'rgba(249, 115, 22, 0.22)',
      },
      {
        id: 'screen-record',
        path: '/media/record',
        icon: MonitorPlay,
        name: '屏幕录制',
        desc: '直接录屏，支持系统声音和麦克风，不折腾',
        gradient: 'linear-gradient(145deg, #ef4444, #f97316)',
        shadowColor: 'rgba(239, 68, 68, 0.22)',
      },
      {
        id: 'audio-convert',
        path: '/media/audio-convert',
        icon: FileText,
        name: '音频转换',
        desc: 'MP3、WAV、FLAC、M4A 等格式互转',
        gradient: 'linear-gradient(145deg, #e879f9, #ec4899)',
        shadowColor: 'rgba(232, 121, 249, 0.22)',
      },
    ],
  },
  {
    id: 'utility',
    label: '文档与效率',
    icon: Wrench,
    desc: '文档转换、二维码、OCR、测试数据，工作流里的常用件。',
    tone: 'violet',
    tools: [
      {
        id: 'doc-convert',
        path: '/doc-convert',
        icon: FileText,
        name: '文档转换',
        desc: 'PDF、Word、Markdown、HTML、图片等多种格式互转',
        gradient: 'linear-gradient(145deg, #60a5fa, #8b5cf6)',
        shadowColor: 'rgba(96, 165, 250, 0.22)',
      },
      {
        id: 'qr-code',
        path: '/qr-code',
        icon: QrCode,
        name: 'QR 码生成',
        desc: '支持颜色、Logo 和容错等级，自定义更漂亮',
        gradient: 'linear-gradient(145deg, #8b5cf6, #6366f1)',
        shadowColor: 'rgba(139, 92, 246, 0.22)',
      },
      {
        id: 'ocr',
        path: '/ocr',
        icon: ScanLine,
        name: 'OCR 识别',
        desc: '图片转文字，支持中英文和多场景识别',
        gradient: 'linear-gradient(145deg, #06b6d4, #8b5cf6)',
        shadowColor: 'rgba(6, 182, 212, 0.22)',
      },
      {
        id: 'id-generator',
        path: '/id-generator',
        icon: CreditCard,
        name: '身份证号生成',
        desc: '适合开发测试，支持地区、性别和出生日期定制',
        gradient: 'linear-gradient(145deg, #3b82f6, #10b981)',
        shadowColor: 'rgba(59, 130, 246, 0.22)',
      },
      {
        id: 'resume-builder',
        path: '/resume-builder',
        icon: ScrollText,
        name: 'AI 简历工坊',
        desc: 'Markdown 编辑、拖拽模块、AI 润色与导出',
        gradient: 'linear-gradient(145deg, #14b8a6, #f59e0b)',
        shadowColor: 'rgba(20, 184, 166, 0.22)',
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI 创作与灵感',
    icon: Bot,
    desc: '把写作、创意、翻译、规划这些活儿交给 AI 干。',
    tone: 'gold',
    tools: [
      {
        id: 'ai-studio',
        path: '/ai-studio',
        icon: Wand2,
        name: 'AI 创作',
        desc: '图片、视频、图生视频创作，适合灵感试验场',
        gradient: 'linear-gradient(145deg, #f59e0b, #d97706)',
        shadowColor: 'rgba(245, 158, 11, 0.22)',
      },
      {
        id: 'travel',
        path: '/travel',
        icon: Plane,
        name: '旅行规划',
        desc: '输入天数和预算，快速生成可执行的行程方案',
        gradient: 'linear-gradient(145deg, #fb7185, #ef4444)',
        shadowColor: 'rgba(251, 113, 133, 0.22)',
      },
      {
        id: 'writer',
        path: '/writer',
        icon: PenTool,
        name: '写作助手',
        desc: '润色、扩写、改写、续写，文字更顺更有力',
        gradient: 'linear-gradient(145deg, #fb923c, #f97316)',
        shadowColor: 'rgba(251, 146, 60, 0.22)',
      },
      {
        id: 'translator',
        path: '/translator',
        icon: Globe,
        name: '翻译专家',
        desc: '多语言互译与自然表达，跨语种沟通省事很多',
        gradient: 'linear-gradient(145deg, #2dd4bf, #0d9488)',
        shadowColor: 'rgba(45, 212, 191, 0.22)',
      },
      {
        id: 'mind',
        path: '/mind',
        icon: Lightbulb,
        name: '头脑风暴',
        desc: '创意发散、问题拆解、思路延展，一键开脑洞',
        gradient: 'linear-gradient(145deg, #facc15, #eab308)',
        shadowColor: 'rgba(250, 204, 21, 0.22)',
      },
    ],
  },
]
</script>

<template>
  <div ref="homeRef" class="home" :style="{ '--home-grid-cols': gridCols }">
    <section class="hero-shell">
      <div ref="heroSceneRef" class="hero-scene"></div>
      <div class="hero-atmosphere hero-atmosphere--top"></div>
      <div class="hero-atmosphere hero-atmosphere--bottom"></div>

      <div class="hero-content">
        <div class="hero-badge hero-badge--floating">
          <Zap :size="14" />
          <span>AI API Gateway</span>
        </div>

        <div class="hero-grid hero-grid--single">
          <div class="hero-copy">
            <h1 class="hero-title hero-title--display">Pond Hub</h1>

            <p class="hero-desc hero-desc--lead">
              欢迎使用 Pond Hub API 公益服务，支持多种主流模型。
            </p>

            <div class="hero-intro">
              <h2>准备好开始了吗？</h2>
              <p>几分钟内即可完成接入，开始使用全球主流 AI 模型。</p>
            </div>

            <div class="hero-actions hero-actions--centered">
              <button class="hero-cta hero-cta--dark" @click="router.push('/watermark-removal')">
                <span>控制台</span>
                <ArrowRight :size="18" />
              </button>
              <button class="hero-cta hero-cta--outline" @click="router.push('/doc-convert')">
                <FileText :size="18" />
                <span>留言板</span>
              </button>
              <button class="hero-cta hero-cta--outline" @click="router.push('/ai-studio')">
                <ArrowRight :size="18" />
                <span>查看模型价格</span>
              </button>
              <button class="hero-cta hero-cta--outline" @click="router.push('/travel')">
                <ArrowRight :size="18" />
                <span>查看服务状态</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="tools tools--first">
      <div v-for="category in toolCategories" :key="category.id" class="tools__category">
        <div class="category-head" :data-tone="category.tone">
          <div class="category-head__main">
            <div class="category-head__icon">
              <component :is="category.icon" class="category-head__icon-svg" />
            </div>
            <div class="category-head__text">
              <span class="section-kicker section-kicker--small">Category</span>
              <h3>{{ category.label }}</h3>
              <p>{{ category.desc }}</p>
            </div>
          </div>
          <button class="category-head__action" @click="router.push(category.tools[0].path)">
            先看这个
            <ArrowRight :size="16" />
          </button>
        </div>

        <div class="tools__grid">
          <UiverseCard
            v-for="tool in category.tools"
            :key="tool.id"
            :name="tool.name"
            :description="tool.desc"
            :gradient="tool.gradient"
            :shadowColor="tool.shadowColor"
            @click="router.push(tool.path)"
          >
            <template #icon>
              <component :is="tool.icon" class="tool-card__icon" />
            </template>
          </UiverseCard>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  --home-bg: #ffffff;
  --home-surface: rgba(255, 255, 255, 0.92);
  --home-surface-solid: #ffffff;
  --home-surface-muted: rgba(255, 255, 255, 0.72);
  --home-line: rgba(15, 23, 42, 0.08);
  --home-line-strong: rgba(15, 23, 42, 0.16);
  --home-text-strong: #060b1f;
  --home-text-main: #1f2937;
  --home-text-muted: #6b7280;
  --home-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
  --home-shadow-soft: 0 10px 28px rgba(15, 23, 42, 0.06);
  --home-shadow-hover: 0 22px 54px rgba(15, 23, 42, 0.12);
  --home-accent: #111827;
  --home-accent-soft: rgba(17, 24, 39, 0.08);

  position: relative;
  max-width: min(1480px, 100%);
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 40px) 96px;
  color: var(--home-text-main);
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
}

.hero-shell {
  position: relative;
  overflow: hidden;
  min-height: clamp(760px, 88vh, 980px);
  padding: clamp(32px, 4vw, 56px) 0 32px;
  border-radius: 0 0 40px 40px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfc 58%, #ffffff 100%);
}

.hero-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.hero-scene :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
  opacity: 0.98;
}

.hero-atmosphere {
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 1;
}

.hero-atmosphere--top {
  top: 0;
  height: 54%;
  background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.98) 44%, rgba(255, 255, 255, 0.34) 100%);
}

.hero-atmosphere--bottom {
  bottom: 0;
  height: 30%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.82) 60%, #ffffff 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  min-height: clamp(760px, 88vh, 980px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
}

.hero-grid,
.hero-grid--single {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.hero-copy {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge,
.section-kicker {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.92);
  color: #374151;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.hero-badge--floating {
  margin-top: clamp(26px, 5vw, 62px);
}

.section-kicker {
  padding: 7px 12px;
}

.section-kicker--small {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.hero-title {
  margin: 0;
  color: var(--home-text-strong);
}

.hero-title--display {
  margin-top: clamp(110px, 14vw, 220px);
  font-size: clamp(4.4rem, 7vw, 9rem);
  line-height: 0.92;
  letter-spacing: -0.075em;
  font-weight: 900;
}

.hero-desc {
  max-width: 980px;
  color: var(--home-text-muted);
  line-height: 1.75;
}

.hero-desc--lead {
  margin-top: 40px;
  font-size: clamp(1.5rem, 1rem + 1.2vw, 2.4rem);
  font-weight: 500;
  letter-spacing: -0.03em;
}

.hero-intro {
  margin-top: clamp(84px, 14vw, 188px);
}

.hero-intro h2 {
  margin: 0;
  color: var(--home-text-strong);
  font-size: clamp(2.8rem, 2rem + 2vw, 4.6rem);
  line-height: 1.04;
  letter-spacing: -0.05em;
  font-weight: 900;
}

.hero-intro p {
  margin: 24px auto 0;
  max-width: 880px;
  color: var(--home-text-muted);
  font-size: clamp(1.28rem, 0.98rem + 0.8vw, 2rem);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  gap: 18px;
  margin-top: 34px;
  flex-wrap: wrap;
}

.hero-actions--centered {
  align-items: center;
  justify-content: center;
}

.hero-cta {
  min-height: 72px;
  padding: 0 32px;
  border-radius: 22px;
  border: 1.5px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  font-size: clamp(1rem, 0.92rem + 0.3vw, 1.18rem);
  font-weight: 700;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease, background .22s ease, color .22s ease;
}

.hero-cta:hover {
  transform: translateY(-2px);
}

.hero-cta--dark {
  color: #ffffff;
  background: linear-gradient(180deg, #31343c 0%, #181b22 100%);
  box-shadow: 0 16px 34px rgba(17, 24, 39, 0.22);
}

.hero-cta--outline {
  color: #111827;
  border-color: rgba(15, 23, 42, 0.16);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.tools {
  display: grid;
  gap: clamp(30px, 4vw, 42px);
}

.tools--first {
  margin-top: 10px;
}

.tools__category {
  display: grid;
  gap: 18px;
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid var(--home-line);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--home-shadow-soft);
  backdrop-filter: blur(12px);
}

.category-head__main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.category-head[data-tone='mint'] .category-head__icon {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(20, 184, 166, 0.12));
  color: #0f766e;
}

.category-head[data-tone='sunset'] .category-head__icon {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(244, 63, 94, 0.12));
  color: #c2410c;
}

.category-head[data-tone='violet'] .category-head__icon {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(96, 165, 250, 0.12));
  color: #6d28d9;
}

.category-head[data-tone='gold'] .category-head__icon {
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(251, 146, 60, 0.12));
  color: #b45309;
}

.category-head__icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(15, 23, 42, 0.06);
  flex-shrink: 0;
}

.category-head__icon-svg {
  width: 24px;
  height: 24px;
}

.category-head__text h3 {
  margin-top: 10px;
  color: var(--home-text-strong);
  font-size: clamp(1.18rem, 1rem + 0.4vw, 1.42rem);
  font-weight: 800;
}

.category-head__text p {
  margin-top: 6px;
  color: var(--home-text-muted);
  font-size: 0.94rem;
  line-height: 1.7;
}

.category-head__action {
  min-height: 46px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid var(--home-line-strong);
  background: rgba(255, 255, 255, 0.94);
  color: var(--home-text-main);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease;
}

.category-head__action:hover {
  transform: translateY(-2px);
  box-shadow: var(--home-shadow-soft);
}

.tools__grid {
  display: grid;
  grid-template-columns: repeat(var(--home-grid-cols), minmax(0, 1fr));
  gap: clamp(14px, 2vw, 22px);
}

.tool-card__icon {
  width: var(--icon-lg);
  height: var(--icon-lg);
}

@media (max-width: 1100px) {
  .hero-title--display {
    margin-top: clamp(100px, 16vw, 180px);
    font-size: clamp(3.6rem, 9vw, 6.2rem);
  }

  .hero-intro {
    margin-top: clamp(72px, 12vw, 120px);
  }
}

@media (max-width: 820px) {
  .tools__grid {
    grid-template-columns: 1fr;
  }

  .category-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-shell,
  .hero-content {
    min-height: 720px;
  }

  .hero-actions--centered {
    gap: 14px;
  }
}

@media (max-width: 640px) {
  .home {
    padding-inline: 16px;
    padding-bottom: 84px;
  }

  .hero-shell {
    min-height: 680px;
    border-radius: 0 0 28px 28px;
  }

  .hero-content {
    min-height: 680px;
  }

  .hero-badge--floating {
    margin-top: 18px;
  }

  .hero-title--display {
    margin-top: 84px;
    font-size: clamp(3rem, 18vw, 4.6rem);
  }

  .hero-desc--lead {
    margin-top: 24px;
    font-size: 1.18rem;
    line-height: 1.6;
  }

  .hero-intro {
    margin-top: 64px;
  }

  .hero-intro h2 {
    font-size: clamp(2.2rem, 11vw, 3rem);
  }

  .hero-intro p {
    margin-top: 16px;
    font-size: 1rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-cta,
  .category-head__action {
    width: 100%;
  }

  .category-head {
    padding: 20px;
    border-radius: 22px;
  }
}
</style>
