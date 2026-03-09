<script setup>
import { ref, computed } from 'vue'
import { useDocConvert } from '../composables/useDocConvert'
import {
  FileText, Upload, Loader2, AlertCircle, RefreshCw,
  ArrowRightLeft, FileUp, Download, CheckCircle2, X,
  FileImage, ImagePlus,
  Table, FileSpreadsheet, FileType, FileCode, Images, Type
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
  <div class="doc-convert">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <FileText :size="14" />
          <span>文档转换</span>
        </div>
        <h1 class="header__title">
          <span>全能文档 </span>
          <span class="gradient-text">格式互转</span>
        </h1>
        <p class="header__desc">
          支持 7 种格式、21 种转换路径
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

<style scoped>
.doc-convert {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* 头部 */
.header {
  padding: 60px 0 40px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #60a5fa;
  margin-bottom: 24px;
}

.header__badge svg { color: #60a5fa; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

/* 分区标签 */
.section-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.section-label__hint {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--text-muted);
}

/* 源格式选择 */
.source-grid {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.source-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  min-width: 100px;
  justify-content: center;
}

.source-card:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  transform: translateY(-2px);
}

.source-card--active {
  border-color: var(--cat-color) !important;
  background: color-mix(in srgb, var(--cat-color) 10%, transparent) !important;
  box-shadow: 0 4px 20px -6px var(--cat-color);
}

.source-card--active .source-card__icon {
  color: var(--cat-color);
}

.source-card__icon {
  color: var(--text-secondary);
  transition: color 0.3s;
  display: flex;
}

.source-card__label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.source-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 目标格式选择 */
.target-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.target-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.target-card__arrow {
  opacity: 0.4;
}

.target-card:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}

.target-card--active {
  border-color: var(--cat-color) !important;
  background: color-mix(in srgb, var(--cat-color) 12%, transparent) !important;
  color: var(--text-primary);
}

.target-card--active .target-card__arrow {
  opacity: 1;
  color: var(--cat-color);
}

.target-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 转换路径提示 */
.convert-path {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px 24px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  color: var(--text-secondary);
}

.convert-path__from,
.convert-path__to {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--cat-color);
}

/* 主面板 */
.main-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 40px;
}

/* 上传区域 */
.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 80px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-zone:hover,
.upload-zone--drag {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.05);
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
}

.upload-zone:hover .upload-icon {
  transform: scale(1.05);
}

.upload-text {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 文件信息 */
.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  margin-bottom: 24px;
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
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card__size {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.file-card__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.file-card__close:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.file-card__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 多文件列表 */
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
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.file-list__item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.file-list__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-list__size {
  color: var(--text-muted);
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* 转换按钮 */
.convert-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.convert-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(59, 130, 246, 0.5);
}

.convert-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 进度条 */
.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 成功提示 */
.success-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  padding: 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  color: #34d399;
}

/* 操作按钮 */
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

/* 错误提示 */
.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  font-size: 0.875rem;
  color: #ef4444;
}

/* 动画 */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 700px) {
  .doc-convert {
    padding: 0 20px 60px;
  }

  .header__title {
    font-size: 2rem;
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

  .result-actions {
    flex-direction: column;
  }
}
</style>
