<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useIdPhoto, PHOTO_PRESETS, BG_COLORS } from '../composables/useIdPhoto'
import {
  Camera, Upload, Download, RefreshCw, X, ZoomIn, ZoomOut,
  Move, Printer, Check, Maximize2, AlertCircle, Loader2, Sparkles
} from 'lucide-vue-next'

const {
  sourceImage,
  sourceFile,
  sourceWidth,
  sourceHeight,
  personImage,
  personReady,
  processing,
  processProgress,
  processError,
  selectedPreset,
  customMode,
  customWidth,
  customHeight,
  selectedBgColor,
  customBgColor,
  cropX,
  cropY,
  cropScale,
  outputDataUrl,
  outputWidth,
  outputHeight,
  activeBgColor,
  loadImage,
  resetCrop,
  renderOutput,
  downloadPhoto,
  downloadPrintLayout,
  resetAll,
} = useIdPhoto()

const isDragging = ref(false)
const cropContainer = ref(null)
const fileInputRef = ref(null)
const dragState = ref(null)

/* ──── 文件上传 ──── */
const handleFileSelect = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return
  if (file.size > 50 * 1024 * 1024) return
  await loadImage(file)
}

const handleDrop = async (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  await loadImage(file)
}

const handleDragOver = (e) => { e.preventDefault(); isDragging.value = true }
const handleDragLeave = () => { isDragging.value = false }

/* ──── 预设切换 ──── */
const selectPreset = (presetId) => {
  customMode.value = false
  selectedPreset.value = presetId
  if (personReady.value) {
    nextTick(() => { resetCrop(); renderOutput() })
  }
}

const switchToCustom = () => {
  customMode.value = true
  if (personReady.value) {
    nextTick(() => { resetCrop(); renderOutput() })
  }
}

const onCustomSizeChange = () => {
  if (personReady.value) {
    nextTick(() => { resetCrop(); renderOutput() })
  }
}

/* ──── 背景色 ──── */
const selectBgColor = (colorId) => { selectedBgColor.value = colorId }
const onCustomColorChange = (e) => {
  selectedBgColor.value = 'custom'
  customBgColor.value = e.target.value
}

/* ──── 拖拽移动 ──── */
const startDrag = (e) => {
  if (!personReady.value) return
  e.preventDefault()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  dragState.value = { startX: clientX, startY: clientY, startCropX: cropX.value, startCropY: cropY.value }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', endDrag)
}

const onDrag = (e) => {
  if (!dragState.value) return
  e.preventDefault()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const container = cropContainer.value
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const displayScale = outputWidth.value / containerRect.width

  const dx = (clientX - dragState.value.startX) * displayScale
  const dy = (clientY - dragState.value.startY) * displayScale

  const scale = cropScale.value
  const pImg = personImage.value
  if (!pImg) return
  const scaledW = pImg.naturalWidth * scale
  const scaledH = pImg.naturalHeight * scale
  const ow = outputWidth.value
  const oh = outputHeight.value

  // 限制：至少 20% 人像可见
  const minV = 0.2
  const minCropX = -(ow - scaledW * minV)
  const maxCropX = scaledW * (1 - minV)
  const minCropY = -(oh - scaledH * minV)
  const maxCropY = scaledH * (1 - minV)

  cropX.value = Math.max(minCropX, Math.min(maxCropX, dragState.value.startCropX + dx))
  cropY.value = Math.max(minCropY, Math.min(maxCropY, dragState.value.startCropY + dy))
}

const endDrag = () => {
  dragState.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', endDrag)
}

/* ──── 缩放 ──── */
const zoomIn = () => {
  if (!personImage.value) return
  const maxScale = Math.min(personImage.value.naturalWidth, personImage.value.naturalHeight) / 50
  adjustScaleFromCenter(Math.min(cropScale.value * 1.2, maxScale))
}

const zoomOut = () => {
  if (!personImage.value) return
  const containScale = Math.min(
    outputWidth.value / personImage.value.naturalWidth,
    outputHeight.value / personImage.value.naturalHeight
  )
  adjustScaleFromCenter(Math.max(cropScale.value / 1.2, containScale * 0.2))
}

