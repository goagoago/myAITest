<script setup>
import { ref, watch } from 'vue'
import { useRemoveBg } from '../composables/useRemoveBg'
import {
  Scissors, Upload, Download, RefreshCw, AlertCircle, Loader2,
  Image, Palette, Check, Eye
} from 'lucide-vue-next'


const {
  sourceImage,
  resultImage,
  composedImage,
  loading,
  progress,
  error,
  bgMode,
  bgColor,
  processImage,
  composeWithBg,
  downloadResult,
  resetAll,
} = useRemoveBg()

const selectedFile = ref(null)
const showOriginal = ref(false)

const bgColors = [
  { label: '透明', value: 'transparent', color: null },
  { label: '白色', value: '#ffffff', color: '#ffffff' },
  { label: '红色', value: '#d03030', color: '#d03030' },
  { label: '蓝色', value: '#438edb', color: '#438edb' },
  { label: '绿色', value: '#22c55e', color: '#22c55e' },
  { label: '黑色', value: '#000000', color: '#000000' },
]

// 文件选择
const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) startProcess(file)
}

const startProcess = (file) => {
  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件'
    return
  }
  selectedFile.value = file
  processImage(file)
}

// 拖拽
const handleDrop = (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files?.[0]
  if (file) startProcess(file)
}

const handleDragOver = (e) => {
  e.preventDefault()
}

// 粘贴
const handlePaste = (e) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) startProcess(file)
      break
    }
  }
}

// 选择背景色
const selectBg = (item) => {
  if (item.value === 'transparent') {
    bgMode.value = 'transparent'
  } else {
    bgMode.value = 'color'
    bgColor.value = item.value
  }
  composeWithBg()
}

// 自定义颜色
const handleCustomColor = (e) => {
  bgMode.value = 'color'
  bgColor.value = e.target.value
  composeWithBg()
}

// 监听 bgMode/bgColor 变化
watch([bgMode, bgColor], () => {
  if (resultImage.value) composeWithBg()
})

// 重置
const handleReset = () => {
  resetAll()
  selectedFile.value = null
  showOriginal.value = false
}
</script>

<template>
  <div class="page" @paste="handlePaste">
    <!-- 头部 -->
    <header class="header">
      <div class="header__character">
      </div>
      <div class="header__content">
        <div class="header__badge">
          <Scissors :size="14" />
          <span>AI 抠图</span>
        </div>
        <h1 class="header__title">
          <span>智能背景去除，</span>
          <span class="gradient-text">一键抠图</span>
        </h1>
        <p class="header__desc">
          AI 自动识别主体，精准去除背景，支持透明背景或自定义纯色背景
        </p>
      </div>
    </header>

    <!-- 主内容 -->
    <div class="main-area">
      <!-- 左侧：上传与配置 -->
      <div class="panel panel--input">
        <!-- 上传区 -->
        <div class="input-section">
          <h3 class="section-label">
            <Image :size="16" />
            <span>上传图片</span>
          </h3>
          <div
            v-if="!sourceImage"
            class="upload-zone"
            @click="$refs.fileInput.click()"
            @drop="handleDrop"
            @dragover="handleDragOver"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="upload-input"
              @change="handleFileSelect"
            />
            <Upload :size="32" />
            <p class="upload-zone__text">点击、拖拽或粘贴图片到此区域</p>
            <span class="upload-zone__tip">支持 JPG、PNG、WebP 等格式</span>
          </div>
          <div v-else class="image-preview">
            <img
              :src="showOriginal ? sourceImage : (composedImage || resultImage || sourceImage)"
              alt="预览图"
              class="preview-img"
            />
            <div class="preview-actions">
              <button
                v-if="resultImage"
                class="preview-btn"
                @mousedown="showOriginal = true"
                @mouseup="showOriginal = false"
                @mouseleave="showOriginal = false"
                @touchstart.prevent="showOriginal = true"
                @touchend="showOriginal = false"
              >
                <Eye :size="14" />
                <span>按住查看原图</span>
              </button>
              <button class="preview-btn" @click="handleReset">
                <RefreshCw :size="14" />
                <span>更换图片</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 进度 -->
        <div v-if="loading" class="progress-section">
          <div class="progress-indicator">
            <Loader2 :size="20" class="spin" />
            <span>{{ progress }}</span>
          </div>
        </div>

        <!-- 背景设置（抠图完成后显示） -->
        <div v-if="resultImage && !loading" class="input-section">
          <h3 class="section-label">
            <Palette :size="16" />
            <span>背景设置</span>
          </h3>
          <div class="bg-group">
            <button
              v-for="item in bgColors"
              :key="item.value"
              :class="['bg-btn', {
                'bg-btn--active': item.value === 'transparent' ? bgMode === 'transparent' : (bgMode === 'color' && bgColor === item.value)
              }]"
              @click="selectBg(item)"
            >
              <span
                v-if="item.color"
                class="bg-btn__swatch"
                :style="{ background: item.color }"
              ></span>
              <span v-else class="bg-btn__swatch bg-btn__swatch--transparent"></span>
              <span class="bg-btn__label">{{ item.label }}</span>
              <Check
                v-if="item.value === 'transparent' ? bgMode === 'transparent' : (bgMode === 'color' && bgColor === item.value)"
                :size="14"
                class="bg-btn__check"
              />
            </button>
          </div>
          <!-- 自定义颜色 -->
          <div class="custom-color">
            <label class="custom-color__label">自定义颜色</label>
            <input
              type="color"
              :value="bgColor"
              class="custom-color__input"
              @input="handleCustomColor"
            />
          </div>
        </div>

        <!-- 下载按钮 -->
        <button
          v-if="resultImage && !loading"
          class="download-btn"
          @click="downloadResult"
        >
          <Download :size="20" />
          <span>下载图片 (PNG)</span>
        </button>

        <!-- 错误 -->
        <div v-if="error" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- 右侧：效果预览 -->
      <div class="panel panel--result">
        <div v-if="resultImage" class="result-content">
          <h3 class="section-label">
            <Scissors :size="16" />
            <span>抠图效果</span>
          </h3>
          <div class="result-preview" :class="{ 'result-preview--transparent': bgMode === 'transparent' }">
            <img
              :src="composedImage || resultImage"
              alt="抠图结果"
              class="result-img"
            />
          </div>
          <div class="result-tips">
            <p>长按左侧"查看原图"按钮可对比原图效果</p>
          </div>
        </div>

        <!-- 占位 -->
        <div v-else class="result-placeholder">
          <div class="placeholder-icon">
            <Scissors :size="48" />
          </div>
          <p>抠图效果</p>
          <span class="placeholder-tip">上传图片后自动开始 AI 抠图</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
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

