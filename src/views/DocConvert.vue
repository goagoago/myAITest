<script setup>
import '../styles/internal-page.scss'
import { ref, computed } from 'vue'
import { useDocConvert } from '../composables/useDocConvert'
import {
  FileText, Upload, Loader2, AlertCircle, RefreshCw,
  ArrowRightLeft, FileUp, Download, CheckCircle2, X,
  FileImage, ImagePlus,
  Table, FileSpreadsheet, FileType, FileCode, Images, Type, Presentation
} from 'lucide-vue-next'

const {
  loading, error, progress, convertedFileName,
  convertPdfToWord, convertPdfToExcel, convertPdfToImages,
  convertPdfToMarkdown, convertPdfToHtml, convertPdfToTxt,
  convertWordToPdf, convertWordToMarkdown, convertWordToHtml, convertWordToTxt,
  convertExcelToPdf, convertExcelToHtml,
  convertMarkdownToPdf, convertMarkdownToWord, convertMarkdownToHtml,
  convertHtmlToPdf, convertHtmlToWord, convertHtmlToMarkdown,
  convertTxtToPdf, convertTxtToWord,
  convertImagesToPdf,
  convertPptToPdf,
  reset,
} = useDocConvert()

// 按源格式分类
const categories = [
  {
    id: 'pdf', label: 'PDF', icon: FileText, color: '#ef4444',
    accept: '.pdf', acceptLabel: 'PDF', multiple: false,
    targets: [
      { id: 'word', label: 'Word' },
      { id: 'excel', label: 'Excel' },
      { id: 'img', label: '图片' },
      { id: 'md', label: 'Markdown' },
      { id: 'html', label: 'HTML' },
      { id: 'txt', label: 'TXT' },
    ],
  },
  {
    id: 'word', label: 'Word', icon: FileType, color: '#3b82f6',
    accept: '.doc,.docx', acceptLabel: 'Word', multiple: false,
    targets: [
      { id: 'pdf', label: 'PDF' },
      { id: 'md', label: 'Markdown' },
      { id: 'html', label: 'HTML' },
      { id: 'txt', label: 'TXT' },
    ],
  },
  {
    id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: '#059669',
    accept: '.xlsx,.xls,.csv', acceptLabel: 'Excel', multiple: false,
    targets: [
      { id: 'pdf', label: 'PDF' },
      { id: 'html', label: 'HTML' },
    ],
  },
  {
    id: 'ppt', label: 'PPT', icon: Presentation, color: '#f59e0b',
    accept: '.ppt,.pptx', acceptLabel: 'PPT', multiple: false,
    targets: [
      { id: 'pdf', label: 'PDF' },
    ],
  },
  {
    id: 'md', label: 'Markdown', icon: FileCode, color: '#8b5cf6',
    accept: '.md,.markdown', acceptLabel: 'Markdown', multiple: false,
    targets: [
      { id: 'pdf', label: 'PDF' },
      { id: 'word', label: 'Word' },
      { id: 'html', label: 'HTML' },
    ],
  },
  {
    id: 'html', label: 'HTML', icon: Table, color: '#f97316',
    accept: '.html,.htm', acceptLabel: 'HTML', multiple: false,
    targets: [
      { id: 'pdf', label: 'PDF' },
      { id: 'word', label: 'Word' },
      { id: 'md', label: 'Markdown' },
    ],
  },
  {
    id: 'txt', label: 'TXT', icon: Type, color: '#64748b',
    accept: '.txt,.text,.log', acceptLabel: 'TXT', multiple: false,
    targets: [
      { id: 'pdf', label: 'PDF' },
      { id: 'word', label: 'Word' },
    ],
  },
  {
    id: 'img', label: '图片', icon: Images, color: '#ec4899',
    accept: 'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif',
    acceptLabel: '图片', multiple: true,
    targets: [
      { id: 'pdf', label: 'PDF' },
    ],
  },
]

