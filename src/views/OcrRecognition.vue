<script setup>
import { ref } from 'vue'
import { useOcr } from '../composables/useOcr'
import {
  ScanLine, Upload, Download, RefreshCw, AlertCircle, Loader2,
  Copy, Check, Image, Sparkles, Cpu
} from 'lucide-vue-next'

const {
  loading,
  progress,
  progressStage,
  resultText,
  error,
  recognize,
  reset,
} = useOcr()

const selectedLang = ref('chi_sim+eng')
const imagePreview = ref('')
const selectedFile = ref(null)
const copied = ref(false)
const engine = ref('vision') // 'vision' AI识别 | 'local' 离线识别

const langOptions = [
  { value: 'chi_sim+eng', label: '中英混合' },
  { value: 'chi_sim', label: '简体中文' },
  { value: 'eng', label: '英文' },
  { value: 'jpn', label: '日文' },
  { value: 'kor', label: '韩文' },
]

// 文件选择
const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) setFile(file)
}

const setFile = (file) => {
  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件'
    return
  }
  selectedFile.value = file
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = URL.createObjectURL(file)
  error.value = ''
}

// 拖拽
const handleDrop = (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files?.[0]
  if (file) setFile(file)
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
      if (file) setFile(file)
      break
    }
  }
}

// 开始识别
const startRecognize = () => {
  if (!selectedFile.value) return
  recognize(selectedFile.value, selectedLang.value, engine.value)
}

// 复制结果
const copyResult = async () => {
  if (!resultText.value) return
  try {
    await navigator.clipboard.writeText(resultText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    error.value = '复制失败，请手动选择文本复制'
  }
}

// 下载为 TXT
const downloadTxt = () => {
  if (!resultText.value) return
  const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ocr_result.txt'
  link.click()
  URL.revokeObjectURL(url)
}

// 重置全部
const resetAll = () => {
  reset()
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = ''
  selectedFile.value = null
  copied.value = false
}
</script>

<template>
  <div class="ocr-page" @paste="handlePaste">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <ScanLine :size="14" />
          <span>OCR 文字识别</span>
        </div>
        <h1 class="header__title">
          <span>图片文字识别，</span>
          <span class="gradient-text">一键提取</span>
        </h1>
        <p class="header__desc">
          AI 智能识别中英文等多语言，支持手写体、印刷体、截图等场景
        </p>
      </div>
    </header>

    <!-- 主内容 -->
    <div class="main-area">
      <!-- 左侧：上传与配置 -->
      <div class="panel panel--input">
        <!-- 图片上传区 -->
        <div class="input-section">
          <h3 class="section-label">
            <Image :size="16" />
            <span>上传图片</span>
          </h3>
          <div
            v-if="!imagePreview"
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
            <span class="upload-zone__tip">支持 JPG、PNG、BMP、WebP 等格式</span>
          </div>
          <div v-else class="image-preview">
            <img :src="imagePreview" alt="预览图" class="preview-img" />
            <button class="preview-remove" @click="resetAll">
              <RefreshCw :size="14" />
              <span>更换图片</span>
            </button>
          </div>
        </div>

        <!-- 识别引擎切换 -->
        <div class="input-section">
          <h3 class="section-label">
            <ScanLine :size="16" />
            <span>识别引擎</span>
          </h3>
          <div class="engine-group">
            <button
              :class="['engine-btn', { 'engine-btn--active': engine === 'vision' }]"
              @click="engine = 'vision'"
            >
              <Sparkles :size="18" />
              <div class="engine-btn__text">
                <span class="engine-btn__title">AI 智能识别</span>
                <span class="engine-btn__desc">效果最好，支持手写体</span>
              </div>
              <span v-if="engine === 'vision'" class="engine-btn__badge">推荐</span>
            </button>
            <button
              :class="['engine-btn', { 'engine-btn--active': engine === 'local' }]"
              @click="engine = 'local'"
            >
              <Cpu :size="18" />
              <div class="engine-btn__text">
                <span class="engine-btn__title">本地离线识别</span>
                <span class="engine-btn__desc">无需联网，印刷体可用</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 语言选择（仅离线模式） -->
        <div v-if="engine === 'local'" class="input-section">
          <h3 class="section-label">
            <ScanLine :size="16" />
            <span>识别语言</span>
          </h3>
          <div class="lang-group">
            <button
              v-for="lang in langOptions"
              :key="lang.value"
              :class="['lang-btn', { 'lang-btn--active': selectedLang === lang.value }]"
              @click="selectedLang = lang.value"
            >{{ lang.label }}</button>
          </div>
        </div>

        <!-- 识别按钮 -->
        <button
          class="recognize-btn"
          :disabled="loading || !selectedFile"
          @click="startRecognize"
        >
          <Loader2 v-if="loading" :size="20" class="spin" />
          <ScanLine v-else :size="20" />
          <span>{{ loading ? '识别中...' : '开始识别' }}</span>
        </button>

        <!-- 进度条 -->
        <div v-if="loading" class="progress-bar">
          <div class="progress-bar__track">
            <div class="progress-bar__fill" :style="{ width: progress + '%' }"></div>
          </div>
          <span class="progress-bar__text">{{ progress }}%</span>
        </div>
        <p v-if="loading && progressStage" class="progress-stage">{{ progressStage }}</p>

        <!-- 错误提示 -->
        <div v-if="error" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- 右侧：识别结果 -->
      <div class="panel panel--result">
        <div v-if="resultText" class="result-content">
          <h3 class="section-label">
            <ScanLine :size="16" />
            <span>识别结果</span>
          </h3>
          <textarea
            v-model="resultText"
            class="result-textarea"
            placeholder="识别结果将显示在这里..."
          ></textarea>

          <div class="result-actions">
            <button class="action-btn action-btn--primary" @click="copyResult">
              <Check v-if="copied" :size="18" />
              <Copy v-else :size="18" />
              <span>{{ copied ? '已复制' : '复制文本' }}</span>
            </button>
            <button class="action-btn" @click="downloadTxt">
              <Download :size="18" />
              <span>下载 TXT</span>
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
            <ScanLine :size="48" />
          </div>
          <p>识别结果</p>
          <span class="placeholder-tip">上传图片后点击"开始识别"提取文字</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ocr-page {
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
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #67e8f9;
  margin-bottom: 24px;
}

.header__badge svg { color: #67e8f9; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #a78bfa 100%);
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
  border-color: rgba(6, 182, 212, 0.4);
  background: rgba(6, 182, 212, 0.05);
  color: #67e8f9;
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
  max-height: 300px;
  object-fit: contain;
  display: block;
}

.preview-remove {
  position: absolute;
  top: 12px;
  right: 12px;
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
}

.preview-remove:hover {
  background: rgba(0, 0, 0, 0.8);
  color: var(--text-primary);
}

/* 引擎切换 */
.engine-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.engine-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
  color: var(--text-secondary);
  position: relative;
}