.header__character {
  flex-shrink: 0;
  filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.15));
}

.header__content {
  text-align: left;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15));
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #c084fc;
  margin-bottom: 24px;
}

.header__badge svg { color: #c084fc; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f472b6 100%);
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

/* 上传区 */
.upload-input { display: none; }

.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s;
}

.upload-zone:hover {
  border-color: rgba(168, 85, 247, 0.4);
  background: rgba(168, 85, 247, 0.05);
  color: #c084fc;
}

.upload-zone__text {
  font-size: 0.9375rem;
  font-weight: 500;
}

.upload-zone__tip {
  font-size: 0.8125rem;
  opacity: 0.6;
}

/* 图片预览 */
.image-preview {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.preview-img {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  display: block;
}

.preview-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.preview-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  color: var(--text-primary);
}

/* 进度 */
.progress-section {
  margin-bottom: 24px;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 14px;
  font-size: 0.9375rem;
  color: #c084fc;
}

/* 背景选择 */
.bg-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.bg-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  color: var(--text-secondary);
}

.bg-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.bg-btn--active {
  background: rgba(168, 85, 247, 0.08);
  border-color: rgba(168, 85, 247, 0.35);
}

.bg-btn__swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.bg-btn__swatch--transparent {
  background: repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 10px 10px;
}

.bg-btn__label {
  font-size: 0.8125rem;
  font-weight: 500;
}

.bg-btn__check {
  margin-left: auto;
  color: #c084fc;
}

.custom-color {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-color__label {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.custom-color__input {
  width: 40px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  padding: 2px;
}

/* 下载按钮 */
.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(168, 85, 247, 0.5);
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

/* 结果区 */
.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 300px;
  background: rgba(0, 0, 0, 0.2);
}

.result-preview--transparent {
  background: repeating-conic-gradient(#1a1a2e 0% 25%, #16162a 0% 50%) 50% / 20px 20px;
}

.result-img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.result-tips {
  margin-top: 12px;
  text-align: center;
}

.result-tips p {
  font-size: 0.8125rem;
  color: var(--text-muted);
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
  .page { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .bg-group { grid-template-columns: repeat(2, 1fr); }
}
</style>
