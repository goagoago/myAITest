import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import { aiClient } from '../services/aiClient'
import { normalizeModelError } from '../services/modelError'
import { requestBlob } from '../services/apiClient'
import { useAccountStore } from '../stores/accountStore'

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

function stripCodeFence(text) {
  const raw = String(text || '').trim()
  if (!raw.startsWith('```')) return raw
  return raw
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim()
}

function parseAiJson(text) {
  const raw = stripCodeFence(text)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function extractAiText(data) {
  if (!data) return ''
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }
  if (Array.isArray(data.output)) {
    const text = data.output
      .flatMap(item => item?.content || [])
      .filter(item => item?.type === 'output_text')
      .map(item => item?.text || '')
      .join('')
      .trim()
    if (text) return text
  }
  return String(data?.choices?.[0]?.message?.content || '').trim()
}

function clampScore(value, max = 100) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(max, Math.round(num)))
}

function extractContactSignals(text) {
  const raw = String(text || '')
  return {
    phone: /1\d{10}/.test(raw),
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw),
    city: /(北京|上海|深圳|广州|杭州|成都|南京|苏州|武汉|西安|天津|重庆|长沙|厦门|郑州|青岛|合肥|佛山|东莞|宁波|无锡)/.test(raw),
  }
}

function buildLocalReview(mdText) {
  const text = String(mdText || '').trim()
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const lower = text.toLowerCase()
  const sectionChecks = [
    { key: 'summary', label: '职业摘要', hit: /##\s*(职业摘要|个人简介|简介|summary|profile)/i.test(text) },
    { key: 'experience', label: '工作经历', hit: /##\s*(工作经历|工作经验|实习经历|experience|employment)/i.test(text) },
    { key: 'project', label: '项目经历', hit: /##\s*(项目经历|项目经验|projects?)/i.test(text) },
    { key: 'education', label: '教育背景', hit: /##\s*(教育背景|教育经历|education)/i.test(text) },
    { key: 'skills', label: '技能', hit: /##\s*(技能|skills?|tech stack|能力)/i.test(text) },
  ]
  const presentSections = sectionChecks.filter(item => item.hit)
  const bulletCount = (text.match(/^\s*[-*]\s+/gm) || []).length
  const quantifiedBullets = (text.match(/^\s*[-*]\s+.*?(\d+%|\d+\+|\d+万|\d+千|\d+个|\d+次|\d+人|\d+天|\d+月|\d+年)/gm) || []).length
  const roleHeadings = (text.match(/^###\s+/gm) || []).length
  const actionVerbHits = (text.match(/(负责|主导|推动|搭建|设计|优化|提升|落地|完成|协同|实现|重构|增长|降低|提升)/g) || []).length
  const contact = extractContactSignals(lines.slice(0, 4).join(' '))
  const lineLengthAvg = lines.length
    ? Math.round(lines.reduce((sum, line) => sum + line.length, 0) / lines.length)
    : 0

  let score = 48
  score += presentSections.length * 6
  score += Math.min(12, bulletCount * 1.5)
  score += Math.min(14, quantifiedBullets * 3)
  score += Math.min(8, roleHeadings * 2)
  score += Math.min(6, Math.floor(actionVerbHits / 3))
  if (contact.phone) score += 2
  if (contact.email) score += 2
  if (contact.city) score += 1
  if (lineLengthAvg > 55) score -= 5
  if (bulletCount < 4) score -= 6
  if (!presentSections.some(item => item.key === 'experience')) score -= 10
  if (!presentSections.some(item => item.key === 'skills')) score -= 5
  score = clampScore(score)

  const dimensions = [
    {
      name: '结构完整度',
      score: clampScore(45 + presentSections.length * 10),
      comment: presentSections.length >= 4 ? '核心模块较齐全，适合继续做针对岗位的精修。' : '建议补齐摘要、经历、项目、教育、技能等核心模块。',
    },
    {
      name: '成果量化',
      score: clampScore(35 + quantifiedBullets * 14),
      comment: quantifiedBullets >= 3 ? '已有可感知的数据表达，能帮助面试官快速判断贡献。' : '量化结果偏少，建议补充效率、规模、成本、增长等数据。',
    },
    {
      name: '岗位匹配度',
      score: clampScore(38 + actionVerbHits * 4 + (/vue|react|产品|运营|java|python|销售|设计/i.test(lower) ? 12 : 0)),
      comment: /vue|react|typescript|产品|运营|数据|销售|设计|python|java/i.test(lower)
        ? '已出现岗位相关关键词，建议继续贴近目标 JD 做关键词覆盖。'
        : '岗位关键词露出不足，建议围绕目标岗位 JD 补充核心技能与业务场景。',
    },
    {
      name: 'ATS 可读性',
      score: clampScore(55 + roleHeadings * 8 + (contact.phone ? 6 : 0) + (contact.email ? 6 : 0) - (lineLengthAvg > 60 ? 6 : 0)),
      comment: lineLengthAvg <= 55 ? '排版相对清晰，机器解析和招聘方快速扫读都更友好。' : '单行内容偏长，建议拆成短句和要点，提升 ATS 与人工筛选效率。',
    },
  ]

  const highlights = []
  if (presentSections.length >= 4) highlights.push('核心模块覆盖较完整，基础框架已经具备投递条件。')
  if (quantifiedBullets >= 2) highlights.push('已使用量化结果描述成果，容易让招聘方快速理解价值。')
  if (roleHeadings >= 2) highlights.push('经历层级清晰，便于 HR 和面试官快速扫读重点。')

  const suggestions = []
  if (!contact.phone || !contact.email) {
    suggestions.push({
      text: '在顶部补齐手机号、邮箱等联系方式，确保招聘方能直接联系到你。',
      importance: 5,
      category: '基础信息',
      example: '姓名下方建议统一为：目标岗位 | 手机 | 邮箱 | 城市',
    })
  }
  if (!presentSections.some(item => item.key === 'summary')) {
    suggestions.push({
      text: '补充 2-4 句职业摘要，概括经验年限、核心方向、代表性成果和目标岗位。',
      importance: 5,
      category: '职业摘要',
      example: '3 年 B 端前端经验，主导后台系统重构，推动页面性能提升 42%，聚焦 Vue 3 与工程化建设。',
    })
  }
  if (quantifiedBullets < 3) {
    suggestions.push({
      text: '把“负责/参与”改成“动作 + 场景 + 结果”，优先补充效率、转化、成本、时长、覆盖规模等数据。',
      importance: 5,
      category: '成果表达',
      example: '优化首屏渲染链路，使 LCP 从 3.1s 降到 1.8s，页面跳出率下降 12%。',
    })
  }
  if (roleHeadings < 2 && presentSections.some(item => item.key === 'experience')) {
    suggestions.push({
      text: '工作经历和项目经历建议拆成独立条目，使用“职位/项目名 + 时间 + 要点”结构，避免堆成大段文字。',
      importance: 4,
      category: '结构表达',
      example: '### 前端开发工程师 | XX 科技\n2023.03 - 至今 上海\n- ...',
    })
  }
  if (!presentSections.some(item => item.key === 'skills')) {
    suggestions.push({
      text: '增加技能模块，按“核心能力 / 工具栈 / 语言”分组，方便招聘平台关键词检索。',
      importance: 4,
      category: '关键词覆盖',
      example: '- 工具栈：Vue 3 / TypeScript / Vite / Node.js',
    })
  }
  suggestions.push({
    text: '针对目标岗位 JD 做一版定制化改写，把岗位高频关键词自然放进摘要、经历和技能模块。',
    importance: 4,
    category: '岗位匹配',
    example: '若目标岗位强调“低代码平台、性能优化、协作推进”，请在对应经历中直接体现这些关键词。',
  })

  return {
    score,
    summary: score >= 80
      ? '整体已经具备较强投递基础，结构清晰且有一定成果感，建议继续围绕目标岗位做关键词精修。'
      : '当前简历具备基础框架，但在量化成果、岗位关键词覆盖和重点表达上仍有明显提升空间。',
    highlights: highlights.slice(0, 3),
    dimensions,
    suggestions: suggestions.slice(0, 6),
  }
}

function normalizeAiReviewResult(parsed, fallback) {
  const base = fallback || buildLocalReview('')
  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
      .map(item => {
        if (typeof item === 'string') {
          return { text: item, importance: 3, category: '优化建议', example: '' }
        }
        const text = String(item?.text || '').trim()
        if (!text) return null
        return {
          text,
          importance: clampScore(item?.importance || 3, 5) || 3,
          category: String(item?.category || '优化建议').trim() || '优化建议',
          example: String(item?.example || '').trim(),
        }
      })
      .filter(Boolean)
    : []

  const dimensions = Array.isArray(parsed?.dimensions)
    ? parsed.dimensions
      .map(item => {
        const name = String(item?.name || '').trim()
        if (!name) return null
        return {
          name,
          score: clampScore(item?.score),
          comment: String(item?.comment || '').trim(),
        }
      })
      .filter(Boolean)
    : []

  const highlights = Array.isArray(parsed?.highlights)
    ? parsed.highlights.map(item => String(item || '').trim()).filter(Boolean)
    : []

  return {
    score: clampScore(parsed?.score || base.score),
    summary: String(parsed?.summary || '').trim() || base.summary,
    highlights: highlights.length ? highlights.slice(0, 3) : base.highlights,
    dimensions: dimensions.length ? dimensions.slice(0, 4) : base.dimensions,
    suggestions: suggestions.length ? suggestions.slice(0, 6) : base.suggestions,
    source: parsed ? 'ai' : 'local',
  }
}

/* ── 调用后端 OCR 服务识别文件（支持 PDF / Word / 图片） ── */

/**
 * 将 HTML 转为简易 Markdown（用于简历导入）
 */
function htmlToMarkdown(html) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 通过后端将 PDF 转为 DOCX，再用 mammoth 提取内容
 */
async function importPdfFile(file) {
  // 1. PDF → DOCX（后端 pdf2docx 服务）
  const formData = new FormData()
  formData.append('file', file)
  formData.append('targetFormat', 'docx')

  const docxBlob = await requestBlob('/api/doc/convert', {
    method: 'POST',
    auth: true,
    featureCode: 'resume-builder',
    body: formData,
  })
  const arrayBuffer = await docxBlob.arrayBuffer()

  // 2. DOCX → HTML（mammoth 前端解析）
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value
  if (!html.trim()) throw new Error('未能从 PDF 中提取到内容')

  // 3. HTML → Markdown
  return htmlToMarkdown(html)
}

/**
 * 通过 mammoth 直接读取 DOCX 内容
 */
async function importDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value
  if (!html.trim()) throw new Error('未能从 Word 中提取到内容')
  return htmlToMarkdown(html)
}

/* ── Composable ────────────────────────────────────── */

const STORAGE_KEY = 'resume-builder-cache-v1'

export function useResumeBuilder() {
  const headerText = ref('')
  const sections = ref([])
  const importLoading = ref(false)
  const importError = ref('')
  const account = useAccountStore()

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

  /* 导入文件（PDF 通过后端转 DOCX，Word 直接解析） */
  const importFile = async (file) => {
    if (!file) return
    importLoading.value = true
    importError.value = ''
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    try {
      const name = file.name.toLowerCase()
      let mdText = ''

      if (name.endsWith('.pdf')) {
        mdText = await importPdfFile(file)
      } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
        mdText = await importDocxFile(file)
      } else {
        throw new Error('仅支持 PDF 和 WORD (.docx) 格式')
      }

      if (!mdText.trim()) throw new Error('未能从文件中提取到内容')

      const formatted = formatRawResumeText(mdText)
      loadFromMarkdown(formatted)
    } catch (e) {
      importError.value = '导入失败：' + (e.message || '未知错误')
    } finally {
      importLoading.value = false
      if (isPdf) {
        account.refreshDashboard().catch(() => {})
      }
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
      }, { featureCode: 'resume-builder' })
      const md = extractAiText(data)
      if (!md) throw new Error('AI 未返回有效内容')
      account.refreshDashboard().catch(() => {})
      return md
    } catch (e) {
      aiFormatError.value = normalizeModelError(e).message
      account.refreshDashboard().catch(() => {})
      return ''
    } finally {
      aiFormatLoading.value = false
    }
  }

  /* AI 辅助写简历 */
  const aiWriteLoading = ref(false)
  const aiWriteError = ref('')

  const aiWriteResumeSection = async ({ role, section, notes } = {}) => {
    const rawNotes = String(notes || '').trim()
    if (!rawNotes) {
      aiWriteError.value = '请填写要点或经历信息'
      return ''
    }
    aiWriteLoading.value = true
    aiWriteError.value = ''
    try {
      const safeRole = String(role || '').trim()
      const sectionMap = {
        summary: '职业摘要',
        experience: '工作经历',
        project: '项目经历',
        skills: '技能',
        education: '教育背景',
      }
      const sectionKey = String(section || 'summary').trim()
      const sectionLabel = sectionMap[sectionKey] || sectionKey
      const formatGuide = {
        summary: '输出 2-4 句职业摘要，按照招聘平台常见筛选偏好写法，依次突出经验年限、细分方向、代表成果、岗位匹配关键词，不要使用列表。',
        experience: '输出一段工作经历：\n### 职位 | 公司\n时间 地点\n- 每条采用“动作 + 业务场景 + 方法/工具 + 结果”结构\n- 输出 3-5 条，要有 2 条以上量化成果\n- 优先写主导、推动、优化、落地、协同等招聘平台高频表达',
        project: '输出一段项目经历：\n### 项目名称\n角色 | 项目一句话说明\n- 输出 3-5 条，写清项目目标、个人职责、关键动作、业务结果\n- 尽量体现复杂度、协作范围、指标提升或交付价值',
        skills: '输出技能列表：\n- 核心能力：能力标签 3-5 个\n- 工具栈：技术/工具 5-8 个\n- 可按招聘平台常见检索习惯自然覆盖关键词',
        education: '输出教育背景：\n- 学校 | 学历 | 专业 | 时间\n- 如用户提供成绩、排名、荣誉则保留，否则不要编造',
      }
      const guide = formatGuide[sectionKey] || '输出与该模块匹配的 Markdown 片段。'

      const data = await aiClient.chat.complete({
        messages: [
          {
            role: 'system',
            content: `你是专业简历写作助手，熟悉 BOSS 直聘、智联招聘、前程无忧、猎聘等招聘平台常见筛选方式。仅使用用户提供的信息生成 Markdown 片段，不得编造或补充事实，不得虚构公司/项目/成绩。

目标模块：${sectionLabel}
目标岗位：${safeRole || '未提供'}

写作要求：
1. 只输出 Markdown 片段，不要加代码块标记，不要解释
2. 信息不足处用 [待补充] 占位
 3. 语言风格要像成熟招聘平台上的高通过率简历，避免空话、套话、学生作文式表达
 4. 经历类内容优先使用“主导/负责/推动/优化/搭建/落地/协同”等动词开头，并尽量量化成果
 5. 如果用户给了目标岗位，就自然融入岗位关键词，但不能生造技术、成绩或职责
 6. 优先保留对招聘方最敏感的信息：业务场景、职责边界、使用工具、影响结果
 7. 格式遵循：${guide}`,
          },
          { role: 'user', content: rawNotes },
        ],
        temperature: 0.5,
        max_tokens: 800,
      }, { featureCode: 'resume-builder' })

      const md = extractAiText(data)
      if (!md) throw new Error('AI 未返回有效内容')
      account.refreshDashboard().catch(() => {})
      return md
    } catch (e) {
      aiWriteError.value = normalizeModelError(e).message
      account.refreshDashboard().catch(() => {})
      return ''
    } finally {
      aiWriteLoading.value = false
    }
  }

  /* AI 评审简历质量 */
  const aiReviewLoading = ref(false)
  const aiReviewError = ref('')
  const aiReviewResult = ref(null)

  const aiReviewResume = async (mdText) => {
    if (!mdText?.trim()) {
      aiReviewError.value = '请先填写简历内容后再评审'
      aiReviewResult.value = null
      return null
    }
    aiReviewLoading.value = true
    aiReviewError.value = ''
    try {
      const fallback = buildLocalReview(mdText)
      const data = await aiClient.chat.complete({
        messages: [
          {
            role: 'system',
            content: `你是专业简历评审官。根据用户提供的 Markdown 简历，输出严格 JSON：
{
  "score": 0-100 的整数,
  "summary": 1-2 句总体评价,
  "highlights": ["1 句亮点总结"],
  "dimensions": [
    {"name": "结构完整度", "score": 0-100 的整数, "comment": "一句点评"},
    {"name": "成果量化", "score": 0-100 的整数, "comment": "一句点评"},
    {"name": "岗位匹配度", "score": 0-100 的整数, "comment": "一句点评"},
    {"name": "ATS 可读性", "score": 0-100 的整数, "comment": "一句点评"}
  ],
  "suggestions": [
    {"text": "具体可执行的建议", "importance": 1-5 的整数, "category": "建议分类", "example": "可参考的写法"}
  ]
}

要求：
 1. 评审标准参考主流招聘平台和 ATS 筛选逻辑：信息完整度、关键词匹配、结果量化、条目清晰度、可读性
 2. 如果简历质量一般或较差，suggestions 给出 4-6 条具体改进建议；如果质量较好，也至少给出 2 条进阶优化建议
 3. 建议要尽量指出缺什么、怎么改、改成什么样，优先使用招聘方常见表达方式
 4. importance 5 表示最重要
 5. 只输出 JSON，不要额外文字、不需要 Markdown 代码块`
          },
          { role: 'user', content: mdText.trim() }
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }, { featureCode: 'resume-builder' })
      const raw = extractAiText(data)
      const parsed = parseAiJson(raw)
      aiReviewResult.value = normalizeAiReviewResult(parsed, fallback)
      if (!parsed) {
        aiReviewError.value = normalizeModelError(new Error('invalid ai review response')).message
      }
      account.refreshDashboard().catch(() => {})
      return aiReviewResult.value
    } catch (e) {
      aiReviewError.value = normalizeModelError(e).message
      aiReviewResult.value = normalizeAiReviewResult(null, buildLocalReview(mdText))
      account.refreshDashboard().catch(() => {})
      return aiReviewResult.value
    } finally {
      aiReviewLoading.value = false
    }
  }

  return {
    headerText, sections, markdown, renderedHtml, completeness,
    importLoading, importError,
    aiFormatLoading, aiFormatError,
    aiReviewLoading, aiReviewError, aiReviewResult,
    aiWriteLoading, aiWriteError,
    fillDemo, resetResume, loadFromMarkdown,
    moveSection, addSection, removeSection,
    moveItem, addItem, removeItem,
    importFile, exportMarkdownFile, formatRawResumeText,
    aiFormatResume,
    aiReviewResume,
    aiWriteResumeSection,
  }
}
