<script setup>
import { ref, computed } from 'vue'
import { useWatermarkRemoval } from '../composables/useWatermarkRemoval'
import {
  Eraser, Sparkles, Upload, Download, RefreshCw, Loader2,
  Image, AlertCircle, Clock, X, ZoomIn, ArrowLeftRight, Wand2
} from 'lucide-vue-next'

const {
  loading,
  error,
  resultImageUrl,
  progress,
  removeWatermark,
  reset
} = useWatermarkRemoval()

// 上传的原始图片
const originalImageUrl = ref('')
const originalFile = ref(null)
const isDragging = ref(false)
const customPrompt = ref('')
const showAdvanced = ref(false)
const compareMode = ref(false)
const comparePosition = ref(50)

// 历史记录
const history = ref([])

// 预设提示词
const presetPrompts = [
  { label: '通用水印', prompt: 'Remove all watermarks, logos, text overlays, and semi-transparent marks from this image. Restore the background naturally. Keep the original image content, colors, and details intact.' },
  { label: '文字水印', prompt: 'Remove all text watermarks and text overlays from this image. Restore the areas behind the text naturally while preserving the original image quality.' },
  { label: 'Logo水印', prompt: 'Remove all logo watermarks and brand marks from this image. Fill in the removed areas with natural background content that matches the surrounding pixels.' },
  { label: '半透明水印', prompt: 'Remove all semi-transparent watermarks and overlay patterns from this image. Restore the original colors and details beneath the watermarks.' },
]

// 处理文件选择
const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) processFile(file)
}

// 处理拖拽
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

// 处理粘贴
const handlePaste = (e) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) processFile(file)
      break
    }
  }
}

// 处理文件
const processFile = (file) => {
  if (!file.type.startsWith('image/')) {
    return
  }
  // 限制 10MB
  if (file.size > 10 * 1024 * 1024) {
    return
  }
  originalFile.value = file
  originalImageUrl.value = URL.createObjectURL(file)
  resultImageUrl.value = ''
  compareMode.value = false
}

// 开始去水印
const handleRemoveWatermark = async () => {
  if (!originalFile.value || loading.value) return

  try {
    const prompt = customPrompt.value.trim() || undefined
    const url = await removeWatermark(originalFile.value, prompt)

    history.value.unshift({
      id: Date.now(),
      originalUrl: originalImageUrl.value,
      resultUrl: url,
      time: new Date().toLocaleTimeString(),
    })

    if (history.value.length > 8) {
      history.value = history.value.slice(0, 8)
    }
  } catch (e) {
    console.error('去水印失败:', e)
  }
}

