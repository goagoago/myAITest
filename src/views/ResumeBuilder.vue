<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import html2pdf from 'html2pdf.js'
import {
  GripVertical, Plus, Trash2, LoaderCircle,
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, ListChecks,
  Link, Quote, Code, Minus,
  Superscript, Subscript,
  Table, Image, SquareCode, Palette,
  Sparkles,
} from 'lucide-vue-next'
import { useResumeBuilder } from '../composables/useResumeBuilder'
import ResumeHero from './components/resume/ResumeHero.vue'
import ResumeReview from './components/resume/ResumeReview.vue'
import ResumeToolbar from './components/resume/ResumeToolbar.vue'
import ResumePasteImport from './components/resume/ResumePasteImport.vue'

const {
  headerText, sections, markdown, renderedHtml,
  importLoading, importError,
  aiFormatLoading, aiFormatError,
  fillDemo, resetResume, loadFromMarkdown,
  moveSection, addSection, removeSection,
  moveItem, addItem, removeItem,
  importFile, exportMarkdownFile, formatRawResumeText,
  aiFormatResume,
  aiReviewLoading, aiReviewError, aiReviewResult, aiReviewResume,
  aiWriteLoading, aiWriteError, aiWriteResumeSection,
} = useResumeBuilder()

const previewRef = ref(null)
const copied = ref(false)
const rawPasteText = ref('')
const pasteCollapsed = ref(false)
const aiWriteRole = ref('')
const aiWriteSection = ref('summary')
const aiWriteNotes = ref('')
const dragState = ref({ type: '', secIdx: -1, itemIdx: -1 })
const dropTarget = ref({ secIdx: -1, itemIdx: -1 })
const lastFocusedTextarea = ref(null)
const colorOptions = ['#16c58e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#0ea5e9', '#111827']
const activeColor = ref('#f59e0b')
const colorOpen = ref(false)

onMounted(() => {
  nextTick(scheduleResizeAllTextareas)
})

watch([headerText, sections], () => nextTick(scheduleResizeAllTextareas), { deep: true })

/* ── Textarea 自动高度 ───────────────── */
let resizeRaf = 0

function resizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function scheduleResizeTextarea(el) {
  if (!el) return
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    resizeTextarea(el)
  })
}

function resizeAllTextareas() {
  document.querySelectorAll('.md-editor textarea').forEach(resizeTextarea)
}

function scheduleResizeAllTextareas() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    resizeAllTextareas()
  })
}

function onInput(e) {
  scheduleResizeTextarea(e.target)
}

function onFocus(e) {
  lastFocusedTextarea.value = e.target
}

/* ── 格式化工具栏 ────────────────────── */
function getActiveTextarea() {
  const active = document.activeElement
  if (active && active.tagName === 'TEXTAREA') return active
  if (lastFocusedTextarea.value && document.contains(lastFocusedTextarea.value)) return lastFocusedTextarea.value
  return document.querySelector('.md-editor textarea')
}

function applyTextareaChange(ta, newVal, selectionStart, selectionEnd = selectionStart) {
  if (!ta) return
  lastFocusedTextarea.value = ta
  ta.focus()
  const nativeInputEvent = new Event('input', { bubbles: true })
  ta.value = newVal
  ta.dispatchEvent(nativeInputEvent)

  nextTick(() => {
    if (typeof selectionStart === 'number') {
      ta.setSelectionRange(selectionStart, selectionEnd)
    }
    ta.focus()
    scheduleResizeTextarea(ta)
  })
}

function insertFormat(prefix, suffix = '') {
  const ta = getActiveTextarea()
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = ta.value
  const selected = text.slice(start, end)
  const replacement = prefix + (selected || '文本') + (suffix || prefix)
  const newVal = text.slice(0, start) + replacement + text.slice(end)

  const cursorPos = start + prefix.length + (selected || '文本').length + (suffix || prefix).length
  applyTextareaChange(ta, newVal, cursorPos)
}

function insertLinePrefix(prefix) {
  const ta = getActiveTextarea()
  if (!ta) return
  const start = ta.selectionStart
  const text = ta.value
  const end = ta.selectionEnd
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const lineEnd = text.indexOf('\n', end)
  const safeLineEnd = lineEnd === -1 ? text.length : lineEnd
  const selectedBlock = text.slice(lineStart, safeLineEnd)
  const hasMultipleLines = selectedBlock.includes('\n') || start !== end
  const applyToLines = hasMultipleLines
    ? selectedBlock.split('\n').map(line => (line.trim() ? prefix + line : line)).join('\n')
    : prefix + selectedBlock
  const newVal = text.slice(0, lineStart) + applyToLines + text.slice(safeLineEnd)

  const added = applyToLines.length - selectedBlock.length
  applyTextareaChange(ta, newVal, start, end + Math.max(0, added))
}

