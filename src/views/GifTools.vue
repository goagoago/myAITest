<script setup>
import '../styles/internal-page.scss'
import '../styles/shared-sliders.scss'
import { computed, ref, watch } from 'vue'
import NeoSlider from '../components/ui/NeoSlider.vue'
import FeatureCostBadge from '../components/account/FeatureCostBadge.vue'
import { useGifTools } from '../composables/useGifTools'
import {
  Video, Upload, Loader2, AlertCircle, RefreshCw,
  Download, Film, ImagePlay, ArrowRightLeft,
} from 'lucide-vue-next'

const {
  loading,
  error,
  progress,
  phase,
  result,
  convert,
  download,
  reset,
} = useGifTools()

const mode = ref('video-to-gif')
const selectedFile = ref(null)
const previewUrl = ref('')
const isDragging = ref(false)
const sourceDuration = ref(0)
const fps = ref(12)
const width = ref(480)
const startTime = ref(0)
const duration = ref(5)

const modes = [
  { value: 'video-to-gif', label: '视频转 GIF', icon: Film, desc: '截取视频片段导出动图' },
  { value: 'compress-gif', label: 'GIF 压缩', icon: ImagePlay, desc: '降低尺寸和帧率缩小体积' },
  { value: 'gif-to-mp4', label: 'GIF 转 MP4', icon: ArrowRightLeft, desc: '把动图转成体积更小的视频' },
]

const accept = computed(() => mode.value === 'video-to-gif' ? 'video/*' : 'image/gif')
const canTrim = computed(() => mode.value === 'video-to-gif' && sourceDuration.value > 0)
const phaseText = computed(() => ({
  loading: '正在加载 FFmpeg 引擎...',
  writing: '正在读取源文件...',
  processing: '正在转换，请稍候...',
  reading: '正在导出结果...',
}[phase.value] || ''))
const outputSizeText = computed(() => formatSize(result.outputSize))
const sourceSizeText = computed(() => formatSize(selectedFile.value?.size || 0))

watch(mode, () => {
  resetAll()
})

watch(sourceDuration, (value) => {
  if (!value) return
  if (startTime.value > value) startTime.value = 0
  if (startTime.value + duration.value > value) {
    duration.value = Math.max(1, Math.floor(value - startTime.value))
  }
})

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

const processFile = async (file) => {
  if (mode.value === 'video-to-gif' && !file.type.startsWith('video/')) return
  if (mode.value !== 'video-to-gif' && file.type !== 'image/gif') return

  selectedFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  sourceDuration.value = mode.value === 'video-to-gif' ? await getMediaDuration(previewUrl.value) : 0
  startTime.value = 0
  duration.value = Math.min(5, Math.max(1, Math.floor(sourceDuration.value) || 5))
  reset()
}

const handleConvert = async () => {
  if (!selectedFile.value || loading.value) return
  try {
    await convert(selectedFile.value, {
      mode: mode.value,
      fps: fps.value,
      width: width.value,
      startTime: startTime.value,
      duration: duration.value,
    })
  } catch {}
}

const downloadResult = () => {
  if (!result.url || !selectedFile.value) return
  const base = selectedFile.value.name.replace(/\.[^.]+$/, '')
  download(`${base}_${mode.value.replace(/-/g, '_')}`)
}

const resetAll = () => {
  reset()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  selectedFile.value = null
  sourceDuration.value = 0
}

function formatSize(size) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getMediaDuration(url) {
  return new Promise((resolve) => {
    const media = document.createElement('video')
    media.preload = 'metadata'
    media.onloadedmetadata = () => resolve(Number.isFinite(media.duration) ? media.duration : 0)
    media.onerror = () => resolve(0)
    media.src = url
  })
}
</script>