// 下载结果
const downloadResult = async () => {
  if (!resultImageUrl.value) return
  try {
    const response = await fetch(resultImageUrl.value)
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `watermark-removed-${Date.now()}.png`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (e) {
    window.open(resultImageUrl.value, '_blank')
  }
}

// 重置全部
const resetAll = () => {
  reset()
  originalImageUrl.value = ''
  originalFile.value = null
  customPrompt.value = ''
  compareMode.value = false
}

// 使用预设提示词
const usePreset = (preset) => {
  customPrompt.value = preset.prompt
}

// 对比滑块拖动
const handleCompareMove = (e) => {
  if (!compareMode.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  comparePosition.value = (x / rect.width) * 100
}

// 文件大小显示
const fileSize = computed(() => {
  if (!originalFile.value) return ''
  const size = originalFile.value.size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})
</script>

<template>
  <div class="watermark-removal" @paste="handlePaste">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <Eraser :size="14" />
          <span>AI 去水印</span>
        </div>
        <h1 class="header__title">
          <span>智能去水印，</span>
          <span class="gradient-text">一键还原</span>
        </h1>
        <p class="header__desc">
          基于 AI 图像编辑模型，智能识别并去除各类复杂水印
        </p>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main">
      <div class="panel">
        <!-- 左侧：上传与设置 -->
        <div class="input-section">
          <!-- 上传区域 -->
          <div
            v-if="!originalImageUrl"
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
              accept="image/*"
              class="upload-input"
              @change="handleFileSelect"
            />
            <div class="upload-icon">
              <Upload :size="40" />
            </div>
            <p class="upload-text">点击上传或拖拽图片到此处</p>
            <p class="upload-hint">支持 JPG、PNG、WebP，最大 10MB</p>
            <p class="upload-hint">也可以直接 Ctrl+V 粘贴图片</p>
          </div>

          <!-- 已上传图片预览 -->
          <div v-else class="preview-section">
            <div class="preview-header">
              <div class="preview-label">
                <Image :size="16" />
                <span>原始图片</span>
                <span class="file-size">{{ fileSize }}</span>
              </div>
              <button class="preview-close" @click="resetAll" :disabled="loading">
                <X :size="16" />
              </button>
            </div>
            <div class="preview-image">
              <img :src="originalImageUrl" alt="原始图片" />
            </div>

            <!-- 重新选择 -->
            <button
              class="reselect-btn"
              @click="$refs.fileInput2.click()"
              :disabled="loading"
            >
              <Upload :size="16" />
              <span>重新选择图片</span>
            </button>
            <input
              ref="fileInput2"
              type="file"
              accept="image/*"
              class="upload-input"
              @change="handleFileSelect"
            />
          </div>

          <!-- 高级设置 -->
          <div class="advanced-section">
            <button class="advanced-toggle" @click="showAdvanced = !showAdvanced">
              <Wand2 :size="16" />
              <span>高级设置</span>
              <span class="toggle-arrow" :class="{ open: showAdvanced }">▾</span>
            </button>

            <div v-if="showAdvanced" class="advanced-content">
              <label class="input-label">
                <span>自定义提示词（可选）</span>
              </label>
              <textarea
                v-model="customPrompt"
                class="textarea"
                placeholder="留空则使用默认提示词。您也可以描述水印的具体位置和类型来提高效果..."
                rows="3"
                :disabled="loading"
              ></textarea>

              <!-- 预设提示词 -->
              <div class="presets">
                <span class="presets-label">快速选择：</span>
                <div class="presets-list">
                  <button
                    v-for="preset in presetPrompts"
                    :key="preset.label"
                    class="preset-btn"
                    @click="usePreset(preset)"
                    :disabled="loading"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <button
            class="generate-btn"
            :disabled="!originalFile || loading"
            @click="handleRemoveWatermark"
          >
            <Loader2 v-if="loading" :size="20" class="spin" />
            <Sparkles v-else :size="20" />
            <span>{{ loading ? '处理中...' : '开始去水印' }}</span>
          </button>

          <!-- 进度条 -->
          <div v-if="loading" class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="error-msg">
            <AlertCircle :size="16" />
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- 右侧：结果展示 -->
        <div class="result-section">
          <!-- 有结果时 -->
          <div v-if="resultImageUrl && originalImageUrl" class="result-content">
            <!-- 对比模式 -->
            <div v-if="compareMode" class="compare-container" @mousemove="handleCompareMove">
              <div class="compare-image compare-image--original">
                <img :src="originalImageUrl" alt="原图" />
                <span class="compare-label compare-label--left">原图</span>
              </div>
              <div class="compare-image compare-image--result" :style="{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }">
                <img :src="resultImageUrl" alt="去水印后" />
                <span class="compare-label compare-label--right">去水印后</span>
              </div>
              <div class="compare-slider" :style="{ left: comparePosition + '%' }">
                <div class="compare-handle">
                  <ArrowLeftRight :size="16" />
                </div>
              </div>
            </div>

            <!-- 普通模式 -->
            <div v-else class="result-image">
              <img :src="resultImageUrl" alt="去水印后的图片" />
            </div>

            <!-- 操作按钮 -->
            <div class="result-actions">
              <button class="action-btn" @click="compareMode = !compareMode">
                <ArrowLeftRight :size="18" />
                <span>{{ compareMode ? '退出对比' : '效果对比' }}</span>
              </button>
              <button class="action-btn" @click="downloadResult">
                <Download :size="18" />
                <span>下载</span>
              </button>
              <button class="action-btn" @click="resetAll">
                <RefreshCw :size="18" />
                <span>重置</span>
              </button>
            </div>
          </div>

          <!-- 无结果时 -->
          <div v-else class="result-placeholder">
            <div class="placeholder-icon">
              <Eraser :size="48" />
            </div>
            <p>去水印结果将在这里显示</p>
            <span class="placeholder-tip">上传图片后点击"开始去水印"</span>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div v-if="history.length" class="history">
        <h3 class="history-title">
          <Clock :size="16" />
          <span>处理记录</span>
        </h3>
        <div class="history-grid">
          <div
            v-for="item in history"
            :key="item.id"
            class="history-item"
            @click="originalImageUrl = item.originalUrl; resultImageUrl = item.resultUrl; compareMode = false"
          >
            <div class="history-images">
              <img :src="item.resultUrl" alt="处理结果" />
            </div>
            <div class="history-info">
              <span class="history-time">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watermark-removal {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* ═══════════════════════════════════════════════════════════
   头部
   ═══════════════════════════════════════════════════════════ */

.header {
  padding: 60px 0 40px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #34d399;
  margin-bottom: 24px;
}

.header__badge svg {
  color: #34d399;
}

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════════════════════════
   主面板
   ═══════════════════════════════════════════════════════════ */

.panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 48px;
}

.input-section,
.result-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 28px;
}

/* ═══════════════════════════════════════════════════════════
   上传区域
   ═══════════════════════════════════════════════════════════ */

.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 60px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-zone:hover,
.upload-zone--drag {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.05);
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
  background: rgba(16, 185, 129, 0.1);
  border-radius: 24px;
  margin: 0 auto 20px;
  color: #34d399;
  transition: all 0.3s;
}

