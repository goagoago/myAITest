<script setup>
import { ref, watch } from 'vue'
import { useWatermarkAdd } from '../composables/useWatermarkAdd'
import {
  Upload, Download, RefreshCw, Image, X, Type, Smile, ImageIcon,
  Bold, Italic
} from 'lucide-vue-next'

const {
  sourceImage, sourceDataUrl, resultDataUrl,
  enableText, enableEmoji, enableStamp,
  text, fontSize, fontFamily, bold, italic, color,
  emoji, emojiSize,
  stampImage, stampDataUrl, stampSize,
  opacity, rotation, tileMode, tileGap,
  loadImage, loadStampImage, renderPreview, downloadResult, resetAll,
} = useWatermarkAdd()

const isDragging = ref(false)

const fontOptions = [
  { value: 'sans-serif', label: '默认无衬线' },
  { value: 'serif', label: '衬线体' },
  { value: '"SimSun", serif', label: '宋体' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: '"KaiTi", serif', label: '楷体' },
  { value: 'monospace', label: '等宽字体' },
]

const popularEmojis = [
  '😀', '😎', '🔥', '❤️', '⭐', '👍', '🎉', '💯',
  '🚀', '💎', '🌈', '🎵', '⚡', '🏆', '🌟', '✨',
  '📌', '🔒', '©️', '®️',
]

const quickAngles = [-45, -30, 0, 30, 45]

const handleFile = async (file) => {
  if (!file || !file.type.startsWith('image/')) return
  if (file.size > 20 * 1024 * 1024) return
  await loadImage(file)
  renderPreview()
}

const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) handleFile(file)
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
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
      handleFile(item.getAsFile())
      break
    }
  }
}

const handleStampSelect = async (e) => {
  const file = e.target.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  await loadStampImage(file)
  renderPreview()
}

watch(
  [enableText, enableEmoji, enableStamp,
   text, fontSize, fontFamily, bold, italic, color,
   emoji, emojiSize, stampSize, opacity, rotation, tileMode, tileGap, stampDataUrl],
  () => {
    if (sourceImage.value) renderPreview()
  },
)
</script>

