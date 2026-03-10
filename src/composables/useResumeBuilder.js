import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import { aiClient } from '../services/aiClient'

/* ── ID generator ──────────────────────────────────── */
let _id = 0
const genId = () => `sid-${++_id}-${Math.random().toString(36).slice(2, 6)}`

/* ── Demo Markdown ─────────────────────────────────── */
const DEMO_MD = `# 陈一诺
前端开发工程师
138-0000-8899 | chenyinuo@example.com | 上海

## 职业摘要
3 年前端经验，专注 Vue 生态与复杂交互系统。擅长把业务需求转化为高可用、可扩展的组件化方案，曾主导后台系统重构，页面性能提升 42%，研发效率提升约 30%。

## 工作经历

### 前端开发工程师 | 星辰科技
2022.03 - 至今 上海
- 主导营销中台前端重构，搭建统一组件库并落地 40+ 页面，交付周期缩短 35%
- 优化首屏渲染策略与资源加载链路，LCP 从 3.1s 降到 1.8s
- 与后端协作制定接口契约和错误码规范，线上接口类问题下降约 50%

### 前端实习生 | 月光网络
2021.06 - 2022.02 杭州
- 参与电商后台管理系统开发，独立完成订单管理模块
- 使用 Vue 2 + Element UI 实现 20+ 页面，通过组件封装减少重复代码 40%

## 项目经历

### 数据运营可视化平台
核心前端 | 面向运营和管理层的实时数据看板系统
- 设计可配置图表模块，支持拖拽布局与模板保存
- 实现权限隔离与多角色视图，覆盖 5 类业务角色

### 企业内部知识库系统
前端负责人 | 支持 Markdown 编辑、全文检索的知识管理平台
- 基于 Prosemirror 搭建富文本编辑器，支持实时协作
- 集成 Elasticsearch 实现毫秒级全文搜索

## 教育背景
- 华东理工大学 | 本科 软件工程 (2018-2022) GPA: 3.7/4.0

## 技能
- 核心能力：组件化设计 / 性能优化 / 工程化建设 / 跨团队协作
- 工具栈：Vue 3 / Vite / Pinia / ECharts / Node.js
- 语言：JavaScript / TypeScript / HTML/CSS

## 证书荣誉
- PMP - PMI 2024
- CET-6 优秀`

/* ── Markdown → Sections 解析 ──────────────────────── */

function parseSectionItems(lines) {
  const hasH3 = lines.some(l => l.startsWith('### '))
  if (hasH3) {
    const items = []
    let buf = []
    for (const line of lines) {
      if (line.startsWith('### ')) {
        const content = buf.join('\n').trim()
        if (content) items.push({ id: genId(), content })
        buf = [line]
      } else {
        buf.push(line)
      }
    }
    const tail = buf.join('\n').trim()
    if (tail) items.push({ id: genId(), content: tail })
    return items
  }

  const listLines = lines.filter(l => l.trimStart().startsWith('- '))
  if (listLines.length > 1) {
    const items = []
    let buf = []
    for (const line of lines) {
      if (line.trimStart().startsWith('- ')) {
        const content = buf.join('\n').trim()
        if (content) items.push({ id: genId(), content })
        buf = [line]
      } else {
        buf.push(line)
      }
    }
    const tail = buf.join('\n').trim()
    if (tail) items.push({ id: genId(), content: tail })
    return items
  }

  const content = lines.join('\n').trim()
  return [{ id: genId(), content }]
}

function parseMarkdownToDoc(mdText) {
  const lines = (mdText || '').split('\n')
  const headerLines = []
  const sections = []
  let cur = null
  let buf = []
  let firstH1Consumed = false

  const flush = () => {
    if (cur) {
      cur.items = parseSectionItems(buf)
      sections.push(cur)
    }
    buf = []
  }

  for (const line of lines) {
    if (!firstH1Consumed && line.startsWith('# ')) {
      headerLines.push(line)
      firstH1Consumed = true
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      cur = { id: genId(), heading: line, items: [] }
    } else if (cur) {
      buf.push(line)
    } else {
      headerLines.push(line)
    }
  }
  flush()

  return { header: headerLines.join('\n').trim(), sections }
}

/* ── Raw text → Markdown 格式化（用于 PDF/WORD 导入） ── */

function normalizeLines(rawText) {
  return String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
}

