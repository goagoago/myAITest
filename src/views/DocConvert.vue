<script setup>
import { ref, computed } from 'vue'
import { useDocConvert } from '../composables/useDocConvert'
import {
  FileText, Upload, Loader2, AlertCircle, RefreshCw,
  ArrowRightLeft, FileUp, Download, CheckCircle2, X
} from 'lucide-vue-next'

const {
  loading,
  error,
  progress,
  convertedFileName,
  convertPdfToWord,
  convertWordToPdf,
  reset
} = useDocConvert()

// 当前模式: 'pdf2word' | 'word2pdf'
const mode = ref('pdf2word')
const selectedFile = ref(null)
const isDragging = ref(false)
const converted = ref(false)

const acceptType = computed(() =>
  mode.value === 'pdf2word' ? '.pdf' : '.doc,.docx'
)

const acceptLabel = computed(() =>
  mode.value === 'pdf2word' ? 'PDF' : 'Word'
)

const switchMode = (newMode) => {
  if (loading.value) return
  mode.value = newMode
  resetAll()
}

const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) processFile(file)
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const processFile = (file) => {
  if (mode.value === 'pdf2word') {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return
    }
  } else {
    if (!file.name.toLowerCase().match(/\.docx?$/)) {
      return
    }
  }
  if (file.size > 50 * 1024 * 1024) return
  selectedFile.value = file
  converted.value = false
  reset()
}

const fileSize = computed(() => {
  if (!selectedFile.value) return ''
  const size = selectedFile.value.size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})

const handleConvert = async () => {
  if (!selectedFile.value || loading.value) return
  try {
    if (mode.value === 'pdf2word') {
      await convertPdfToWord(selectedFile.value)
    } else {
      await convertWordToPdf(selectedFile.value)
    }
    converted.value = true
  } catch (e) {
    console.error('转换失败:', e)
  }
}

const resetAll = () => {
  reset()
  selectedFile.value = null
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
          <span>PDF / Word </span>
          <span class="gradient-text">格式互转</span>
        </h1>
        <p class="header__desc">
          纯浏览器端转换，无需上传服务器，安全快速
        </p>
      </div>
    </header>

    <!-- 模式切换 -->
    <div class="mode-tabs">
      <button
        :class="['mode-tab', { 'mode-tab--active': mode === 'pdf2word' }]"
        @click="switchMode('pdf2word')"
        :disabled="loading"
      >
        <FileText :size="18" />
        <span>PDF → Word</span>
      </button>
      <button
        :class="['mode-tab', { 'mode-tab--active': mode === 'word2pdf' }]"
        @click="switchMode('word2pdf')"
        :disabled="loading"
      >
        <ArrowRightLeft :size="18" />
        <span>Word → PDF</span>
      </button>
    </div>

    <!-- 主内容 -->
    <div class="main-panel">
      <!-- 上传区域 -->
      <div
        v-if="!selectedFile"
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
          :accept="acceptType"
          class="upload-input"
          @change="handleFileSelect"
        />
        <div class="upload-icon">
          <Upload :size="40" />
        </div>
        <p class="upload-text">点击上传或拖拽 {{ acceptLabel }} 文件到此处</p>
        <p class="upload-hint">最大 50MB</p>
      </div>

      <!-- 已选文件 -->
      <div v-else class="file-info">
        <div class="file-card">
          <div class="file-card__icon">
            <FileUp :size="32" />
          </div>
          <div class="file-card__detail">
            <p class="file-card__name">{{ selectedFile.name }}</p>
            <p class="file-card__size">{{ fileSize }}</p>
          </div>
          <button class="file-card__close" @click="resetAll" :disabled="loading">
            <X :size="16" />
          </button>
        </div>

        <!-- 转换按钮 -->
        <button
          v-if="!converted"
          class="convert-btn"
          :disabled="loading"
          @click="handleConvert"
        >
          <Loader2 v-if="loading" :size="20" class="spin" />
          <ArrowRightLeft v-else :size="20" />
          <span>{{ loading ? '转换中...' : (mode === 'pdf2word' ? '转换为 Word' : '转换为 PDF') }}</span>
        </button>

        <!-- 进度条 -->
        <div v-if="loading" class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
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
        <div class="feature-icon">🆓</div>
        <h3>完全免费</h3>
        <p>无需注册、无次数限制、永久免费使用</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-convert {
  max-width: 800px;
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

/* 模式切换 */
.mode-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  margin-bottom: 32px;
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-tab:hover:not(:disabled) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.mode-tab--active {
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.mode-tab:disabled {
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
  background: rgba(59, 130, 246, 0.15);
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
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  border-radius: 14px;
  color: #60a5fa;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.feature-item {
  padding: 28px 20px;
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
@media (max-width: 700px) {
  .doc-convert {
    padding: 0 20px 60px;
  }

  .header__title {
    font-size: 2rem;
  }

  .features-section {
    grid-template-columns: 1fr;
  }

  .result-actions {
    flex-direction: column;
  }
}
</style>
