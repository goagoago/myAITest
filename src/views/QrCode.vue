<script setup>
import { watch } from 'vue'
import { useQrCode } from '../composables/useQrCode'
import {
  QrCode, Upload, Download, RefreshCw, AlertCircle, Loader2,
  Palette, Shield, Maximize, Image, X, Info
} from 'lucide-vue-next'

const {
  loading,
  error,
  qrDataUrl,
  options,
  generate,
  setLogo,
  clearLogo,
  download,
  reset,
} = useQrCode()

const errorLevels = [
  { value: 'L', label: 'L - 低', desc: '约 7% 容错' },
  { value: 'M', label: 'M - 中', desc: '约 15% 容错' },
  { value: 'Q', label: 'Q - 较高', desc: '约 25% 容错' },
  { value: 'H', label: 'H - 高', desc: '约 30% 容错' },
]

const sizePresets = [
  { value: 200, label: '200px' },
  { value: 300, label: '300px' },
  { value: 400, label: '400px' },
  { value: 500, label: '500px' },
  { value: 600, label: '600px' },
]

// Logo 文件处理
const handleLogoSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) setLogo(file)
}

// 自动生成：文本变化时自动重新生成
let debounceTimer = null
watch(() => options.text, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (options.text.trim()) generate()
  }, 400)
})

// 配置变化时自动重新生成
watch(
  () => [options.foreground, options.background, options.errorCorrectionLevel, options.size, options.logoUrl],
  () => {
    if (options.text.trim()) generate()
  },
)

const handleDownload = () => {
  const name = options.text.length > 20
    ? options.text.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
    : options.text.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
  download(`qrcode_${name || 'output'}.png`)
}

const resetAll = () => {
  reset()
}
</script>