function cleanMarkdownInline(text) {
  return (text || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function normalizeHeading(line) {
  return cleanMarkdownInline(line)
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s+\[[ xX]\]\s*/, '')
    .replace(/[：:]$/, '')
    .trim()
}

function matchSectionHeading(line) {
  const heading = normalizeHeading(line).toLowerCase()
  const map = [
    { re: /^(个人信息|基本信息|联系方式|contact|about)$/i, h: '## 基本信息' },
    { re: /^(职业摘要|个人简介|简介|summary|profile|about me)$/i, h: '## 职业摘要' },
    { re: /^(工作经历|实习经历|工作经验|经历|experience|work experience|employment)$/i, h: '## 工作经历' },
    { re: /^(项目经历|项目经验|projects?|project experience)$/i, h: '## 项目经历' },
    { re: /^(教育背景|教育经历|education|academic)$/i, h: '## 教育背景' },
    { re: /^(技能|技能关键词|skills?|tech stack|能力)$/i, h: '## 技能' },
    { re: /^(证书|荣誉|获奖|certifications?|awards?)$/i, h: '## 证书荣誉' },
  ]
  return map.find(item => item.re.test(heading))
}

function formatRawResumeText(rawText) {
  const lines = normalizeLines(rawText)
  const result = []
  let inCode = false

  for (const line of lines) {
    const raw = cleanMarkdownInline(line)
    if (/^```/.test(raw)) { inCode = !inCode; continue }
    if (inCode) continue
    if (!raw || /^---+$/.test(raw)) {
      if (result[result.length - 1] !== '') result.push('')
      continue
    }
    if (/^\|.*\|$/.test(raw)) {
      const cells = raw.split('|').map(s => s.trim()).filter(Boolean)
      if (cells.length > 1 && !cells.every(c => /^-+$/.test(c.replace(/:/g, '')))) {
        result.push(`- ${cells.join(' | ')}`)
      }
      continue
    }
    const pair = raw.match(/^([^:：]{1,20})[:：]\s*(.+)$/)
    if (pair) {
      const sec = matchSectionHeading(pair[1])
      if (sec) {
        result.push(sec.h)
        if (pair[2].trim()) result.push(pair[2].trim())
        continue
      }
    }
    const sec = matchSectionHeading(raw)
    if (sec) { result.push(sec.h); continue }
    if (/^\d+[.)、]\s*/.test(raw)) { result.push(`- ${raw.replace(/^\d+[.)、]\s*/, '')}`); continue }
    if (/^[•·\-*]\s*/.test(raw)) { result.push(`- ${raw.replace(/^[•·\-*]\s*/, '')}`); continue }
    result.push(raw)
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/* ── 文件内容提取 ─────────────────────────────────── */

async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.worker.min.mjs'
  }
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(it => it.str).join(' '))
  }
  return pages.join('\n')
}

async function extractWordText(file) {
  const mod = await import('mammoth')
  const mammoth = mod.default || mod
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

/* ── Composable ────────────────────────────────────── */

const STORAGE_KEY = 'resume-builder-cache-v1'

export function useResumeBuilder() {
  const headerText = ref('')
  const sections = ref([])
  const importLoading = ref(false)
  const importError = ref('')

  /* 从结构重建 Markdown */
  const markdown = computed(() => {
    let md = headerText.value
    for (const sec of sections.value) {
      md += '\n\n' + sec.heading + '\n'
      md += sec.items.map(i => i.content).join('\n\n')
    }
    return md.trim()
  })

  /* 渲染 HTML（用于 PDF 导出） */
  const renderedHtml = computed(() => marked.parse(markdown.value))

  /* 完整度评分 */
  const completeness = computed(() => {
    const md = markdown.value
    let score = 0
    const sug = []

    if (/^# .+/m.test(md)) score += 10; else sug.push('补充姓名（# 开头）')
    if (/\S+@\S+\.\S+/.test(md)) score += 6; else sug.push('补充邮箱')
    if (/1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/.test(md)) score += 6; else sug.push('补充手机号')

    const summaryM = md.match(/## 职业摘要\n([\s\S]*?)(?=\n## |$)/)
    if (summaryM?.[1]?.trim().length > 40) score += 10; else sug.push('补充 60~120 字职业摘要')

    const expM = md.match(/## 工作经历\n([\s\S]*?)(?=\n## |$)/)
    if (expM?.[1]?.trim().length > 30) {
      score += 18
      const bullets = expM[1].match(/^- .+/gm) || []
      const nums = bullets.filter(b => /\d+([.,]\d+)?(%|x|倍|万|千|ms|s)/.test(b))
      if (nums.length >= 2) score += 12; else sug.push('经历描述中加入数字成果（如"效率提升 30%"）')
      const verbs = /(主导|搭建|优化|提升|降低|负责|完成|推动|设计|实现|led|built|delivered)/i
      if (bullets.filter(b => verbs.test(b)).length >= 2) score += 8; else sug.push('使用动作动词开头（主导/优化/搭建等）')
    } else {
      sug.push('添加工作经历')
    }

    if (/## 项目经历/.test(md)) score += 6
    if (/## 教育背景/.test(md)) score += 6; else sug.push('添加教育背景')

    const skillM = md.match(/## 技能\n([\s\S]*?)(?=\n## |$)/)
    if (skillM?.[1]?.trim().length > 20) score += 10; else sug.push('添加技能关键词')

    if (/## 证书/.test(md)) score += 4

    return { score: Math.min(score, 100), suggestions: sug }
  })

  /* 加载 Markdown → 结构 */
  const loadFromMarkdown = (mdText) => {
    const doc = parseMarkdownToDoc(mdText)
    headerText.value = doc.header
    sections.value = doc.sections
  }

  const fillDemo = () => loadFromMarkdown(DEMO_MD)
  const resetResume = () => { headerText.value = ''; sections.value = [] }

  /* 本地缓存恢复 */
  const restoreCache = () => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (typeof data?.headerText === 'string') headerText.value = data.headerText
      if (Array.isArray(data?.sections)) sections.value = data.sections
    } catch (e) {
      console.warn('Resume cache restore failed', e)
    }
  }

  restoreCache()

  /* 本地缓存保存（轻量节流） */
  let cacheTimer = null
  watch([headerText, sections], () => {
    if (typeof window === 'undefined') return
    clearTimeout(cacheTimer)
    cacheTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          headerText: headerText.value,
          sections: sections.value,
        }))
      } catch (e) {
        console.warn('Resume cache save failed', e)
      }
    }, 300)
  }, { deep: true })

  /* 模块操作 */
  const moveSection = (from, to) => {
    const arr = [...sections.value]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    sections.value = arr
  }

  const addSection = (heading = '## 新模块') => {
    sections.value.push({ id: genId(), heading, items: [{ id: genId(), content: '' }] })
  }

  const removeSection = (idx) => sections.value.splice(idx, 1)

  /* 条目操作 */
  const moveItem = (secIdx, from, to) => {
    const items = [...sections.value[secIdx].items]
    const [moved] = items.splice(from, 1)
    items.splice(to, 0, moved)
    sections.value[secIdx].items = items
  }

  const addItem = (secIdx) => {
    sections.value[secIdx].items.push({ id: genId(), content: '' })
  }

  const removeItem = (secIdx, itemIdx) => {
    sections.value[secIdx].items.splice(itemIdx, 1)
    if (!sections.value[secIdx].items.length) {
      sections.value[secIdx].items.push({ id: genId(), content: '' })
    }
  }

  /* 导入文件 */
  const importFile = async (file) => {
    if (!file) return
    importLoading.value = true
    importError.value = ''
    try {
      const name = file.name.toLowerCase()
      let text = ''
      if (name.endsWith('.pdf')) {
        text = await extractPdfText(file)
      } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
        text = await extractWordText(file)
      } else {
        throw new Error('仅支持 PDF 和 WORD (.docx) 格式')
      }
      if (!text.trim()) throw new Error('未能从文件中提取到文本内容')
      const formatted = formatRawResumeText(text)
      loadFromMarkdown(formatted)
    } catch (e) {
      importError.value = '导入失败：' + (e.message || '未知错误')
    } finally {
      importLoading.value = false
    }
  }

  /* 导出 Markdown 文件 */
  const exportMarkdownFile = () => {
    const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* AI 格式化简历文本 */
  const aiFormatLoading = ref(false)
  const aiFormatError = ref('')

  const aiFormatResume = async (rawText) => {
    if (!rawText?.trim()) return ''
    aiFormatLoading.value = true
    aiFormatError.value = ''
    try {
      const data = await aiClient.chat.complete({
        messages: [
          {
            role: 'system',
            content: `你是一个专业的简历排版助手。用户会粘贴一段简历原文（可能格式混乱、缺少结构），请你仅进行格式排版，不得改动任何原文内容（不得增删改字）。

要求：
1. 第一行用 # 标注姓名
2. 姓名下方紧跟职位、联系方式（手机 | 邮箱 | 城市）
3. 使用 ## 划分模块：职业摘要、工作经历、项目经历、教育背景、技能、证书荣誉（根据内容取舍）
4. 工作经历和项目经历中用 ### 标注职位/项目名
5. 具体描述用 - 列表项，尽量保留原文数据和成果
6. 禁止改写、润色、同义替换或纠错，禁止添加或删除任何文字
7. 只做格式整理和合理归类
8. 直接输出 Markdown，不要加代码块标记，不要加任何解释说明`
          },
          { role: 'user', content: rawText.trim() }
        ],
        temperature: 0.3,
        max_tokens: 4096,
      })
      const md = (data.choices?.[0]?.message?.content || '').trim()
      if (!md) throw new Error('AI 未返回有效内容')
      return md
    } catch (e) {
      aiFormatError.value = 'AI 格式化失败：' + (e.message || '未知错误')
      return ''
    } finally {
      aiFormatLoading.value = false
    }
  }

  /* AI 评审简历质量 */
  const aiReviewLoading = ref(false)
  const aiReviewError = ref('')
  const aiReviewResult = ref(null)

  const parseAiReview = (text) => {
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(text.slice(start, end + 1))
        } catch {
          return null
        }
      }
      return null
    }
  }

  const aiReviewResume = async (mdText) => {
    if (!mdText?.trim()) {
      aiReviewError.value = '请先填写简历内容后再评审'
      aiReviewResult.value = null
      return null
    }
    aiReviewLoading.value = true
    aiReviewError.value = ''
    try {
      const data = await aiClient.chat.complete({
        messages: [
          {
            role: 'system',
            content: `你是专业简历评审官。根据用户提供的 Markdown 简历，输出严格 JSON：
{
  "score": 0-100 的整数,
  "summary": 1-2 句总体评价,
  "suggestions": [
    {"text": "具体可执行的建议", "importance": 1-5 的整数}
  ]
}

要求：
1. 如果简历质量一般或较差，suggestions 给出 4-8 条具体改进建议
2. 如果质量较好，suggestions 可以为空数组，但 summary 需说明亮点
3. importance 5 表示最重要
4. 只输出 JSON，不要额外文字、不需要 Markdown 代码块`
          },
          { role: 'user', content: mdText.trim() }
        ],
        temperature: 0.2,
        max_tokens: 1200,
      })
      const raw = (data.choices?.[0]?.message?.content || '').trim()
      const parsed = parseAiReview(raw)
      if (!parsed) throw new Error('AI 返回内容无法解析为JSON')
      const score = Number(parsed.score)
      const normalizedSuggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
          .map(item => {
            if (typeof item === 'string') {
              return { text: item, importance: 3 }
            }
            const text = String(item?.text || '').trim()
            const importance = Number(item?.importance)
            if (!text) return null
            const level = Number.isFinite(importance) ? Math.max(1, Math.min(5, Math.round(importance))) : 3
            return { text, importance: level }
          })
          .filter(Boolean)
        : []
      aiReviewResult.value = {
        score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
        summary: String(parsed.summary || '').trim() || '暂无总结',
        suggestions: normalizedSuggestions,
      }
      return aiReviewResult.value
    } catch (e) {
      aiReviewError.value = 'AI 评审失败：' + (e.message || '未知错误')
      aiReviewResult.value = null
      return null
    } finally {
      aiReviewLoading.value = false
    }
  }

  return {
    headerText, sections, markdown, renderedHtml, completeness,
    importLoading, importError,
    aiFormatLoading, aiFormatError,
    aiReviewLoading, aiReviewError, aiReviewResult,
    fillDemo, resetResume, loadFromMarkdown,
    moveSection, addSection, removeSection,
    moveItem, addItem, removeItem,
    importFile, exportMarkdownFile, formatRawResumeText,
    aiFormatResume,
    aiReviewResume,
  }
}