.engine-btn svg {
  flex-shrink: 0;
}

.engine-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.engine-btn--active {
  background: rgba(6, 182, 212, 0.08);
  border-color: rgba(6, 182, 212, 0.35);
}

.engine-btn--active svg {
  color: #67e8f9;
}

.engine-btn__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.engine-btn__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.engine-btn__desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.engine-btn__badge {
  margin-left: auto;
  padding: 3px 10px;
  background: linear-gradient(135deg, #06b6d4, #8b5cf6);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: white;
}

/* 语言选择 */
.lang-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lang-btn {
  flex: 1;
  min-width: 72px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.lang-btn:hover {
  background: rgba(6, 182, 212, 0.08);
  border-color: rgba(6, 182, 212, 0.25);
  color: #67e8f9;
}

.lang-btn--active {
  background: rgba(6, 182, 212, 0.12);
  border-color: rgba(6, 182, 212, 0.4);
  color: #67e8f9;
}

/* 进度阶段提示 */
.progress-stage {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 8px;
  text-align: center;
}

/* 识别按钮 */
.recognize-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.recognize-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(6, 182, 212, 0.5);
}

.recognize-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* 进度条 */
.progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.progress-bar__track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #8b5cf6);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-bar__text {
  font-size: 0.875rem;
  font-weight: 700;
  color: #67e8f9;
  min-width: 40px;
  text-align: right;
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

.result-textarea {
  flex: 1;
  width: 100%;
  min-height: 300px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-size: 0.9375rem;
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  transition: border-color 0.3s;
  font-family: inherit;
  line-height: 1.7;
  margin-bottom: 16px;
}

.result-textarea::placeholder { color: var(--text-muted); }

.result-textarea:focus {
  border-color: rgba(6, 182, 212, 0.5);
}

.result-actions {
  display: flex;
  gap: 12px;
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
  background: rgba(6, 182, 212, 0.12);
  border-color: rgba(6, 182, 212, 0.3);
  color: #67e8f9;
}

.action-btn--primary:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: rgba(6, 182, 212, 0.5);
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
  .ocr-page { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .result-actions { flex-direction: column; }
  .lang-group { flex-direction: column; }
}
</style>
