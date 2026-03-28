<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plane, PenTool, Globe, Lightbulb, Sparkles,
  Eraser, FileText, ImageDown, MonitorPlay,
  Image, Wrench, Bot, Camera, QrCode, ScanLine, Scissors, CreditCard, Video, ScrollText,
  ArrowRight, Wand2
} from 'lucide-vue-next'
import UiverseCard from '../components/UiverseCard.vue'

const router = useRouter()
const homeRef = ref(null)
const gridCols = ref(4)

let resizeObserver = null
const updateGridCols = () => {
  const width = homeRef.value?.clientWidth ?? window.innerWidth
  const idealCols = Math.floor(width / 280)
  gridCols.value = Math.min(4, Math.max(2, idealCols))
}

onMounted(() => {
  updateGridCols()
  if ('ResizeObserver' in window && homeRef.value) {
    resizeObserver = new ResizeObserver(updateGridCols)
    resizeObserver.observe(homeRef.value)
  } else {
    window.addEventListener('resize', updateGridCols, { passive: true })
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', updateGridCols)
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
      <div class="hero-bg-orb hero-bg-orb--one"></div>
      <div class="hero-bg-orb hero-bg-orb--two"></div>

      <div class="hero-grid hero-grid--single">
        <div class="hero-copy hero-panel hero-panel--main">
          <div class="hero-badge">
            <Sparkles :size="14" />
            <span>Browser-first creative toolbox</span>
          </div>

          <h1 class="hero-title">
            一站式在线工具箱，
            <span class="hero-title__gradient">把高频任务做得更顺手</span>
          </h1>

          <p class="hero-desc">
            处理图片、文档、音视频和 AI 创作，不必在一堆站点之间来回跳。
          </p>

          <div class="hero-actions">
            <button class="hero-cta hero-cta--primary" @click="router.push('/watermark-removal')">
              <Sparkles :size="18" />
              <span>立即开始</span>
            </button>
            <button class="hero-cta hero-cta--ghost" @click="router.push('/doc-convert')">
              <ArrowRight :size="18" />
              <span>查看热门工具</span>
            </button>
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
  --home-bg: #dde4f2;
  --home-surface: rgba(234, 239, 248, 0.76);
  --home-surface-solid: #eef3fb;
  --home-surface-muted: rgba(226, 233, 245, 0.78);
  --home-line: rgba(82, 97, 138, 0.14);
  --home-line-strong: rgba(70, 86, 128, 0.22);
  --home-text-strong: #243047;
  --home-text-main: #31415e;
  --home-text-muted: #6c7891;
  --home-shadow: 0 18px 44px rgba(90, 103, 145, 0.16);
  --home-shadow-soft: 0 12px 28px rgba(90, 103, 145, 0.12);
  --home-shadow-hover: 0 26px 58px rgba(99, 102, 241, 0.16);
  --home-accent: #4f46e5;
  --home-accent-soft: rgba(79, 70, 229, 0.1);

  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0 var(--page-padding) 96px;
  color: var(--home-text-main);
}

.hero-shell {
  position: relative;
  padding: clamp(28px, 4vw, 52px) 0 12px;
}

.hero-bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(50px);
  pointer-events: none;
  animation: floatOrb 10s ease-in-out infinite;
}

.hero-bg-orb--one {
  top: 16px;
  left: 0;
  width: 260px;
  height: 260px;
  background: rgba(59, 130, 246, 0.12);
}

.hero-bg-orb--two {
  top: 80px;
  right: 4%;
  width: 320px;
  height: 320px;
  background: rgba(168, 85, 247, 0.1);
  animation-delay: -3s;
}

.hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
  gap: clamp(20px, 2.4vw, 30px);
  align-items: stretch;
}

.hero-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.hero-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--home-line);
  background:
    linear-gradient(180deg, rgba(245, 248, 255, 0.92), rgba(227, 233, 246, 0.82)),
    var(--home-surface);
  backdrop-filter: blur(18px) saturate(120%);
  box-shadow: var(--home-shadow);
}

.hero-panel--main {
  border-radius: 36px;
  padding: clamp(28px, 4vw, 44px);
}

.hero-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.96), transparent);
}

.hero-badge,
.section-kicker {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(236, 241, 250, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.12);
  color: var(--home-accent);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.section-kicker {
  padding: 7px 12px;
}

.section-kicker--small {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.hero-title {
  margin-top: 20px;
  font-size: clamp(3rem, 2rem + 3vw, 5.4rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
  font-weight: 900;
  color: var(--home-text-strong);
}

.hero-title__gradient {
  display: block;
  margin-top: 10px;
  background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 42%, #14b8a6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  max-width: 680px;
  margin-top: 22px;
  color: var(--home-text-muted);
  font-size: clamp(1rem, 0.92rem + 0.32vw, 1.12rem);
  line-height: 1.85;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
  flex-wrap: wrap;
}

.hero-cta {
  min-height: 52px;
  padding: 0 20px;
  border-radius: 16px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease, background .22s ease, color .22s ease;
}

.hero-cta:hover {
  transform: translateY(-2px);
}

.hero-cta--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #4f46e5, #6366f1 45%, #06b6d4);
  box-shadow: 0 16px 34px rgba(79, 70, 229, 0.22);
}

.hero-cta--ghost {
  color: var(--home-text-main);
  border-color: var(--home-line-strong);
  background: rgba(236, 241, 250, 0.76);
}

.hero-cta--soft {
  background: rgba(230, 236, 248, 0.78);
}

.tools {
  display: grid;
  gap: clamp(30px, 4vw, 42px);
}

.tools--first {
  margin-top: 28px;
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
  background: rgba(228, 235, 247, 0.78);
  box-shadow: var(--home-shadow-soft);
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
  background: rgba(236, 241, 250, 0.9);
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


@keyframes floatOrb {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-10px) translateX(8px); }
}

@media (max-width: 820px) {
  .tools__grid {
    grid-template-columns: 1fr;
  }

  .category-head {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .home {
    padding-inline: 16px;
    padding-bottom: 84px;
  }

  .hero-panel--main,
  .category-head,
  .bottom-cta__panel {
    padding: 20px;
    border-radius: 24px;
  }

  .hero-title {
    font-size: clamp(2.4rem, 10vw, 4rem);
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-cta,
  .category-head__action {
    width: 100%;
  }
}
</style>