// 转换函数映射
const convertMap = {
  'pdf→word': convertPdfToWord,
  'pdf→excel': convertPdfToExcel,
  'pdf→img': convertPdfToImages,
  'pdf→md': convertPdfToMarkdown,
  'pdf→html': convertPdfToHtml,
  'pdf→txt': convertPdfToTxt,
  'word→pdf': convertWordToPdf,
  'word→md': convertWordToMarkdown,
  'word→html': convertWordToHtml,
  'word→txt': convertWordToTxt,
  'excel→pdf': convertExcelToPdf,
  'excel→html': convertExcelToHtml,
  'ppt→pdf': convertPptToPdf,
  'md→pdf': convertMarkdownToPdf,
  'md→word': convertMarkdownToWord,
  'md→html': convertMarkdownToHtml,
  'html→pdf': convertHtmlToPdf,
  'html→word': convertHtmlToWord,
  'html→md': convertHtmlToMarkdown,
  'txt→pdf': convertTxtToPdf,
  'txt→word': convertTxtToWord,
  'img→pdf': convertImagesToPdf,
}

const sourceId = ref('pdf')
const targetId = ref('word')
const selectedFile = ref(null)
const selectedFiles = ref([])
const isDragging = ref(false)
const converted = ref(false)

const currentCat = computed(() => categories.find(c => c.id === sourceId.value))
const convertKey = computed(() => `${sourceId.value}→${targetId.value}`)
const targetLabel = computed(() => {
  const t = currentCat.value?.targets.find(t => t.id === targetId.value)
  return t?.label || ''
})

const switchSource = (id) => {
  if (loading.value) return
  sourceId.value = id
  const cat = categories.find(c => c.id === id)
  targetId.value = cat.targets[0].id
  resetAll()
}

