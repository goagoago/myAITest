<script setup>
import { ref, computed, watch } from 'vue'
import { useImageCompress } from '../composables/useImageCompress'
import {
  ImageDown, Upload, Loader2, AlertCircle, RefreshCw,
  Download, CheckCircle2, X, Settings2, Zap, SlidersHorizontal,
  Maximize, Target, FileType, ArrowLeftRight, Info
} from 'lucide-vue-next'

const {
  loading,
  error,
  progress,
  result,
  compress,
  reset
} = useImageCompress()

// 原始图片
const originalFile = ref(null)
const originalUrl = ref('')
const isDragging = ref(false)
const converted = ref(false)

// 压缩模式
const compressMode = ref('smart')

// 各模式参数
const qualityLevel = ref(80) // 1-100
const outputFormat = ref('jpeg')
const resizeMode = ref('scale') // 'scale' | 'maxDim'
const resizeScale = ref(50) // 百分比
const maxWidth = ref(1920)
const maxHeight = ref(1080)
const targetSizeKB = ref(500)

const modes = [
  {
    id: 'smart',
    icon: Zap,
    label: '智能压缩',
    desc: '自动选择最佳参数，平衡质量与体积',
  },
  {
    id: 'quality',
    icon: SlidersHorizontal,
    label: '质量调节',
    desc: '手动调整图片质量，精确控制压缩程度',
  },
  {
    id: 'resize',
    icon: Maximize,
    label: '尺寸缩放',
    desc: '按比例或指定最大分辨率缩小图片',
  },
  {
    id: 'target',
    icon: Target,
    label: '目标大小',
    desc: '指定目标文件大小，自动调整参数逼近',
  },
  {
    id: 'format',
    icon: FileType,
    label: '格式转换',
    desc: '转换为更高效的格式以减小文件体积',
  },
]

const formats = [
  { value: 'jpeg', label: 'JPEG', desc: '适合照片，体积小' },
  { value: 'webp', label: 'WebP', desc: '现代格式，体积最小' },
  { value: 'png', label: 'PNG', desc: '无损压缩，体积较大' },
]

const qualityPresets = [
  { label: '极致压缩', value: 20, desc: '最小体积' },
  { label: '高压缩', value: 40, desc: '体积优先' },
  { label: '均衡', value: 60, desc: '质量/体积平衡' },
  { label: '高质量', value: 80, desc: '质量优先' },
  { label: '极致质量', value: 95, desc: '接近无损' },
]