function insertBlock(block) {
  const ta = getActiveTextarea()
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = ta.value
  const newVal = text.slice(0, start) + block + text.slice(end)

  const cursorPos = start + block.length
  applyTextareaChange(ta, newVal, cursorPos)
}

function insertColor(color) {
  const safeColor = color || activeColor.value
  insertFormat(`<span style="color:${safeColor};">`, '</span>')
}

const formatActions = [
  { icon: Heading1, title: '一级标题', label: '标题1', action: () => insertLinePrefix('# ') },
  { icon: Heading2, title: '二级标题', label: '标题2', action: () => insertLinePrefix('## ') },
  { icon: Heading3, title: '三级标题', label: '标题3', action: () => insertLinePrefix('### ') },
  { icon: Heading4, title: '四级标题', label: '标题4', action: () => insertLinePrefix('#### ') },
  { sep: true },
  { icon: Bold, title: '加粗', label: '加粗', action: () => insertFormat('**') },
  { icon: Italic, title: '斜体', label: '斜体', action: () => insertFormat('*') },
  { icon: Underline, title: '下划线', label: '下划线', action: () => insertFormat('<u>', '</u>') },
  { icon: Strikethrough, title: '删除线', label: '删除线', action: () => insertFormat('~~') },
  { icon: Superscript, title: '上标', label: '上标', action: () => insertFormat('<sup>', '</sup>') },
  { icon: Subscript, title: '下标', label: '下标', action: () => insertFormat('<sub>', '</sub>') },
  { icon: Code, title: '行内代码', label: '行内', action: () => insertFormat('`') },
  { icon: SquareCode, title: '代码块', label: '代码块', action: () => insertFormat('```\n', '\n```') },
  { sep: true },
  { icon: List, title: '无序列表', label: '无序', action: () => insertLinePrefix('- ') },
  { icon: ListOrdered, title: '有序列表', label: '有序', action: () => insertLinePrefix('1. ') },
  { icon: ListChecks, title: '任务清单', label: '清单', action: () => insertLinePrefix('- [ ] ') },
  { icon: Quote, title: '引用', label: '引用', action: () => insertLinePrefix('> ') },
  { icon: Table, title: '表格', label: '表格', action: () => insertBlock('| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |\n') },
  { icon: Minus, title: '分隔线', label: '分隔线', action: () => insertLinePrefix('---\n') },
  { sep: true },
  { icon: Link, title: '链接', label: '链接', action: () => insertFormat('[', '](url)') },
  { icon: Image, title: '图片', label: '图片', action: () => insertFormat('![', '](url)') },
]

/* ── Section 拖拽 ────────────────────── */
function onSecDragStart(e, si) {
  dragState.value = { type: 'section', secIdx: si, itemIdx: -1 }
  e.dataTransfer.effectAllowed = 'move'
}

function onSecDragOver(e, si) {
  if (dragState.value.type !== 'section') return
  e.preventDefault()
  dropTarget.value = { secIdx: si, itemIdx: -1 }
}

function onSecDrop(e, si) {
  if (dragState.value.type !== 'section') return
  e.preventDefault()
  const from = dragState.value.secIdx
  if (from !== si) moveSection(from, si)
  onDragEnd()
}

/* ── Item 拖拽 ───────────────────────── */
function onItemDragStart(e, si, ii) {
  e.stopPropagation()
  dragState.value = { type: 'item', secIdx: si, itemIdx: ii }
  e.dataTransfer.effectAllowed = 'move'
}

function onItemDragOver(e, si, ii) {
  if (dragState.value.type !== 'item') return
  e.preventDefault()
  e.stopPropagation()
  dropTarget.value = { secIdx: si, itemIdx: ii }
}

