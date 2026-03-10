<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import html2pdf from 'html2pdf.js'
import {
  ScrollText, Download, Zap, RefreshCw,
  GripVertical, Plus, Trash2, Upload, Copy, Check, LoaderCircle,
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, ListChecks,
  Link, Quote, Code, Minus,
  Superscript, Subscript,
  Table, Image, SquareCode, Palette,
  ClipboardPaste, ChevronDown, Sparkles,
} from 'lucide-vue-next'
import { useResumeBuilder } from '../composables/useResumeBuilder'

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
} = useResumeBuilder()

const previewRef = ref(null)
const copied = ref(false)
const rawPasteText = ref('')
const pasteCollapsed = ref(false)
const dragState = ref({ type: '', secIdx: -1, itemIdx: -1 })
const dropTarget = ref({ secIdx: -1, itemIdx: -1 })
const lastFocusedTextarea = ref(null)
const colorOptions = ['#16c58e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#0ea5e9', '#111827']
const activeColor = ref('#f59e0b')
const colorOpen = ref(false)

onMounted(() => {
  nextTick(resizeAllTextareas)
})

watch([headerText, sections], () => nextTick(resizeAllTextareas), { deep: true })

/* ── Textarea 自动高度 ───────────────── */
function resizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function resizeAllTextareas() {
  document.querySelectorAll('.md-editor textarea').forEach(resizeTextarea)
}

