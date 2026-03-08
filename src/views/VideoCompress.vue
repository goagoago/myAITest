<script setup>
import { ref, computed, watch } from 'vue'
import { useVideoCompress } from '../composables/useVideoCompress'
import {
  Video, Upload, Loader2, AlertCircle, RefreshCw,
  Download, X, Settings2, Zap, Info,
  Sparkles, Scale, Minimize2, Target
} from 'lucide-vue-next'

const {
  loading,
  error,
  progress,
  phase,
  result,
  compress,
  reset
} = useVideoCompress()

const phaseText = {
  loading: '正在加载 FFmpeg 引擎...',
  writing: '正在读取视频文件...',
  compressing: '正在压缩视频...',
  reading: '正在导出结果...',
}

const originalFile = ref(null)
const originalUrl = ref('')
const isDragging = ref(false)
const converted = ref(false)

// 压缩参数
const preset = ref('balanced')
const resolution = ref('original')
const outputFormat = ref('mp4')

// 目标大小
const targetSizeValue = ref('')
const targetSizeUnit = ref('MB')
const sizeUnits = [
  { value: 'KB', label: 'KB', multiplier: 1024 },
  { value: 'MB', label: 'MB', multiplier: 1024 * 1024 },
  { value: 'GB', label: 'GB', multiplier: 1024 * 1024 * 1024 },
]

const presets = [
  { id: 'high', label: '高质量', desc: '画质优先，适度压缩', icon: Sparkles },
  { id: 'balanced', label: '均衡', desc: '质量与体积平衡', icon: Scale },
  { id: 'max', label: '极致压缩', desc: '体积最小，画质有损', icon: Minimize2 },
  { id: 'custom', label: '指定大小', desc: '压缩到目标体积', icon: Target },
]

const resolutions = [
  { value: 'original', label: '原始分辨率' },
  { value: '1080', label: '1080P' },
  { value: '720', label: '720P' },
  { value: '480', label: '480P' },
]

const formats = [
  { value: 'mp4', label: 'MP4', desc: '兼容性最好' },
  { value: 'webm', label: 'WebM', desc: '体积更小' },
]

// 文件处理
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
  if (!file.type.startsWith('video/')) return
  if (file.size > 500 * 1024 * 1024) return
  originalFile.value = file
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  originalUrl.value = URL.createObjectURL(file)
  converted.value = false
  reset()
}

const fileSize = computed(() => formatSize(originalFile.value?.size || 0))
const compressedSize = computed(() => formatSize(result.compressedSize))
const compressionRatio = computed(() => {
  if (!result.originalSize || !result.compressedSize) return 0
  return Math.round((1 - result.compressedSize / result.originalSize) * 100)
})

function formatSize(size) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 目标大小校验：不能超过原始文件大小
const maxTargetInUnit = computed(() => {
  const fileBytes = originalFile.value?.size || 0
  if (!fileBytes) return 0
  const unit = sizeUnits.find(u => u.value === targetSizeUnit.value)
  return parseFloat((fileBytes / (unit?.multiplier || 1)).toFixed(1))
})

const isUnitDisabled = (unitValue) => {
  const fileBytes = originalFile.value?.size || 0
  if (!fileBytes) return true
  const unit = sizeUnits.find(u => u.value === unitValue)
  // 该单位下最小可选值 0.1 对应的字节数 > 原文件大小，则禁用
  return (0.1 * (unit?.multiplier || 1)) > fileBytes
}

// 切换单位时：如果当前值超限则自动修正；如果新单位不可用则回退
watch(targetSizeUnit, () => {
  const max = maxTargetInUnit.value
  const v = parseFloat(targetSizeValue.value)
  if (v && v > max) targetSizeValue.value = String(max)
})

// 输入值变化时：不能超过原文件大小
watch(targetSizeValue, (val) => {
  const v = parseFloat(val)
  const max = maxTargetInUnit.value
  if (v && max && v > max) {
    targetSizeValue.value = String(max)
  }
})