<template>
  <div class="qr-code">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <QrCode :size="14" />
          <span>QR 码生成器</span>
        </div>
        <h1 class="header__title">
          <span>二维码生成与美化，</span>
          <span class="gradient-text">一键搞定</span>
        </h1>
        <p class="header__desc">
          自定义颜色、嵌入 Logo、调整容错等级，生成高清二维码
        </p>
      </div>
    </header>

    <!-- 主内容 -->
    <div class="main-area">
      <!-- 左侧：输入配置 -->
      <div class="panel panel--input">
        <!-- 文本输入 -->
        <div class="input-section">
          <h3 class="section-label">
            <QrCode :size="16" />
            <span>输入内容</span>
          </h3>
          <textarea
            v-model="options.text"
            class="text-input"
            placeholder="输入文本或链接，如 https://example.com"
            rows="3"
          ></textarea>
        </div>

        <!-- 颜色设置 -->
        <div class="input-section">
          <h3 class="section-label">
            <Palette :size="16" />
            <span>颜色设置</span>
          </h3>
          <div class="color-row">
            <div class="color-field">
              <label class="color-label">前景色</label>
              <div class="color-picker-wrap">
                <input
                  type="color"
                  v-model="options.foreground"
                  class="color-picker"
                />
                <span class="color-value">{{ options.foreground }}</span>
              </div>
            </div>
            <div class="color-field">
              <label class="color-label">背景色</label>
              <div class="color-picker-wrap">
                <input
                  type="color"
                  v-model="options.background"
                  class="color-picker"
                />
                <span class="color-value">{{ options.background }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 容错等级 -->
        <div class="input-section">
          <h3 class="section-label">
            <Shield :size="16" />
            <span>容错等级</span>
          </h3>
          <div class="level-grid">
            <button
              v-for="level in errorLevels"
              :key="level.value"
              :class="['level-btn', { 'level-btn--active': options.errorCorrectionLevel === level.value }]"
              @click="options.errorCorrectionLevel = level.value"
            >
              <span class="level-btn__label">{{ level.label }}</span>
              <span class="level-btn__desc">{{ level.desc }}</span>
            </button>
          </div>
          <div v-if="options.logoUrl && options.errorCorrectionLevel !== 'H'" class="option-info">
            <Info :size="16" />
            <span>已上传 Logo，建议使用 H 等级以确保扫码成功率。</span>
          </div>
        </div>

        <!-- 尺寸 -->
        <div class="input-section">
          <h3 class="section-label">
            <Maximize :size="16" />
            <span>二维码尺寸</span>
          </h3>
          <div class="size-presets">
            <button
              v-for="s in sizePresets"
              :key="s.value"
              :class="['preset-chip', { 'preset-chip--active': options.size === s.value }]"
              @click="options.size = s.value"
            >{{ s.label }}</button>
          </div>
          <div class="slider-row">
            <input
              type="range"
              class="slider"
              v-model.number="options.size"
              min="100"
              max="800"
              step="10"
            />
            <span class="slider-value">{{ options.size }}px</span>
          </div>
        </div>

        <!-- Logo 上传 -->
        <div class="input-section">
          <h3 class="section-label">
            <Image :size="16" />
            <span>Logo 嵌入（可选）</span>
          </h3>
          <div v-if="!options.logoUrl" class="logo-upload" @click="$refs.logoInput.click()">
            <input
              ref="logoInput"
              type="file"
              accept="image/*"
              class="upload-input"
              @change="handleLogoSelect"
            />
            <Upload :size="24" />
            <span>点击上传 Logo 图片</span>
          </div>
          <div v-else class="logo-preview">
            <img :src="options.logoUrl" alt="Logo" class="logo-img" />
            <button class="logo-remove" @click="clearLogo">
              <X :size="14" />
              <span>移除</span>
            </button>
          </div>
        </div>

        <!-- 生成按钮 -->
        <button
          class="generate-btn"
          :disabled="loading || !options.text.trim()"
          @click="generate"
        >
          <Loader2 v-if="loading" :size="20" class="spin" />
          <QrCode v-else :size="20" />
          <span>{{ loading ? '生成中...' : '生成二维码' }}</span>
        </button>

        <!-- 错误提示 -->
        <div v-if="error" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- 右侧：预览 -->
      <div class="panel panel--result">
        <div v-if="qrDataUrl" class="result-content">
          <div class="qr-preview">
            <img :src="qrDataUrl" alt="生成的二维码" />
          </div>

          <div class="result-info">
            <span>{{ options.size }} × {{ options.size }} px</span>
            <span v-if="options.logoUrl">· 含 Logo</span>
            <span>· 容错 {{ options.errorCorrectionLevel }}</span>
          </div>

          <div class="result-actions">
            <button class="action-btn action-btn--primary" @click="handleDownload">
              <Download :size="18" />
              <span>下载 PNG</span>
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
            <QrCode :size="48" />
          </div>
          <p>二维码预览</p>
          <span class="placeholder-tip">在左侧输入文本或链接后自动生成</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-code {
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
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #a78bfa;
  margin-bottom: 24px;
}

.header__badge svg { color: #a78bfa; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%);
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

/* 区块标题 */
.input-section {
  margin-bottom: 24px;
}

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

/* 文本输入 */
.text-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-size: 0.9375rem;
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  transition: border-color 0.3s;
  font-family: inherit;
  line-height: 1.5;
}

.text-input::placeholder { color: var(--text-muted); }

.text-input:focus {
  border-color: rgba(139, 92, 246, 0.5);
}

/* 颜色选择 */
.color-row {
  display: flex;
  gap: 16px;
}

.color-field {
  flex: 1;
}

.color-label {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.color-picker-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.color-picker::-webkit-color-swatch-wrapper { padding: 0; }
.color-picker::-webkit-color-swatch {
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
}

.color-value {
  font-size: 0.8125rem;
  font-family: 'SF Mono', monospace;
  color: var(--text-secondary);
}

/* 容错等级 */
.level-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.level-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.level-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.level-btn--active {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.35);
}

.level-btn__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.level-btn__desc {
  font-size: 0.625rem;
  color: var(--text-muted);
}

/* 提示信息 */
.option-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  font-size: 0.8125rem;
  color: rgba(253, 224, 71, 0.9);
  line-height: 1.5;
  margin-top: 10px;
}

.option-info svg { color: #fbbf24; flex-shrink: 0; margin-top: 1px; }

/* 尺寸 */
.size-presets {
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

.preset-chip:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}

.preset-chip--active {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.4);
  color: #a78bfa;
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
  background: #a78bfa;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(167, 139, 250, 0.4);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #a78bfa;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.slider-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #a78bfa;
  min-width: 56px;
  text-align: right;
}

/* Logo 上传 */
.upload-input { display: none; }

.logo-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  color: var(--text-muted);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s;
}

.logo-upload:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.05);
  color: #a78bfa;
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.logo-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.logo-remove {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 0.75rem;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.3s;
}

.logo-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

/* 生成按钮 */
.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(139, 92, 246, 0.5);
}

.generate-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

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

/* 结果区 */
.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  width: 100%;
  margin-bottom: 16px;
}

.qr-preview img {
  max-width: 100%;
  max-height: 400px;
  image-rendering: pixelated;
  border-radius: 4px;
}

.result-info {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.result-actions {
  display: flex;
  gap: 12px;
  width: 100%;
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
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}

.action-btn--primary:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
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
  .qr-code { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
  .level-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .result-actions { flex-direction: column; }
  .color-row { flex-direction: column; }
}
</style>
