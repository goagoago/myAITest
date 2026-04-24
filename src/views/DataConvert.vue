<script setup>
import '../styles/internal-page.scss'
import { computed, ref, watch } from 'vue'
import FeatureCostBadge from '../components/account/FeatureCostBadge.vue'
import { useDataConvert } from '../composables/useDataConvert'
import {
  FileSpreadsheet, Upload, Loader2, AlertCircle, RefreshCw,
  Download, FileCode, FileText, Table, Copy,
} from 'lucide-vue-next'

const {
  loading,
  error,
  result,
  convert,
  download,
  reset,
} = useDataConvert()

const sourceType = ref('excel')
const targetType = ref('json')
const selectedFile = ref(null)
const sourceText = ref('')
const isDragging = ref(false)
const copied = ref(false)

const cleanOptions = ref({
  trimText: true,
  removeEmptyRows: true,
  dedupeRows: false,
  firstRowAsHeader: true,
})

const sourceOptions = [
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: '读取 .xlsx / .xls 文件' },
  { value: 'csv', label: 'CSV', icon: Table, desc: '读取 .csv 表格文件' },
  { value: 'json', label: 'JSON', icon: FileCode, desc: '直接粘贴 JSON 内容' },
]

const targetOptions = computed(() => [
  { value: 'json', label: 'JSON', icon: FileCode },
  { value: 'csv', label: 'CSV', icon: Table },
  { value: 'xlsx', label: 'XLSX', icon: FileSpreadsheet },
])

const fileAccept = computed(() => {
  if (sourceType.value === 'excel') return '.xlsx,.xls'
  if (sourceType.value === 'csv') return '.csv,text/csv'
  return ''
})

const previewHeaders = computed(() => {
  const rows = result.previewRows || []
  if (!rows.length) return []
  const maxLength = rows.reduce((max, row) => Math.max(max, row.length), 0)
  return Array.from({ length: maxLength }, (_, index) => `列 ${index + 1}`)
})