.upload-zone:hover .upload-icon {
  transform: scale(1.05);
  background: rgba(16, 185, 129, 0.15);
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

/* ═══════════════════════════════════════════════════════════
   预览区域
   ═══════════════════════════════════════════════════════════ */

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.preview-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-label svg {
  color: #34d399;
}

.file-size {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 6px;
}

.preview-close {
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
}

.preview-close:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.preview-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-image {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 16px;
}

.preview-image img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  display: block;
}

.reselect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.reselect-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.reselect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ═══════════════════════════════════════════════════════════
   高级设置
   ═══════════════════════════════════════════════════════════ */

.advanced-section {
  margin-top: 20px;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.advanced-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
}

.advanced-toggle svg {
  color: var(--primary);
}

.toggle-arrow {
  margin-left: auto;
  transition: transform 0.3s;
}

.toggle-arrow.open {
  transform: rotate(180deg);
}

.advanced-content {
  margin-top: 16px;
}

.input-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.textarea {
  width: 100%;
  padding: 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-size: 0.875rem;
  color: var(--text-primary);
  resize: none;
  transition: all 0.3s;
  font-family: inherit;
}

.textarea::placeholder {
  color: var(--text-muted);
}

.textarea:focus {
  outline: none;
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 预设提示词 */
.presets {
  margin-top: 14px;
}

.presets-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.presets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.preset-btn:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.preset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ═══════════════════════════════════════════════════════════
   操作按钮
   ═══════════════════════════════════════════════════════════ */

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
  margin-top: 24px;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(16, 185, 129, 0.5);
}

.generate-btn:disabled {
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
  background: linear-gradient(90deg, #10b981, #3b82f6);
  border-radius: 3px;
  transition: width 0.3s ease;
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

/* ═══════════════════════════════════════════════════════════
   结果展示
   ═══════════════════════════════════════════════════════════ */

.result-section {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.placeholder-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  margin-bottom: 16px;
}

.placeholder-icon svg {
  opacity: 0.4;
}

.result-placeholder p {
  font-size: 0.9375rem;
  margin-bottom: 4px;
}

.placeholder-tip {
  font-size: 0.8125rem;
  opacity: 0.6;
}

.result-image {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.result-image img {
  width: 100%;
  max-height: 450px;
  object-fit: contain;
  display: block;
}

/* 对比模式 */
.compare-container {
  position: relative;
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  cursor: col-resize;
  user-select: none;
}

.compare-image {
  position: absolute;
  inset: 0;
}

.compare-image img {
  width: 100%;
  height: 100%;
  max-height: 450px;
  object-fit: contain;
}

.compare-image--original {
  z-index: 1;
}

.compare-image--result {
  z-index: 2;
}

.compare-label {
  position: absolute;
  top: 12px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  z-index: 3;
}

.compare-label--left {
  left: 12px;
}

.compare-label--right {
  right: 12px;
}

.compare-slider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: white;
  z-index: 4;
  transform: translateX(-50%);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.compare-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  color: #1a1a2e;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
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

/* ═══════════════════════════════════════════════════════════
   历史记录
   ═══════════════════════════════════════════════════════════ */

.history {
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.history-title svg {
  color: var(--text-muted);
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.history-item {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(0, 0, 0, 0.2);
}

.history-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px -10px rgba(0, 0, 0, 0.4);
}

.history-images img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.history-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.history-time {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
}

/* ═══════════════════════════════════════════════════════════
   动画
   ═══════════════════════════════════════════════════════════ */

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ═══════════════════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 900px) {
  .watermark-removal {
    padding: 0 20px 60px;
  }

  .header__title {
    font-size: 2rem;
  }

  .panel {
    grid-template-columns: 1fr;
  }

  .history-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .result-actions {
    flex-direction: column;
  }

  .history-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