<template>
  <div class="gif-tools internal-page">
    <section class="tool-summary panel">
      <div class="tool-summary__head">
        <div class="header__badge">
          <Film :size="14" />
          <span>GIF 工具</span>
        </div>
        <span class="tool-summary__hint">浏览器本地处理</span>
      </div>
      <div class="tool-summary__body">
        <div>
          <h1 class="tool-summary__title">视频转 GIF、压缩 GIF，也能转回 MP4</h1>
          <p class="tool-summary__desc">
            适合演示片段、反馈截图和教程动图。文件只在浏览器里处理，不上传源文件。
          </p>
        </div>
        <div class="quick-tags">
          <span class="quick-tag">截取片段</span>
          <span class="quick-tag">GIF / MP4</span>
          <span class="quick-tag">低占用</span>
        </div>
      </div>
    </section>

    <div class="main-area">
      <div class="panel panel--input">
        <div class="stack">
          <div class="input-section section-card">
            <h3 class="section-title">处理模式</h3>
            <div class="mode-grid">
              <button
                v-for="item in modes"
                :key="item.value"
                :class="['mode-card', { 'mode-card--active': mode === item.value }]"
                @click="mode = item.value"
              >
                <component :is="item.icon" :size="18" />
                <div class="mode-card__text">
                  <span class="mode-card__title">{{ item.label }}</span>
                  <span class="mode-card__desc">{{ item.desc }}</span>
                </div>
              </button>
            </div>
          </div>

          <div
            v-if="!selectedFile"
            class="upload-zone upload-zone--plain"
            :class="{ 'upload-zone--drag': isDragging }"
            @drop="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              class="upload-input"
              :accept="accept"
              @change="handleFileSelect"
            />
            <span class="upload-cta">{{ mode === 'video-to-gif' ? '选择视频' : '选择 GIF' }}</span>
            <div class="upload-icon"><Upload :size="40" /></div>
            <p class="upload-text">点击上传或拖拽文件到此处</p>
            <p class="upload-hint">{{ mode === 'video-to-gif' ? '支持 MP4、WebM、MOV 等视频' : '请上传 GIF 图片' }}</p>
            <FeatureCostBadge feature-code="gif-tools" muted />
          </div>

          <template v-else>
            <div class="input-section section-card">
              <div class="section-head">
                <h3 class="section-title">源文件</h3>
                <button class="action-btn action-btn--soft" @click="resetAll">
                  <RefreshCw :size="16" />
                  <span>更换文件</span>
                </button>
              </div>
              <div class="file-meta-card">
                <strong>{{ selectedFile.name }}</strong>
                <div class="metric-row">
                  <span class="metric-pill">{{ sourceSizeText }}</span>
                  <span v-if="sourceDuration" class="metric-pill">{{ sourceDuration.toFixed(1) }}s</span>
                  <span class="metric-pill">{{ mode === 'gif-to-mp4' ? '输出 MP4' : '输出 GIF' }}</span>
                </div>
              </div>
              <div class="preview-shell">
                <video
                  v-if="mode === 'video-to-gif'"
                  :src="previewUrl"
                  controls
                  preload="metadata"
                  class="preview-media"
                />
                <img v-else :src="previewUrl" alt="源文件预览" class="preview-media preview-media--image" />
              </div>
            </div>

            <div class="input-section section-card">
              <div class="section-head">
                <h3 class="section-title">输出参数</h3>
                <span class="section-note">宽度越小、帧率越低，体积越轻</span>
              </div>

              <div class="settings-grid">
                <div class="option-group option-card">
                  <label class="option-label">宽度</label>
                  <NeoSlider v-model="width" :min="160" :max="960" :step="20" />
                  <span class="slider-value">{{ width }} px</span>
                </div>

                <div class="option-group option-card">
                  <label class="option-label">帧率</label>
                  <NeoSlider v-model="fps" :min="6" :max="24" :step="1" />
                  <span class="slider-value">{{ fps }} fps</span>
                </div>
              </div>

              <div v-if="canTrim" class="settings-grid">
                <div class="option-group option-card">
                  <label class="option-label">开始时间</label>
                  <NeoSlider
                    v-model="startTime"
                    :min="0"
                    :max="Math.max(0, Math.floor(sourceDuration - 1))"
                    :step="0.1"
                  />
                  <span class="slider-value">{{ startTime.toFixed(1) }} s</span>
                </div>

                <div class="option-group option-card">
                  <label class="option-label">截取时长</label>
                  <NeoSlider
                    v-model="duration"
                    :min="1"
                    :max="Math.max(1, Math.floor(sourceDuration - startTime))"
                    :step="1"
                  />
                  <span class="slider-value">{{ duration.toFixed(0) }} s</span>
                </div>
              </div>
            </div>

            <button class="convert-btn" :disabled="loading" @click="handleConvert">
              <Loader2 v-if="loading" :size="20" class="spin" />
              <Film v-else :size="20" />
              <span>{{ loading ? '处理中...' : '生成结果文件' }}</span>
              <FeatureCostBadge v-if="!loading" feature-code="gif-tools" />
            </button>

            <div v-if="loading" class="option-info progress-box">
              <span>{{ phaseText }}</span>
              <strong>{{ progress }}%</strong>
            </div>

            <div v-if="error" class="error-msg">
              <AlertCircle :size="16" />
              <span>{{ error }}</span>
            </div>
          </template>
        </div>
      </div>

      <div class="panel panel--result">
        <div v-if="result.url" class="result-content">
          <div class="section-head">
            <h3 class="section-title">结果预览</h3>
            <span class="metric-pill">{{ result.extension?.toUpperCase() }}</span>
          </div>

          <div class="result-preview">
            <img
              v-if="result.mimeType === 'image/gif'"
              :src="result.url"
              alt="GIF 结果预览"
              class="preview-media preview-media--image"
            />
            <video
              v-else
              :src="result.url"
              controls
              preload="metadata"
              class="preview-media"
            />
          </div>

          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-label">原始大小</span>
              <strong>{{ sourceSizeText }}</strong>
            </div>
            <div class="stat-item">
              <span class="stat-label">输出大小</span>
              <strong>{{ outputSizeText }}</strong>
            </div>
            <div class="stat-item">
              <span class="stat-label">输出格式</span>
              <strong>{{ result.extension?.toUpperCase() }}</strong>
            </div>
          </div>

          <div class="result-actions">
            <button class="action-btn action-btn--primary" @click="downloadResult">
              <Download :size="18" />
              <span>下载结果</span>
            </button>
            <button class="action-btn action-btn--soft" @click="resetAll">
              <RefreshCw :size="18" />
              <span>重新开始</span>
            </button>
          </div>
        </div>

        <div v-else class="result-placeholder">
          <div class="placeholder-icon">
            <Film :size="42" />
          </div>
          <p>结果预览区</p>
          <span class="placeholder-tip">输出文件会显示在这里，方便确认尺寸、帧率和体积。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.gif-tools {
  --accent: #3a628d;
  max-width: 1220px;
  margin: 0 auto;
}