function onInput(e) {
  resizeTextarea(e.target)
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

function insertFormat(prefix, suffix = '') {
  const ta = getActiveTextarea()
  if (!ta) return
  lastFocusedTextarea.value = ta
  ta.focus()
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = ta.value
  const selected = text.slice(start, end)
  const replacement = prefix + (selected || '文本') + (suffix || prefix)
  const newVal = text.slice(0, start) + replacement + text.slice(end)

  // 触发 Vue 的 v-model 更新
  const nativeInputEvent = new Event('input', { bubbles: true })
  ta.value = newVal
  ta.dispatchEvent(nativeInputEvent)

  nextTick(() => {
    const cursorPos = start + prefix.length + (selected || '文本').length + (suffix || prefix).length
    ta.setSelectionRange(cursorPos, cursorPos)
    ta.focus()
    resizeTextarea(ta)
  })
}

function insertLinePrefix(prefix) {
  const ta = getActiveTextarea()
  if (!ta) return
  lastFocusedTextarea.value = ta
  ta.focus()
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

  const nativeInputEvent = new Event('input', { bubbles: true })
  ta.value = newVal
  ta.dispatchEvent(nativeInputEvent)

  nextTick(() => {
    const added = applyToLines.length - selectedBlock.length
    ta.setSelectionRange(start, end + Math.max(0, added))
    ta.focus()
    resizeTextarea(ta)
  })
}

function insertBlock(block) {
  const ta = getActiveTextarea()
  if (!ta) return
  lastFocusedTextarea.value = ta
  ta.focus()
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = ta.value
  const newVal = text.slice(0, start) + block + text.slice(end)

  const nativeInputEvent = new Event('input', { bubbles: true })
  ta.value = newVal
  ta.dispatchEvent(nativeInputEvent)

  nextTick(() => {
    const cursorPos = start + block.length
    ta.setSelectionRange(cursorPos, cursorPos)
    ta.focus()
    resizeTextarea(ta)
  })
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
    <header class="hero">
      <div class="hero__left">
        <div class="hero__badge">
          <ScrollText :size="14" />
          <span>AI 简历工坊</span>
        </div>
        <h1 class="hero__title">写出更能拿到面试的简历</h1>
        <p class="hero__desc">Markdown 直接编辑、模块拖拽排序、PDF/WORD 导入、实时预览。</p>
      </div>
      <div class="hero__score">
        <button class="btn btn--ghost btn--small hero__review-btn" @click="handleAiReview" :disabled="aiReviewLoading">
          <component :is="aiReviewLoading ? LoaderCircle : Sparkles" :size="14" :class="{ spinning: aiReviewLoading }" />
          <span>{{ aiReviewLoading ? '评审中...' : 'AI 评审' }}</span>
        </button>
      </div>
    </header>

    <section v-if="aiReviewError || aiReviewResult" class="review card">
      <div class="review__title">AI 评审结果</div>
      <p v-if="aiReviewError" class="review__error">{{ aiReviewError }}</p>
      <div v-else class="review__body">
        <div class="review__summary">
          <span class="review__badge">评分 {{ aiReviewResult.score }}</span>
          <span class="review__text">{{ aiReviewResult.summary }}</span>
        </div>
        <ul v-if="aiReviewResult.suggestions?.length" class="review__list">
          <li v-for="(item, idx) in aiReviewResult.suggestions" :key="idx" class="review__item">
            <span class="review__item-text">{{ item.text }}</span>
            <span class="review__stars" :aria-label="`重要程度 ${item.importance} 星`">
              <span v-for="n in 5" :key="n" class="review__star" :class="{ 'review__star--on': n <= item.importance }">★</span>
            </span>
          </li>
        </ul>
        <p v-else class="review__hint">整体质量不错，建议保持当前结构与量化成果表达。</p>
      </div>
    </section>

    <!-- Toolbar -->
    <section class="toolbar">
      <div class="toolbar__left">
        <button class="btn btn--accent" @click="fillDemo">
          <Zap :size="16" />
          <span>填充示例</span>
        </button>
        <button class="btn btn--ghost" @click="resetResume">
          <RefreshCw :size="16" />
          <span>清空重置</span>
        </button>
      </div>
      <div class="toolbar__right">
        <label class="btn btn--ghost btn--file" :class="{ 'btn--loading': importLoading }">
          <input type="file" accept=".pdf,.doc,.docx" @change="handleImport" :disabled="importLoading" />
          <component :is="importLoading ? LoaderCircle : Upload" :size="16" :class="{ spinning: importLoading }" />
          <span>{{ importLoading ? '导入中...' : '导入 PDF/WORD' }}</span>
        </label>
        <button class="btn btn--ghost" @click="exportMarkdownFile">导出 MD</button>
        <button class="btn btn--ghost" @click="copyMarkdown">
          <component :is="copied ? Check : Copy" :size="14" />
          <span>{{ copied ? '已复制' : '复制 MD' }}</span>
        </button>
        <button class="btn btn--primary" @click="exportPdf">
          <Download :size="16" />
          <span>导出 PDF</span>
        </button>
      </div>
    </section>

    <p v-if="importError" class="import-error">{{ importError }}</p>

    <!-- 粘贴文字导入 -->
    <section class="paste-section card">
      <button class="paste-section__toggle" @click="pasteCollapsed = !pasteCollapsed">
        <ClipboardPaste :size="15" />
        <span>粘贴文字导入</span>
        <ChevronDown :size="15" class="paste-section__arrow" :class="{ 'paste-section__arrow--open': !pasteCollapsed }" />
      </button>
      <div v-show="!pasteCollapsed" class="paste-section__body">
        <p class="paste-section__hint">粘贴简历内容，支持由 AI 智能格式化后导入</p>
        <textarea
          v-model="rawPasteText"
          class="paste-section__textarea"
          rows="8"
          placeholder="在此粘贴简历内容（纯文本或 Markdown 均可）..."
        ></textarea>
        <p v-if="aiFormatError" class="paste-section__error">{{ aiFormatError }}</p>
        <div class="paste-section__actions">
          <button class="btn btn--primary btn--small" @click="handleAiFormatImport" :disabled="!rawPasteText.trim() || aiFormatLoading">
            <component :is="aiFormatLoading ? LoaderCircle : Sparkles" :size="14" :class="{ spinning: aiFormatLoading }" />
            <span>{{ aiFormatLoading ? '格式化中...' : '格式化导入' }}</span>
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

<style scoped>
.resume-builder {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 28px 88px;
  --line: rgba(255, 255, 255, 0.08);
  --c1: #13c38b;
  --c2: #e4a12f;
}

/* ── Hero ──────────────────────────────── */
.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(19, 195, 139, 0.35);
  border-radius: 999px;
  background: rgba(19, 195, 139, 0.12);
  color: #57ddb3;
  font-size: 0.8125rem;
  margin-bottom: 10px;
}

.hero__title {
  font-size: 2.3rem;
  line-height: 1.15;
  color: var(--text-primary);
  margin: 0;
}

.hero__desc {
  margin: 10px 0 0;
  color: var(--text-secondary);
}

.hero__score {
  padding: 16px 22px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  min-width: 150px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.hero__score-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.hero__score-value {
  font-size: 2.1rem;
  line-height: 1;
  display: block;
  color: var(--text-primary);
}

.hero__review-btn {
  margin-top: 6px;
}

/* ── Toolbar ───────────────────────────── */
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.toolbar__left,
.toolbar__right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.import-error {
  margin: -10px 0 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 0.84rem;
}

/* ── Card ──────────────────────────────── */
.card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--line);
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

/* ── AI 评审 ─────────────────────────── */
.review {
  margin: 0 0 16px;
  padding: 14px 16px;
}

.review__title {
  font-size: 0.82rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.review__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.review__badge {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(19, 195, 139, 0.14);
  border: 1px solid rgba(19, 195, 139, 0.3);
  color: #57ddb3;
  font-size: 0.75rem;
}

.review__text {
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.review__list {
  margin: 6px 0 0 18px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.7;
}

.review__item {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.review__item-text {
  flex: 1;
}

.review__stars {
  display: inline-flex;
  gap: 2px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.2);
}

.review__star--on {
  color: #f6c453;
  text-shadow: 0 0 6px rgba(246, 196, 83, 0.35);
}

.review__hint {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.review__error {
  margin: 0;
  color: #f87171;
  font-size: 0.82rem;
}

/* ── Panel 双栏布局 ────────────────────── */
.panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

/* ── 格式化工具栏 ─────────────────────── */
.format-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 14px;
  flex-wrap: wrap;
  position: sticky;
  top: 96px;
  z-index: 3;
  background: rgba(16, 18, 26, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 12px;
}

.format-bar__sep {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.format-btn {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  gap: 6px;
  white-space: nowrap;
}

.format-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.format-btn:active {
  background: rgba(19, 195, 139, 0.18);
  color: #57ddb3;
}

.format-btn__label {
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}

.format-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
  padding: 4px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.format-color__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.74rem;
  background: transparent;
  border: none;
  cursor: pointer;
}

.format-color__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.format-color__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 5;
  padding: 10px;
  border-radius: 12px;
  background: rgba(14, 16, 24, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-color__swatches {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.format-color__swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid transparent;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4) inset;
}

.format-color__swatch--active {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.7);
}

.format-color__custom {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.74rem;
}

.format-color__custom input {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

/* ── MD Editor ─────────────────────────── */
.md-editor {
  padding: 16px;
  max-height: none;
  overflow: visible;
}

.md-header textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.98rem;
  font-family: 'Noto Sans SC', 'Segoe UI', sans-serif;
  padding: 12px 14px;
  resize: none;
  line-height: 1.7;
  overflow: hidden;
}

.md-header textarea:focus {
  outline: none;
  border-color: rgba(19, 195, 139, 0.45);
  box-shadow: 0 0 0 3px rgba(19, 195, 139, 0.1);
}

.md-divider {
  height: 1px;
  background: var(--line);
  margin: 14px 0;
}

/* ── Section ───────────────────────────── */
.md-section {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 10px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.015);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.md-section--drop-target {
  border-color: rgba(19, 195, 139, 0.5);
  box-shadow: 0 0 0 3px rgba(19, 195, 139, 0.12);
}

.md-section--dragging {
  opacity: 0.5;
}

.md-section__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.md-section__handle {
  cursor: grab;
  color: var(--text-muted);
  opacity: 0.4;
  transition: opacity 0.2s;
  flex-shrink: 0;
  padding: 4px 0;
}

.md-section:hover .md-section__handle {
  opacity: 0.8;
}

.md-section__handle:active {
  cursor: grabbing;
}

.md-section__heading-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 4px 0;
}

.md-section__heading-input:focus {
  outline: none;
  border-bottom: 1px solid rgba(19, 195, 139, 0.4);
}

.md-section__heading-input::placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

/* ── Item ──────────────────────────────── */
.md-section__items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.md-item {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 3px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: border-color 0.2s, background 0.2s;
}

.md-item--drop-target {
  border-color: rgba(228, 161, 47, 0.5);
  background: rgba(228, 161, 47, 0.06);
}

.md-item--dragging {
  opacity: 0.5;
}

.md-item__handle {
  cursor: grab;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
  padding: 6px 0;
}

.md-item:hover .md-item__handle {
  opacity: 0.6;
}

.md-item__handle:active {
  cursor: grabbing;
}

.md-item textarea {
  flex: 1;
  width: 100%;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.86rem;
  font-family: 'Noto Sans SC', 'Segoe UI', sans-serif;
  padding: 8px 10px;
  resize: none;
  line-height: 1.65;
  overflow: hidden;
}

.md-item textarea:focus {
  outline: none;
  border-color: rgba(19, 195, 139, 0.35);
  box-shadow: 0 0 0 2px rgba(19, 195, 139, 0.08);
}

.md-item textarea::placeholder {
  color: var(--text-muted);
}

/* ── Preview Pane ─────────────────────── */
.preview-pane {
  padding: 16px;
  position: sticky;
  top: 16px;
  max-height: none;
  overflow: visible;
}

.preview-pane__label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.resume-paper {
  background: #fffdf7;
  color: #131722;
  border-radius: 10px;
  padding: 28px 24px;
  min-height: 500px;
  box-shadow: 0 25px 50px -28px rgba(0, 0, 0, 0.8);
  font-family: 'Noto Sans SC', 'Segoe UI', sans-serif;
  font-size: 13px;
  line-height: 1.7;
  border-top: 6px solid #13141a;
}

.resume-paper :deep(h1) {
  font-size: 1.7rem;
  margin: 0 0 4px;
  color: #111;
  line-height: 1.2;
}

.resume-paper :deep(h2) {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  border-bottom: 1.5px solid #d8dbe2;
  padding-bottom: 4px;
  margin: 18px 0 8px;
  color: #222;
}

.resume-paper :deep(h3) {
  font-size: 0.88rem;
  margin: 12px 0 2px;
  color: #1a1f2e;
}

.resume-paper :deep(p) {
  margin: 3px 0;
  color: #333;
  font-size: 0.84rem;
}

.resume-paper :deep(ul) {
  padding-left: 18px;
  margin: 4px 0;
}

.resume-paper :deep(li) {
  margin: 2px 0;
  color: #333;
  font-size: 0.84rem;
  line-height: 1.6;
}

.resume-paper :deep(strong) {
  color: #111;
}

.resume-paper :deep(em) {
  color: #444;
}

.resume-paper :deep(del) {
  color: #999;
}

.resume-paper :deep(code) {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.82rem;
  color: #d63384;
}

.resume-paper :deep(blockquote) {
  border-left: 3px solid #d8dbe2;
  padding-left: 12px;
  margin: 8px 0;
  color: #666;
}

.resume-paper :deep(hr) {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 12px 0;
}

.resume-paper :deep(a) {
  color: #0969da;
  text-decoration: none;
}

/* PDF 导出时覆盖 */
.resume-paper.pdf-preview--exporting {
  box-shadow: none;
  border-radius: 0;
  border-top: none;
}

/* ── 粘贴文字导入 ─────────────────────── */
.paste-section {
  margin-bottom: 16px;
  padding: 0;
  overflow: hidden;
}

.paste-section__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.86rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.paste-section__toggle:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}

.paste-section__arrow {
  margin-left: auto;
  transition: transform 0.25s;
}

.paste-section__arrow--open {
  transform: rotate(180deg);
}

.paste-section__body {
  padding: 0 16px 16px;
}

.paste-section__hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0 0 10px;
}