const switchTarget = (id) => {
  if (loading.value) return
  targetId.value = id
  resetAll()
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (!files || files.length === 0) return
  if (currentCat.value.multiple) {
    processFiles(Array.from(files))
  } else {
    processFile(files[0])
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  if (currentCat.value.multiple) {
    processFiles(Array.from(files))
  } else {
    processFile(files[0])
  }
}

const processFile = (file) => {
  if (file.size > 100 * 1024 * 1024) return
  selectedFile.value = file
  selectedFiles.value = [file]
  converted.value = false
  reset()
}

const processFiles = (files) => {
  if (files.some(f => f.size > 100 * 1024 * 1024)) return
  selectedFiles.value = files
  selectedFile.value = files[0]
  converted.value = false
  reset()
}

const fileSize = computed(() => {
  if (currentCat.value.multiple && selectedFiles.value.length > 0) {
    const total = selectedFiles.value.reduce((sum, f) => sum + f.size, 0)
    return formatSize(total)
  }
  if (!selectedFile.value) return ''
  return formatSize(selectedFile.value.size)
})

const formatSize = (size) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const fileDisplayName = computed(() => {
  if (currentCat.value.multiple && selectedFiles.value.length > 1) {
    return `${selectedFiles.value.length} 个文件`
  }
  return selectedFile.value?.name || ''
})

const handleConvert = async () => {
  if (loading.value) return
  if (currentCat.value.multiple) {
    if (selectedFiles.value.length === 0) return
  } else {
    if (!selectedFile.value) return
  }

  const fn = convertMap[convertKey.value]
  if (!fn) return

  try {
    if (currentCat.value.multiple) {
      await fn(selectedFiles.value)
    } else {
      await fn(selectedFile.value)
    }
    converted.value = true
  } catch (e) {
    console.error('转换失败:', e)
  }
}

const resetAll = () => {
  reset()
  selectedFile.value = null
  selectedFiles.value = []
  converted.value = false
}
</script>

<template>
  <div class="doc-convert internal-page">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <FileText :size="14" />
          <span>文档转换</span>
        </div>
        <h1 class="header__title header__title--tinted">
          <span>全能文档 </span>
          <span class="gradient-text">格式互转</span>
        </h1>
        <p class="header__desc">
          支持 8 种格式、22 种转换路径
        </p>
      </div>
    </header>

    <!-- 选择源格式 -->
    <div class="section-label">选择源文件格式</div>
    <div class="source-grid">
      <button
        v-for="cat in categories"
        :key="cat.id"
        :class="['source-card', { 'source-card--active': sourceId === cat.id }]"
        @click="switchSource(cat.id)"
        :disabled="loading"
        :style="{ '--cat-color': cat.color }"
      >
        <div class="source-card__icon">
          <component :is="cat.icon" :size="22" />
        </div>
        <span class="source-card__label">{{ cat.label }}</span>
      </button>
    </div>

    <!-- 选择目标格式 -->
    <div class="section-label">
      转换为
      <span class="section-label__hint">（{{ currentCat.targets.length }} 种可选）</span>
    </div>
    <div class="target-grid">
      <button
        v-for="t in currentCat.targets"
        :key="t.id"
        :class="['target-card', { 'target-card--active': targetId === t.id }]"
        @click="switchTarget(t.id)"
        :disabled="loading"
        :style="{ '--cat-color': currentCat.color }"
      >
        <ArrowRightLeft :size="14" class="target-card__arrow" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <!-- 当前转换路径提示 -->
    <div class="convert-path" :style="{ '--cat-color': currentCat.color }">
      <span class="convert-path__from">{{ currentCat.label }}</span>
      <ArrowRightLeft :size="18" />
      <span class="convert-path__to">{{ targetLabel }}</span>
    </div>

    <!-- 主内容 -->
    <div class="main-panel">
      <!-- 上传区域 -->
      <div
        v-if="selectedFiles.length === 0"
        class="upload-zone"
        :class="{ 'upload-zone--drag': isDragging }"
        @drop="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @click="$refs.fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          :accept="currentCat.accept"
          :multiple="currentCat.multiple"
          class="upload-input"
          @change="handleFileSelect"
        />
        <div class="upload-icon" :style="{ background: `${currentCat.color}15`, color: currentCat.color }">
          <Upload :size="40" />
        </div>
        <p class="upload-text">
          {{ currentCat.multiple ? '点击上传或拖拽多张图片到此处' : `点击上传或拖拽 ${currentCat.acceptLabel} 文件到此处` }}
        </p>
        <p class="upload-hint">最大 100MB{{ currentCat.multiple ? '，支持多选' : '' }}</p>
      </div>

      <!-- 已选文件 -->
      <div v-else class="file-info">
        <div class="file-card">
          <div class="file-card__icon" :style="{ background: `${currentCat.color}20`, color: currentCat.color }">
            <FileUp :size="32" />
          </div>
          <div class="file-card__detail">
            <p class="file-card__name">{{ fileDisplayName }}</p>
            <p class="file-card__size">{{ fileSize }}</p>
          </div>
          <button class="file-card__close" @click="resetAll" :disabled="loading">
            <X :size="16" />
          </button>
        </div>

        <!-- 多文件列表 -->
        <div v-if="currentCat.multiple && selectedFiles.length > 1" class="file-list">
          <div v-for="(f, idx) in selectedFiles" :key="idx" class="file-list__item">
            <FileImage :size="16" />
            <span class="file-list__name">{{ f.name }}</span>
            <span class="file-list__size">{{ formatSize(f.size) }}</span>
          </div>
        </div>

        <!-- 转换按钮 -->
        <button
          v-if="!converted"
          class="convert-btn"
          :disabled="loading"
          :style="{ background: loading ? '' : `linear-gradient(135deg, ${currentCat.color} 0%, ${currentCat.color}cc 100%)` }"
          @click="handleConvert"
        >
          <Loader2 v-if="loading" :size="20" class="spin" />
          <ArrowRightLeft v-else :size="20" />
          <span>{{ loading ? '转换中...' : `转换为 ${targetLabel}` }}</span>
        </button>

        <!-- 进度条 -->
        <div v-if="loading" class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progress + '%', background: `linear-gradient(90deg, ${currentCat.color}, ${currentCat.color}cc)` }"
          ></div>
        </div>

        <!-- 转换成功 -->
        <div v-if="converted" class="success-msg">
          <CheckCircle2 :size="20" />
          <span>转换完成！文件已自动下载</span>
        </div>

        <!-- 操作按钮 -->
        <div v-if="converted" class="result-actions">
          <button class="action-btn" @click="handleConvert">
            <Download :size="18" />
            <span>重新下载</span>
          </button>
          <button class="action-btn" @click="resetAll">
            <RefreshCw :size="18" />
            <span>转换其他文件</span>
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ error }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped lang="scss">
.doc-convert {
  --page-bg: #fbfcff;
  --surface: rgba(255, 255, 255, 0.72);
  --surface-strong: rgba(255, 255, 255, 0.9);
  --surface-soft: rgba(246, 249, 255, 0.88);
  --line: rgba(124, 138, 167, 0.18);
  --line-strong: rgba(96, 112, 145, 0.28);
  --text-strong: #0f172a;
  --text-main: #334155;
  --text-soft: #64748b;
  --shadow-soft: 0 18px 44px rgba(148, 163, 184, 0.14);
  --shadow-card: 0 14px 34px rgba(148, 163, 184, 0.12);

  max-width: 1080px;
  margin: 0 auto;
  padding: 0 32px 88px;
  color: var(--text-main);
}

