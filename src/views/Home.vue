<script setup>
import { useRouter } from 'vue-router'
import {
  Plane, PenTool, Globe, Lightbulb, Zap, Shield, Sparkles, Clock,
  Star, Users, TrendingUp, Wand2, Eraser, FileText, ImageDown, MonitorPlay,
  Image, Wrench, Bot, Camera, QrCode, ScanLine, Scissors, CreditCard, Video
} from 'lucide-vue-next'
import UiverseCard from '../components/UiverseCard.vue'

const router = useRouter()

/* ═══ 数据 ═══ */
const toolCategories = [
  {
    id: 'image',
    label: '图片工具',
    icon: Image,
    desc: '图片处理与优化',
    tools: [
      {
        id: 'watermark-removal',
        path: '/watermark-removal',
        icon: Eraser,
        name: '图片去水印',
        desc: '智能识别并去除各类复杂水印，一键还原清晰图片',
        gradient: 'linear-gradient(145deg, #12c98e, #0ea572)',
        shadowColor: 'rgba(16, 185, 129, 0.3)',
      },
      {
        id: 'image-compress',
        path: '/image-compress',
        icon: ImageDown,
        name: '图片压缩',
        desc: '多种压缩方式可选，智能压缩、质量调节、尺寸缩放、目标大小',
        gradient: 'linear-gradient(145deg, #22c55e, #06b6d4)',
        shadowColor: 'rgba(34, 197, 94, 0.3)',
      },
      {
        id: 'id-photo',
        path: '/id-photo',
        icon: Camera,
        name: '证件照制作',
        desc: '一寸二寸等标准尺寸，自定义像素，更换背景色，裁剪调整',
        gradient: 'linear-gradient(145deg, #14b8a6, #10b981)',
        shadowColor: 'rgba(20, 184, 166, 0.3)',
      },
      {
        id: 'remove-bg',
        path: '/remove-bg',
        icon: Scissors,
        name: 'AI 抠图',
        desc: 'AI 智能识别主体，一键去除背景，支持透明或自定义背景',
        gradient: 'linear-gradient(145deg, #a855f7, #ec4899)',
        shadowColor: 'rgba(168, 85, 247, 0.3)',
      },
    ],
  },
  {
    id: 'media',
    label: '音视频工具',
    icon: Video,
    desc: '音视频处理与转换',
    tools: [
      {
        id: 'video-compress',
        path: '/media/compress',
        icon: Video,
        name: '视频压缩',
        desc: '浏览器端 FFmpeg 压缩视频，多种预设与分辨率可选，安全无上传',
        gradient: 'linear-gradient(145deg, #f97316, #ef4444)',
        shadowColor: 'rgba(249, 115, 22, 0.3)',
      },
      {
        id: 'screen-record',
        path: '/media/record',
        icon: MonitorPlay,
        name: '屏幕录制',
        desc: '浏览器端录屏，支持系统声音和麦克风，无需安装插件',
        gradient: 'linear-gradient(145deg, #ef4444, #f97316)',
        shadowColor: 'rgba(239, 68, 68, 0.3)',
      },
      {
        id: 'audio-convert',
        path: '/media/audio-convert',
        icon: FileText,
        name: '音频转换',
        desc: '支持多种音频格式互相转换，如 MP3, WAV, FLAC, M4A 等',
        gradient: 'linear-gradient(145deg, #d946ef, #ec4899)',
        shadowColor: 'rgba(217, 70, 239, 0.3)',
      },
    ],
  },
  {
    id: 'utility',
    label: '实用工具',
    icon: Wrench,
    desc: '文档与媒体处理',
    tools: [
      {
        id: 'doc-convert',
        path: '/doc-convert',
        icon: FileText,
        name: '文档转换',
        desc: '支持 PDF、Word、Markdown、HTML、图片等 7 种格式互转',
        gradient: 'linear-gradient(145deg, #3b82f6, #8b5cf6)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
      },
      {
        id: 'qr-code',
        path: '/qr-code',
        icon: QrCode,
        name: 'QR码生成',
        desc: '自定义颜色与Logo，生成高清二维码图片，多种容错等级',
        gradient: 'linear-gradient(145deg, #8b5cf6, #6366f1)',
        shadowColor: 'rgba(139, 92, 246, 0.3)',
      },
      {
        id: 'ocr',
        path: '/ocr',
        icon: ScanLine,
        name: 'OCR文字识别',
        desc: '上传图片提取文字，支持中英文多语言，纯浏览器端处理',
        gradient: 'linear-gradient(145deg, #06b6d4, #8b5cf6)',
        shadowColor: 'rgba(6, 182, 212, 0.3)',
      },
      {
        id: 'id-generator',
        path: '/id-generator',
        icon: CreditCard,
        name: '身份证号生成',
        desc: '随机生成符合规则的身份证号，支持指定省市区、性别、出生日期',
        gradient: 'linear-gradient(145deg, #3b82f6, #10b981)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI 助手',
    icon: Bot,
    desc: '智能AI创作与辅助',
    tools: [
      {
        id: 'ai-studio',
        path: '/ai-studio',
        icon: Wand2,
        name: 'AI 创作',
        desc: 'AI图片、视频与搞笑视频生成，输入文字或上传图片即可创作',
        gradient: 'linear-gradient(145deg, #f59e0b, #d97706)',
        shadowColor: 'rgba(245, 158, 11, 0.3)',
      },
      {
        id: 'travel',
        path: '/travel',
        icon: Plane,
        name: '旅行规划',
        desc: '智能生成个性化旅行行程方案，让每一次出行都完美',
        gradient: 'linear-gradient(145deg, #ef4444, #dc2626)',
        shadowColor: 'rgba(239, 68, 68, 0.3)',
      },
      {
        id: 'writer',
        path: '/writer',
        icon: PenTool,
        name: '写作助手',
        desc: '文章润色、续写、风格改写，让你的文字更有力量',
        gradient: 'linear-gradient(145deg, #f97316, #ea580c)',
        shadowColor: 'rgba(249, 115, 22, 0.3)',
      },
      {
        id: 'translator',
        path: '/translator',
        icon: Globe,
        name: '翻译专家',
        desc: '多语言智能翻译与本地化，打破语言的边界',
        gradient: 'linear-gradient(145deg, #14b8a6, #0d9488)',
        shadowColor: 'rgba(20, 184, 166, 0.3)',
      },
      {
        id: 'mind',
        path: '/mind',
        icon: Lightbulb,
        name: '头脑风暴',
        desc: '创意激发与思维拓展工具，让灵感源源不断',
        gradient: 'linear-gradient(145deg, #eab308, #ca8a04)',
        shadowColor: 'rgba(234, 179, 8, 0.3)',
      },
    ],
  },
]
</script>

<template>
  <div class="home">
    <!-- ═══════════════ Hero 区域 ═══════════════ -->
    <section class="hero">
      <div class="hero__content">
        <!-- 3D凸起标题 -->
        <h1 class="hero__title text-3d">
          <span class="hero__title-line">让 TB 成为你的</span>
          <span class="hero__title-highlight gradient-text">超级助手</span>
        </h1>
      </div>
    </section>

    <!-- ═══════════════ 工具区域 ═══════════════ -->
    <section class="tools">
      <div v-for="(category, catIdx) in toolCategories" :key="category.id" class="tools__category">
        <!-- 分类头 — 新拟物 -->
        <div class="category-head">
          <div class="category-head__icon">
            <component :is="category.icon" :size="20" />
          </div>
          <div class="category-head__text">
            <h3>{{ category.label }}</h3>
            <p>{{ category.desc }}</p>
          </div>
        </div>

        <!-- 工具网格 -->
        <div class="tools__grid" :class="{ 'tools__grid--wide': category.tools.length > 3 }">
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
              <component :is="tool.icon" :size="28" />
            </template>
          </UiverseCard>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ═══════════════════════════════════════════════════════════
   Hero 区域
   ═══════════════════════════════════════════════════════════ */

.hero {
  padding: 80px 0;
  text-align: center;
}

.hero__content {
  max-width: 800px;
  margin: 0 auto;
}

/* 3D凸起标题 */
.hero__title {
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.hero__title-line {
  display: block;
  color: var(--text-primary);
}

.hero__title-highlight {
  display: block;
  font-size: 5rem;
  margin-top: 8px;
}

/* ═══════════════════════════════════════════════════════════
   工具区域
   ═══════════════════════════════════════════════════════════ */

.tools {
  padding: 40px 0 100px;
}

.tools__category {
  margin-bottom: 56px;
}

.tools__category:last-child {
  margin-bottom: 0;
}

/* 分类头 — 新拟物 */
.category-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.category-head__icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neo-surface-raised);
  border-radius: 14px;
  box-shadow: var(--neo-shadow-up-sm);
  color: var(--primary);
  flex-shrink: 0;
  border: 1px solid rgba(16, 185, 129, 0.12);
}

.category-head__text h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.category-head__text p {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* 网格 */
.tools__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  justify-items: center;
}

.tools__grid--wide {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* ═══════════════════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 700px) {
  .home {
    padding: 0 20px;
  }

  .hero__title {
    font-size: 2.5rem;
  }

  .hero__title-highlight {
    font-size: 2.75rem;
  }
  
  .tools__grid,
  .tools__grid--wide {
    grid-template-columns: 1fr;
  }
}
</style>
