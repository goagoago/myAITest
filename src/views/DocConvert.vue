<script setup>
import { ref, computed } from 'vue'
import { useDocConvert } from '../composables/useDocConvert'
import {
  FileText, Upload, Loader2, AlertCircle, RefreshCw,
  ArrowRightLeft, FileUp, Download, CheckCircle2, X,
  FileCode, FileImage, Code2, ImagePlus, Images
} from 'lucide-vue-next'

const {
  loading,
  error,
  progress,
  convertedFileName,
  convertPdfToWord,
  convertWordToPdf,
  convertMarkdownToPdf,
  convertMarkdownToWord,
  convertHtmlToPdf,
  convertImagesToPdf,
  convertPdfToImages,
  reset
} = useDocConvert()

// 转换模式配置
const modes = [
  {
    id: 'pdf2word',
    label: 'PDF → Word',
    icon: FileText,
    accept: '.pdf',
    acceptLabel: 'PDF',
    desc: '提取文本生成 Word',
    color: '#3b82f6',
    multiple: false,
  },
  {
    id: 'word2pdf',
    label: 'Word → PDF',
    icon: ArrowRightLeft,
    accept: '.doc,.docx',
    acceptLabel: 'Word',
    desc: '保留排版导出 PDF',
    color: '#8b5cf6',
    multiple: false,
  },
  {
    id: 'md2pdf',
    label: 'Markdown → PDF',
    icon: FileCode,
    accept: '.md,.markdown',
    acceptLabel: 'Markdown',
    desc: '渲染格式生成 PDF',
    color: '#10b981',
    multiple: false,
  },
  {
    id: 'md2word',
    label: 'Markdown → Word',
    icon: Code2,
    accept: '.md,.markdown',
    acceptLabel: 'Markdown',
    desc: '解析标记生成 Word',
    color: '#14b8a6',
    multiple: false,
  },
  {
    id: 'html2pdf',
    label: 'HTML → PDF',
    icon: FileCode,
    accept: '.html,.htm',
    acceptLabel: 'HTML',
    desc: '网页内容转为 PDF',
    color: '#f97316',
    multiple: false,
  },
  {
    id: 'img2pdf',
    label: '图片 → PDF',
    icon: ImagePlus,
    accept: 'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif',
    acceptLabel: '图片',
    desc: '多张图片合并为 PDF',
    color: '#ec4899',
    multiple: true,
  },
  {
    id: 'pdf2img',
    label: 'PDF → 图片',
    icon: Images,
    accept: '.pdf',
    acceptLabel: 'PDF',
    desc: '逐页导出为 PNG 图',
    color: '#eab308',
    multiple: false,
  },
]

const mode = ref('pdf2word')
const selectedFile = ref(null)
const selectedFiles = ref([])
const isDragging = ref(false)
const converted = ref(false)

const currentMode = computed(() => modes.find(m => m.id === mode.value))

