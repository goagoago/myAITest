<script setup>
import { ref, computed } from 'vue'
import { useAudioConvert } from '../composables/useAudioConvert'
import CustomSelect from '@/components/ui/CustomSelect.vue'
import {
  FileText, Upload, Loader2, AlertCircle, RefreshCw,
  ArrowRightLeft, FileUp, Download, CheckCircle2, X,
  Music,
} from 'lucide-vue-next'

const {
  loading, error, progress, convertedFileName,
  convertAudio,
  reset,
} = useAudioConvert()

// Audio formats
const formats = [
  { id: 'mp3', label: 'MP3', color: '#f97316', lossy: true },
  { id: 'wav', label: 'WAV', color: '#3b82f6', lossy: false },
  { id: 'flac', label: 'FLAC', color: '#059669', lossy: false },
  { id: 'm4a', label: 'M4A', color: '#8b5cf6', lossy: true },
  { id: 'ogg', label: 'OGG', color: '#ef4444', lossy: true },
  { id: 'aac', label: 'AAC', color: '#ec4899', lossy: true },
]

const sampleRates = [
  { value: 'auto', label: '自动' },
  { value: '16000', label: '16000 Hz' },
  { value: '22050', label: '22050 Hz' },
  { value: '44100', label: '44100 Hz' },
  { value: '48000', label: '48000 Hz' },
]

const qualityPresets = [
  { value: 96, label: '普通品质 (96kbps)' },
  { value: 128, label: '标准品质 (128kbps)' },
  { value: 192, label: '高品质 (192kbps)' },
  { value: 320, label: '发烧级 (320kbps)' },
]

const flacPresets = [
  { value: 0, label: '最快' },
  { value: 5, label: '均衡' },
  { value: 8, label: '最大' },
]

const sourceId = ref('mp3')
const targetId = ref('wav')
const selectedFile = ref(null)
const isDragging = ref(false)
const converted = ref(false)

const sampleRate = ref('auto')
const quality = ref(192)
const flacPreset = ref(5)

const currentSourceFormat = computed(() => formats.find(f => f.id === sourceId.value))
const currentTargetFormat = computed(() => formats.find(f => f.id === targetId.value))

const showQualityOptions = computed(() => currentTargetFormat.value?.lossy)
const showFlacOptions = computed(() => targetId.value === 'flac')

const switchSource = (id) => {
  if (loading.value) return
  sourceId.value = id
  if (targetId.value === id) {
    targetId.value = formats.find(f => f.id !== id)?.id || 'wav'
  }
  resetAll()
}

const switchTarget = (id) => {
  if (loading.value) return
  targetId.value = id
  quality.value = 192 // Reset quality to default
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  processFile(file)
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  processFile(file)
}

const processFile = (file) => {
  if (file.size > 200 * 1024 * 1024) { // 200MB limit
    error.value = 'File size should not exceed 200MB.'
    return
  }
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
  if (loading.value || !selectedFile.value) return

  const options = {
    sampleRate: sampleRate.value,
    bitrate: quality.value,
    flacCompression: flacPreset.value,
  }

  try {
    await convertAudio(selectedFile.value, targetId.value, options)
    converted.value = true
  } catch (e) {
    console.error('Conversion failed:', e)
  }
}

const resetAll = () => {
  reset()
  selectedFile.value = null
  converted.value = false
  const input = document.querySelector('input[type="file"]')
  if(input) input.value = ''
}
</script>