<template>
  <div class="wm-add" @paste="handlePaste">
    <!-- ═══ 上方：预览区（sticky） ═══ -->
    <div class="wm-preview-bar" :class="{ 'wm-preview-bar--has-img': sourceDataUrl }">
      <!-- 未上传 -->
      <div
        v-if="!sourceDataUrl"
        class="wm-upload-zone"
        :class="{ 'wm-upload-zone--drag': isDragging }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @click="$refs.srcInput.click()"
      >
        <input ref="srcInput" type="file" accept="image/*" class="wm-hidden" @change="handleFileSelect" />
        <div class="wm-upload-icon">
          <Upload :size="36" />
        </div>
        <p class="wm-upload-text">点击上传或拖拽图片到此处</p>
        <p class="wm-upload-hint">支持 JPG、PNG、WebP，最大 20MB &nbsp;|&nbsp; 也可直接 Ctrl+V 粘贴</p>
      </div>

      <!-- 已上传 — 预览 + 操作 -->
      <div v-else class="wm-preview-content">
        <div class="wm-preview-img-box">
          <img :src="resultDataUrl || sourceDataUrl" alt="预览" class="wm-preview-img" />
        </div>
        <div class="wm-preview-side">
          <div class="wm-preview-label">
            <Image :size="16" />
            <span>实时预览</span>
          </div>
          <div class="wm-preview-btns">
            <button class="wm-btn-primary wm-btn-sm" :disabled="!resultDataUrl" @click="downloadResult">
              <Download :size="16" />
              <span>下载 PNG</span>
            </button>
            <button class="wm-btn-ghost wm-btn-sm" @click="$refs.srcInput2.click()">
              <Upload :size="16" />
              <span>换图</span>
            </button>
            <button class="wm-btn-ghost wm-btn-sm wm-btn-danger" @click="resetAll">
              <X :size="16" />
            </button>
          </div>
          <input ref="srcInput2" type="file" accept="image/*" class="wm-hidden" @change="handleFileSelect" />
        </div>
      </div>
    </div>

    <!-- ═══ 下方：设置面板（三列水印 + 通用） ═══ -->
    <div v-if="sourceDataUrl" class="wm-settings">
      <!-- 三种水印层横向排列 -->
      <div class="wm-layers-row">
        <!-- 文字水印 -->
        <div class="wm-layer" :class="{ 'wm-layer--on': enableText }">
          <div class="wm-layer-header">
            <label class="wm-layer-toggle">
              <input type="checkbox" v-model="enableText" />
              <span class="wm-switch"></span>
            </label>
            <div class="wm-layer-title">
              <Type :size="15" />
              <span>文字</span>
            </div>
          </div>
          <div v-if="enableText" class="wm-layer-body">
            <input v-model="text" class="wm-input" placeholder="水印文字" />

            <div class="wm-row-pair">
              <div class="wm-field">
                <label class="wm-label">字号 <span class="wm-val">{{ fontSize }}px</span></label>
                <input type="range" class="wm-slider" v-model.number="fontSize" min="12" max="120" />
              </div>
              <div class="wm-field">
                <label class="wm-label">字体</label>
                <select v-model="fontFamily" class="wm-select">
                  <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
                </select>
              </div>
            </div>

            <div class="wm-row-inline">
              <input type="color" v-model="color" class="wm-color-picker" />
              <span class="wm-color-hex">{{ color }}</span>
              <button :class="['wm-icon-btn', { active: bold }]" @click="bold = !bold" title="粗体">
                <Bold :size="14" />
              </button>
              <button :class="['wm-icon-btn', { active: italic }]" @click="italic = !italic" title="斜体">
                <Italic :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- Emoji 水印 -->
        <div class="wm-layer" :class="{ 'wm-layer--on': enableEmoji }">
          <div class="wm-layer-header">
            <label class="wm-layer-toggle">
              <input type="checkbox" v-model="enableEmoji" />
              <span class="wm-switch"></span>
            </label>
            <div class="wm-layer-title">
              <Smile :size="15" />
              <span>Emoji</span>
            </div>
          </div>
          <div v-if="enableEmoji" class="wm-layer-body">
            <div class="wm-emoji-grid">
              <button
                v-for="e in popularEmojis"
                :key="e"
                :class="['wm-emoji-btn', { active: emoji === e }]"
                @click="emoji = e"
              >{{ e }}</button>
            </div>
            <input v-model="emoji" class="wm-input wm-input--mt" placeholder="自定义 Emoji" />
            <label class="wm-label">大小 <span class="wm-val">{{ emojiSize }}px</span></label>
            <input type="range" class="wm-slider" v-model.number="emojiSize" min="20" max="200" />
          </div>
        </div>

        <!-- 图片水印 -->
        <div class="wm-layer" :class="{ 'wm-layer--on': enableStamp }">
          <div class="wm-layer-header">
            <label class="wm-layer-toggle">
              <input type="checkbox" v-model="enableStamp" />
              <span class="wm-switch"></span>
            </label>
            <div class="wm-layer-title">
              <ImageIcon :size="15" />
              <span>图片</span>
            </div>
          </div>
          <div v-if="enableStamp" class="wm-layer-body">
            <button class="wm-upload-stamp" @click="$refs.stampInput.click()">
              <Upload :size="14" />
              <span>{{ stampDataUrl ? '更换图片' : '选择图片' }}</span>
            </button>
            <input ref="stampInput" type="file" accept="image/*" class="wm-hidden" @change="handleStampSelect" />
            <div v-if="stampDataUrl" class="wm-stamp-preview">
              <img :src="stampDataUrl" alt="水印图片" />
            </div>
            <label class="wm-label">大小 <span class="wm-val">{{ stampSize }}px</span></label>
            <input type="range" class="wm-slider" v-model.number="stampSize" min="20" max="500" />
          </div>
        </div>
      </div>

      <!-- 通用设置：横向一行 -->
      <div class="wm-common">
        <div class="wm-common-item">
          <label class="wm-label">透明度 <span class="wm-val">{{ Math.round(opacity * 100) }}%</span></label>
          <input type="range" class="wm-slider" v-model.number="opacity" min="0.05" max="1" step="0.05" />
        </div>
        <div class="wm-common-item">
          <label class="wm-label">旋转 <span class="wm-val">{{ rotation }}°</span></label>
          <input type="range" class="wm-slider" v-model.number="rotation" min="-180" max="180" />
          <div class="wm-quick-angles">
            <button
              v-for="a in quickAngles"
              :key="a"
              :class="['wm-angle-btn', { active: rotation === a }]"
              @click="rotation = a"
            >{{ a }}°</button>
          </div>
        </div>
        <div class="wm-common-item wm-common-item--narrow">
          <label class="wm-switch-label">
            <input type="checkbox" v-model="tileMode" />
            <span class="wm-switch"></span>
            <span>{{ tileMode ? '平铺' : '居中' }}</span>
          </label>
          <div v-if="tileMode" style="margin-top: 8px;">
            <label class="wm-label">间距 <span class="wm-val">{{ tileGap }}px</span></label>
            <input type="range" class="wm-slider" v-model.number="tileGap" min="20" max="200" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wm-add {
  width: 100%;
}

.wm-hidden {
  display: none;
}

/* ═══════════════════════════════════════════════════════════
   预览栏（上方，sticky）
   ═══════════════════════════════════════════════════════════ */