.tool-summary {
  margin-bottom: 18px;
  border-radius: 22px;
  padding: 18px 20px;
}

.tool-summary__head,
.tool-summary__body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.tool-summary__body {
  margin-top: 12px;
}

.tool-summary__title {
  margin: 0;
  max-width: 760px;
  font-size: clamp(1.45rem, 1.18rem + 0.9vw, 2.1rem);
  line-height: 1.18;
  color: var(--text-strong);
}

.tool-summary__desc {
  max-width: 640px;
  margin: 8px 0 0;
  color: var(--text-soft);
  line-height: 1.7;
}

.tool-summary__hint {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(244, 248, 253, 0.95);
  border: 1px solid rgba(104, 120, 154, 0.14);
  color: #46627f;
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.quick-tags,
.metric-row,
.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-tag,
.metric-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  background: rgba(248, 251, 255, 0.88);
  color: var(--text-main);
  font-size: 0.8rem;
  font-weight: 600;
}

.main-area {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 22px;
}

.stack {
  display: grid;
  gap: 16px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 78px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  cursor: pointer;
  text-align: left;
  background: rgba(255, 255, 255, 0.74);
  transition: border-color .22s ease, background .22s ease;
}

.mode-card:hover {
  background: rgba(252, 254, 255, 0.94);
}