.header {
  padding: 88px 0 42px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(96, 165, 250, 0.24);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 24px;
  box-shadow: 0 10px 24px rgba(96, 165, 250, 0.08);
}

.header__badge svg { color: #2563eb; }

.header__title {
  font-size: clamp(3rem, 2.4rem + 2.2vw, 5rem);
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.05em;
  color: var(--text-strong);
  margin-bottom: 14px;
}

.header__title--tinted {
  background: linear-gradient(180deg, #0f172a 0%, #1e3a8a 58%, #312e81 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-text {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 46%, #db2777 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: #526277;
}

.section-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1d4ed8;
  margin-bottom: 12px;
}

.section-label__hint {
  color: #7c8aa0;
}

.convert-path__from,
.convert-path__to {
  font-size: 1.0625rem;
  font-weight: 800;
  color: var(--cat-color);
  text-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

.upload-text,
.file-card__name {
  color: #172554;
}

.source-card__label,
.target-card,
.action-btn {
  color: #334155;
}

.success-msg {
  color: #047857;
}

.error-msg {
  color: #b91c1c;
}

.section-label__hint {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-soft);
}

.source-grid,
.target-grid {
  display: flex;
  flex-wrap: wrap;
}

.source-grid {
  gap: 12px;
  margin-bottom: 28px;
}

.target-grid {
  gap: 10px;
  margin-bottom: 24px;
}

.source-card,
.target-card {
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease, color 0.22s ease;
}

.source-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  flex: 1;
  min-width: 106px;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(148, 163, 184, 0.08);
}

.source-card:hover:not(:disabled),
.target-card:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: 0 14px 28px rgba(148, 163, 184, 0.12);
}

.source-card--active {
  border-color: color-mix(in srgb, var(--cat-color) 46%, white) !important;
  background: color-mix(in srgb, var(--cat-color) 12%, white) !important;
  box-shadow: 0 16px 30px -16px var(--cat-color);
}

.source-card--active .source-card__icon,
.target-card--active .target-card__arrow {
  color: var(--cat-color);
}

.source-card__icon {
  color: var(--text-soft);
  transition: color 0.3s;
  display: flex;
}

.source-card__label {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-strong);
}

.target-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid var(--line);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-main);
}