.wm-preview-bar {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 24px;
}

.wm-preview-bar--has-img {
  position: sticky;
  top: 80px;
  z-index: 10;
  background: rgba(9, 9, 11, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* ─── 上传区域 ─── */
.wm-upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 48px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.wm-upload-zone:hover,
.wm-upload-zone--drag {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.05);
}

.wm-upload-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 20px;
  margin: 0 auto 16px;
  color: #34d399;
}

.wm-upload-text {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.wm-upload-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* ─── 已上传：水平布局 图片+操作 ─── */
.wm-preview-content {
  display: flex;
  gap: 20px;
  align-items: center;
}

.wm-preview-img-box {
  flex: 1;
  min-width: 0;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.wm-preview-img {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.wm-preview-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.wm-preview-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.wm-preview-label svg { color: #34d399; }

.wm-preview-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wm-btn-sm {
  padding: 8px 14px !important;
  font-size: 0.8125rem !important;
  border-radius: 10px !important;
}

.wm-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  border: none;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.wm-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -6px rgba(16, 185, 129, 0.5);
}

.wm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.wm-btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.wm-btn-ghost:hover { background: rgba(255, 255, 255, 0.1); }

.wm-btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* ═══════════════════════════════════════════════════════════
   设置面板（下方）
   ═══════════════════════════════════════════════════════════ */

.wm-settings {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 24px;
}

/* ─── 三种水印层横向排列 ─── */
.wm-layers-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.wm-layer {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 14px;
  transition: border-color 0.3s;
}

.wm-layer--on {
  border-color: rgba(16, 185, 129, 0.25);
}

.wm-layer-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wm-layer-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.wm-layer-toggle input { display: none; }

.wm-layer-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.wm-layer-title svg { color: var(--text-muted); }

.wm-layer--on .wm-layer-title svg { color: #34d399; }

.wm-layer-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* ─── 通用设置横向一行 ─── */
.wm-common {
  display: grid;
  grid-template-columns: 1fr 1.2fr auto;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  align-items: start;
}

.wm-common-item--narrow {
  min-width: 110px;
}

/* ─── 控件 ─── */
.wm-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  margin-top: 10px;
}

.wm-label:first-child { margin-top: 0; }

.wm-val {
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 4px;
}

.wm-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--text-primary);
  transition: all 0.3s;
  font-family: inherit;
}

.wm-input--mt { margin-top: 8px; }

.wm-input::placeholder { color: var(--text-muted); }

.wm-input:focus {
  outline: none;
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
}

.wm-select {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--text-primary);
  cursor: pointer;
}

.wm-select:focus {
  outline: none;
  border-color: rgba(16, 185, 129, 0.5);
}

.wm-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.wm-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #34d399;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.4);
}

.wm-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #34d399;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

/* ─── 文字水印行内 ─── */
.wm-row-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.wm-row-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.wm-color-picker {
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: none;
  padding: 0;
  flex-shrink: 0;
}

.wm-color-hex {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
  margin-right: auto;
}

.wm-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.wm-icon-btn:hover { background: rgba(255, 255, 255, 0.06); }

.wm-icon-btn.active {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
}

/* ─── Emoji ─── */
.wm-emoji-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.wm-emoji-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.wm-emoji-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.1);
}

.wm-emoji-btn.active {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.4);
}

/* ─── 图片水印 ─── */
.wm-upload-stamp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.wm-upload-stamp:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(16, 185, 129, 0.4);
}

.wm-stamp-preview {
  margin-top: 8px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.wm-stamp-preview img {
  max-width: 100%;
  max-height: 60px;
  object-fit: contain;
}

/* ─── 快捷角度 ─── */
.wm-quick-angles {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.wm-angle-btn {
  flex: 1;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  font-size: 0.6875rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.wm-angle-btn:hover { background: rgba(255, 255, 255, 0.06); }

.wm-angle-btn.active {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
}

/* ─── 开关样式 ─── */
.wm-switch {
  width: 34px;
  height: 18px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  position: relative;
  transition: background 0.3s;
  flex-shrink: 0;
}

.wm-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

input:checked ~ .wm-switch,
.wm-switch-label input:checked ~ .wm-switch {
  background: #34d399;
}

input:checked ~ .wm-switch::after,
.wm-switch-label input:checked ~ .wm-switch::after {
  transform: translateX(16px);
}

.wm-switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.wm-switch-label input { display: none; }

/* ═══════════════════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 900px) {
  .wm-layers-row {
    grid-template-columns: 1fr;
  }

  .wm-common {
    grid-template-columns: 1fr;
  }

  .wm-preview-content {
    flex-direction: column;
  }

  .wm-preview-side {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
  }

  .wm-preview-btns {
    flex-direction: row;
    margin-left: auto;
  }
}
</style>