const handleCompress = async () => {
  if (!originalFile.value || loading.value) return
  // 指定大小模式校验
  if (preset.value === 'custom') {
    const v = parseFloat(targetSizeValue.value)
    if (!v || v <= 0) return
  }
  try {
    const opts = {
      preset: preset.value,
      resolution: resolution.value,
      format: outputFormat.value,
    }
    if (preset.value === 'custom') {
      const unit = sizeUnits.find(u => u.value === targetSizeUnit.value)
      opts.targetSize = parseFloat(targetSizeValue.value) * (unit?.multiplier || 1024 * 1024)
    }
    await compress(originalFile.value, opts)
    converted.value = true
  } catch (e) {
    console.error('压缩失败:', e)
  }
}

const downloadResult = () => {
  if (!result.blob) return
  const ext = outputFormat.value
  const baseName = originalFile.value.name.replace(/\.[^.]+$/, '')
  const link = document.createElement('a')
  link.href = result.url
  link.download = `${baseName}_compressed.${ext}`
  link.click()
}

const resetAll = () => {
  reset()
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  originalFile.value = null
  originalUrl.value = ''
  converted.value = false
}
</script>

<template>
  <div class="video-compress">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <Video :size="14" />
          <span>视频压缩</span>
        </div>
        <h1 class="header__title">
          <span>视频智能压缩，</span>
          <span class="gradient-text">轻松瘦身</span>
        </h1>
        <p class="header__desc">
          浏览器端 FFmpeg 处理，无需上传服务器，安全高效
        </p>
      </div>
    </header>

    <!-- 主内容 -->
    <div class="main-area">
      <!-- 左侧：上传与设置 -->
      <div class="panel panel--input">
        <!-- 上传区域 -->
        <div
          v-if="!originalFile"
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
            accept="video/*"
            class="upload-input"
            @change="handleFileSelect"
          />
          <div class="upload-icon">
            <Upload :size="40" />
          </div>
          <p class="upload-text">点击上传或拖拽视频到此处</p>
          <p class="upload-hint">支持 MP4、WebM、MOV、AVI 等格式，最大 500MB</p>
        </div>

        <!-- 已上传预览 -->
        <template v-else>
          <div class="preview-header">
            <div class="preview-label">
              <Video :size="16" />
              <span>原始视频</span>
              <span class="file-size-tag">{{ fileSize }}</span>
            </div>
            <button class="preview-close" @click="resetAll" :disabled="loading">
              <X :size="16" />
            </button>
          </div>

          <div class="preview-video">
            <video :src="originalUrl" controls preload="metadata" />
          </div>

          <button
            class="reselect-btn"
            @click="$refs.fileInput2.click()"
            :disabled="loading"
          >
            <Upload :size="16" />
            <span>重新选择视频</span>
          </button>
          <input
            ref="fileInput2"
            type="file"
            accept="video/*"
            class="upload-input"
            @change="handleFileSelect"
          />

          <!-- 压缩预设 -->
          <div class="mode-section">
            <h3 class="section-label">
              <Settings2 :size="16" />
              <span>压缩预设</span>
            </h3>
            <div class="preset-grid">
              <button
                v-for="p in presets"
                :key="p.id"
                :class="['preset-card', { 'preset-card--active': preset === p.id }]"
                @click="preset = p.id"
                :disabled="loading"
              >
                <component :is="p.icon" :size="20" class="preset-card__icon" />
                <span class="preset-card__label">{{ p.label }}</span>
                <span class="preset-card__desc">{{ p.desc }}</span>
              </button>
            </div>

            <!-- 目标大小输入 -->
            <div v-if="preset === 'custom'" class="target-size-row">
              <input
                v-model="targetSizeValue"
                type="number"
                min="0.1"
                step="0.1"
                :max="maxTargetInUnit"
                :placeholder="`最大 ${maxTargetInUnit}`"
                class="target-size-input"
                :disabled="loading"
              />
              <div class="unit-select">
                <button
                  v-for="u in sizeUnits"
                  :key="u.value"
                  :class="['unit-btn', { 'unit-btn--active': targetSizeUnit === u.value }]"
                  @click="targetSizeUnit = u.value"
                  :disabled="loading || isUnitDisabled(u.value)"
                >{{ u.label }}</button>
              </div>
            </div>
          </div>

          <!-- 参数面板 -->
          <div class="options-panel">
            <!-- 分辨率 -->
            <div class="option-group">
              <label class="option-label">输出分辨率</label>
              <div class="resolution-options">
                <button
                  v-for="r in resolutions"
                  :key="r.value"
                  :class="['res-btn', { 'res-btn--active': resolution === r.value }]"
                  @click="resolution = r.value"
                  :disabled="loading"
                >{{ r.label }}</button>
              </div>
            </div>

            <!-- 输出格式 -->
            <div class="option-group">
              <label class="option-label">输出格式</label>
              <div class="format-options">
                <button
                  v-for="f in formats"
                  :key="f.value"
                  :class="['format-btn', { 'format-btn--active': outputFormat === f.value }]"
                  @click="outputFormat = f.value"
                  :disabled="loading"
                >
                  <span class="format-btn__label">{{ f.label }}</span>
                  <span class="format-btn__desc">{{ f.desc }}</span>
                </button>
              </div>
            </div>

            <div class="option-info">
              <Info :size="16" />
              <span>视频压缩在浏览器端使用 FFmpeg.wasm 处理，大文件可能需要较长时间，请耐心等待。</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <button
            class="compress-btn"
            :disabled="loading"
            @click="handleCompress"
          >
            <Loader2 v-if="loading" :size="20" class="spin" />
            <Zap v-else :size="20" />
            <span>{{ loading ? (phaseText[phase] || '处理中...') : '开始压缩' }}</span>
          </button>

          <!-- 进度条 -->
          <div v-if="loading" class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p v-if="loading" class="progress-text">{{ progress }}%</p>

          <!-- 错误提示 -->
          <div v-if="error" class="error-msg">
            <AlertCircle :size="16" />
            <span>{{ error }}</span>
          </div>
        </template>
      </div>

      <!-- 右侧：结果 -->
      <div class="panel panel--result">
        <div v-if="converted && result.url" class="result-content">
          <!-- 压缩统计 -->
          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-label">原始大小</span>
              <span class="stat-value">{{ fileSize }}</span>
            </div>
            <div class="stat-arrow">&rarr;</div>
            <div class="stat-item">
              <span class="stat-label">压缩后</span>
              <span class="stat-value stat-value--highlight">{{ compressedSize }}</span>
            </div>
            <div class="stat-item stat-item--ratio">
              <span class="stat-label">压缩率</span>
              <span
                class="stat-value"
                :class="compressionRatio > 0 ? 'stat-value--green' : 'stat-value--red'"
              >
                {{ compressionRatio > 0 ? '-' : '+' }}{{ Math.abs(compressionRatio) }}%
              </span>
            </div>
          </div>

          <!-- 视频预览 -->
          <div class="result-video">
            <video :src="result.url" controls preload="metadata" />
          </div>

          <!-- 操作按钮 -->
          <div class="result-actions">
            <button class="action-btn action-btn--primary" @click="downloadResult">
              <Download :size="18" />
              <span>下载</span>
            </button>
            <button class="action-btn" @click="resetAll">
              <RefreshCw :size="18" />
              <span>重置</span>
            </button>
          </div>
        </div>

        <!-- 占位 -->
        <div v-else class="result-placeholder">
          <div class="placeholder-icon">
            <Video :size="48" />
          </div>
          <p>压缩结果将在这里显示</p>
          <span class="placeholder-tip">上传视频并选择参数后点击"开始压缩"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-compress {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* 头部 */
.header {
  padding: 60px 0 40px;
  display: flex;
  align-items: center;
  gap: 32px;
  justify-content: center;
}

.header__content {
  text-align: left;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(239, 68, 68, 0.15));
  border: 1px solid rgba(249, 115, 22, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fb923c;
  margin-bottom: 24px;
}

.header__badge svg { color: #fb923c; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #f97316 0%, #ef4444 50%, #dc2626 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

/* 主区域 */
.main-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 28px;
}

.panel--result {
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

/* 上传区域 */
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
  border-color: rgba(249, 115, 22, 0.5);
  background: rgba(249, 115, 22, 0.05);
}

.upload-input { display: none; }

.upload-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(249, 115, 22, 0.1);
  border-radius: 24px;
  margin: 0 auto 20px;
  color: #fb923c;
  transition: all 0.3s;
}

