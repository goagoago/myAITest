<script setup>
import { useRouter } from 'vue-router'
import { ArrowRight, Eraser, Image, ImageDown, Camera, Scissors, Video, MonitorPlay, FileText, Wrench, QrCode, ScanLine, CreditCard, ScrollText } from 'lucide-vue-next'
import UiverseCard from '../../../components/UiverseCard.vue'

const router = useRouter()

const toolCategories = [
  {
    id: 'image',
    label: '处理图片',
    icon: Image,
    desc: '去水印、压缩、证件照、抠图这些高频任务，尽量一步直达。',
    tone: 'mint',
    tools: [
      { id: 'watermark-removal', path: '/watermark-removal', icon: Eraser, name: '图片去水印', desc: '智能识别并去除复杂水印，一键还原清晰图片', gradient: 'linear-gradient(145deg, #34d399, #14b8a6)', shadowColor: 'rgba(52, 211, 153, 0.22)' },
      { id: 'image-compress', path: '/image-compress', icon: ImageDown, name: '图片压缩', desc: '多种压缩方式可选，体积和画质平衡更聪明', gradient: 'linear-gradient(145deg, #38bdf8, #22c55e)', shadowColor: 'rgba(56, 189, 248, 0.22)' },
      { id: 'id-photo', path: '/id-photo', icon: Camera, name: '证件照制作', desc: '标准尺寸、换底色、裁剪排版，一站搞定', gradient: 'linear-gradient(145deg, #14b8a6, #10b981)', shadowColor: 'rgba(20, 184, 166, 0.22)' },
      { id: 'remove-bg', path: '/remove-bg', icon: Scissors, name: 'AI 抠图', desc: '自动识别主体，一键去背景，干净利落', gradient: 'linear-gradient(145deg, #8b5cf6, #ec4899)', shadowColor: 'rgba(139, 92, 246, 0.22)' },
    ],
  },
  {
    id: 'media',
    label: '音视频处理',
    icon: Video,
    desc: '压缩、录制、转换都放在一起，减少来回折腾。',
    tone: 'sunset',
    tools: [
      { id: 'video-compress', path: '/media/compress', icon: Video, name: '视频压缩', desc: '浏览器端 FFmpeg 压缩视频，多种预设和分辨率可选', gradient: 'linear-gradient(145deg, #fb7185, #f97316)', shadowColor: 'rgba(249, 115, 22, 0.22)' },
      { id: 'screen-record', path: '/media/record', icon: MonitorPlay, name: '屏幕录制', desc: '直接录屏，支持系统声音和麦克风，不折腾', gradient: 'linear-gradient(145deg, #ef4444, #f97316)', shadowColor: 'rgba(239, 68, 68, 0.22)' },
      { id: 'audio-convert', path: '/media/audio-convert', icon: FileText, name: '音频转换', desc: 'MP3、WAV、FLAC、M4A 等格式互转', gradient: 'linear-gradient(145deg, #e879f9, #ec4899)', shadowColor: 'rgba(232, 121, 249, 0.22)' },
      { id: 'gif-tools', path: '/media/gif', icon: Video, name: 'GIF 工具', desc: '视频转 GIF、GIF 压缩、GIF 转 MP4 一页搞定', gradient: 'linear-gradient(145deg, #f97316, #ef4444)', shadowColor: 'rgba(249, 115, 22, 0.22)' },
    ],
  },
  {
    id: 'utility',
    label: '文档与效率',
    icon: Wrench,
    desc: '文档转换、二维码、OCR、测试数据，工作流里的常用件。',
    tone: 'violet',
    tools: [
      { id: 'doc-convert', path: '/doc-convert', icon: FileText, name: '文档转换', desc: 'PDF、Word、Markdown、HTML、图片等多种格式互转', gradient: 'linear-gradient(145deg, #60a5fa, #8b5cf6)', shadowColor: 'rgba(96, 165, 250, 0.22)' },
      { id: 'qr-code', path: '/qr-code', icon: QrCode, name: 'QR 码生成', desc: '支持颜色、Logo 和容错等级，自定义更漂亮', gradient: 'linear-gradient(145deg, #8b5cf6, #6366f1)', shadowColor: 'rgba(139, 92, 246, 0.22)' },
      { id: 'qr-scan', path: '/qr-scan', icon: ScanLine, name: '二维码解析', desc: '上传图片或截图，直接识别二维码内容', gradient: 'linear-gradient(145deg, #7c3aed, #4338ca)', shadowColor: 'rgba(124, 58, 237, 0.22)' },
      { id: 'ocr', path: '/ocr', icon: ScanLine, name: 'OCR 识别', desc: '图片转文字，支持中英文和多场景识别', gradient: 'linear-gradient(145deg, #06b6d4, #8b5cf6)', shadowColor: 'rgba(6, 182, 212, 0.22)' },
      { id: 'data-convert', path: '/data-convert', icon: FileText, name: '数据转换', desc: 'Excel、CSV、JSON 互转并做基础清洗', gradient: 'linear-gradient(145deg, #2563eb, #06b6d4)', shadowColor: 'rgba(37, 99, 235, 0.22)' },
      { id: 'id-generator', path: '/id-generator', icon: CreditCard, name: '身份证号生成', desc: '适合开发测试，支持地区、性别和出生日期定制', gradient: 'linear-gradient(145deg, #3b82f6, #10b981)', shadowColor: 'rgba(59, 130, 246, 0.22)' },
      { id: 'resume-builder', path: '/resume-builder', icon: ScrollText, name: 'AI 简历工坊', desc: 'Markdown 编辑、拖拽模块、AI 润色与导出', gradient: 'linear-gradient(145deg, #14b8a6, #f59e0b)', shadowColor: 'rgba(20, 184, 166, 0.22)' },
    ],
  },
]
</script>

<template>
  <section class="tools tools--first">
    <div v-for="category in toolCategories" :key="category.id" class="tools__category">
      <div class="category-head" :data-tone="category.tone">
        <div class="category-head__main">
          <div class="category-head__icon">
            <component :is="category.icon" class="category-head__icon-svg" />
          </div>
          <div class="category-head__text">
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
</template>