const adjustScaleFromCenter = (newScale) => {
  const ow = outputWidth.value
  const oh = outputHeight.value
  const oldScale = cropScale.value
  const imgCenterX = (cropX.value + ow / 2) / oldScale
  const imgCenterY = (cropY.value + oh / 2) / oldScale
  cropScale.value = newScale
  cropX.value = imgCenterX * newScale - ow / 2
  cropY.value = imgCenterY * newScale - oh / 2
}

/* ──── 辅助计算 ──── */
const currentPresetInfo = computed(() => {
  if (customMode.value) return { label: '自定义', width: customWidth.value, height: customHeight.value, mm: '', desc: '' }
  return PHOTO_PRESETS.find(p => p.id === selectedPreset.value) || PHOTO_PRESETS[0]
})

const fileSizeText = computed(() => {
  if (!sourceFile.value) return ''
  const s = sourceFile.value.size
  if (s < 1024) return `${s} B`
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`
  return `${(s / (1024 * 1024)).toFixed(1)} MB`
})

const previewStyle = computed(() => {
  const w = outputWidth.value
  const h = outputHeight.value
  const maxSize = 340
  const scale = Math.min(maxSize / w, maxSize / h, 1)
  return { width: `${Math.round(w * scale)}px`, height: `${Math.round(h * scale)}px` }
})

watch(selectedPreset, () => {
  if (personReady.value && !customMode.value) {
    nextTick(() => { resetCrop(); renderOutput() })
  }
})

onUnmounted(() => {
  if (sourceImage.value) URL.revokeObjectURL(sourceImage.value.src)
  if (personImage.value) URL.revokeObjectURL(personImage.value.src)
})
</script>

<template>
  <div class="id-photo">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <Camera :size="14" />
          <span>证件照制作</span>
        </div>
        <h1 class="header__title">
          <span>AI 智能证件照 </span>
          <span class="gradient-text">在线制作</span>
        </h1>
        <p class="header__desc">
          AI 自动识别人像、去除背景，一键更换证件照底色
        </p>
      </div>
    </header>

    <div class="content">
      <!-- ═══ 未上传 ═══ -->
      <div
        v-if="!sourceImage"
        class="upload-zone"
        :class="{ 'upload-zone--drag': isDragging }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @click="fileInputRef.click()"
      >
        <input ref="fileInputRef" type="file" accept="image/*" class="upload-input" @change="handleFileSelect" />
        <div class="upload-icon"><Upload :size="40" /></div>
        <p class="upload-text">点击上传或拖拽照片到此处</p>
        <p class="upload-hint">支持 JPG / PNG 格式，最大 50MB</p>
      </div>

      <!-- ═══ AI 处理中 ═══ -->
      <div v-else-if="processing" class="processing-panel">
        <div class="processing-card">
          <div class="processing-anim">
            <div class="processing-ring"></div>
            <Sparkles :size="32" class="processing-icon" />
          </div>
          <h3 class="processing-title">AI 正在识别人像</h3>
          <p class="processing-text">{{ processProgress || '处理中，请稍候...' }}</p>
          <p class="processing-hint">首次使用需下载 AI 模型（约 30MB），后续会自动缓存</p>
        </div>
      </div>

      <!-- ═══ 处理失败 ═══ -->
      <div v-else-if="processError" class="error-panel">
        <div class="error-card">
          <AlertCircle :size="40" class="error-icon" />
          <p class="error-text">{{ processError }}</p>
          <button class="error-retry" @click="resetAll">
            <RefreshCw :size="16" />
            <span>重新上传</span>
          </button>
        </div>
      </div>

      <!-- ═══ 编辑区 ═══ -->
      <div v-else-if="personReady" class="editor">
        <!-- 左侧面板 -->
        <div class="panel">
          <!-- 文件信息 -->
          <div class="panel__section">
            <div class="file-info">
              <div class="file-info__detail">
                <p class="file-info__name">{{ sourceFile?.name }}</p>
                <p class="file-info__meta">{{ sourceWidth }} × {{ sourceHeight }} px · {{ fileSizeText }}</p>
              </div>
              <button class="file-info__close" @click="resetAll"><X :size="16" /></button>
            </div>
          </div>

          <!-- 尺寸选择 -->
          <div class="panel__section">
            <h3 class="panel__title">照片尺寸</h3>
            <div class="preset-grid">
              <button
                v-for="preset in PHOTO_PRESETS"
                :key="preset.id"
                :class="['preset-btn', { 'preset-btn--active': !customMode && selectedPreset === preset.id }]"
                @click="selectPreset(preset.id)"
              >
                <span class="preset-btn__label">{{ preset.label }}</span>
                <span class="preset-btn__mm">{{ preset.mm }}</span>
              </button>
              <button
                :class="['preset-btn preset-btn--custom', { 'preset-btn--active': customMode }]"
                @click="switchToCustom"
              >
                <Maximize2 :size="14" />
                <span class="preset-btn__label">自定义</span>
              </button>
            </div>

            <div v-if="customMode" class="custom-size">
              <div class="custom-size__field">
                <label>宽 (px)</label>
                <input type="number" v-model.number="customWidth" min="50" max="6000" @change="onCustomSizeChange" />
              </div>
              <span class="custom-size__x">×</span>
              <div class="custom-size__field">
                <label>高 (px)</label>
                <input type="number" v-model.number="customHeight" min="50" max="6000" @change="onCustomSizeChange" />
              </div>
            </div>

            <div class="size-info">
              <span>输出: {{ outputWidth }} × {{ outputHeight }} px</span>
              <span v-if="currentPresetInfo.mm"> · {{ currentPresetInfo.mm }}</span>
            </div>
            <p v-if="currentPresetInfo.desc && !customMode" class="size-desc">{{ currentPresetInfo.desc }}</p>
          </div>

          <!-- 背景色 -->
          <div class="panel__section">
            <h3 class="panel__title">背景颜色</h3>
            <div class="color-options">
              <button
                v-for="bg in BG_COLORS"
                :key="bg.id"
                :class="['color-btn', { 'color-btn--active': selectedBgColor === bg.id }]"
                @click="selectBgColor(bg.id)"
              >
                <span
                  class="color-btn__swatch"
                  :style="{
                    background: bg.color === 'transparent'
                      ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 12px 12px'
                      : bg.color
                  }"
                ></span>
                <span class="color-btn__label">{{ bg.label }}</span>
                <Check v-if="selectedBgColor === bg.id" :size="14" class="color-btn__check" />
              </button>

              <div :class="['color-btn color-btn--picker', { 'color-btn--active': selectedBgColor === 'custom' }]">
                <input type="color" :value="customBgColor" class="color-picker-input" @input="onCustomColorChange" />
                <span class="color-btn__swatch" :style="{ background: customBgColor }"></span>
                <span class="color-btn__label">自定义</span>
                <Check v-if="selectedBgColor === 'custom'" :size="14" class="color-btn__check" />
              </div>
            </div>
          </div>

          <!-- 裁剪控制 -->
          <div class="panel__section">
            <h3 class="panel__title">位置调整</h3>
            <div class="crop-controls">
              <button class="ctrl-btn" @click="zoomIn"><ZoomIn :size="18" /><span>放大</span></button>
              <button class="ctrl-btn" @click="zoomOut"><ZoomOut :size="18" /><span>缩小</span></button>
              <button class="ctrl-btn" @click="resetCrop(); renderOutput()"><Move :size="18" /><span>居中</span></button>
            </div>
            <p class="crop-hint"><Move :size="12" /> 拖动预览图调整人像位置</p>
          </div>
        </div>

        <!-- 右侧预览 -->
        <div class="preview">
          <h3 class="preview__title">预览效果</h3>

          <div
            ref="cropContainer"
            class="preview__canvas"
            :style="previewStyle"
            @mousedown="startDrag"
            @touchstart="startDrag"
          >
            <div v-if="selectedBgColor === 'transparent'" class="preview__checker"></div>
            <img v-if="outputDataUrl" :src="outputDataUrl" class="preview__result-img" draggable="false" />
          </div>

          <p class="preview__size-label">
            {{ outputWidth }} × {{ outputHeight }} px
            <span v-if="currentPresetInfo.mm && !customMode"> · {{ currentPresetInfo.label }}（{{ currentPresetInfo.mm }}）</span>
          </p>

          <div class="download-actions">
            <button class="download-btn download-btn--primary" @click="downloadPhoto('png')">
              <Download :size="18" /><span>下载 PNG</span>
            </button>
            <button class="download-btn" @click="downloadPhoto('jpg')">
              <Download :size="18" /><span>下载 JPG</span>
            </button>
            <button class="download-btn" @click="downloadPrintLayout">
              <Printer :size="18" /><span>排版打印</span>
            </button>
          </div>
          <p class="print-hint">排版打印：自动排列到 6 寸纸上，可直接冲印</p>
        </div>
      </div>
    </div>

    <!-- 功能说明 -->
    <div class="features-section">
      <div class="feature-item">
        <div class="feature-icon">🤖</div>
        <h3>AI 抠图</h3>
        <p>AI 自动识别人像轮廓，精准去除背景</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🎨</div>
        <h3>一键换底</h3>
        <p>红、蓝、白及自定义底色，切换秒级生效</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">📐</div>
        <h3>标准尺寸</h3>
        <p>内置 1寸、2寸等 6 种规格，支持自定义像素</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <h3>隐私安全</h3>
        <p>AI 模型在浏览器本地运行，照片不会上传服务器</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.id-photo {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* ═══ 头部 ═══ */
.header { padding: 60px 0 40px; text-align: center; }

.header__badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.15));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 50px; font-size: 0.875rem; font-weight: 500; color: #34d399; margin-bottom: 24px;
}
.header__badge svg { color: #34d399; }

.header__title { font-size: 3rem; font-weight: 800; line-height: 1.2; color: var(--text-primary); margin-bottom: 16px; }

.gradient-text {
  background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.header__desc { font-size: 1.125rem; color: var(--text-secondary); }

/* ═══ 上传 ═══ */
.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.12); border-radius: 24px;
  padding: 100px 32px; text-align: center; cursor: pointer; transition: all 0.3s;
  background: rgba(255, 255, 255, 0.02);
}
.upload-zone:hover, .upload-zone--drag { border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.04); }
.upload-input { display: none; }
.upload-icon {
  width: 88px; height: 88px; display: flex; align-items: center; justify-content: center;
  background: rgba(16, 185, 129, 0.1); border-radius: 24px; margin: 0 auto 24px; color: #34d399; transition: transform 0.3s;
}
.upload-zone:hover .upload-icon { transform: scale(1.05); }
.upload-text { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
.upload-hint { font-size: 0.8125rem; color: var(--text-muted); }

/* ═══ AI 处理中 ═══ */
.processing-panel { display: flex; justify-content: center; padding: 60px 0; }

.processing-card {
  text-align: center; padding: 60px 48px;
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px; max-width: 460px; width: 100%;
}

.processing-anim { position: relative; width: 100px; height: 100px; margin: 0 auto 32px; }

.processing-ring {
  position: absolute; inset: 0;
  border: 3px solid rgba(16, 185, 129, 0.15);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

.processing-icon {
  position: absolute;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  color: #34d399;
  animation: pulse 2s ease-in-out infinite;
}

.processing-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.processing-text { font-size: 1rem; color: #34d399; font-weight: 500; margin-bottom: 8px; }
.processing-hint { font-size: 0.8125rem; color: var(--text-muted); line-height: 1.5; }

/* ═══ 错误 ═══ */
.error-panel { display: flex; justify-content: center; padding: 60px 0; }

.error-card {
  text-align: center; padding: 48px;
  background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 28px; max-width: 420px; width: 100%;
}
.error-icon { color: #ef4444; margin-bottom: 20px; }
.error-text { font-size: 1rem; color: var(--text-secondary); margin-bottom: 24px; }
.error-retry {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
  color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.3s;
}
.error-retry:hover { background: rgba(255, 255, 255, 0.12); color: var(--text-primary); }

/* ═══ 编辑区 ═══ */
.editor { display: flex; gap: 28px; }
.panel { flex: 1; min-width: 0; }

.panel__section {
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px; padding: 20px; margin-bottom: 16px;
}
.panel__title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; }

/* 文件信息 */
.file-info { display: flex; align-items: center; gap: 12px; }
.file-info__detail { flex: 1; min-width: 0; }
.file-info__name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-info__meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
.file-info__close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px; color: var(--text-muted); cursor: pointer; transition: all 0.3s; flex-shrink: 0;
}
.file-info__close:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444; }

/* 预设 */
.preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.preset-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; cursor: pointer; transition: all 0.25s;
}
.preset-btn:hover { border-color: rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.06); }
.preset-btn--active { border-color: rgba(16, 185, 129, 0.5) !important; background: rgba(16, 185, 129, 0.08) !important; }
.preset-btn--active .preset-btn__label { color: #34d399; }
.preset-btn--custom { flex-direction: row; gap: 6px; color: var(--text-secondary); }
.preset-btn__label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
.preset-btn__mm { font-size: 0.6875rem; color: var(--text-muted); }

.custom-size {
  display: flex; align-items: flex-end; gap: 10px; margin-bottom: 12px;
  padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 12px;
}
.custom-size__field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.custom-size__field label { font-size: 0.6875rem; font-weight: 500; color: var(--text-muted); }
.custom-size__field input {
  width: 100%; padding: 8px 10px; background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
  color: var(--text-primary); font-size: 0.875rem; font-weight: 600; outline: none; transition: border-color 0.2s;
}
.custom-size__field input:focus { border-color: rgba(16, 185, 129, 0.5); }
.custom-size__x { font-size: 1.125rem; color: var(--text-muted); padding-bottom: 8px; }
.size-info { font-size: 0.75rem; color: var(--text-secondary); }
.size-desc { font-size: 0.6875rem; color: var(--text-muted); margin-top: 4px; }

/* 背景色 */
.color-options { display: flex; flex-wrap: wrap; gap: 8px; }
.color-btn {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px; cursor: pointer; transition: all 0.25s; position: relative;
}
.color-btn:hover { border-color: rgba(255, 255, 255, 0.2); }
.color-btn--active { border-color: rgba(16, 185, 129, 0.5) !important; background: rgba(16, 185, 129, 0.06) !important; }
.color-btn__swatch { width: 20px; height: 20px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); flex-shrink: 0; }
.color-btn__label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); }
.color-btn__check { color: #34d399; }
.color-btn--picker { position: relative; }
.color-picker-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }

/* 裁剪控制 */
.crop-controls { display: flex; gap: 8px; margin-bottom: 8px; }
.ctrl-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px; color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500;
  cursor: pointer; transition: all 0.25s;
}
.ctrl-btn:hover { background: rgba(255, 255, 255, 0.08); color: var(--text-primary); border-color: rgba(255, 255, 255, 0.15); }
.crop-hint { display: flex; align-items: center; gap: 6px; font-size: 0.6875rem; color: var(--text-muted); }

/* ═══ 预览 ═══ */
.preview { width: 380px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
.preview__title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; text-align: center; }

.preview__canvas {
  position: relative; overflow: hidden; border-radius: 8px; cursor: grab;
  user-select: none; -webkit-user-select: none;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 60px -15px rgba(0, 0, 0, 0.5);
}
.preview__canvas:active { cursor: grabbing; }
.preview__checker { position: absolute; inset: 0; z-index: 0; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; }
.preview__result-img { position: relative; z-index: 1; width: 100%; height: 100%; display: block; pointer-events: none; object-fit: fill; }
.preview__size-label { font-size: 0.75rem; color: var(--text-muted); margin-top: 12px; text-align: center; }

/* 下载 */
.download-actions { display: flex; gap: 8px; margin-top: 24px; width: 100%; }
.download-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 12px 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.3s;
}
.download-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); color: var(--text-primary); }
.download-btn--primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-color: transparent; color: white; }
.download-btn--primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -8px rgba(16, 185, 129, 0.5); color: white; }
.print-hint { font-size: 0.6875rem; color: var(--text-muted); margin-top: 10px; text-align: center; }

/* ═══ 功能说明 ═══ */
.features-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 48px; }
.feature-item {
  padding: 28px 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px; text-align: center; transition: all 0.3s;
}
.feature-item:hover { transform: translateY(-4px); border-color: rgba(255, 255, 255, 0.12); box-shadow: 0 15px 40px -15px rgba(0, 0, 0, 0.3); }
.feature-icon { font-size: 2rem; margin-bottom: 12px; }
.feature-item h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.feature-item p { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6; }

/* ═══ 动画 ═══ */
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }

/* ═══ 响应式 ═══ */
@media (max-width: 900px) { .editor { flex-direction: column; } .preview { width: 100%; } .preview__canvas { margin: 0 auto; } }
@media (max-width: 700px) {
  .id-photo { padding: 0 20px 60px; } .header__title { font-size: 2rem; }
  .preset-grid { grid-template-columns: repeat(2, 1fr); }
  .features-section { grid-template-columns: repeat(2, 1fr); }
  .download-actions { flex-direction: column; } .color-options { gap: 6px; }
}
@media (max-width: 480px) { .features-section { grid-template-columns: 1fr; } }
</style>