.paste-section__textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: 'Menlo', 'Consolas', 'Monaco', monospace;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.65;
}

.paste-section__textarea:focus {
  outline: none;
  border-color: rgba(19, 195, 139, 0.4);
  box-shadow: 0 0 0 3px rgba(19, 195, 139, 0.1);
}

.paste-section__actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  justify-content: flex-end;
}

.paste-section__error {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  font-size: 0.78rem;
}

/* ── Buttons ───────────────────────────── */
.btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 9px 12px;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.84rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--primary {
  background: linear-gradient(120deg, #16c58e, #e3a23c);
  color: #0e1b17;
  border: none;
  font-weight: 700;
}

.btn--accent {
  background: linear-gradient(120deg, rgba(19, 195, 139, 0.22), rgba(228, 161, 47, 0.18));
  border-color: rgba(19, 195, 139, 0.45);
  color: #9ff0d1;
  font-weight: 600;
}

.btn--accent:hover {
  background: linear-gradient(120deg, rgba(19, 195, 139, 0.32), rgba(228, 161, 47, 0.28));
}

.btn--primary:hover {
  filter: brightness(1.08);
}

.btn--soft {
  background: rgba(19, 195, 139, 0.1);
  border-color: rgba(19, 195, 139, 0.2);
  font-size: 0.8rem;
}

.btn--small {
  padding: 6px 10px;
  font-size: 0.78rem;
}

.btn--file input {
  display: none;
}

.btn--file {
  cursor: pointer;
}

.btn--loading {
  opacity: 0.7;
  pointer-events: none;
}

.btn--add-section {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
  border-style: dashed;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s, color 0.15s;
}

.md-section:hover > .md-section__bar > .icon-btn,
.md-item:hover > .icon-btn {
  opacity: 0.6;
}

.icon-btn:hover {
  opacity: 1 !important;
}

.icon-btn--danger:hover {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.4);
}

.icon-btn--small {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  margin-top: 6px;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── 响应式 ────────────────────────────── */
@media (max-width: 1100px) {
  .panel {
    grid-template-columns: 1fr;
  }

  .preview-pane {
    position: static;
    max-height: none;
  }
}

@media (max-width: 760px) {
  .resume-builder {
    padding: 16px 14px 70px;
  }

  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero__title {
    font-size: 1.8rem;
  }

  .toolbar {
    flex-direction: column;
  }

  .md-editor {
    padding: 12px;
    max-height: none;
  }
}
</style>
