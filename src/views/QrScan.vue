<script setup>
import '../styles/internal-page.scss'
import { onMounted, ref } from 'vue'
import FeatureCostBadge from '../components/account/FeatureCostBadge.vue'
import { useQrScan } from '../composables/useQrScan'
import {
  QrCode, Upload, Loader2, AlertCircle, RefreshCw,
  Copy, ExternalLink, ScanLine,
} from 'lucide-vue-next'

const {
  loading,
  error,
  supported,
  results,
  initDetector,
  scan,
  reset,
} = useQrScan()

const selectedFile = ref(null)
const previewUrl = ref('')
const isDragging = ref(false)
const copiedId = ref('')

onMounted(() => {
  initDetector()
})

const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) setFile(file)
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) setFile(file)
}

const handlePaste = (e) => {
  const items = e.clipboardData?.items || []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        setFile(file)
      }
      break
    }
  }
}

const setFile = (file) => {
  if (!file.type.startsWith('image/')) return
  selectedFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  copiedId.value = ''
  reset()
}

const handleScan = async () => {
  if (!selectedFile.value || loading.value) return
  copiedId.value = ''
  try {
    await scan(selectedFile.value)
  } catch {}
}

const copyValue = async (item) => {
  await navigator.clipboard.writeText(item.rawValue)
  copiedId.value = item.id
  setTimeout(() => {
    copiedId.value = ''
  }, 2000)
}

const isUrl = (value) => /^https?:\/\//i.test(value)

const resetAll = () => {
  reset()
  selectedFile.value = null
  copiedId.value = ''
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}
</script>