.upload-zone:hover .upload-icon {
  transform: scale(1.05);
  background: rgba(249, 115, 22, 0.15);
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

/* 预览 */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.preview-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-label svg { color: #fb923c; }

.file-size-tag {
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

.preview-close:disabled { opacity: 0.5; cursor: not-allowed; }

.preview-video {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 12px;
}

.preview-video video {
  display: block;
  width: 100%;
  max-height: 240px;
  object-fit: contain;
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
  margin-bottom: 20px;
}

.reselect-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.reselect-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 预设选择 */
.mode-section { margin-bottom: 20px; }

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.section-label svg { color: var(--text-muted); }

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.preset-card:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.preset-card--active {
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(249, 115, 22, 0.35);
}

.preset-card:disabled { opacity: 0.5; cursor: not-allowed; }

.preset-card__icon {
  color: var(--text-muted);
  transition: color 0.3s;
}

.preset-card--active .preset-card__icon {
  color: #fb923c;
}

.preset-card__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-card__desc {
  font-size: 0.6875rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* 目标大小输入 */
.target-size-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.target-size-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  outline: none;
  transition: all 0.3s;
  -moz-appearance: textfield;
}

.target-size-input::-webkit-outer-spin-button,
.target-size-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.target-size-input::placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

.target-size-input:focus {
  border-color: rgba(249, 115, 22, 0.5);
  background: rgba(249, 115, 22, 0.04);
}

.target-size-input:disabled { opacity: 0.5; }

.unit-select {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 4px;
}

.unit-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s;
}

.unit-btn:hover:not(:disabled) {
  color: var(--text-secondary);
}

.unit-btn--active {
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(249, 115, 22, 0.35);
  color: #fb923c;
}

.unit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 参数面板 */
.options-panel { margin-bottom: 20px; }

.option-group { margin-bottom: 16px; }

.option-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.option-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  font-size: 0.8125rem;
  color: rgba(147, 197, 253, 0.9);
  line-height: 1.5;
}

.option-info svg { color: #60a5fa; flex-shrink: 0; margin-top: 1px; }

/* 分辨率 */
.resolution-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.res-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.res-btn:hover:not(:disabled) {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.3);
  color: #fb923c;
}

.res-btn--active {
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(249, 115, 22, 0.4);
  color: #fb923c;
}

.res-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 格式 */
.format-options {
  display: flex;
  gap: 8px;
}

.format-btn {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.format-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.format-btn--active {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.35);
}

.format-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.format-btn__label {
  display: block;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.format-btn__desc {
  font-size: 0.6875rem;
  color: var(--text-muted);
}

/* 操作按钮 */
.compress-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.compress-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(249, 115, 22, 0.5);
}

.compress-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* 进度 */
.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316, #ef4444);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8125rem;
  color: #fb923c;
  text-align: center;
  margin-top: 8px;
  font-weight: 600;
}

/* 错误 */
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

/* 结果 */
.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.stat-item--ratio { flex: 0.8; }

.stat-label {
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value--highlight { color: #fb923c; }
.stat-value--green { color: #4ade80; }
.stat-value--red { color: #ef4444; }

.stat-arrow {
  font-size: 1.25rem;
  color: var(--text-muted);
}

.result-video {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.result-video video {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
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

.action-btn--primary {
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(249, 115, 22, 0.3);
  color: #fb923c;
}

.action-btn--primary:hover {
  background: rgba(249, 115, 22, 0.2);
  border-color: rgba(249, 115, 22, 0.5);
}

/* 占位 */
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

.placeholder-icon svg { opacity: 0.4; }

.result-placeholder p {
  font-size: 0.9375rem;
  margin-bottom: 4px;
}

.placeholder-tip {
  font-size: 0.8125rem;
  opacity: 0.6;
}

/* 动画 */
.spin { animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 900px) {
  .video-compress { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
  .preset-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .result-actions { flex-direction: column; }
  .stats-bar { flex-wrap: wrap; }
  .format-options { flex-direction: column; }
  .resolution-options { flex-direction: column; }
}
</style>