const targetPresets = [
  { label: '100 KB', value: 100 },
  { label: '200 KB', value: 200 },
  { label: '500 KB', value: 500 },
  { label: '1 MB', value: 1024 },
  { label: '2 MB', value: 2048 },
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

const processFile = (file) => {
  if (!file.type.startsWith('image/')) return
  if (file.size > 50 * 1024 * 1024) return
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

// 开始压缩
const handleCompress = async () => {
  if (!originalFile.value || loading.value) return

  const options = { mode: compressMode.value }

  switch (compressMode.value) {
    case 'smart':
      break
    case 'quality':
      options.quality = qualityLevel.value / 100
      options.format = outputFormat.value
      break
    case 'resize':
      options.quality = 0.85
      options.format = 'jpeg'
      if (resizeMode.value === 'scale') {
        options.scale = resizeScale.value / 100
      } else {
        options.maxWidth = maxWidth.value
        options.maxHeight = maxHeight.value
      }
      break
    case 'target':
      options.targetSizeKB = targetSizeKB.value
      options.format = 'jpeg'
      break
    case 'format':
      options.quality = 0.85
      options.format = outputFormat.value
      break
  }

  try {
    await compress(originalFile.value, options)
    converted.value = true
  } catch (e) {
    console.error('压缩失败:', e)
  }
}

// 下载结果
const downloadResult = () => {
  if (!result.blob) return
  const ext = result.blob.type.split('/')[1] || 'jpg'
  const baseName = originalFile.value.name.replace(/\.[^.]+$/, '')
  const link = document.createElement('a')
  link.href = result.url
  link.download = `${baseName}_compressed.${ext === 'jpeg' ? 'jpg' : ext}`
  link.click()
}

// 重置
const resetAll = () => {
  reset()
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  originalFile.value = null
  originalUrl.value = ''
  converted.value = false
}

// 对比模式
const compareMode = ref(false)
const comparePosition = ref(50)

const handleCompareMove = (e) => {
  if (!compareMode.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  comparePosition.value = (x / rect.width) * 100
}
</script>

<template>
  <div class="image-compress" @paste="handlePaste">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <ImageDown :size="14" />
          <span>图片压缩</span>
        </div>
        <h1 class="header__title">
          <span>智能图片压缩，</span>
          <span class="gradient-text">轻松瘦身</span>
        </h1>
        <p class="header__desc">
          多种压缩方式可选，纯浏览器端处理，安全无上传
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
            accept="image/*"
            class="upload-input"
            @change="handleFileSelect"
          />
          <div class="upload-icon">
            <Upload :size="40" />
          </div>
          <p class="upload-text">点击上传或拖拽图片到此处</p>
          <p class="upload-hint">支持 JPG、PNG、WebP，最大 50MB</p>
          <p class="upload-hint">也可以直接 Ctrl+V 粘贴图片</p>
        </div>

        <!-- 已上传预览 -->
        <template v-else>
          <div class="preview-header">
            <div class="preview-label">
              <ImageDown :size="16" />
              <span>原始图片</span>
              <span class="file-size-tag">{{ fileSize }}</span>
            </div>
            <button class="preview-close" @click="resetAll" :disabled="loading">
              <X :size="16" />
            </button>
          </div>

          <div class="preview-image">
            <img :src="originalUrl" alt="原始图片" />
          </div>

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

          <!-- 压缩模式选择 -->
          <div class="mode-section">
            <h3 class="section-label">
              <Settings2 :size="16" />
              <span>选择压缩方式</span>
            </h3>
            <div class="mode-grid">
              <button
                v-for="m in modes"
                :key="m.id"
                :class="['mode-card', { 'mode-card--active': compressMode === m.id }]"
                @click="compressMode = m.id"
                :disabled="loading"
              >
                <component :is="m.icon" :size="20" class="mode-card__icon" />
                <span class="mode-card__label">{{ m.label }}</span>
                <span class="mode-card__desc">{{ m.desc }}</span>
              </button>
            </div>
          </div>

          <!-- 参数面板 -->
          <div class="options-panel">
            <!-- 智能压缩 -->
            <div v-if="compressMode === 'smart'" class="option-info">
              <Info :size="16" />
              <span>智能模式将根据图片大小自动调整质量和分辨率，无需手动配置。</span>
            </div>

            <!-- 质量调节 -->
            <template v-if="compressMode === 'quality'">
              <div class="option-group">
                <label class="option-label">图片质量</label>
                <div class="quality-presets">
                  <button
                    v-for="p in qualityPresets"
                    :key="p.value"
                    :class="['preset-btn', { 'preset-btn--active': qualityLevel === p.value }]"
                    @click="qualityLevel = p.value"
                    :disabled="loading"
                  >
                    <span class="preset-btn__label">{{ p.label }}</span>
                    <span class="preset-btn__desc">{{ p.value }}%</span>
                  </button>
                </div>
                <div class="slider-row">
                  <input
                    type="range"
                    class="slider"
                    v-model.number="qualityLevel"
                    min="1"
                    max="100"
                    :disabled="loading"
                  />
                  <span class="slider-value">{{ qualityLevel }}%</span>
                </div>
              </div>
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
            </template>

            <!-- 尺寸缩放 -->
            <template v-if="compressMode === 'resize'">
              <div class="option-group">
                <label class="option-label">缩放方式</label>
                <div class="resize-tabs">
                  <button
                    :class="['tab-btn', { 'tab-btn--active': resizeMode === 'scale' }]"
                    @click="resizeMode = 'scale'"
                    :disabled="loading"
                  >按比例缩放</button>
                  <button
                    :class="['tab-btn', { 'tab-btn--active': resizeMode === 'maxDim' }]"
                    @click="resizeMode = 'maxDim'"
                    :disabled="loading"
                  >最大分辨率</button>
                </div>
              </div>
              <div v-if="resizeMode === 'scale'" class="option-group">
                <label class="option-label">缩放比例</label>
                <div class="scale-presets">
                  <button
                    v-for="s in [25, 50, 75]"
                    :key="s"
                    :class="['preset-chip', { 'preset-chip--active': resizeScale === s }]"
                    @click="resizeScale = s"
                    :disabled="loading"
                  >{{ s }}%</button>
                </div>
                <div class="slider-row">
                  <input
                    type="range"
                    class="slider"
                    v-model.number="resizeScale"
                    min="10"
                    max="100"
                    :disabled="loading"
                  />
                  <span class="slider-value">{{ resizeScale }}%</span>
                </div>
              </div>
              <div v-else class="option-group">
                <label class="option-label">最大分辨率</label>
                <div class="dim-inputs">
                  <div class="dim-field">
                    <span class="dim-label">宽</span>
                    <input
                      type="number"
                      class="dim-input"
                      v-model.number="maxWidth"
                      min="100"
                      max="10000"
                      :disabled="loading"
                    />
                    <span class="dim-unit">px</span>
                  </div>
                  <X :size="14" class="dim-x" />
                  <div class="dim-field">
                    <span class="dim-label">高</span>
                    <input
                      type="number"
                      class="dim-input"
                      v-model.number="maxHeight"
                      min="100"
                      max="10000"
                      :disabled="loading"
                    />
                    <span class="dim-unit">px</span>
                  </div>
                </div>
                <div class="dim-presets">
                  <button
                    v-for="d in [{w:1920,h:1080,l:'1080P'},{w:1280,h:720,l:'720P'},{w:800,h:600,l:'800x600'},{w:400,h:300,l:'400x300'}]"
                    :key="d.l"
                    class="preset-chip"
                    @click="maxWidth = d.w; maxHeight = d.h"
                    :disabled="loading"
                  >{{ d.l }}</button>
                </div>
              </div>
            </template>

            <!-- 目标大小 -->
            <template v-if="compressMode === 'target'">
              <div class="option-group">
                <label class="option-label">目标文件大小</label>
                <div class="target-presets">
                  <button
                    v-for="t in targetPresets"
                    :key="t.value"
                    :class="['preset-chip', { 'preset-chip--active': targetSizeKB === t.value }]"
                    @click="targetSizeKB = t.value"
                    :disabled="loading"
                  >{{ t.label }}</button>
                </div>
                <div class="slider-row">
                  <input
                    type="range"
                    class="slider"
                    v-model.number="targetSizeKB"
                    min="10"
                    max="5120"
                    step="10"
                    :disabled="loading"
                  />
                  <span class="slider-value">{{ targetSizeKB >= 1024 ? (targetSizeKB / 1024).toFixed(1) + ' MB' : targetSizeKB + ' KB' }}</span>
                </div>
              </div>
            </template>

            <!-- 格式转换 -->
            <template v-if="compressMode === 'format'">
              <div class="option-group">
                <label class="option-label">转换为</label>
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
                <span>WebP 格式通常比 JPEG 小 25-35%，推荐用于网页场景。</span>
              </div>
            </template>
          </div>

          <!-- 操作按钮 -->
          <button
            class="compress-btn"
            :disabled="loading"
            @click="handleCompress"
          >
            <Loader2 v-if="loading" :size="20" class="spin" />
            <Zap v-else :size="20" />
            <span>{{ loading ? '压缩中...' : '开始压缩' }}</span>
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
            <div class="stat-arrow">→</div>
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

          <div class="result-dims">
            尺寸：{{ result.width }} × {{ result.height }} px
          </div>

          <!-- 对比/预览 -->
          <div v-if="compareMode" class="compare-container" @mousemove="handleCompareMove">
            <div class="compare-image compare-image--original">
              <img :src="originalUrl" alt="原图" />
              <span class="compare-label compare-label--left">原图</span>
            </div>
            <div class="compare-image compare-image--result" :style="{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }">
              <img :src="result.url" alt="压缩后" />
              <span class="compare-label compare-label--right">压缩后</span>
            </div>
            <div class="compare-slider" :style="{ left: comparePosition + '%' }">
              <div class="compare-handle">
                <ArrowLeftRight :size="16" />
              </div>
            </div>
          </div>
          <div v-else class="result-image">
            <img :src="result.url" alt="压缩后的图片" />
          </div>

          <!-- 操作按钮 -->
          <div class="result-actions">
            <button class="action-btn" @click="compareMode = !compareMode">
              <ArrowLeftRight :size="18" />
              <span>{{ compareMode ? '退出对比' : '效果对比' }}</span>
            </button>
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
            <ImageDown :size="48" />
          </div>
          <p>压缩结果将在这里显示</p>
          <span class="placeholder-tip">上传图片并选择压缩方式后点击"开始压缩"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-compress {
  max-width: 1280px;
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
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15));
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4ade80;
  margin-bottom: 24px;
}

.header__badge svg { color: #4ade80; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #22c55e 0%, #10b981 50%, #06b6d4 100%);
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
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.05);
}