function onItemDrop(e, si, ii) {
  if (dragState.value.type !== 'item') return
  e.preventDefault()
  e.stopPropagation()
  const fromSec = dragState.value.secIdx
  const fromItem = dragState.value.itemIdx
  if (fromSec === si) {
    if (fromItem !== ii) moveItem(si, fromItem, ii)
  } else {
    const item = sections.value[fromSec].items[fromItem]
    sections.value[fromSec].items.splice(fromItem, 1)
    if (!sections.value[fromSec].items.length) {
      sections.value[fromSec].items.push({ id: Date.now().toString(), content: '' })
    }
    sections.value[si].items.splice(ii, 0, item)
  }
  onDragEnd()
}

function onDragEnd() {
  dragState.value = { type: '', secIdx: -1, itemIdx: -1 }
  dropTarget.value = { secIdx: -1, itemIdx: -1 }
}

/* ── 操作 ────────────────────────────── */
const copyMarkdown = async () => {
  await navigator.clipboard.writeText(markdown.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1400)
}

const handleImport = (e) => {
  const file = e.target.files?.[0]
  if (file) importFile(file)
  e.target.value = ''
}

/* ── 粘贴文字导入 ─────────────────────── */
const handleAiFormatImport = async () => {
  if (!rawPasteText.value.trim()) return
  const md = await aiFormatResume(rawPasteText.value)
  if (md) {
    loadFromMarkdown(md)
    pasteCollapsed.value = true
    rawPasteText.value = ''
  }
}

const handleAiReview = async () => {
  await aiReviewResume(markdown.value)
}

const handleAiWrite = async () => {
  const md = await aiWriteResumeSection({
    role: aiWriteRole.value,
    section: aiWriteSection.value,
    notes: aiWriteNotes.value,
  })
  if (md) {
    insertBlock(`\n${md}\n`)
  }
}