<template>
  <div class="qr-scan internal-page" @paste="handlePaste">
    <section class="tool-summary panel">
      <div class="tool-summary__head">
        <div class="header__badge">
          <ScanLine :size="14" />
          <span>二维码解析</span>
        </div>
        <span class="tool-summary__hint">浏览器本地识别</span>
      </div>
      <div class="tool-summary__body">
        <div>
          <h1 class="tool-summary__title">上传或粘贴截图，直接识别二维码内容</h1>
          <p class="tool-summary__desc">
            适合聊天截图、海报和文档里的二维码。识别后可以直接复制，链接也能一键打开。
          </p>
        </div>
        <div class="quick-tags">
          <span class="quick-tag">截图即扫</span>
          <span class="quick-tag">支持粘贴</span>
          <span class="quick-tag">链接直达</span>
        </div>
      </div>
    </section>

    <div class="main-area">
      <div class="panel panel--input">
        <div class="stack">
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
              accept="image/*"
              @change="handleFileSelect"
            />
            <span class="upload-cta">选择图片</span>
            <div class="upload-icon"><Upload :size="30" /></div>
            <p class="upload-text">选择二维码图片</p>
            <p class="upload-hint">支持拖拽上传，也可以直接粘贴截图</p>
            <div class="upload-meta">
              <span class="metric-pill">JPG / PNG / WebP</span>
              <FeatureCostBadge feature-code="qr-scan" muted />
            </div>
          </div>

          <template v-else>
            <div class="input-section section-card">
              <div class="section-head">
                <h3 class="section-title">源图片</h3>
                <button class="action-btn action-btn--soft" @click="resetAll">
                  <RefreshCw :size="16" />
                  <span>更换图片</span>
                </button>
              </div>

              <div class="file-meta-card">
                <strong>{{ selectedFile.name }}</strong>
                <div class="metric-row">
                  <span class="metric-pill">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
                  <span class="metric-pill">图片扫码</span>
                </div>
              </div>

              <img :src="previewUrl" alt="待识别图片" class="preview-image" />
            </div>

            <div class="support-inline" :class="{ 'support-inline--warn': !supported }">
              <AlertCircle :size="16" />
              <span>
                {{ supported ? '当前浏览器支持本地识别，图片不会上传服务器。' : '当前浏览器对本地二维码识别支持有限，建议使用最新版 Chrome 或 Edge。' }}
              </span>
            </div>

            <button class="convert-btn" :disabled="loading || !selectedFile" @click="handleScan">
              <Loader2 v-if="loading" :size="20" class="spin" />
              <QrCode v-else :size="20" />
              <span>{{ loading ? '识别中...' : '开始识别' }}</span>
              <FeatureCostBadge v-if="!loading" feature-code="qr-scan" />
            </button>

            <div v-if="error" class="error-msg">
              <AlertCircle :size="16" />
              <span>{{ error }}</span>
            </div>
          </template>
        </div>
      </div>

      <div class="panel panel--result">
        <div v-if="results.length" class="result-content">
          <div class="section-head">
            <h3 class="section-title">识别结果</h3>
            <span class="metric-pill">{{ results.length }} 个结果</span>
          </div>

          <div class="result-list">
            <div v-for="item in results" :key="item.id" class="result-item">
              <div class="result-item__main">
                <span class="result-item__id">{{ item.format }}</span>
                <p class="result-item__value">{{ item.rawValue }}</p>
              </div>
              <div class="result-item__actions">
                <button class="action-btn action-btn--soft" @click="copyValue(item)">
                  <Copy :size="16" />
                  <span>{{ copiedId === item.id ? '已复制' : '复制' }}</span>
                </button>
                <a
                  v-if="isUrl(item.rawValue)"
                  class="action-btn action-btn--link"
                  :href="item.rawValue"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink :size="16" />
                  <span>打开链接</span>
                </a>
              </div>
            </div>
          </div>

          <div class="result-actions">
            <button class="action-btn action-btn--soft" @click="resetAll">
              <RefreshCw :size="18" />
              <span>重新开始</span>
            </button>
          </div>
        </div>

        <div v-else class="result-placeholder">
          <div class="placeholder-icon">
            <ScanLine :size="42" />
          </div>
          <p>识别结果区</p>
          <span class="placeholder-tip">识别成功后会把二维码内容列在这里，链接类型可直接打开。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.qr-scan {
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
.tool-summary__body,
.quick-tags,
.metric-row,
.result-actions,
.upload-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.tool-summary__body {
  margin-top: 12px;
}

.tool-summary__title {
  margin: 0;
  max-width: 700px;
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

.tool-summary__hint,
.quick-tag,
.metric-pill {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  background: rgba(248, 251, 255, 0.9);
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.tool-summary__hint {
  color: #46627f;
}

.main-area {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 22px;
}

.stack {
  display: grid;
  gap: 16px;
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

.upload-text {
  margin-bottom: 6px;
}

.upload-hint {
  max-width: 320px;
  margin: 0 auto;
}

.upload-meta {
  justify-content: center;
  margin-top: 16px;
}

.file-meta-card {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(104, 120, 154, 0.14);
}

.preview-image {
  width: 100%;
  margin-top: 14px;
  border-radius: 16px;
  background: rgba(241, 246, 252, 0.92);
  border: 1px solid rgba(104, 120, 154, 0.12);
  object-fit: contain;
  max-height: 420px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.convert-btn {
  min-height: 50px;
  width: 100%;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  background: #203753;
  color: #fff;
  border: 1px solid rgba(23, 37, 64, 0.08);
  box-shadow: 0 12px 26px rgba(32, 55, 83, 0.14);
  transition: background 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
}

.convert-btn:hover:not(:disabled) {
  background: #182c45;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(24, 44, 69, 0.16);
}

.convert-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.support-inline {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  background: rgba(247, 250, 254, 0.94);
  color: var(--text-main);
  line-height: 1.6;
}

.support-inline svg {
  margin-top: 2px;
  flex-shrink: 0;
  color: var(--accent);
}

.support-inline--warn {
  border-color: rgba(214, 168, 77, 0.28) !important;
  background: rgba(255, 249, 238, 0.96) !important;
  color: #7b5a22;
}

.support-inline--warn svg {
  color: #b8892f;
}

.result-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.result-item {
  display: grid;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(104, 120, 154, 0.16);
}

.result-item__main {
  display: grid;
  gap: 8px;
}

.result-item__id {
  width: fit-content;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(241, 246, 252, 0.96);
  border: 1px solid rgba(104, 120, 154, 0.14);
  color: #37516f;
  font-size: 0.76rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.result-item__value {
  margin: 0;
  word-break: break-all;
  line-height: 1.7;
  color: var(--text-strong);
}

.result-item__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  background: rgba(255, 255, 255, 0.84);
  color: var(--text-main);
  text-decoration: none;
}

.action-btn--soft {
  background: rgba(255, 255, 255, 0.84);
}

.action-btn--link {
  background: rgba(243, 247, 253, 0.95);
  color: #29496d;
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
  gap: 10px;
  text-align: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .main-area {
    grid-template-columns: 1fr;
  }

  .tool-summary__head,
  .tool-summary__body,
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