<template>
  <div class="audio-convert">
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <Music :size="14" />
          <span>音频转换</span>
        </div>
        <h1 class="header__title">
          <span>万能音频 </span>
          <span class="gradient-text">格式转换</span>
        </h1>
        <p class="header__desc">
          支持主流音频格式间的高质量转换
        </p>
      </div>
    </header>

    <div class="section-label">选择源文件格式</div>
    <div class="format-grid">
      <button
        v-for="format in formats"
        :key="format.id"
        :class="['format-card', { 'format-card--active': sourceId === format.id }]"
        @click="switchSource(format.id)"
        :disabled="loading"
        :style="{ '--format-color': format.color }"
      >
        <span class="format-card__label">{{ format.label }}</span>
      </button>
    </div>

    <div class="section-label">
      转换为
    </div>
    <div class="format-grid">
      <button
        v-for="format in formats.filter(f => f.id !== sourceId)"
        :key="format.id"
        :class="['format-card', { 'format-card--active': targetId === format.id }]"
        @click="switchTarget(format.id)"
        :disabled="loading"
        :style="{ '--format-color': format.color }"
      >
        <span>{{ format.label }}</span>
      </button>
    </div>

    <div class="convert-path" :style="{ '--cat-color': currentSourceFormat.color }">
      <span class="convert-path__from">{{ currentSourceFormat.label }}</span>
      <ArrowRightLeft :size="18" />
      <span class="convert-path__to" :style="{ color: currentTargetFormat.color }">{{ currentTargetFormat.label }}</span>
    </div>

    <div class="main-panel">
      <div
        v-if="!selectedFile"
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
          accept="audio/*"
          class="upload-input"
          @change="handleFileSelect"
        />
        <div class="upload-icon" :style="{ background: `${currentSourceFormat.color}15`, color: currentSourceFormat.color }">
          <Upload :size="40" />
        </div>
        <p class="upload-text">
          点击上传或拖拽音频文件到此处
        </p>
        <p class="upload-hint">最大 200MB</p>
      </div>

      <div v-else class="file-info">
        <div class="file-card">
          <div class="file-card__icon" :style="{ background: `${currentSourceFormat.color}20`, color: currentSourceFormat.color }">
            <Music :size="32" />
          </div>
          <div class="file-card__detail">
            <p class="file-card__name">{{ selectedFile.name }}</p>
            <p class="file-card__size">{{ fileSize }}</p>
          </div>
          <button class="file-card__close" @click="resetAll" :disabled="loading">
            <X :size="16" />
          </button>
        </div>

        <!-- Advanced Options -->
        <div class="options-grid">
          <!-- Unified Quality/Compression Group -->
          <div v-if="showQualityOptions || showFlacOptions" class="option-group">
            <label class="option-label">压缩率</label>
            <CustomSelect v-if="showQualityOptions" v-model="quality" :options="qualityPresets" />
            <CustomSelect v-else-if="showFlacOptions" v-model="flacPreset" :options="flacPresets" />
          </div>
        </div>

        <button
          v-if="!converted"
          class="convert-btn"
          :disabled="loading"
          :style="{ background: loading ? '' : `linear-gradient(135deg, ${currentSourceFormat.color} 0%, ${currentTargetFormat.color} 100%)` }"
          @click="handleConvert"
        >
          <Loader2 v-if="loading" :size="20" class="spin" />
          <ArrowRightLeft v-else :size="20" />
          <span>{{ loading ? '转换中...' : `转换为 ${currentTargetFormat.label}` }}</span>
        </button>

        <div v-if="loading" class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progress + '%', background: `linear-gradient(90deg, ${currentSourceFormat.color}, ${currentTargetFormat.color})` }"
          ></div>
        </div>

        <div v-if="converted" class="success-msg">
          <CheckCircle2 :size="20" />
          <span>转换完成！文件已自动下载</span>
        </div>

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

        <div v-if="error" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-convert {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

.header {
  padding: 60px 0 40px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(217, 70, 239, 0.15));
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #f472b6;
  margin-bottom: 24px;
}

.header__badge svg { color: #f472b6; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

.section-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.format-grid {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.format-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  min-width: 80px;
  color: var(--text-primary);
}

.format-card:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  transform: translateY(-2px);
}

.format-card--active {
  border-color: var(--format-color) !important;
  background: color-mix(in srgb, var(--format-color) 10%, transparent) !important;
  box-shadow: 0 4px 20px -6px var(--format-color);
  color: var(--text-primary);
}

.format-card__label {
  font-size: 0.9375rem;
  font-weight: 600;
}

.format-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

.main-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 40px;
}

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
  border-color: var(--format-color);
  background: color-mix(in srgb, var(--format-color) 5%, transparent);
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
}

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

.file-card__detail { flex: 1; min-width: 0; }
.file-card__name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.convert-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
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
  box-shadow: 0 15px 40px -10px var(--format-color);
}

.convert-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 700px) {
  .audio-convert {
    padding: 0 20px 60px;
  }
  .header__title {
    font-size: 2rem;
  }
  .format-grid {
    gap: 8px;
  }
  .format-card {
    padding: 10px 14px;
    min-width: 60px;
  }
  .format-card__label, .format-card span {
    font-size: 0.8125rem;
  }
  .result-actions {
    flex-direction: column;
  }
}
</style>