.upload-input { display: none; }

.upload-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 24px;
  margin: 0 auto 20px;
  color: #4ade80;
  transition: all 0.3s;
}

.upload-zone:hover .upload-icon {
  transform: scale(1.05);
  background: rgba(34, 197, 94, 0.15);
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

/* 预览头 */
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

.preview-label svg { color: #4ade80; }

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

.preview-image {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 12px;
}

.preview-image img {
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

/* 压缩模式 */
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

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.mode-card:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.mode-card--active {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.35);
}

.mode-card--active .mode-card__icon { color: #4ade80; }

.mode-card:disabled { opacity: 0.5; cursor: not-allowed; }

.mode-card__icon { color: var(--text-muted); margin-bottom: 2px; }

.mode-card__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.mode-card__desc {
  font-size: 0.6875rem;
  color: var(--text-muted);
  line-height: 1.4;
}

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

/* 质量预设 */
.quality-presets {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  min-width: 0;
}

.preset-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.preset-btn--active {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.35);
}

.preset-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.preset-btn__label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.preset-btn__desc {
  font-size: 0.625rem;
  color: var(--text-muted);
}

/* Slider */
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #4ade80;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #4ade80;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.slider:disabled { opacity: 0.4; cursor: not-allowed; }

.slider-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #4ade80;
  min-width: 56px;
  text-align: right;
}

/* 格式选择 */
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
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.35);
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