.mode-card--active {
  border-color: rgba(58, 98, 141, 0.24) !important;
  background: rgba(247, 250, 254, 0.96) !important;
}

.mode-card__text {
  display: grid;
  gap: 4px;
}

.mode-card__title {
  font-weight: 700;
  color: var(--text-strong);
}

.section-card {
  border-radius: 18px;
  padding: 16px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
}

.section-note {
  color: var(--text-soft);
  font-size: 0.84rem;
  text-align: right;
}

.upload-zone--plain {
  min-height: 228px;
  padding: 36px 28px;
  border-radius: 18px;
  border: 1.5px dashed rgba(108, 123, 154, 0.28) !important;
  background: rgba(255, 255, 255, 0.78) !important;
  text-align: center;
}

.upload-zone--plain.upload-zone--drag,
.upload-zone--plain:hover {
  border-color: rgba(58, 98, 141, 0.34) !important;
  background: rgba(248, 251, 255, 0.96) !important;
}

.upload-input {
  display: none;
}

.upload-cta {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid rgba(104, 120, 154, 0.18);
  background: rgba(255, 255, 255, 0.96);
  color: #223550;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(113, 128, 157, 0.1);
}

.upload-icon {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  margin: 14px auto 14px;
  border-radius: 18px;
  background: rgba(241, 246, 252, 0.96) !important;
  border: 1px solid rgba(108, 123, 154, 0.14);
  color: var(--accent);
}

.preview-shell,
.result-preview {
  margin-top: 12px;
}

.result-preview {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(104, 120, 154, 0.14);
}

.preview-media {
  width: 100%;
  max-height: 420px;
  border-radius: 14px;
  object-fit: contain;
  background: rgba(241, 246, 252, 0.92);
  border: 1px solid rgba(104, 120, 154, 0.12);
}

.preview-media--image {
  padding: 16px;
}

.stat-item {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(104, 120, 154, 0.14);
}

.stat-label {
  color: var(--text-soft);
  font-size: 0.84rem;
}

.convert-btn,
.action-btn--primary {
  background: #203753;
  color: #fff;
  border: 1px solid rgba(23, 37, 64, 0.08);
}

.convert-btn {
  min-height: 50px;
  width: 100%;
  margin-top: 16px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(32, 55, 83, 0.14);
  transition: background 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
}

.convert-btn:hover:not(:disabled),
.action-btn--primary:hover {
  background: #182c45 !important;
  box-shadow: 0 14px 28px rgba(24, 44, 69, 0.16);
}

.convert-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.convert-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.progress-box {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(247, 250, 254, 0.94) !important;
  border: 1px solid rgba(104, 120, 154, 0.16);
}

.option-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76) !important;
}

.file-meta-card,
.placeholder-icon {
  display: grid;
  gap: 10px;
}

.file-meta-card {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(104, 120, 154, 0.14);
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 18px;
  background: rgba(243, 247, 252, 0.95) !important;
  border: 1px dashed rgba(104, 120, 154, 0.18);
  color: var(--accent);
}

.result-placeholder {
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
}

.action-btn--soft {
  background: rgba(255, 255, 255, 0.84);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .main-area,
  .mode-grid,
  .settings-grid,
  .stats-bar {
    grid-template-columns: 1fr;
  }

  .tool-summary__head,
  .tool-summary__body,
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-note {
    text-align: left;
  }
}
</style>