watch(sourceType, () => {
  selectedFile.value = null
  sourceText.value = ''
  targetType.value = sourceType.value === 'json' ? 'csv' : 'json'
  copied.value = false
  reset()
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

const processFile = (file) => {
  selectedFile.value = file
  reset()
}

const handleConvert = async () => {
  if (sourceType.value !== 'json' && !selectedFile.value) return
  if (sourceType.value === 'json' && !sourceText.value.trim()) return

  copied.value = false

  try {
    await convert({
      sourceType: sourceType.value,
      targetType: targetType.value,
      file: selectedFile.value,
      text: sourceText.value,
      options: cleanOptions.value,
    })
  } catch {}
}

const handleDownload = () => {
  download()
}

const copyJson = async () => {
  if (!result.jsonText) return
  await navigator.clipboard.writeText(result.jsonText)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

const resetAll = () => {
  reset()
  selectedFile.value = null
  sourceText.value = ''
  copied.value = false
}
</script>

<template>
  <div class="data-convert internal-page">
    <section class="tool-summary panel">
      <div class="tool-summary__head">
        <div class="header__badge">
          <FileSpreadsheet :size="14" />
          <span>数据转换</span>
        </div>
        <span class="tool-summary__hint">Excel / CSV / JSON</span>
      </div>
      <div class="tool-summary__body">
        <div>
          <h1 class="tool-summary__title">Excel、CSV、JSON 互转和基础清洗</h1>
          <p class="tool-summary__desc">
            适合办公表格和接口调试，把格式转换、去空行、去首尾空格和整行去重放到一个页面里完成。
          </p>
        </div>
        <div class="quick-tags">
          <span class="quick-tag">格式互转</span>
          <span class="quick-tag">基础清洗</span>
          <span class="quick-tag">本地处理</span>
        </div>
      </div>
    </section>

    <div class="main-area">
      <div class="panel panel--input">
        <div class="stack">
          <div class="input-section section-card">
            <h3 class="section-title">源格式</h3>
            <div class="source-grid">
              <button
                v-for="item in sourceOptions"
                :key="item.value"
                :class="['mode-card', { 'mode-card--active': sourceType === item.value }]"
                @click="sourceType = item.value"
              >
                <component :is="item.icon" :size="18" />
                <div class="mode-card__text">
                  <span class="mode-card__title">{{ item.label }}</span>
                  <span class="mode-card__desc">{{ item.desc }}</span>
                </div>
              </button>
            </div>
          </div>

          <div v-if="sourceType !== 'json'" class="input-section section-card">
            <div class="section-head">
              <h3 class="section-title">上传源文件</h3>
              <span class="section-note">{{ sourceType === 'excel' ? '读取第一个工作表' : '按表格文本逐行读取' }}</span>
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
                :accept="fileAccept"
                @change="handleFileSelect"
              />
              <span class="upload-cta">{{ sourceType === 'excel' ? '选择 Excel' : '选择 CSV' }}</span>
              <div class="upload-icon"><Upload :size="40" /></div>
              <p class="upload-text">点击上传或拖拽文件到此处</p>
              <p class="upload-hint">{{ sourceType === 'excel' ? '支持 .xlsx 和 .xls 文件' : '支持 .csv 文件' }}</p>
              <FeatureCostBadge feature-code="data-convert" muted />
            </div>

            <div v-else class="file-meta-card">
              <div class="file-meta-card__top">
                <strong>{{ selectedFile.name }}</strong>
                <button class="action-btn action-btn--soft" @click="selectedFile = null">
                  <RefreshCw :size="16" />
                  <span>重选</span>
                </button>
              </div>
              <div class="metric-row">
                <span class="metric-pill">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
                <span class="metric-pill">{{ sourceType.toUpperCase() }}</span>
              </div>
            </div>
          </div>

          <div v-else class="input-section section-card">
            <div class="section-head">
              <h3 class="section-title">粘贴 JSON</h3>
              <span class="section-note">支持数组、对象和二维数组</span>
            </div>
            <textarea
              v-model="sourceText"
              class="textarea code-surface"
              rows="12"
              placeholder='例如：[{"name":"Tom","score":98},{"name":"Amy","score":95}]'
            ></textarea>
          </div>

          <div class="input-section section-card">
            <div class="section-head">
              <h3 class="section-title">输出格式</h3>
              <span class="section-note">结果区会提供预览和下载</span>
            </div>
            <div class="target-grid">
              <button
                v-for="item in targetOptions"
                :key="item.value"
                :class="['target-pill', { 'target-pill--active': targetType === item.value }]"
                @click="targetType = item.value"
              >
                <component :is="item.icon" :size="16" />
                <span>{{ item.label }}</span>
              </button>
            </div>
          </div>

          <div class="input-section section-card">
            <div class="section-head">
              <h3 class="section-title">清洗选项</h3>
              <span class="section-note">只保留最常用的整理动作</span>
            </div>
            <div class="toggle-list">
              <label class="toggle-item">
                <input v-model="cleanOptions.trimText" type="checkbox" />
                <span>去掉文本首尾空格</span>
              </label>
              <label class="toggle-item">
                <input v-model="cleanOptions.removeEmptyRows" type="checkbox" />
                <span>移除全空行</span>
              </label>
              <label class="toggle-item">
                <input v-model="cleanOptions.dedupeRows" type="checkbox" />
                <span>按整行去重</span>
              </label>
              <label class="toggle-item">
                <input v-model="cleanOptions.firstRowAsHeader" type="checkbox" />
                <span>转 JSON 时将首行视为表头</span>
              </label>
            </div>
          </div>

          <button class="convert-btn" :disabled="loading" @click="handleConvert">
            <Loader2 v-if="loading" :size="20" class="spin" />
            <FileSpreadsheet v-else :size="20" />
            <span>{{ loading ? '处理中...' : '执行转换与清洗' }}</span>
            <FeatureCostBadge v-if="!loading" feature-code="data-convert" />
          </button>

          <div v-if="error" class="error-msg">
            <AlertCircle :size="16" />
            <span>{{ error }}</span>
          </div>
        </div>
      </div>

      <div class="panel panel--result">
        <div v-if="result.filename" class="result-content">
          <div class="section-head">
            <h3 class="section-title">结果预览</h3>
            <span class="metric-pill">{{ result.targetType.toUpperCase() }}</span>
          </div>

          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-label">总行数</span>
              <strong>{{ result.rowCount }}</strong>
            </div>
            <div class="stat-item">
              <span class="stat-label">总列数</span>
              <strong>{{ result.colCount }}</strong>
            </div>
            <div class="stat-item">
              <span class="stat-label">输出格式</span>
              <strong>{{ result.targetType.toUpperCase() }}</strong>
            </div>
          </div>

          <div v-if="result.targetType === 'json'" class="result-section">
            <div class="result-head">
              <h3>JSON 结果</h3>
              <button class="action-btn action-btn--soft" @click="copyJson">
                <Copy :size="16" />
                <span>{{ copied ? '已复制' : '复制内容' }}</span>
              </button>
            </div>
            <textarea :value="result.jsonText" class="textarea textarea--result code-surface" rows="16" readonly></textarea>
          </div>

          <div v-else class="result-section">
            <div class="result-head">
              <h3>预览前 20 行</h3>
              <span class="section-note">完整内容请下载文件</span>
            </div>
            <div class="table-wrap">
              <table class="preview-table">
                <thead>
                  <tr>
                    <th v-for="header in previewHeaders" :key="header">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in result.previewRows" :key="rowIndex">
                    <td v-for="(cell, cellIndex) in previewHeaders" :key="`${rowIndex}-${cellIndex}`">
                      {{ row[cellIndex] ?? '' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="result-actions">
            <button class="action-btn action-btn--primary" @click="handleDownload">
              <Download :size="18" />
              <span>下载结果</span>
            </button>
            <button class="action-btn action-btn--soft" @click="resetAll">
              <RefreshCw :size="18" />
              <span>重置</span>
            </button>
          </div>
        </div>

        <div v-else class="result-placeholder">
          <div class="placeholder-icon">
            <FileSpreadsheet :size="42" />
          </div>
          <p>转换结果区</p>
          <span class="placeholder-tip">这里会显示 JSON 文本，或前 20 行表格预览，方便快速检查输出。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-convert {
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
  max-width: 660px;
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
  grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr);
  gap: 22px;
}

.stack {
  display: grid;
  gap: 16px;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mode-card {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 78px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  text-align: left;
  cursor: pointer;
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
  border-radius: 20px;
  padding: 18px;
}

.section-head,
.file-meta-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.section-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
}

.input-section.section-card {
  border-radius: 18px;
  padding: 16px;
}

.section-note {
  color: var(--text-soft);
  font-size: 0.84rem;
  text-align: right;
}

.code-surface {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background: rgba(248, 251, 255, 0.96) !important;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.target-pill {
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(104, 120, 154, 0.16);
  background: rgba(255, 255, 255, 0.82);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 700;
}

.target-pill--active {
  border-color: rgba(58, 98, 141, 0.24) !important;
  background: rgba(247, 250, 254, 0.96) !important;
}

.toggle-list {
  display: grid;
  gap: 12px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(104, 120, 154, 0.16);
}

.toggle-item input {
  accent-color: var(--accent);
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

.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-item {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(104, 120, 154, 0.16);
}

.stat-label {
  color: var(--text-soft);
  font-size: 0.84rem;
}

.table-wrap {
  overflow: auto;
  margin-top: 12px;
  border-radius: 16px;
  border: 1px solid rgba(104, 120, 154, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
  background: rgba(255, 255, 255, 0.82);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.82);
}

.preview-table th,
.preview-table td {
  min-width: 120px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(104, 120, 154, 0.12);
  text-align: left;
  font-size: 0.94rem;
}

.preview-table th {
  position: sticky;
  top: 0;
  background: rgba(239, 245, 252, 0.98);
  color: var(--text-strong);
}

.textarea--result {
  margin-top: 12px;
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
  gap: 10px;
  text-align: center;
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
  .source-grid,
  .target-grid,
  .stats-bar {
    grid-template-columns: 1fr;
  }

  .tool-summary__head,
  .tool-summary__body,
  .section-head,
  .file-meta-card__top,
  .result-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-note {
    text-align: left;
  }
}
</style>