/* 缩放 */
.resize-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.tab-btn--active {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.35);
  color: #4ade80;
}

.tab-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.scale-presets, .target-presets, .dim-presets {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.preset-chip {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.preset-chip:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.preset-chip--active {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.preset-chip:disabled { opacity: 0.5; cursor: not-allowed; }

/* 分辨率输入 */
.dim-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dim-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.dim-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.dim-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
  min-width: 0;
}

.dim-input::-webkit-inner-spin-button { display: none; }

.dim-unit {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.dim-x {
  color: var(--text-muted);
  flex-shrink: 0;
}

/* 操作按钮 */
.compress-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
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
  box-shadow: 0 15px 40px -10px rgba(34, 197, 94, 0.5);
}

.compress-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

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
  background: linear-gradient(90deg, #22c55e, #10b981);
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

.stat-item--ratio {
  flex: 0.8;
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value--highlight { color: #60a5fa; }
.stat-value--green { color: #4ade80; }
.stat-value--red { color: #ef4444; }

.stat-arrow {
  font-size: 1.25rem;
  color: var(--text-muted);
}

.result-dims {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 12px;
}

.result-image {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.result-image img {
  width: 100%;
  max-height: 400px;
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
  min-height: 250px;
}

.compare-image {
  position: absolute;
  inset: 0;
}

.compare-image img {
  width: 100%;
  height: 100%;
  max-height: 400px;
  object-fit: contain;
}

.compare-image--original { z-index: 1; }
.compare-image--result { z-index: 2; }

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

.compare-label--left { left: 12px; }
.compare-label--right { right: 12px; }

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

.action-btn--primary {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.action-btn--primary:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
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
  .image-compress { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
  .mode-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .result-actions { flex-direction: column; }
  .stats-bar { flex-wrap: wrap; }
  .format-options { flex-direction: column; }
}
</style>