const exportPdf = async () => {
  if (!previewRef.value) return
  const el = previewRef.value
  el.classList.add('pdf-preview--exporting')
  try {
    await html2pdf()
      .set({
        margin: 8,
        filename: 'resume.pdf',
        image: { type: 'png', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(el)
      .save()
  } finally {
    el.classList.remove('pdf-preview--exporting')
  }
}
</script>

<template>
  <div class="resume-builder">
    <!-- Hero -->
    <ResumeHero :ai-review-loading="aiReviewLoading" @review="handleAiReview" />

    <ResumeReview :ai-review-error="aiReviewError" :ai-review-result="aiReviewResult" />

    <!-- Toolbar -->
    <ResumeToolbar
      :import-loading="importLoading"
      :copied="copied"
      @fill-demo="fillDemo"
      @reset="resetResume"
      @import="handleImport"
      @export-markdown="exportMarkdownFile"
      @copy-markdown="copyMarkdown"
      @export-pdf="exportPdf"
    />

    <p v-if="importError" class="import-error">{{ importError }}</p>

    <!-- 粘贴文字导入 -->
    <ResumePasteImport
      v-model:raw-text="rawPasteText"
      v-model:collapsed="pasteCollapsed"
      :ai-format-loading="aiFormatLoading"
      :ai-format-error="aiFormatError"
      @format="handleAiFormatImport"
    />

    <!-- AI 写作辅助 -->
    <section class="ai-write card">
      <div class="ai-write__header">
        <Sparkles :size="15" />
        <span>AI 帮写简历</span>
      </div>
      <div class="ai-write__body">
        <div class="ai-write__grid">
          <label class="ai-write__field">
            <span>目标岗位</span>
            <input v-model="aiWriteRole" type="text" placeholder="如：前端开发 / 产品经理" />
          </label>
          <label class="ai-write__field">
            <span>生成模块</span>
            <select v-model="aiWriteSection">
              <option value="summary">职业摘要</option>
              <option value="experience">工作经历</option>
              <option value="project">项目经历</option>
              <option value="skills">技能</option>
              <option value="education">教育背景</option>
            </select>
          </label>
        </div>
        <label class="ai-write__field">
          <span>要点/经历信息</span>
          <textarea
            v-model="aiWriteNotes"
            rows="5"
            placeholder="写清楚你做过什么、用到什么技能、取得什么结果（可多行）"
          ></textarea>
        </label>
        <p v-if="aiWriteError" class="ai-write__error">{{ aiWriteError }}</p>
        <div class="ai-write__actions">
          <button class="btn btn--primary btn--small" @click="handleAiWrite" :disabled="!aiWriteNotes.trim() || aiWriteLoading">
            <component :is="aiWriteLoading ? LoaderCircle : Sparkles" :size="14" :class="{ spinning: aiWriteLoading }" />
            <span>{{ aiWriteLoading ? '生成中...' : '生成并插入' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 双栏：编辑 + 预览 -->
    <div class="panel">
      <!-- 左侧：编辑器 -->
      <div class="md-editor card">
        <!-- 格式化工具栏 -->
        <div class="format-bar">
          <template v-for="(act, idx) in formatActions" :key="idx">
            <div v-if="act.sep" class="format-bar__sep"></div>
            <button v-else class="format-btn" :title="act.title" @mousedown.prevent="act.action">
              <component :is="act.icon" :size="15" />
              <span class="format-btn__label">{{ act.label }}</span>
            </button>
          </template>
          <div class="format-color">
            <button class="format-color__trigger" @click="colorOpen = !colorOpen">
              <Palette :size="15" />
              <span>颜色</span>
              <span class="format-color__dot" :style="{ background: activeColor }"></span>
            </button>
            <div v-if="colorOpen" class="format-color__panel">
              <div class="format-color__swatches">
                <button
                  v-for="color in colorOptions"
                  :key="color"
                  class="format-color__swatch"
                  :style="{ background: color, borderColor: color }"
                  :class="{ 'format-color__swatch--active': activeColor === color }"
                  @mousedown.prevent="activeColor = color; insertColor(color); colorOpen = false"
                ></button>
              </div>
              <label class="format-color__custom" title="自定义颜色">
                <input type="color" v-model="activeColor" @input="insertColor($event.target.value)" />
                <span>{{ activeColor.toUpperCase() }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 头部区域 -->
        <div class="md-header">
          <textarea
            v-model="headerText"
            @input="onInput"
            @focus="onFocus"
            placeholder="# 你的姓名&#10;目标职位&#10;手机 | 邮箱 | 城市"
            rows="3"
          ></textarea>
        </div>

        <div class="md-divider"></div>

        <!-- 各模块 -->
        <div
          v-for="(section, si) in sections"
          :key="section.id"
          class="md-section"
          :class="{
            'md-section--drop-target': dropTarget.secIdx === si && dragState.type === 'section',
            'md-section--dragging': dragState.secIdx === si && dragState.type === 'section',
          }"
          @dragover="onSecDragOver($event, si)"
          @drop="onSecDrop($event, si)"
          @dragend="onDragEnd"
        >
          <div class="md-section__bar">
            <div
              class="md-section__handle"
              title="拖拽排序模块"
              draggable="true"
              @dragstart="onSecDragStart($event, si)"
              @dragend="onDragEnd"
            >
              <GripVertical :size="16" />
            </div>
            <input
              :value="section.heading.replace(/^##\s*/, '')"
              @input="section.heading = '## ' + $event.target.value"
              class="md-section__heading-input"
              placeholder="模块名称"
            />
            <button class="icon-btn icon-btn--danger" title="删除模块" @click="removeSection(si)">
              <Trash2 :size="14" />
            </button>
          </div>

          <div class="md-section__items">
            <div
              v-for="(item, ii) in section.items"
              :key="item.id"
              class="md-item"
              :class="{
                'md-item--drop-target': dropTarget.secIdx === si && dropTarget.itemIdx === ii && dragState.type === 'item',
                'md-item--dragging': dragState.secIdx === si && dragState.itemIdx === ii && dragState.type === 'item',
              }"
              @dragover="onItemDragOver($event, si, ii)"
              @drop="onItemDrop($event, si, ii)"
              @dragend="onDragEnd"
            >
              <div
                class="md-item__handle"
                title="拖拽排序条目"
                draggable="true"
                @dragstart="onItemDragStart($event, si, ii)"
                @dragend="onDragEnd"
              >
                <GripVertical :size="12" />
              </div>
              <textarea
                v-model="item.content"
                @input="onInput"
                @focus="onFocus"
                rows="1"
                placeholder="输入内容..."
              ></textarea>
              <button class="icon-btn icon-btn--small" title="删除条目" @click="removeItem(si, ii)">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>

          <button class="btn btn--soft btn--small" @click="addItem(si)">
            <Plus :size="14" />
            <span>添加条目</span>
          </button>
        </div>

        <button class="btn btn--ghost btn--add-section" @click="addSection()">
          <Plus :size="15" />
          <span>添加模块</span>
        </button>
      </div>

      <!-- 右侧：实时预览 -->
      <div class="preview-pane card">
        <div class="preview-pane__label">实时预览</div>
        <div ref="previewRef" class="resume-paper" v-html="renderedHtml"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./components/resume/ResumeBuilder.scss"></style>