.target-card__arrow {
  opacity: 0.5;
}

.target-card--active {
  border-color: color-mix(in srgb, var(--cat-color) 42%, white) !important;
  background: color-mix(in srgb, var(--cat-color) 10%, white) !important;
  color: var(--text-strong);
}

.source-card:disabled,
.target-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.convert-path {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 15px 24px;
  margin-bottom: 28px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--line);
  border-radius: 18px;
  color: var(--text-soft);
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
}

.convert-path__from,
.convert-path__to {
  font-size: 1.0625rem;
  font-weight: 800;
  color: var(--cat-color);
}

.main-panel {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(247, 250, 255, 0.88));
  border: 1px solid rgba(124, 138, 167, 0.16);
  border-radius: 28px;
  padding: 32px;
  margin-bottom: 40px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(16px);
}

.upload-zone {
  border: 2px dashed rgba(124, 138, 167, 0.28);
  border-radius: 22px;
  padding: 80px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.38);
}

.upload-zone:hover,
.upload-zone--drag {
  border-color: rgba(59, 130, 246, 0.52);
  background: rgba(59, 130, 246, 0.06);
}

.upload-input { display: none; }

.upload-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  margin: 0 auto 20px;
  transition: all 0.3s;
  box-shadow: 0 12px 28px rgba(148, 163, 184, 0.12);
}

.upload-zone:hover .upload-icon {
  transform: scale(1.05);
}

.upload-text {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 0.8125rem;
  color: var(--text-soft);
  margin-top: 4px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--line);
  border-radius: 18px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-card);
}

.file-card__icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  flex-shrink: 0;
}

.file-card__detail {
  flex: 1;
  min-width: 0;
}

.file-card__name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card__size {
  font-size: 0.8125rem;
  color: var(--text-soft);
  margin-top: 4px;
}

.file-card__close {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.file-card__close:hover:not(:disabled) {
  background: rgba(254, 242, 242, 0.95);
  border-color: rgba(239, 68, 68, 0.26);
  color: #ef4444;
}

.file-card__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-list {
  max-height: 160px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 4px;
}

.file-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.8125rem;
  color: var(--text-main);
  transition: background 0.2s;
}

.file-list__item:hover {
  background: rgba(255, 255, 255, 0.5);
}

.file-list__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-list__size {
  color: var(--text-soft);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.convert-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  border: none;
  border-radius: 18px;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
  box-shadow: 0 18px 38px -18px rgba(59, 130, 246, 0.54);
}

.convert-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 18px 42px -14px rgba(59, 130, 246, 0.5);
}

.convert-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.progress-bar {
  height: 8px;
  background: rgba(203, 213, 225, 0.55);
  border-radius: 999px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.success-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  padding: 16px;
  background: rgba(236, 253, 245, 0.96);
  border: 1px solid rgba(16, 185, 129, 0.24);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 700;
  color: #059669;
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  border-radius: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.96);
  border-color: var(--line-strong);
  color: var(--text-strong);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(254, 242, 242, 0.98);
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: 14px;
  font-size: 0.875rem;
  color: #dc2626;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 700px) {
  .doc-convert {
    padding: 0 20px 60px;
  }

  .header {
    padding-top: 74px;
  }

  .header__title {
    font-size: 2.3rem;
  }

  .source-grid {
    gap: 8px;
  }

  .source-card {
    padding: 10px 14px;
    min-width: 80px;
    gap: 6px;
  }

  .source-card__label {
    font-size: 0.8125rem;
  }

  .source-card__icon svg {
    width: 18px;
    height: 18px;
  }

  .target-grid {
    gap: 6px;
  }

  .target-card {
    padding: 8px 14px;
    font-size: 0.8125rem;
  }

  .main-panel {
    padding: 22px;
    border-radius: 22px;
  }

  .upload-zone {
    padding: 56px 20px;
  }

  .result-actions {
    flex-direction: column;
  }
}
</style>