const switchMode = (newMode) => {
  if (loading.value) return
  mode.value = newMode
  resetAll()
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (!files || files.length === 0) return
  if (currentMode.value.multiple) {
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
  if (currentMode.value.multiple) {
    processFiles(Array.from(files))
  } else {
    processFile(files[0])
  }
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
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
  if (currentMode.value.multiple && selectedFiles.value.length > 0) {
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
  if (currentMode.value.multiple && selectedFiles.value.length > 1) {
    return `${selectedFiles.value.length} 个文件`
  }
  return selectedFile.value?.name || ''
})

const handleConvert = async () => {
  if (loading.value) return
  if (currentMode.value.multiple) {
    if (selectedFiles.value.length === 0) return
  } else {
    if (!selectedFile.value) return
  }

  try {
    switch (mode.value) {
      case 'pdf2word':
        await convertPdfToWord(selectedFile.value)
        break
      case 'word2pdf':
        await convertWordToPdf(selectedFile.value)
        break
      case 'md2pdf':
        await convertMarkdownToPdf(selectedFile.value)
        break
      case 'md2word':
        await convertMarkdownToWord(selectedFile.value)
        break
      case 'html2pdf':
        await convertHtmlToPdf(selectedFile.value)
        break
      case 'img2pdf':
        await convertImagesToPdf(selectedFiles.value)
        break
      case 'pdf2img':
        await convertPdfToImages(selectedFile.value)
        break
    }
    converted.value = true
  } catch (e) {
    console.error('转换失败:', e)
  }
}

const convertBtnLabel = computed(() => {
  const map = {
    pdf2word: '转换为 Word',
    word2pdf: '转换为 PDF',
    md2pdf: '转换为 PDF',
    md2word: '转换为 Word',
    html2pdf: '转换为 PDF',
    img2pdf: '合并为 PDF',
    pdf2img: '导出为图片',
  }
  return map[mode.value] || '开始转换'
})

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
          <span class="gradient-text">格式转换</span>
        </h1>
        <p class="header__desc">
          支持 7 种转换模式，纯浏览器端处理，无需上传服务器
        </p>
      </div>
    </header>

    <!-- 模式选择卡片 -->
    <div class="mode-grid">
      <button
        v-for="m in modes"
        :key="m.id"
        :class="['mode-card', { 'mode-card--active': mode === m.id }]"
        @click="switchMode(m.id)"
        :disabled="loading"
        :style="{ '--mode-color': m.color }"
      >
        <div class="mode-card__icon">
          <component :is="m.icon" :size="20" />
        </div>
        <span class="mode-card__label">{{ m.label }}</span>
        <span class="mode-card__desc">{{ m.desc }}</span>
      </button>
    </div>

    <!-- 主内容 -->
    <div class="main-panel">
      <!-- 上传区域 -->
      <div
        v-if="selectedFiles.length === 0"
        class="upload-zone"
        :class="{ 'upload-zone--drag': isDragging }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @click="$refs.fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          :accept="currentMode.accept"
          :multiple="currentMode.multiple"
          class="upload-input"
          @change="handleFileSelect"
        />
        <div class="upload-icon" :style="{ background: `${currentMode.color}15`, color: currentMode.color }">
          <Upload :size="40" />
        </div>
        <p class="upload-text">
          {{ currentMode.multiple ? '点击上传或拖拽多张图片到此处' : `点击上传或拖拽 ${currentMode.acceptLabel} 文件到此处` }}
        </p>
        <p class="upload-hint">最大 100MB{{ currentMode.multiple ? '，支持多选' : '' }}</p>
      </div>

      <!-- 已选文件 -->
      <div v-else class="file-info">
        <div class="file-card">
          <div class="file-card__icon" :style="{ background: `${currentMode.color}20`, color: currentMode.color }">
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
        <div v-if="currentMode.multiple && selectedFiles.length > 1" class="file-list">
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
          :style="{ background: loading ? '' : `linear-gradient(135deg, ${currentMode.color} 0%, ${currentMode.color}cc 100%)` }"
          @click="handleConvert"
        >
          <Loader2 v-if="loading" :size="20" class="spin" />
          <ArrowRightLeft v-else :size="20" />
          <span>{{ loading ? '转换中...' : convertBtnLabel }}</span>
        </button>

        <!-- 进度条 -->
        <div v-if="loading" class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progress + '%', background: `linear-gradient(90deg, ${currentMode.color}, ${currentMode.color}cc)` }"
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

    <!-- 功能说明 -->
    <div class="features-section">
      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <h3>安全私密</h3>
        <p>文件仅在浏览器本地处理，不会上传到任何服务器</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">⚡</div>
        <h3>快速转换</h3>
        <p>基于浏览器端技术，秒级完成文档格式转换</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">📄</div>
        <h3>7 种模式</h3>
        <p>PDF、Word、Markdown、HTML、图片多种格式互转</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🆓</div>
        <h3>完全免费</h3>
        <p>无需注册、无次数限制、永久免费使用</p>
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

.header__badge svg {
  color: #60a5fa;
}

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

/* 模式选择卡片网格 */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 32px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.mode-card:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  transform: translateY(-2px);
}

.mode-card--active {
  border-color: var(--mode-color) !important;
  background: color-mix(in srgb, var(--mode-color) 8%, transparent) !important;
  box-shadow: 0 4px 20px -6px var(--mode-color);
}

.mode-card--active .mode-card__icon {
  background: var(--mode-color);
  color: white;
}

.mode-card__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: var(--text-secondary);
  transition: all 0.3s;
}

.mode-card__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.mode-card__desc {
  font-size: 0.6875rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.mode-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.upload-input {
  display: none;
}

.upload-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 24px;
  margin: 0 auto 20px;
  color: #60a5fa;
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
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
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

/* 功能说明 */
.features-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.feature-item {
  padding: 28px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  text-align: center;
  transition: all 0.3s;
}

.feature-item:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 15px 40px -15px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.feature-item h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.feature-item p {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.6;
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
@media (max-width: 800px) {
  .mode-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .doc-convert {
    padding: 0 20px 60px;
  }

  .header__title {
    font-size: 2rem;
  }

  .mode-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .mode-card {
    padding: 12px 6px;
  }

  .mode-card__desc {
    display: none;
  }

  .features-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .result-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .features-section {
    grid-template-columns: 1fr;
  }
}
</style>
