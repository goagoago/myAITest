<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  BotMessageSquare, Check, Eraser, File, FileText, ImageDown, ImagePlus, MonitorPlay,
  Image, Wrench, Camera, QrCode, ScanLine, Scissors, CreditCard, Video, ScrollText, FileSpreadsheet,
  ArrowRight, Upload, Send, Loader2, Trash2, Paperclip, X, FileImage, History, Square,
  SquarePen, Copy, PencilLine,
  Music, Presentation, Archive
} from 'lucide-vue-next'
import { marked } from 'marked'
import UiverseCard from '../components/UiverseCard.vue'
import FeatureCostBadge from '../components/account/FeatureCostBadge.vue'
import SiteSceneBackground from '../components/SiteSceneBackground.vue'
import { useBaiduPush } from '../composables/useBaiduPush'
import { useChat } from '../composables/useChat'
import { useAiImage } from '../composables/useAiImage'
import { useAccountStore } from '../stores/accountStore'

const CHAT_RETENTION_MS = 1000 * 60 * 60 * 24 * 7
const MAX_ATTACHMENTS = 4
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ATTACHMENT_TEXT_LIMIT = 12000
const PDF_PAGE_LIMIT = 8
const IMAGE_OUTPUT_SIZE = '1024x1024'
const ACCEPTED_FILE_TYPES = [
  'image/*',
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm', '.rtf',
  '.pdf', '.docx', '.docm', '.xlsx', '.xls', '.xlsm',
]

const attachmentIconMap = {
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  Presentation,
  MonitorPlay,
  Music,
  Archive,
}

const studioModes = [
  {
    value: 'chat',
    label: 'AI 对话',
    description: '直接问，或拖文件进来。',
    placeholder: '输入你的问题，或直接上传附件',
    actionLabel: '发送',
    busyLabel: '生成中',
    hint: '可传图片和文档',
  },
  {
    value: 'image',
    label: 'AI 生图',
    description: '一句提示词，直接出图。',
    placeholder: '描述你想生成的画面，例如：奶油色极简咖啡店海报',
    actionLabel: '生成图片',
    busyLabel: '生图中',
    hint: '结果直接回到会话里',
  },
]

const chatSuggestions = [
  '帮我规划一个五一 3 天游',
  '把这段卖点改成口播文案',
  '给我 5 个低成本副业方向',
]

const imageSuggestions = [
  '生成一张极简咖啡品牌海报，奶油色背景，杂志排版，柔光摄影感',
  '做一张赛博朋克雨夜街景插画，霓虹反射，电影海报构图',
  '设计一张清爽的电商主图，白底护肤品，微距产品摄影风格',
]

const isDev = import.meta.env.DEV
const { loading: pushLoading, result: pushResult, error: pushError, pushUrls } = useBaiduPush()
const { loading: chatLoading, sendMessageStream, stop: stopChat } = useChat('ai-chat')
const { loading: imageLoading, generate: generateAiImage, stop: stopImage } = useAiImage('ai-image')
const account = useAccountStore()

const router = useRouter()
const studioSection = ref(null)
const studioTimeline = ref(null)
const composerInput = ref('')
const studioMode = ref('chat')
const pendingAttachments = ref([])
const studioMessages = ref([])
const studioError = ref('')
const attachmentLoading = ref(false)
const dragActive = ref(false)
const historyPanelOpen = ref(false)
const selectedHistoryTurnId = ref('')
const highlightedTurnId = ref('')
const typingPlaybackActive = ref(false)
const turnSeed = ref(0)
const activeRunMode = ref('')
const activeAssistantMessageId = ref('')
const currentSessionId = ref('')
const composerFocused = ref(false)
const editingMessageId = ref('')
const editingDraft = ref('')
const copiedMessageId = ref('')
const placeholderFlowText = ref('')
const fileInput = ref(null)
let persistTimer = 0
let highlightTimer = 0
let typewriterTimer = 0
let typewriterQueue = []
let typewriterDone = false
let typewriterMessageId = ''
let typewriterDrainResolve = null
let copyTimer = 0
let placeholderTimer = 0
let placeholderPhraseIndex = 0
let placeholderCharIndex = 0
let placeholderDeleting = false

const toolCategories = [
  {
    id: 'image',
    label: '处理图片',
    icon: Image,
    desc: '去水印、压缩、证件照、抠图这些高频任务，尽量一步直达。',
    tone: 'mint',
    tools: [
      {
        id: 'watermark-removal',
        path: '/watermark-removal',
        icon: Eraser,
        name: '图片去水印',
        desc: '智能识别并去除复杂水印，一键还原清晰图片',
        gradient: 'linear-gradient(145deg, #34d399, #14b8a6)',
        shadowColor: 'rgba(52, 211, 153, 0.22)',
      },
      {
        id: 'image-compress',
        path: '/image-compress',
        icon: ImageDown,
        name: '图片压缩',
        desc: '多种压缩方式可选，体积和画质平衡更聪明',
        gradient: 'linear-gradient(145deg, #38bdf8, #22c55e)',
        shadowColor: 'rgba(56, 189, 248, 0.22)',
      },
      {
        id: 'id-photo',
        path: '/id-photo',
        icon: Camera,
        name: '证件照制作',
        desc: '标准尺寸、换底色、裁剪排版，一站搞定',
        gradient: 'linear-gradient(145deg, #14b8a6, #10b981)',
        shadowColor: 'rgba(20, 184, 166, 0.22)',
      },
      {
        id: 'remove-bg',
        path: '/remove-bg',
        icon: Scissors,
        name: 'AI 抠图',
        desc: '自动识别主体，一键去背景，干净利落',
        gradient: 'linear-gradient(145deg, #8b5cf6, #ec4899)',
        shadowColor: 'rgba(139, 92, 246, 0.22)',
      },
    ],
  },
  {
    id: 'media',
    label: '音视频处理',
    icon: Video,
    desc: '压缩、录制、转换都放在一起，减少来回折腾。',
    tone: 'sunset',
    tools: [
      {
        id: 'video-compress',
        path: '/media/compress',
        icon: Video,
        name: '视频压缩',
        desc: '浏览器端 FFmpeg 压缩视频，多种预设和分辨率可选',
        gradient: 'linear-gradient(145deg, #fb7185, #f97316)',
        shadowColor: 'rgba(249, 115, 22, 0.22)',
      },
      {
        id: 'screen-record',
        path: '/media/record',
        icon: MonitorPlay,
        name: '屏幕录制',
        desc: '直接录屏，支持系统声音和麦克风，不折腾',
        gradient: 'linear-gradient(145deg, #ef4444, #f97316)',
        shadowColor: 'rgba(239, 68, 68, 0.22)',
      },
      {
        id: 'audio-convert',
        path: '/media/audio-convert',
        icon: FileText,
        name: '音频转换',
        desc: 'MP3、WAV、FLAC、M4A 等格式互转',
        gradient: 'linear-gradient(145deg, #e879f9, #ec4899)',
        shadowColor: 'rgba(232, 121, 249, 0.22)',
      },
      {
        id: 'gif-tools',
        path: '/media/gif',
        icon: Video,
        name: 'GIF 工具',
        desc: '视频转 GIF、GIF 压缩、GIF 转 MP4 一页搞定',
        gradient: 'linear-gradient(145deg, #f97316, #ef4444)',
        shadowColor: 'rgba(249, 115, 22, 0.22)',
      },
    ],
  },
  {
    id: 'utility',
    label: '文档与效率',
    icon: Wrench,
    desc: '文档转换、二维码、OCR、测试数据，工作流里的常用件。',
    tone: 'violet',
    tools: [
      {
        id: 'doc-convert',
        path: '/doc-convert',
        icon: FileText,
        name: '文档转换',
        desc: 'PDF、Word、Markdown、HTML、图片等多种格式互转',
        gradient: 'linear-gradient(145deg, #60a5fa, #8b5cf6)',
        shadowColor: 'rgba(96, 165, 250, 0.22)',
      },
      {
        id: 'qr-code',
        path: '/qr-code',
        icon: QrCode,
        name: 'QR 码生成',
        desc: '支持颜色、Logo 和容错等级，自定义更漂亮',
        gradient: 'linear-gradient(145deg, #8b5cf6, #6366f1)',
        shadowColor: 'rgba(139, 92, 246, 0.22)',
      },
      {
        id: 'qr-scan',
        path: '/qr-scan',
        icon: ScanLine,
        name: '二维码解析',
        desc: '上传图片或截图，直接识别二维码内容',
        gradient: 'linear-gradient(145deg, #7c3aed, #4338ca)',
        shadowColor: 'rgba(124, 58, 237, 0.22)',
      },
      {
        id: 'ocr',
        path: '/ocr',
        icon: ScanLine,
        name: 'OCR 识别',
        desc: '图片转文字，支持中英文和多场景识别',
        gradient: 'linear-gradient(145deg, #06b6d4, #8b5cf6)',
        shadowColor: 'rgba(6, 182, 212, 0.22)',
      },
      {
        id: 'data-convert',
        path: '/data-convert',
        icon: FileSpreadsheet,
        name: '数据转换',
        desc: 'Excel、CSV、JSON 互转并做基础清洗',
        gradient: 'linear-gradient(145deg, #2563eb, #06b6d4)',
        shadowColor: 'rgba(37, 99, 235, 0.22)',
      },
      {
        id: 'id-generator',
        path: '/id-generator',
        icon: CreditCard,
        name: '身份证号生成',
        desc: '适合开发测试，支持地区、性别和出生日期定制',
        gradient: 'linear-gradient(145deg, #3b82f6, #10b981)',
        shadowColor: 'rgba(59, 130, 246, 0.22)',
      },
      {
        id: 'resume-builder',
        path: '/resume-builder',
        icon: ScrollText,
        name: 'AI 简历工坊',
        desc: 'Markdown 编辑、拖拽模块、AI 润色与导出',
        gradient: 'linear-gradient(145deg, #14b8a6, #f59e0b)',
        shadowColor: 'rgba(20, 184, 166, 0.22)',
      },
    ],
  },
]

const createSessionId = (mode = 'chat') => `session-${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const historyKey = computed(() => `toolsbox-home-studio:${account.profile.value?.id || 'guest'}`)
const getSessionMode = (sessionId) => studioMessages.value.find(item => item.sessionId === sessionId)?.mode || ''
const resolveLatestSessionId = (messages, mode = studioMode.value) => {
  const latestInMode = [...messages].reverse().find(item => (item.mode === 'image' ? 'image' : 'chat') === mode)
  return latestInMode?.sessionId || createSessionId(mode)
}
const visibleStudioMessages = computed(() => (
  currentSessionId.value
    ? studioMessages.value.filter(item => item.sessionId === currentSessionId.value)
    : []
))
const currentModeMeta = computed(() => studioModes.find(item => item.value === studioMode.value) || studioModes[0])
const studioBusy = computed(() => (
  chatLoading.value
  || imageLoading.value
  || attachmentLoading.value
  || typingPlaybackActive.value
))
const canInterrupt = computed(() => (
  chatLoading.value
  || imageLoading.value
  || typingPlaybackActive.value
))
const studioFeatureCode = computed(() => (studioMode.value === 'image' ? 'ai-image' : 'ai-chat'))
const studioCountLabel = computed(() => `${visibleStudioMessages.value.filter(item => !item.system).length} 条消息`)
const hasMessages = computed(() => visibleStudioMessages.value.some(item => !item.system))
const showSuggestions = computed(() => !hasMessages.value)
const activeSuggestions = computed(() => (studioMode.value === 'image' ? imageSuggestions : chatSuggestions))
const placeholderSamples = computed(() => (
  studioMode.value === 'image'
    ? [
        '生成一张真实感很强的旧照片，人物表情自然，环境细节丰富',
        '做一张高级感电商品牌海报，白底、干净、产品质感突出',
        '画一幅电影感雨夜街景，霓虹反光，镜头语言明确',
      ]
    : [
        '把这段需求拆成可执行方案，再列出优先级',
        '总结我上传文件的重点，再给出结论和行动建议',
        '把下面这段文案改得更短、更有销售感',
      ]
))
const composerPlaceholder = computed(() => currentModeMeta.value.placeholder)
const composerActionLabel = computed(() => currentModeMeta.value.actionLabel)
const composerBusyLabel = computed(() => currentModeMeta.value.busyLabel)
const attachmentAccept = computed(() => ACCEPTED_FILE_TYPES.join(','))
const attachmentHint = computed(() => {
  if (attachmentLoading.value) return '解析附件中...'
  return studioMode.value === 'chat' ? currentModeMeta.value.hint : '切回 AI 对话后可上传附件'
})
const latestMessageId = computed(() => visibleStudioMessages.value.at(-1)?.id || '')
const showPlaceholderFlow = computed(() => !composerInput.value && !composerFocused.value)
const canSubmit = computed(() => {
  if (studioBusy.value) return false
  const hasPrompt = composerInput.value.trim().length > 0
  if (studioMode.value === 'image') {
    return hasPrompt
  }
  return hasPrompt || pendingAttachments.value.length > 0
})

const renderMarkdown = (content) => marked.parse(content || '', { breaks: true })
const resolveAttachmentIcon = (iconKey) => attachmentIconMap[iconKey] || File
const isAbortError = (error) => (
  error?.name === 'AbortError'
  || error?.code === 'ABORT_ERR'
  || error?.isAbort === true
)
const findMessageById = (id) => studioMessages.value.find(item => item.id === id)
const ensureCurrentSessionId = (mode = studioMode.value) => {
  if (!currentSessionId.value || getSessionMode(currentSessionId.value) && getSessionMode(currentSessionId.value) !== mode) {
    currentSessionId.value = createSessionId(mode)
  }
  return currentSessionId.value
}
const stopPlaceholderFlow = () => {
  if (placeholderTimer && typeof window !== 'undefined') {
    window.clearTimeout(placeholderTimer)
  }
  placeholderTimer = 0
}
const runPlaceholderFlow = () => {
  stopPlaceholderFlow()
  if (!showPlaceholderFlow.value) {
    placeholderFlowText.value = ''
    return
  }

  const samples = placeholderSamples.value
  if (!samples.length) return

  const step = () => {
    if (!showPlaceholderFlow.value) {
      placeholderFlowText.value = ''
      placeholderTimer = 0
      return
    }

    const phrase = samples[placeholderPhraseIndex % samples.length] || ''

    if (!placeholderDeleting) {
      placeholderCharIndex = Math.min(phrase.length, placeholderCharIndex + 1)
      placeholderFlowText.value = phrase.slice(0, placeholderCharIndex)

      if (placeholderCharIndex >= phrase.length) {
        placeholderDeleting = true
        placeholderTimer = window.setTimeout(step, 1100)
        return
      }

      placeholderTimer = window.setTimeout(step, 28)
      return
    }

    placeholderCharIndex = Math.max(0, placeholderCharIndex - 1)
    placeholderFlowText.value = phrase.slice(0, placeholderCharIndex)

    if (placeholderCharIndex === 0) {
      placeholderDeleting = false
      placeholderPhraseIndex = (placeholderPhraseIndex + 1) % samples.length
      placeholderTimer = window.setTimeout(step, 220)
      return
    }

    placeholderTimer = window.setTimeout(step, 14)
  }

  step()
}
const canEditMessage = (message) => (
  message.role === 'user'
  && message.mode === 'chat'
  && message.kind === 'text'
  && !message.attachments?.length
)
const isEditingMessage = (message) => editingMessageId.value === message.id
const clearEditingState = () => {
  editingMessageId.value = ''
  editingDraft.value = ''
}
const startEditingMessage = (message) => {
  if (!canEditMessage(message) || studioBusy.value) return
  editingMessageId.value = message.id
  editingDraft.value = message.content
}
const clearCopyState = () => {
  if (copyTimer && typeof window !== 'undefined') {
    window.clearTimeout(copyTimer)
  }
  copyTimer = 0
  copiedMessageId.value = ''
}
const copyAssistantMessage = async (message) => {
  const content = normalizeText(message.content)
  if (!content || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
  try {
    await navigator.clipboard.writeText(content)
    copiedMessageId.value = message.id
    clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => {
      copiedMessageId.value = ''
      copyTimer = 0
    }, 1600)
  } catch {
    studioError.value = '复制失败，请稍后再试'
  }
}
const startNewConversation = ({ mode = studioMode.value, scroll = true } = {}) => {
  if (studioBusy.value) {
    interruptStudio()
  }
  clearEditingState()
  studioMode.value = mode
  currentSessionId.value = createSessionId(mode)
  composerInput.value = ''
  pendingAttachments.value = []
  studioError.value = ''
  selectedHistoryTurnId.value = ''
  if (scroll) {
    syncTimeline()
    scrollToStudio()
  }
}
const clearActiveRun = (messageId = '') => {
  if (!messageId || activeAssistantMessageId.value === messageId) {
    activeRunMode.value = ''
    activeAssistantMessageId.value = ''
  }
}
const markAssistantMessageStopped = (message, fallbackContent = '') => {
  if (!message) return
  if (message.mode === 'chat' && typewriterMessageId === message.id) {
    if (typewriterQueue.length) {
      message.content += typewriterQueue.join('')
      refreshStudioMessages()
      syncTimeline()
    }
    stopTypewriter()
  }
  message.state = 'stopped'
  message.statusLabel = message.mode === 'image' ? '已停止生图' : '已停止返回'
  if (message.mode === 'image') {
    message.progressLabel = '本次生成已中断'
  }
  if (!String(message.content || '').trim() && fallbackContent) {
    message.content = fallbackContent
  }
  refreshStudioMessages()
}
const isPendingAssistantMessage = (message) => (
  message.role === 'assistant'
  && message.state === 'running'
  && message.id === latestMessageId.value
)
const showImageProgress = (message) => (
  message.mode === 'image'
  && ['running', 'stopped'].includes(message.state)
)
const interruptStudio = () => {
  if (!canInterrupt.value) return
  const message = findMessageById(activeAssistantMessageId.value)

  if (activeRunMode.value === 'chat') {
    markAssistantMessageStopped(message, '已停止本次回答。')
    stopChat()
  } else if (activeRunMode.value === 'image') {
    markAssistantMessageStopped(message, '已停止本次生图。')
    stopImage()
  } else if (typingPlaybackActive.value && message) {
    markAssistantMessageStopped(message, '已停止本次回答。')
  }

  studioError.value = ''
  clearActiveRun()
}
const refreshStudioMessages = () => {
  studioMessages.value = [...studioMessages.value]
}
const syncTimeline = () => nextTick(() => {
  if (!studioTimeline.value) return
  studioTimeline.value.scrollTop = studioTimeline.value.scrollHeight
})
const scrollToStudio = (behavior = 'smooth') => nextTick(() => {
  studioSection.value?.scrollIntoView({ behavior, block: 'start' })
})
const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)
const resolveTypewriterBatch = () => {
  if (typewriterQueue.length > 140) return 4
  if (typewriterQueue.length > 64) return 3
  if (typewriterQueue.length > 24) return 2
  return 1
}
const resolveTypewriterWait = () => {
  if (typewriterDrainResolve) {
    typewriterDrainResolve()
    typewriterDrainResolve = null
  }
}
const stopTypewriter = () => {
  if (typewriterTimer && typeof window !== 'undefined') {
    window.clearTimeout(typewriterTimer)
  }
  typewriterTimer = 0
  typewriterQueue = []
  typewriterDone = false
  typewriterMessageId = ''
  typingPlaybackActive.value = false
  resolveTypewriterWait()
}
const pumpTypewriter = (message) => {
  if (typeof window === 'undefined' || prefersReducedMotion()) {
    typingPlaybackActive.value = false
    resolveTypewriterWait()
    return
  }
  if (typewriterTimer) return

  typingPlaybackActive.value = true

  const step = () => {
    typewriterTimer = 0

    if (typewriterMessageId !== message.id) {
      stopTypewriter()
      return
    }

    if (typewriterQueue.length) {
      const nextText = typewriterQueue.splice(0, resolveTypewriterBatch()).join('')
      message.content += nextText
      refreshStudioMessages()
      syncTimeline()
      typewriterTimer = window.setTimeout(step, 16)
      return
    }

    if (!typewriterDone) {
      typewriterTimer = window.setTimeout(step, 20)
      return
    }

    stopTypewriter()
  }

  step()
}
const startTypewriter = (message) => {
  stopTypewriter()
  if (typeof window === 'undefined' || prefersReducedMotion()) return
  typewriterMessageId = message.id
  typewriterDone = false
  typingPlaybackActive.value = true
}
const queueTypewriterChunk = (message, chunk) => {
  if (!chunk) return

  if (typeof window === 'undefined' || prefersReducedMotion()) {
    message.content += chunk
    refreshStudioMessages()
    syncTimeline()
    return
  }

  if (typewriterMessageId !== message.id) {
    startTypewriter(message)
  }

  typewriterQueue.push(...Array.from(chunk))
  pumpTypewriter(message)
}
const completeTypewriter = async (message) => {
  if (typeof window === 'undefined' || prefersReducedMotion()) return
  if (typewriterMessageId !== message.id) return

  typewriterDone = true
  pumpTypewriter(message)

  if (!typewriterQueue.length && !typewriterTimer) {
    stopTypewriter()
    return
  }

  await new Promise(resolve => {
    typewriterDrainResolve = resolve
  })
}

const sanitizeMessages = (value) => {
  if (!Array.isArray(value)) return []
  const cutoff = Date.now() - CHAT_RETENTION_MS

  return value
    .filter(item => item && ['assistant', 'user'].includes(item.role))
    .filter(item => !item.system)
    .map(item => ({
      id: item.id || `msg-${Math.random().toString(36).slice(2)}`,
      role: item.role,
      mode: item.mode === 'image' ? 'image' : 'chat',
      kind: item.kind === 'image' ? 'image' : 'text',
      content: typeof item.content === 'string' ? item.content : '',
      turnId: item.turnId || '',
      sessionId: item.sessionId || item.turnId || createSessionId(item.mode === 'image' ? 'image' : 'chat'),
      createdAt: Number(item.createdAt) || Date.now(),
      attachments: Array.isArray(item.attachments)
        ? item.attachments.map(attachment => ({
            id: attachment.id || `att-${Math.random().toString(36).slice(2)}`,
            kind: attachment.kind === 'image' ? 'image' : 'document',
            name: attachment.name || '附件',
            size: Number(attachment.size) || 0,
            iconKey: attachment.iconKey || 'File',
            visualType: attachment.visualType || 'default',
            note: attachment.note || '',
          }))
        : [],
      images: Array.isArray(item.images)
        ? item.images
            .filter(image => image?.url && !String(image.url).startsWith('data:'))
            .map(image => ({
              id: image.id || `img-${Math.random().toString(36).slice(2)}`,
              url: image.url,
              revisedPrompt: image.revisedPrompt || '',
            }))
        : [],
    }))
    .filter(item => item.createdAt >= cutoff)
}

const applyMessages = (messages) => {
  studioMessages.value = messages
}

const persistMessages = () => {
  if (typeof window === 'undefined') return
  const messages = sanitizeMessages(studioMessages.value)
  if (messages.length) {
    window.localStorage.setItem(historyKey.value, JSON.stringify(messages))
  } else {
    window.localStorage.removeItem(historyKey.value)
  }
}

const loadMessages = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(historyKey.value)
    const parsed = raw ? JSON.parse(raw) : []
    const sanitized = sanitizeMessages(parsed)
    applyMessages(sanitized)
    const latestMessage = sanitized.at(-1)
    if (latestMessage) {
      studioMode.value = latestMessage.mode === 'image' ? 'image' : 'chat'
      currentSessionId.value = latestMessage.sessionId
    } else {
      currentSessionId.value = createSessionId(studioMode.value)
    }
  } catch {
    applyMessages([])
    currentSessionId.value = createSessionId(studioMode.value)
  }
}
const schedulePersistMessages = () => {
  if (typeof window === 'undefined') return
  if (persistTimer) {
    window.clearTimeout(persistTimer)
  }
  persistTimer = window.setTimeout(() => {
    persistTimer = 0
    persistMessages()
  }, 180)
}
const clearHistoryHighlight = () => {
  if (highlightTimer && typeof window !== 'undefined') {
    window.clearTimeout(highlightTimer)
  }
  highlightTimer = 0
  highlightedTurnId.value = ''
}
const flashHistoryTurn = (turnId) => {
  clearHistoryHighlight()
  highlightedTurnId.value = turnId
  if (typeof window === 'undefined') return
  highlightTimer = window.setTimeout(() => {
    highlightedTurnId.value = ''
    highlightTimer = 0
  }, 1800)
}
const selectHistoryTurn = (item) => {
  if (!item?.turnId) return
  selectedHistoryTurnId.value = item.turnId
  currentSessionId.value = item.sessionId
  studioMode.value = item.mode === 'image' ? 'image' : 'chat'
  clearEditingState()
  closeHistoryPanel()
  scrollToStudio(prefersReducedMotion() ? 'auto' : 'smooth')

  nextTick(() => {
    const target = studioTimeline.value?.querySelector(`[data-turn-id="${item.turnId}"]`)
    if (!target) return
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    })
    flashHistoryTurn(item.turnId)
  })
}

watch(historyKey, () => {
  stopTypewriter()
  clearHistoryHighlight()
  selectedHistoryTurnId.value = ''
  loadMessages()
}, { immediate: true })

watch([studioMode, composerInput, composerFocused], () => {
  placeholderCharIndex = 0
  placeholderDeleting = false
  runPlaceholderFlow()
}, { immediate: true })

watch(studioMessages, () => {
  schedulePersistMessages()
}, { deep: true })

watch(studioMode, (value) => {
  pendingAttachments.value = []
  studioError.value = ''
  if (value === 'chat') {
    return
  }
  scrollToStudio()
})

watch(currentSessionId, () => {
  clearEditingState()
  syncTimeline()
})

watch(historyPanelOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

const deleteTurn = (turnId) => {
  if (!turnId) return
  if (selectedHistoryTurnId.value === turnId) {
    selectedHistoryTurnId.value = ''
  }
  if (highlightedTurnId.value === turnId) {
    clearHistoryHighlight()
  }
  const nextMessages = sanitizeMessages(studioMessages.value.filter(item => item.turnId !== turnId))
  applyMessages(nextMessages)
  if (!nextMessages.some(item => item.sessionId === currentSessionId.value)) {
    currentSessionId.value = resolveLatestSessionId(nextMessages, studioMode.value)
  }
  syncTimeline()
}

const removeAttachment = (id) => {
  pendingAttachments.value = pendingAttachments.value.filter(item => item.id !== id)
}

const closeHistoryPanel = () => {
  historyPanelOpen.value = false
}

const setStudioMode = (mode) => {
  if (studioBusy.value) return
  if (!studioModes.some(item => item.value === mode)) return
  if (mode === studioMode.value) return
  clearEditingState()
  studioMode.value = mode
  currentSessionId.value = resolveLatestSessionId(studioMessages.value, mode)
  composerInput.value = ''
  pendingAttachments.value = []
  studioError.value = ''
  selectedHistoryTurnId.value = ''
}

const resetStudio = () => {
  interruptStudio()
  stopTypewriter()
  clearHistoryHighlight()
  clearEditingState()
  clearCopyState()
  stopPlaceholderFlow()
  composerInput.value = ''
  pendingAttachments.value = []
  studioError.value = ''
  selectedHistoryTurnId.value = ''
  applyMessages([])
  currentSessionId.value = createSessionId(studioMode.value)
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(historyKey.value)
  }
  syncTimeline()
}

onBeforeUnmount(() => {
  interruptStudio()
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  if (persistTimer && typeof window !== 'undefined') {
    window.clearTimeout(persistTimer)
    persistMessages()
  }
  clearCopyState()
  clearHistoryHighlight()
  stopPlaceholderFlow()
  stopTypewriter()
})

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`))
  reader.readAsDataURL(file)
})

const readAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`))
  reader.readAsText(file, 'utf-8')
})

const readAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`))
  reader.readAsArrayBuffer(file)
})

const getFileExtension = (filename) => {
  const match = filename.toLowerCase().match(/\.[^.]+$/)
  return match ? match[0] : ''
}

const isImageFile = (file) => {
  if ((file.type || '').startsWith('image/')) return true
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff', '.heic'].includes(getFileExtension(file.name))
}

const getAttachmentVisualType = (file) => {
  const type = (file.type || '').toLowerCase()
  const ext = getFileExtension(file.name)
  if (isImageFile(file)) return 'image'
  if (type.includes('pdf') || ext === '.pdf') return 'pdf'
  if (type.includes('word') || type.includes('document') || ['.doc', '.docx', '.docm'].includes(ext)) return 'word'
  if (type.includes('excel') || type.includes('sheet') || ['.xls', '.xlsx', '.xlsm'].includes(ext)) return 'excel'
  if (type.includes('powerpoint') || type.includes('presentation') || ['.ppt', '.pptx', '.pptm'].includes(ext)) return 'ppt'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type.includes('zip') || type.includes('rar') || ['.zip', '.rar'].includes(ext)) return 'archive'
  if (
    type.startsWith('text/')
    || type.includes('json')
    || type.includes('xml')
    || type.includes('markdown')
    || type.includes('csv')
    || type.includes('html')
    || type.includes('rtf')
    || ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm', '.rtf'].includes(ext)
  ) {
    return 'code'
  }
  return 'default'
}

const getAttachmentIconKey = (visualType) => ({
  image: 'FileImage',
  pdf: 'FileText',
  word: 'FileText',
  excel: 'FileSpreadsheet',
  ppt: 'Presentation',
  video: 'MonitorPlay',
  audio: 'Music',
  archive: 'Archive',
  code: 'FileText',
  default: 'File',
}[visualType] || 'File')

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const normalizeText = (text) => String(text || '')
  .replace(/\u0000/g, '')
  .replace(/\r\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
const toSingleLine = (text) => normalizeText(text).replace(/\n+/g, ' ')
const trimHistoryText = (text, max = 52) => {
  const normalized = toSingleLine(text)
  if (!normalized) return ''
  return normalized.length > max
    ? `${normalized.slice(0, max).trim()}...`
    : normalized
}
const startOfDay = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
const formatHistoryDateLabel = (timestamp) => {
  const today = startOfDay(Date.now())
  const target = startOfDay(timestamp)
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(timestamp)
}
const formatHistoryTime = (timestamp) => new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(timestamp)
const buildHistorySummary = (message) => {
  const prompt = trimHistoryText(message.content, 30)
  if (prompt) return prompt
  if (message.attachments?.length) {
    return trimHistoryText(message.attachments.map(item => item.name).join('、'), 30)
  }
  return message.mode === 'image' ? '图片生成' : '新对话'
}
const buildHistoryPreview = (message) => {
  if (message.kind === 'image' && message.images?.length) {
    return `已生成 ${message.images.length} 张图片`
  }
  return trimHistoryText(message.content, 46) || (message.mode === 'image' ? '图片结果' : '对话记录')
}
const historyTurns = computed(() => {
  const turnMap = new Map()

  studioMessages.value
    .filter(item => item.turnId && !item.system)
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((item) => {
      const current = turnMap.get(item.turnId) || {
        turnId: item.turnId,
        sessionId: item.sessionId,
        createdAt: item.createdAt,
        mode: item.mode,
        summary: '',
        preview: '',
      }

      current.createdAt = Math.min(current.createdAt, item.createdAt || Date.now())
      current.mode = item.mode
      current.sessionId = item.sessionId || current.sessionId

      if (item.role === 'user') {
        current.summary = buildHistorySummary(item)
      } else if (!current.preview || item.kind === 'image') {
        current.preview = buildHistoryPreview(item)
      }

      turnMap.set(item.turnId, current)
    })

  return Array.from(turnMap.values()).sort((a, b) => b.createdAt - a.createdAt)
})
const historyGroups = computed(() => {
  const groups = []

  historyTurns.value.forEach((item) => {
    const label = formatHistoryDateLabel(item.createdAt)
    const currentGroup = groups[groups.length - 1]

    if (!currentGroup || currentGroup.label !== label) {
      groups.push({
        label,
        items: [item],
      })
      return
    }

    currentGroup.items.push(item)
  })

  return groups
})
const historyTurnsCount = computed(() => historyTurns.value.length)
const hasHistory = computed(() => historyTurnsCount.value > 0)

const finalizeExtractedText = (text, notes = []) => {
  const normalized = normalizeText(text)
  const finalNotes = [...notes]
  if (!normalized) {
    return { text: '', note: finalNotes.join('，') }
  }
  if (normalized.length > ATTACHMENT_TEXT_LIMIT) {
    finalNotes.push(`已截取前 ${ATTACHMENT_TEXT_LIMIT} 个字符`)
    return {
      text: normalized.slice(0, ATTACHMENT_TEXT_LIMIT).trim(),
      note: finalNotes.join('，'),
    }
  }
  return { text: normalized, note: finalNotes.join('，') }
}

let pdfjsLibPromise
const getPdfJs = async () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
      return pdfjsLib
    })
  }
  return pdfjsLibPromise
}

const extractTextFromPdf = async (file) => {
  const pdfjsLib = await getPdfJs()
  const pdf = await pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise
  const maxPages = Math.min(pdf.numPages, PDF_PAGE_LIMIT)
  const pageBlocks = []
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = normalizeText(textContent.items.map(item => item.str || '').join(' '))
    if (pageText) {
      pageBlocks.push(`第 ${pageNumber} 页\n${pageText}`)
    }
  }
  const notes = []
  if (pdf.numPages > maxPages) {
    notes.push(`已解析前 ${maxPages} 页，共 ${pdf.numPages} 页`)
  }
  return finalizeExtractedText(pageBlocks.join('\n\n'), notes)
}

const extractTextFromWord = async (file) => {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: await readAsArrayBuffer(file) })
  return finalizeExtractedText(result.value)
}

const extractTextFromSpreadsheet = async (file) => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await readAsArrayBuffer(file), { type: 'array' })
  const sheetNames = workbook.SheetNames.slice(0, 3)
  const sheetBlocks = sheetNames.map((sheetName) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false })
    return csv ? `工作表：${sheetName}\n${csv}` : ''
  }).filter(Boolean)
  const notes = []
  if (workbook.SheetNames.length > sheetNames.length) {
    notes.push(`已解析前 ${sheetNames.length} 个工作表，共 ${workbook.SheetNames.length} 个`)
  }
  return finalizeExtractedText(sheetBlocks.join('\n\n'), notes)
}

const extractTextFromFile = async (file) => {
  const visualType = getAttachmentVisualType(file)
  const ext = getFileExtension(file.name)

  if (visualType === 'code') {
    return finalizeExtractedText(await readAsText(file))
  }
  if (visualType === 'pdf') {
    return extractTextFromPdf(file)
  }
  if (visualType === 'word') {
    if (['.docx', '.docm'].includes(ext)) {
      return extractTextFromWord(file)
    }
    return {
      text: '',
      note: '暂不支持直接解析 .doc，请转换成 .docx 或补充文字说明',
    }
  }
  if (visualType === 'excel') {
    return extractTextFromSpreadsheet(file)
  }
  return {
    text: '',
    note: '当前仅自动解析图片、PDF、Word、Excel 和文本附件',
  }
}

const buildAttachmentRecord = async (file) => {
  const visualType = getAttachmentVisualType(file)
  const baseRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    iconKey: getAttachmentIconKey(visualType),
    visualType,
    previewUrl: '',
    note: '',
  }

  if (isImageFile(file)) {
    const dataUrl = await readAsDataUrl(file)
    return {
      ...baseRecord,
      kind: 'image',
      dataUrl,
      previewUrl: dataUrl,
    }
  }

  const extraction = await extractTextFromFile(file)
  return {
    ...baseRecord,
    kind: 'document',
    extractedText: extraction.text,
    note: extraction.note,
  }
}

const appendFiles = async (files) => {
  studioError.value = ''
  const targets = Array.from(files || [])
  if (!targets.length) return
  const availableSlots = MAX_ATTACHMENTS - pendingAttachments.value.length
  if (availableSlots <= 0) {
    studioError.value = `最多上传 ${MAX_ATTACHMENTS} 个附件`
    return
  }

  attachmentLoading.value = true
  try {
    const nextAttachments = []

    for (const file of targets.slice(0, availableSlots)) {
      try {
        if (file.size > MAX_FILE_SIZE) {
          studioError.value = `${file.name} 大小超过 50MB 限制`
          return
        }
        nextAttachments.push(await buildAttachmentRecord(file))
      } catch (error) {
        studioError.value = `读取 ${file.name} 失败: ${error.message}`
        return
      }
    }

    pendingAttachments.value = [...pendingAttachments.value, ...nextAttachments]
  } finally {
    attachmentLoading.value = false
  }
}

const handleFiles = async (event) => {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  await appendFiles(files)
}

const onDragEnter = (e) => {
  if (studioMode.value !== 'chat') return
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = true
}

const onDragOver = (e) => {
  if (studioMode.value !== 'chat') return
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = true
}

const onDragLeave = (e) => {
  if (studioMode.value !== 'chat') return
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false
}

const onDrop = async (e) => {
  if (studioMode.value !== 'chat') return
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false
  await appendFiles(Array.from(e.dataTransfer.files || []))
}

const buildUserPayload = (content, attachments) => {
  const imageAttachments = attachments.filter(item => item.kind === 'image')
  const documentAttachments = attachments.filter(item => item.kind === 'document')

  const textBlocks = []
  if (content) {
    textBlocks.push(content)
  }

  if (documentAttachments.length) {
    textBlocks.push(documentAttachments.map((item, index) => {
      const summary = item.extractedText || '该附件暂未自动解析，请结合文件名和上下文理解。'
      const notes = item.note ? `\n备注：${item.note}` : ''
      return `附件 ${index + 1}：${item.name}${notes}\n${summary}`
    }).join('\n\n'))
  }

  if (!content && !documentAttachments.length && imageAttachments.length) {
    textBlocks.push('请先识别图片内容，再给出结构化结论和可执行建议。')
  }

  if (!content && documentAttachments.length && !imageAttachments.length) {
    textBlocks.unshift('请先总结附件重点，再给出结论。')
  }

  const textPayload = textBlocks.join('\n\n').trim()
  if (!imageAttachments.length) {
    return textPayload
  }

  return [
    {
      type: 'text',
      text: textPayload || '请结合附件图片处理。',
    },
    ...imageAttachments.map(item => ({
      type: 'image_url',
      image_url: {
        url: item.dataUrl,
      },
    })),
  ]
}

const toDisplayAttachments = (attachments) => attachments.map(item => ({
  id: item.id,
  kind: item.kind,
  name: item.name,
  size: item.size,
  iconKey: item.iconKey,
  visualType: item.visualType,
  note: item.note,
  previewUrl: item.previewUrl || '',
}))

const streamChatReply = async ({ history, payloadContent, assistantMessage }) => {
  try {
    startTypewriter(assistantMessage)
    await sendMessageStream([
      {
        role: 'system',
        content: '你是 Tools Box 首页 AI 助手。请用中文回答，语气专业直接，优先给出可执行建议，适合处理旅行规划、文案润色、工作整理、翻译和头脑风暴。',
      },
      ...history,
      {
        role: 'user',
        content: payloadContent,
      },
    ], (chunk) => {
      if (assistantMessage.state === 'stopped') return
      queueTypewriterChunk(assistantMessage, chunk)
    })
    await completeTypewriter(assistantMessage)
    if (assistantMessage.state !== 'stopped') {
      assistantMessage.state = 'done'
      assistantMessage.statusLabel = ''
      refreshStudioMessages()
    }
  } catch (error) {
    if (isAbortError(error) || assistantMessage.state === 'stopped') {
      if (!String(assistantMessage.content || '').trim()) {
        assistantMessage.content = '已停止本次回答。'
      }
      refreshStudioMessages()
      return
    }
    stopTypewriter()
    assistantMessage.state = 'error'
    assistantMessage.statusLabel = '模型返回失败'
    assistantMessage.content = error?.message === '请先登录后再使用该功能'
      ? '登录后即可继续使用首页 AI 工作台。'
      : (error?.message || '这次没有顺利返回结果。')
    refreshStudioMessages()
    studioError.value = assistantMessage.content
  } finally {
    clearActiveRun(assistantMessage.id)
  }
}

const submitChat = async (content, attachments = []) => {
  const sessionId = ensureCurrentSessionId('chat')
  const history = studioMessages.value
    .filter(item => item.sessionId === sessionId && item.mode === 'chat' && item.kind === 'text' && item.content && !item.system)
    .map(item => ({
      role: item.role,
      content: item.payloadContent || item.content,
    }))

  const turnId = `turn-${Date.now()}-${turnSeed.value++}`
  const createdAt = Date.now()
  const payloadContent = buildUserPayload(content, attachments)
  const userMessage = {
    id: `user-${turnSeed.value++}`,
    role: 'user',
    mode: 'chat',
    kind: 'text',
    content,
    payloadContent,
    attachments: toDisplayAttachments(attachments),
    turnId,
    sessionId,
    createdAt,
  }
  const assistantMessage = {
    id: `assistant-${turnSeed.value++}`,
    role: 'assistant',
    mode: 'chat',
    kind: 'text',
    content: '',
    attachments: [],
    statusLabel: '实时返回中',
    state: 'running',
    turnId,
    sessionId,
    createdAt,
  }

  studioMessages.value = [...studioMessages.value, userMessage, assistantMessage]
  activeRunMode.value = 'chat'
  activeAssistantMessageId.value = assistantMessage.id
  selectedHistoryTurnId.value = turnId
  composerInput.value = ''
  pendingAttachments.value = []
  studioError.value = ''
  syncTimeline()
  await streamChatReply({ history, payloadContent, assistantMessage })
}

const submitImage = async (content) => {
  const prompt = content.trim()
  if (!prompt) return
  const sessionId = ensureCurrentSessionId('image')

  const turnId = `turn-${Date.now()}-${turnSeed.value++}`
  const createdAt = Date.now()
  const userMessage = {
    id: `user-${turnSeed.value++}`,
    role: 'user',
    mode: 'image',
    kind: 'text',
    content: prompt,
    attachments: [],
    turnId,
    sessionId,
    createdAt,
  }
  const assistantMessage = {
    id: `assistant-${turnSeed.value++}`,
    role: 'assistant',
    mode: 'image',
    kind: 'image',
    content: '',
    attachments: [],
    images: [],
    progress: 6,
    progressLabel: '正在理解提示词',
    statusLabel: '正在生图',
    state: 'running',
    turnId,
    sessionId,
    createdAt,
  }

  studioMessages.value = [...studioMessages.value, userMessage, assistantMessage]
  activeRunMode.value = 'image'
  activeAssistantMessageId.value = assistantMessage.id
  selectedHistoryTurnId.value = turnId
  composerInput.value = ''
  studioError.value = ''
  syncTimeline()

  try {
    const images = await generateAiImage({
      prompt,
      size: IMAGE_OUTPUT_SIZE,
    }, {
      onProgress: ({ value, label }) => {
        if (assistantMessage.state === 'stopped') return
        assistantMessage.progress = value
        assistantMessage.progressLabel = label
        refreshStudioMessages()
      },
    })
    if (assistantMessage.state === 'stopped') return
    assistantMessage.images = images
    assistantMessage.progress = 100
    assistantMessage.progressLabel = '图片已生成'
    assistantMessage.statusLabel = ''
    assistantMessage.state = 'done'
    const revisedPrompts = images
      .map((item, index) => (item.revisedPrompt ? `- 图 ${index + 1}：${item.revisedPrompt}` : ''))
      .filter(Boolean)
    assistantMessage.content = revisedPrompts.length
      ? `已生成 ${images.length} 张图片。\n\n优化后的提示词：\n${revisedPrompts.join('\n')}`
      : `已生成 ${images.length} 张图片。`
    refreshStudioMessages()
    syncTimeline()
  } catch (error) {
    if (isAbortError(error) || assistantMessage.state === 'stopped') {
      assistantMessage.progressLabel = '本次生成已中断'
      assistantMessage.statusLabel = '已停止生图'
      if (!String(assistantMessage.content || '').trim()) {
        assistantMessage.content = '已停止本次生图。'
      }
      refreshStudioMessages()
      return
    }
    assistantMessage.state = 'error'
    assistantMessage.statusLabel = '模型返回失败'
    assistantMessage.kind = 'text'
    assistantMessage.content = error?.message === '请先登录后再使用该功能'
      ? '登录后即可继续使用 AI 生图。'
      : (error?.message || '这次没有顺利生成图片。')
    refreshStudioMessages()
    studioError.value = assistantMessage.content
  } finally {
    clearActiveRun(assistantMessage.id)
  }
}

const saveEditedMessage = async (message) => {
  if (!canEditMessage(message) || studioBusy.value) return
  const content = editingDraft.value.trim()
  if (!content) return

  const targetIndex = studioMessages.value.findIndex(item => item.id === message.id)
  if (targetIndex < 0) return

  const targetMessage = studioMessages.value[targetIndex]
  const sessionId = targetMessage.sessionId
  const nextMessages = studioMessages.value
    .map((item, index) => (index === targetIndex
      ? {
          ...item,
          content,
          payloadContent: content,
        }
      : item))
    .filter((item, index) => !(item.sessionId === sessionId && index > targetIndex))

  const updatedTarget = nextMessages.find(item => item.id === message.id)
  const history = nextMessages
    .filter(item => item.sessionId === sessionId && item.mode === 'chat' && item.kind === 'text' && item.content && !item.system)
    .filter(item => item.id !== updatedTarget.id)
    .map(item => ({
      role: item.role,
      content: item.payloadContent || item.content,
    }))

  const assistantMessage = {
    id: `assistant-${turnSeed.value++}`,
    role: 'assistant',
    mode: 'chat',
    kind: 'text',
    content: '',
    attachments: [],
    statusLabel: '实时返回中',
    state: 'running',
    turnId: updatedTarget.turnId,
    sessionId,
    createdAt: Date.now(),
  }

  applyMessages([...nextMessages, assistantMessage])
  currentSessionId.value = sessionId
  studioMode.value = 'chat'
  activeRunMode.value = 'chat'
  activeAssistantMessageId.value = assistantMessage.id
  selectedHistoryTurnId.value = updatedTarget.turnId
  studioError.value = ''
  clearEditingState()
  syncTimeline()

  await streamChatReply({
    history,
    payloadContent: content,
    assistantMessage,
  })
}

const submitStudio = async (preset = '') => {
  const content = (preset || composerInput.value).trim()
  if (studioMode.value === 'image') {
    await submitImage(content)
    return
  }
  if (!content && !pendingAttachments.value.length) return
  await submitChat(content, pendingAttachments.value)
}
</script>

<template>
  <div class="home">
    <SiteSceneBackground />

    <section ref="studioSection" class="hero-shell">
      <div class="hero-bg-orb hero-bg-orb--one"></div>
      <div class="hero-bg-orb hero-bg-orb--two"></div>

      <div
        class="studio__shell"
        :class="{ 'studio__shell--dragging': dragActive }"
        @dragenter="onDragEnter"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div class="studio__workspace">
          <div class="studio__main">
            <div class="studio__nav" aria-label="聊天控制栏">
              <div class="studio__mode-tabs" role="tablist" aria-label="AI 模式">
                <button
                  v-for="mode in studioModes"
                  :key="mode.value"
                  type="button"
                  class="studio__choice"
                  :class="{ 'studio__choice--active': studioMode === mode.value }"
                  :disabled="studioBusy"
                  @click="setStudioMode(mode.value)"
                >
                  <component :is="mode.value === 'image' ? ImagePlus : BotMessageSquare" :size="14" />
                  <span>{{ mode.label }}</span>
                </button>
              </div>

              <div class="studio__utility-actions">
                <button class="studio__ghost" type="button" @click="startNewConversation({ mode: studioMode })">
                  <SquarePen :size="14" />
                  <span>新建</span>
                </button>
                <button class="studio__ghost" type="button" @click="historyPanelOpen = !historyPanelOpen">
                  <History :size="14" />
                  <span>{{ historyTurnsCount ? `历史 ${historyTurnsCount}` : '历史' }}</span>
                </button>
                <FeatureCostBadge :feature-code="studioFeatureCode" strong />
              </div>
            </div>

            <div v-if="showSuggestions" class="studio__chips">
              <button
                v-for="item in activeSuggestions"
                :key="item"
                type="button"
                class="studio__chip"
                @click="submitStudio(item)"
              >
                {{ item }}
              </button>
            </div>

            <div v-if="hasMessages" ref="studioTimeline" class="studio__messages">
              <TransitionGroup tag="div" name="message-fade" class="studio__message-list">
                <article
                  v-for="message in visibleStudioMessages"
                  :key="message.id"
                  class="message"
                  :data-turn-id="message.turnId || ''"
                  :class="[
                    `message--${message.role}`,
                    {
                      'message--pending': isPendingAssistantMessage(message),
                      'message--highlighted': message.turnId && message.turnId === highlightedTurnId,
                    },
                  ]"
                >
                  <div v-if="message.role === 'assistant'" class="message__avatar">AI</div>

                  <div class="message__body">
                    <div class="message__surface">
                      <div v-if="message.role === 'assistant' && message.statusLabel && message.mode === 'chat'" class="message__status">
                        <span class="message__status-dot"></span>
                        <span>{{ message.statusLabel }}</span>
                      </div>

                      <div v-if="message.attachments?.length" class="message__attachments">
                        <div
                          v-for="attachment in message.attachments"
                          :key="attachment.id"
                          class="message__attachment"
                          :class="`message__attachment--${attachment.kind}`"
                        >
                          <img
                            v-if="attachment.previewUrl"
                            :src="attachment.previewUrl"
                            :alt="attachment.name"
                            class="studio__pending-thumb"
                          />
                          <component
                            v-else
                            :is="resolveAttachmentIcon(attachment.iconKey)"
                            :size="18"
                            class="message__attachment-icon"
                            :class="`message__attachment-icon--${attachment.visualType}`"
                          />
                          <div class="message__attachment-info">
                            <span class="message__attachment-name">{{ attachment.name }}</span>
                            <span v-if="attachment.size" class="message__attachment-size">{{ formatFileSize(attachment.size) }}</span>
                            <span v-if="attachment.note" class="message__attachment-size">{{ attachment.note }}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="showImageProgress(message)"
                        class="message__image-progress"
                        :class="{
                          'message__image-progress--stopped': message.state === 'stopped',
                        }"
                      >
                        <div class="message__image-progress-head">
                          <div class="message__image-progress-copy">
                            <span class="message__image-progress-badge">
                              {{ message.state === 'stopped' ? '已停止' : `${Math.max(1, Math.round(message.progress || 0))}%` }}
                            </span>
                            <strong>{{ message.progressLabel || '正在生成图片' }}</strong>
                          </div>
                          <span class="message__image-progress-note">
                            {{ message.state === 'stopped' ? '你已手动中断本次生成' : '可随时打断，重新换个方向' }}
                          </span>
                        </div>
                        <div class="message__image-progress-rail">
                          <span :style="{ width: `${Math.max(8, Math.min(100, message.progress || 0))}%` }"></span>
                        </div>
                      </div>

                      <div
                        v-if="isEditingMessage(message)"
                        class="message__editor"
                      >
                        <textarea
                          v-model="editingDraft"
                          class="message__editor-input"
                          rows="4"
                        />
                        <div class="message__editor-actions">
                          <button type="button" class="message__tool" @click="clearEditingState">
                            取消
                          </button>
                          <button type="button" class="message__tool message__tool--strong" @click="saveEditedMessage(message)">
                            保存并重发
                          </button>
                        </div>
                      </div>

                      <div v-if="message.kind === 'image' && message.images?.length" class="message__image-result">
                        <div class="message__image-grid">
                          <figure v-for="image in message.images" :key="image.id" class="message__image-card">
                            <img
                              :src="image.url"
                              alt="AI 生成图片"
                              class="message__generated-image"
                            />
                            <figcaption v-if="image.revisedPrompt" class="message__image-meta">{{ image.revisedPrompt }}</figcaption>
                            <a
                              class="message__image-link"
                              :href="image.url"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              查看原图
                            </a>
                          </figure>
                        </div>
                      </div>

                      <div
                        v-else-if="message.content"
                        class="message__content"
                        :class="[
                          {
                            'message__content--caption': message.kind === 'image' && message.images?.length,
                            'message__content--streaming': isPendingAssistantMessage(message),
                          },
                        ]"
                        v-html="renderMarkdown(message.content)"
                      ></div>

                      <div
                        v-if="(message.role === 'assistant' && message.content) || canEditMessage(message)"
                        class="message__tools"
                        :class="{ 'message__tools--assistant': message.role === 'assistant' }"
                      >
                        <button
                          v-if="message.role === 'assistant' && message.content"
                          type="button"
                          class="message__tool message__tool--icon"
                          :class="{ 'message__tool--active': copiedMessageId === message.id }"
                          title="复制"
                          aria-label="复制"
                          @click="copyAssistantMessage(message)"
                        >
                          <component :is="copiedMessageId === message.id ? Check : Copy" :size="13" />
                        </button>
                        <button
                          v-if="canEditMessage(message)"
                          type="button"
                          class="message__tool message__tool--icon"
                          title="编辑"
                          aria-label="编辑"
                          @click="startEditingMessage(message)"
                        >
                          <PencilLine :size="13" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </TransitionGroup>
            </div>

            <div v-if="pendingAttachments.length && studioMode === 'chat'" class="studio__pending">
              <div
                v-for="attachment in pendingAttachments"
                :key="attachment.id"
                class="studio__pending-item"
                :class="`studio__pending-item--${attachment.kind}`"
              >
                <img
                  v-if="attachment.previewUrl"
                  :src="attachment.previewUrl"
                  :alt="attachment.name"
                  class="studio__pending-thumb"
                />
                <component
                  v-else
                  :is="resolveAttachmentIcon(attachment.iconKey)"
                  :size="20"
                  class="studio__pending-icon"
                  :class="`studio__pending-icon--${attachment.visualType}`"
                />
                <span class="studio__pending-name">{{ attachment.name }}</span>
                <span class="studio__pending-size">{{ formatFileSize(attachment.size) }}</span>
                <button class="studio__pending-remove" type="button" @click="removeAttachment(attachment.id)">
                  <X :size="14" />
                </button>
              </div>
            </div>

            <div class="studio__composer">
              <div v-if="showPlaceholderFlow" class="studio__placeholder-flow">
                <span>{{ placeholderFlowText }}</span>
              </div>
              <textarea
                v-model="composerInput"
                class="studio__input"
                rows="4"
                :placeholder="showPlaceholderFlow ? '' : composerPlaceholder"
                @focus="composerFocused = true"
                @blur="composerFocused = false"
                @keydown.enter.exact.prevent="submitStudio()"
              />

              <div class="studio__footer">
                <div class="studio__footer-left">
                  <label v-if="studioMode === 'chat'" class="studio__upload">
                    <input
                      ref="fileInput"
                      type="file"
                      multiple
                      :accept="attachmentAccept"
                      hidden
                      @change="handleFiles"
                    />
                    <Paperclip :size="16" />
                    <span>附件</span>
                  </label>
                  <span class="studio__hint">{{ attachmentHint }}</span>
                </div>

                <div class="studio__footer-actions">
                  <div v-if="studioBusy" class="studio__busy-indicator">
                    <Loader2 :size="15" class="studio__spin" />
                    <span>{{ composerBusyLabel }}</span>
                  </div>

                  <button
                    v-if="canInterrupt"
                    class="studio__stop"
                    type="button"
                    @click="interruptStudio"
                  >
                    <Square :size="15" />
                    <span>打断</span>
                  </button>

                  <button
                    v-else
                    class="studio__submit"
                    type="button"
                    :disabled="!canSubmit"
                    @click="submitStudio()"
                  >
                    <Send :size="18" />
                    <span>{{ composerActionLabel }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Teleport to="body">
        <Transition name="history-overlay">
          <div
            v-if="historyPanelOpen"
            class="studio__history-overlay"
            @click.self="closeHistoryPanel"
          >
            <aside class="studio__history-drawer" aria-label="近 7 天历史记录">
              <div class="studio__history-head">
                <div>
                  <p class="studio__history-title">近 7 天</p>
                  <p class="studio__history-note">
                    {{ hasHistory ? `${historyTurnsCount} 条记录` : '暂无记录' }}
                  </p>
                </div>

                <div class="studio__history-actions">
                  <button
                    v-if="hasHistory"
                    class="studio__history-clear"
                    type="button"
                    @click="resetStudio"
                  >
                    清空
                  </button>
                  <button
                    class="studio__history-close"
                    type="button"
                    @click="closeHistoryPanel"
                  >
                    <X :size="16" />
                  </button>
                </div>
              </div>

              <div v-if="hasHistory" class="studio__history-list">
                <section
                  v-for="group in historyGroups"
                  :key="group.label"
                  class="studio__history-group"
                >
                  <p class="studio__history-label">{{ group.label }}</p>

                  <div class="studio__history-items">
                    <article
                      v-for="item in group.items"
                      :key="item.turnId"
                      class="studio__history-item"
                      :class="{ 'studio__history-item--active': selectedHistoryTurnId === item.turnId }"
                    >
                      <button
                        class="studio__history-link"
                        type="button"
                        @click="selectHistoryTurn(item)"
                      >
                        <span class="studio__history-dot"></span>
                        <span class="studio__history-copy">
                          <span class="studio__history-summary">{{ item.summary }}</span>
                          <span class="studio__history-preview">{{ item.preview }}</span>
                          <span class="studio__history-meta">
                            {{ formatHistoryTime(item.createdAt) }} · {{ item.mode === 'image' ? '生图' : '对话' }}
                          </span>
                        </span>
                      </button>

                      <button
                        class="studio__history-delete"
                        type="button"
                        @click.stop="deleteTurn(item.turnId)"
                      >
                        <Trash2 :size="14" />
                      </button>
                    </article>
                  </div>
                </section>
              </div>

              <div v-else class="studio__history-empty">
                近 7 天还没有记录
              </div>
            </aside>
          </div>
        </Transition>
      </Teleport>

      <p v-if="studioError" class="studio__error">{{ studioError }}</p>
    </section>

    <section class="tools tools--first">
      <div v-for="category in toolCategories" :key="category.id" class="tools__category">
        <div class="category-head" :data-tone="category.tone">
          <div class="category-head__main">
            <div class="category-head__icon">
              <component :is="category.icon" class="category-head__icon-svg" />
            </div>
            <div class="category-head__text">
              <h3>{{ category.label }}</h3>
              <p>{{ category.desc }}</p>
            </div>
          </div>
          <button class="category-head__action" @click="router.push(category.tools[0].path)">
            先看这个
            <ArrowRight :size="16" />
          </button>
        </div>

        <div class="tools__grid">
          <UiverseCard
            v-for="tool in category.tools"
            :key="tool.id"
            :name="tool.name"
            :description="tool.desc"
            :gradient="tool.gradient"
            :shadowColor="tool.shadowColor"
            @click="router.push(tool.path)"
          >
            <template #icon>
              <component :is="tool.icon" class="tool-card__icon" />
            </template>
          </UiverseCard>
        </div>
      </div>
    </section>

    <section v-if="isDev" class="baidu-push">
      <div class="baidu-push__inner">
        <span class="baidu-push__label">百度收录推送</span>
        <button class="baidu-push__btn" :disabled="pushLoading" @click="pushUrls()">
          <Upload :size="14" />
          {{ pushLoading ? '推送中...' : '一键推送' }}
        </button>
        <span v-if="pushResult" class="baidu-push__status baidu-push__status--ok">
          成功 {{ pushResult.success }} 条，剩余配额 {{ pushResult.remain }}
        </span>
        <span v-if="pushError" class="baidu-push__status baidu-push__status--err">{{ pushError }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  --home-bg: #f9fbff;
  --home-surface: rgba(234, 239, 248, 0.68);
  --home-surface-solid: #f7faff;
  --home-surface-muted: rgba(240, 244, 252, 0.76);
  --home-line: rgba(82, 97, 138, 0.12);
  --home-line-strong: rgba(70, 86, 128, 0.18);
  --home-text-strong: #243047;
  --home-text-main: #31415e;
  --home-text-muted: #6c7891;
  --home-shadow: 0 18px 44px rgba(90, 103, 145, 0.12);
  --home-shadow-soft: 0 12px 28px rgba(90, 103, 145, 0.1);
  --home-shadow-hover: 0 26px 58px rgba(99, 102, 241, 0.14);
  --home-accent: #4f46e5;
  --studio-ink: #172033;
  --studio-muted: #667085;
  --studio-soft: #f6f8fb;
  --studio-border: rgba(15, 23, 42, 0.09);
  --studio-border-strong: rgba(15, 23, 42, 0.14);
  --studio-focus: rgba(37, 99, 235, 0.16);
  --studio-radius: 24px;
  --studio-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --studio-control-h: 30px;
  --studio-control-h-sm: 26px;
  --tool-grid-gap: clamp(14px, 1.9vw, 22px);
  --tool-card-max-width: 300px;
  --tool-card-height: clamp(194px, 20vw, 236px);
  --tool-card-radius: clamp(20px, 2.2vw, 24px);
  --tool-card-padding-y: clamp(18px, 2vw, 22px);
  --tool-card-padding-x: clamp(16px, 1.8vw, 20px);
  --tool-card-gap: clamp(8px, 1vw, 10px);
  --tool-card-icon-box: clamp(48px, 4.5vw, 62px);
  --tool-card-icon-radius: clamp(15px, 1.8vw, 18px);
  --tool-card-title-size: clamp(0.96rem, 0.88rem + 0.28vw, 1.12rem);
  --tool-card-title-hover-size: clamp(1.04rem, 0.96rem + 0.32vw, 1.22rem);
  --tool-card-title-line-height: 1.32;
  --tool-card-desc-size: clamp(0.82rem, 0.77rem + 0.18vw, 0.9rem);
  --tool-card-desc-line-height: 1.58;
  --tool-card-desc-pad-x: clamp(4px, 0.8vw, 8px);
  --tool-card-desc-expand-height: 64px;
  --tool-card-desc-lines: 2;

  position: relative;
  isolation: isolate;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0 var(--page-padding) 96px;
  color: var(--home-text-main);
}

.hero-shell {
  position: relative;
  overflow: visible;
  padding: clamp(16px, 3vw, 28px) 0 12px;
}

.hero-bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(50px);
  pointer-events: none;
  animation: floatOrb 10s ease-in-out infinite;
  z-index: 1;
}

.hero-bg-orb--one {
  top: 12px;
  left: -24px;
  width: 280px;
  height: 280px;
  background: rgba(148, 163, 184, 0.13);
}

.hero-bg-orb--two {
  top: 86px;
  right: 2%;
  width: 340px;
  height: 340px;
  background: rgba(203, 213, 225, 0.13);
  animation-delay: -3s;
}

.hero-grid {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 16px;
}

.hero-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.hero-copy {
  position: relative;
  max-width: 700px;
  margin: 0 auto;
  padding: clamp(24px, 3vw, 32px);
  border-radius: 30px;
  border: 1px solid var(--home-line);
  background: rgba(248, 251, 255, 0.42);
  backdrop-filter: blur(14px) saturate(112%);
  box-shadow: var(--home-shadow);
  text-align: center;
}

.hero-copy::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.96), transparent);
}

.hero-kicker,
.section-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(236, 241, 250, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.12);
  color: var(--home-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.section-kicker--small {
  font-size: 0.7rem;
}

.hero-title {
  margin-top: 18px;
  font-size: clamp(2.4rem, 1.9rem + 1.8vw, 4rem);
  line-height: 1.02;
  letter-spacing: -0.05em;
  font-weight: 800;
  color: var(--home-text-strong);
}

.hero-desc {
  margin: 12px auto 0;
  color: var(--home-text-muted);
  font-size: 0.88rem;
  line-height: 1.7;
}

.studio__ghost {
  min-height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--studio-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.66rem;
  font-weight: 680;
  transition: border-color 0.18s var(--studio-ease), background 0.18s var(--studio-ease), color 0.18s var(--studio-ease), transform 0.18s var(--studio-ease);
}

.studio__ghost {
  color: #667085;
}

.studio__shell {
  position: relative;
  z-index: 2;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  border-radius: 22px;
  background: transparent;
  border: none;
  backdrop-filter: none;
  box-shadow: none;
  transition: border-color 0.2s var(--studio-ease), box-shadow 0.2s var(--studio-ease), background 0.2s var(--studio-ease);
}

.studio__shell--dragging {
  border-color: rgba(37, 99, 235, 0.28);
  background: #fff;
  box-shadow: 0 20px 52px rgba(37, 99, 235, 0.1);
}

.studio__chips,
.message__meta,
.message__attachments,
.studio__pending,
.studio__footer,
.studio__footer-left {
  display: flex;
}

.studio__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.studio__main {
  min-width: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
}

.studio__chips {
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.studio__chip {
  min-height: var(--studio-control-h);
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--studio-border);
  background: rgba(255, 255, 255, 0.68);
  color: #344054;
  font-size: 0.66rem;
  font-weight: 680;
  box-shadow: none;
  transition: transform 0.18s var(--studio-ease), border-color 0.18s var(--studio-ease), background 0.18s var(--studio-ease), box-shadow 0.18s var(--studio-ease);
}

.studio__choice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #667085;
  font-size: 0.68rem;
  font-weight: 700;
  transition: border-color 0.18s var(--studio-ease), background 0.18s var(--studio-ease), color 0.18s var(--studio-ease), transform 0.18s var(--studio-ease), box-shadow 0.18s var(--studio-ease);
}

.studio__choice:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.studio__choice--active {
  background: #ffffff;
  color: #101828;
  border-color: rgba(15, 23, 42, 0.1);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.studio__messages {
  margin-top: 14px;
  min-height: 0;
  max-height: 520px;
  overflow: auto;
  padding: 10px 8px 10px 2px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.72), rgba(255, 255, 255, 0.18));
  border: 1px solid rgba(15, 23, 42, 0.045);
  scrollbar-color: rgba(148, 163, 184, 0.34) transparent;
}

.studio__message-list {
  display: grid;
  gap: 16px;
}

.message {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 11px;
  max-width: min(90%, 740px);
}

.message--assistant {
  justify-self: start;
  align-items: flex-start;
  max-width: min(96%, 780px);
}

.message--user {
  justify-self: end;
}

.message--highlighted .message__surface {
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.16);
}

.message__avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: linear-gradient(135deg, #111827, #334155);
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.16) inset;
}

.message__body {
  width: 100%;
  min-width: 0;
}

.message__surface {
  width: 100%;
  padding: 13px 15px;
  border-radius: 18px;
  border: 1px solid var(--studio-border);
  background: rgba(255, 255, 255, 0.94);
  color: var(--studio-ink);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
  transition: transform 0.2s var(--studio-ease), box-shadow 0.2s var(--studio-ease), border-color 0.2s var(--studio-ease), background 0.2s var(--studio-ease);
}

.message--assistant .message__surface {
  padding: 0 0 0 14px;
  border: none;
  border-left: 2px solid rgba(203, 213, 225, 0.78);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--studio-ink);
}

.message--user .message__surface {
  border-top-right-radius: 7px;
  background: #101828;
  border-color: rgba(16, 24, 40, 0.22);
  color: #fff;
  box-shadow: 0 10px 24px rgba(16, 24, 40, 0.12);
}

.message--pending .message__surface {
  transform: translateY(0);
}

.message--pending .message__avatar {
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.06);
}

.message__content,
.message__image-result {
  color: inherit;
  line-height: 1.72;
}

.message__status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #f2f4f7;
  color: #475467;
  font-size: 0.66rem;
  font-weight: 720;
}

.message__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  animation: pulseDot 1.05s ease-in-out infinite;
}

.message__content {
  font-size: 0.9rem;
  letter-spacing: -0.005em;
}

.message--assistant .message__content {
  color: #202939;
}

.message__tools {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.message__tools--assistant {
  padding-bottom: 2px;
}

.message__tool {
  min-height: var(--studio-control-h-sm);
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--studio-border);
  background: rgba(255, 255, 255, 0.76);
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.63rem;
  font-weight: 660;
  transition: border-color 0.18s var(--studio-ease), background 0.18s var(--studio-ease), color 0.18s var(--studio-ease), transform 0.18s var(--studio-ease);
}

.message__tool--icon {
  width: 26px;
  height: 26px;
  padding: 0;
  justify-content: center;
  gap: 0;
}

.message__tool--active {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.18);
  background: rgba(219, 234, 254, 0.72);
}

.message__tool--strong {
  background: #101828;
  border-color: rgba(16, 24, 40, 0.18);
  color: #fff;
}

.message--user .message__tool {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.message__content--caption {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.message__content--streaming::after {
  content: '';
  display: inline-block;
  width: 0.55ch;
  height: 1.05em;
  margin-left: 2px;
  border-radius: 999px;
  background: currentColor;
  vertical-align: -0.14em;
  animation: cursorBlink 0.95s steps(1) infinite;
}

.message__content :deep(p) {
  margin: 0;
}

.message__content :deep(p + p) {
  margin-top: 10px;
}

.message__content :deep(ul),
.message__content :deep(ol) {
  margin: 10px 0 0;
  padding-left: 20px;
}

.message__content :deep(li + li) {
  margin-top: 4px;
}

.message__attachments,
.studio__pending {
  flex-wrap: wrap;
  gap: 8px;
}

.message__attachments {
  margin-bottom: 10px;
}

.message__attachment,
.studio__pending-item {
  min-height: 42px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid var(--studio-border);
  background: rgba(248, 250, 252, 0.92);
  align-items: center;
  gap: 8px;
  color: #20293c;
  font-size: 0.72rem;
  font-weight: 600;
  transition: border-color 0.15s var(--studio-ease), background 0.15s var(--studio-ease), transform 0.15s var(--studio-ease);
}

.message__attachment:hover,
.studio__pending-item:hover {
  border-color: rgba(17, 24, 39, 0.15);
  background: #fff;
}

.message--assistant .message__attachment {
  background: rgba(255, 255, 255, 0.92);
}

.message--user .message__attachment {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #f3f4f6;
}

.message__attachment-icon,
.studio__pending-icon {
  flex-shrink: 0;
}

.message__attachment-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

.message__attachment-name,
.studio__pending-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.message__attachment-size,
.studio__pending-size {
  font-size: 0.62rem;
  color: #8b94a5;
  font-weight: 500;
}

.studio__pending-icon--image {
  color: #06b6d4;
}

.studio__pending-icon--image,
.message__attachment-icon--image {
  color: #06b6d4;
}

.studio__pending-icon--pdf,
.message__attachment-icon--pdf {
  color: #dc2626;
}

.studio__pending-icon--word,
.message__attachment-icon--word {
  color: #2563eb;
}

.studio__pending-icon--excel,
.message__attachment-icon--excel {
  color: #16a34a;
}

.studio__pending-icon--ppt,
.message__attachment-icon--ppt {
  color: #ea580c;
}

.studio__pending-icon--archive,
.message__attachment-icon--archive {
  color: #854d0e;
}

.studio__pending-icon--video,
.message__attachment-icon--video {
  color: #0891b2;
}

.studio__pending-icon--audio,
.message__attachment-icon--audio {
  color: #a855f7;
}

.studio__pending-icon--code,
.message__attachment-icon--code {
  color: #f59e0b;
}

.studio__pending-icon--default,
.message__attachment-icon--default {
  color: #6b7280;
}

.studio__pending-thumb {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  object-fit: cover;
}

.message__image-grid {
  display: grid;
  gap: 12px;
}

.message__image-progress {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 34%),
    radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 247, 250, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 14px 24px rgba(15, 23, 42, 0.04);
}

.message__image-progress--stopped {
  background:
    radial-gradient(circle at top right, rgba(148, 163, 184, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 246, 248, 0.98));
}

.message__image-progress-head {
  display: grid;
  gap: 6px;
}

.message__image-progress-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.message__image-progress-copy strong {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 800;
}

.message__image-progress-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: linear-gradient(135deg, #111827, #1e293b);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  box-shadow: 0 10px 18px rgba(17, 24, 39, 0.12);
}

.message__image-progress-note {
  color: #94a3b8;
  font-size: 0.68rem;
  line-height: 1.5;
}

.message__image-progress-rail {
  position: relative;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(226, 232, 240, 0.92), rgba(241, 245, 249, 0.98));
}

.message__image-progress-rail span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(90deg, #111827 0%, #4338ca 42%, #0ea5e9 100%);
  box-shadow:
    0 0 24px rgba(79, 70, 229, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: width 0.55s ease;
}

.message__editor {
  display: grid;
  gap: 10px;
}

.message__editor-input {
  width: 100%;
  min-height: 116px;
  padding: 12px 13px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  resize: vertical;
  line-height: 1.7;
  font-size: 0.84rem;
  outline: none;
}

.message__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.message__image-card {
  display: grid;
  gap: 10px;
}

.message__generated-image {
  width: 100%;
  display: block;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.message__image-meta {
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.6;
}

.message__image-link {
  width: fit-content;
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 700;
}

.message--user .message__image-meta,
.message--user .message__image-link {
  color: rgba(255, 255, 255, 0.76);
}

.studio__history-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  justify-content: flex-end;
  padding: 24px;
  background: rgba(15, 23, 42, 0.12);
}

.studio__history-drawer {
  width: min(100%, 368px);
  height: calc(100vh - 48px);
  max-height: calc(100vh - 48px);
  padding: 18px 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.09);
  display: grid;
  gap: 16px;
  overflow: hidden;
}

.studio__history-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.studio__history-title {
  color: #111827;
  font-size: 0.82rem;
  font-weight: 800;
}

.studio__history-note,
.studio__history-label,
.studio__history-meta,
.studio__history-empty {
  color: #9ca3af;
}

.studio__history-note,
.studio__history-empty {
  margin-top: 4px;
  font-size: 0.68rem;
  line-height: 1.5;
}

.studio__history-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.studio__history-clear {
  min-height: 28px;
  padding: 0 9px;
  border-radius: 9px;
  border: 1px solid var(--studio-border);
  background: #fff;
  color: #111827;
  font-size: 0.64rem;
  font-weight: 680;
}

.studio__history-close {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  border: 1px solid var(--studio-border);
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.studio__history-list {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.studio__history-group + .studio__history-group {
  margin-top: 14px;
}

.studio__history-label {
  margin-bottom: 10px;
  font-size: 0.66rem;
  font-weight: 800;
}

.studio__history-items {
  position: relative;
  display: grid;
  gap: 6px;
}

.studio__history-items::before {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 8px;
  width: 1px;
  background: rgba(148, 163, 184, 0.24);
}

.studio__history-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}

.studio__history-link {
  padding: 0;
  border: none;
  background: transparent;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  text-align: left;
  color: inherit;
}

.studio__history-dot {
  width: 8px;
  height: 8px;
  margin-top: 9px;
  border-radius: 999px;
  background: #111827;
  position: relative;
  z-index: 1;
}

.studio__history-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 8px 12px 10px;
  border-radius: 16px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.studio__history-item:hover .studio__history-copy,
.studio__history-item--active .studio__history-copy {
  background: #f8fafc;
}

.studio__history-item--active .studio__history-dot {
  background: #2563eb;
}

.studio__history-summary,
.studio__history-preview {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio__history-summary {
  color: #111827;
  font-size: 0.76rem;
  font-weight: 800;
}

.studio__history-preview {
  color: #6b7280;
  font-size: 0.68rem;
}

.studio__history-meta {
  font-size: 0.62rem;
  font-weight: 600;
}

.studio__history-delete {
  width: 26px;
  height: 26px;
  margin-top: 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.studio__pending {
  margin-top: 14px;
}

.studio__pending-remove {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.74);
  color: #20293c;
}

.studio__composer {
  margin-top: 14px;
  position: relative;
  padding: 12px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.1);
  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: border-color 0.18s var(--studio-ease), box-shadow 0.18s var(--studio-ease), transform 0.18s var(--studio-ease);
}

.studio__composer:focus-within {
  border-color: rgba(37, 99, 235, 0.26);
  box-shadow:
    0 0 0 3px var(--studio-focus),
    0 12px 34px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.studio__placeholder-flow {
  position: absolute;
  top: 13px;
  left: 13px;
  right: 13px;
  min-height: 96px;
  pointer-events: none;
  color: #94a3b8;
  line-height: 1.72;
  font-size: 0.86rem;
  white-space: pre-wrap;
}

.studio__placeholder-flow span::after {
  content: '';
  display: inline-block;
  width: 0.55ch;
  height: 1.05em;
  margin-left: 2px;
  border-radius: 999px;
  background: currentColor;
  vertical-align: -0.14em;
  animation: cursorBlink 0.95s steps(1) infinite;
}

.studio__input {
  width: 100%;
  min-height: 96px;
  resize: none;
  border: none;
  background: transparent;
  color: var(--studio-ink);
  line-height: 1.68;
  font-size: 0.9rem;
  outline: none;
}

.studio__input::placeholder {
  color: #8b94a5;
}

.studio__footer {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(15, 23, 42, 0.055);
}

.studio__footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.studio__footer-left {
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.studio__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.studio__upload {
  min-height: var(--studio-control-h);
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--studio-border);
  background: var(--studio-soft);
  color: #344054;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.66rem;
  font-weight: 680;
  cursor: pointer;
  transition: border-color 0.18s var(--studio-ease), background 0.18s var(--studio-ease), transform 0.18s var(--studio-ease), color 0.18s var(--studio-ease);
}

.studio__hint {
  color: #7b8797;
  font-size: 0.67rem;
}

.studio__busy-indicator {
  min-height: var(--studio-control-h);
  padding: 0 10px;
  border-radius: 10px;
  background: #f2f4f7;
  color: #475467;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.64rem;
  font-weight: 680;
}

.studio__submit {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(16, 24, 40, 0.2);
  background: #101828;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.67rem;
  font-weight: 740;
  box-shadow: 0 4px 10px rgba(16, 24, 40, 0.12);
  transition: transform 0.18s var(--studio-ease), box-shadow 0.18s var(--studio-ease), opacity 0.18s var(--studio-ease);
}

.studio__stop {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(180, 83, 9, 0.16);
  background: #fffbeb;
  color: #92400e;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.67rem;
  font-weight: 720;
  box-shadow: none;
}

.studio__submit:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.studio__mode-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(242, 244, 247, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.studio__utility-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: wrap;
}

.studio__ghost:hover,
.studio__choice:hover,
.studio__upload:hover,
.message__tool--icon:hover {
  transform: translateY(-1px);
}

.studio__chip:hover,
.studio__ghost:hover,
.studio__upload:hover,
.message__tool:hover {
  border-color: rgba(15, 23, 42, 0.16);
  background: #fff;
}

.studio__submit:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(16, 24, 40, 0.14);
}

.studio__chip:focus-visible,
.studio__ghost:focus-visible,
.studio__choice:focus-visible,
.studio__upload:focus-visible,
.studio__submit:focus-visible,
.studio__stop:focus-visible,
.message__tool:focus-visible,
.studio__pending-remove:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--studio-focus);
}

.studio__error {
  margin: 12px 0 0;
  color: #dc2626;
  font-size: 0.8rem;
}

.studio__spin {
  animation: spin 0.9s linear infinite;
}

.tools {
  display: grid;
  gap: clamp(30px, 4vw, 42px);
}

.tools--first {
  margin-top: 28px;
}

.tools__category {
  display: grid;
  gap: 18px;
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid var(--home-line);
  background: rgba(228, 235, 247, 0.78);
  backdrop-filter: blur(12px) saturate(110%);
  box-shadow: var(--home-shadow-soft);
}

.category-head__main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.category-head[data-tone='mint'] .category-head__icon {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(20, 184, 166, 0.12));
  color: #0f766e;
}

.category-head[data-tone='sunset'] .category-head__icon {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(244, 63, 94, 0.12));
  color: #c2410c;
}

.category-head[data-tone='violet'] .category-head__icon {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(96, 165, 250, 0.12));
  color: #6d28d9;
}

.category-head[data-tone='gold'] .category-head__icon {
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(251, 146, 60, 0.12));
  color: #b45309;
}

.category-head__icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(15, 23, 42, 0.06);
  flex-shrink: 0;
}

.category-head__icon-svg {
  width: 24px;
  height: 24px;
}

.category-head__text h3 {
  margin-top: 10px;
  color: var(--home-text-strong);
  font-size: clamp(1.24rem, 1.06rem + 0.4vw, 1.48rem);
  font-weight: 800;
}

.category-head__text p {
  margin-top: 6px;
  color: var(--home-text-muted);
  font-size: 0.94rem;
  line-height: 1.7;
}

.category-head__action {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--home-line-strong);
  background: rgba(255, 255, 255, 0.68);
  color: var(--home-text-main);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 680;
  cursor: pointer;
  transition: transform .18s var(--studio-ease), border-color .18s var(--studio-ease), background .18s var(--studio-ease), box-shadow .18s var(--studio-ease);
}

.category-head__action:hover {
  transform: translateY(-1px);
  background: #fff;
  border-color: rgba(15, 23, 42, 0.16);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05);
}

.tools__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--tool-grid-gap);
}

.tool-card__icon {
  width: var(--icon-lg);
  height: var(--icon-lg);
}

.baidu-push {
  margin-top: 48px;
}

.baidu-push__inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: 20px;
  border: 1px dashed var(--home-line-strong);
  background: rgba(255, 255, 255, 0.92);
}

.baidu-push__label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--home-text-muted);
}

.baidu-push__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--home-line-strong);
  background: #ffffff;
  color: var(--home-text-main);
  font-size: 0.7rem;
  font-weight: 680;
  cursor: pointer;
  transition: border-color .2s ease, background .2s ease;
}

.baidu-push__btn:hover {
  background: #f8fafc;
  border-color: rgba(100, 116, 139, 0.24);
}

.baidu-push__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.baidu-push__status {
  font-size: 0.82rem;
  font-weight: 600;
}

.baidu-push__status--ok { color: #10b981; }
.baidu-push__status--err { color: #ef4444; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes cursorBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

@keyframes floatOrb {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-10px) translateX(8px); }
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 0.72; }
  50% { transform: scale(1.2); opacity: 1; }
}

.history-overlay-enter-active,
.history-overlay-leave-active {
  transition: opacity 0.22s ease;
}

.history-overlay-enter-active .studio__history-drawer,
.history-overlay-leave-active .studio__history-drawer {
  transition: transform 0.26s ease, opacity 0.26s ease;
}

.history-overlay-enter-from,
.history-overlay-leave-to {
  opacity: 0;
}

.history-overlay-enter-from .studio__history-drawer,
.history-overlay-leave-to .studio__history-drawer {
  transform: translateX(24px);
  opacity: 0;
}

.message-fade-enter-active,
.message-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 820px) {
  .home {
    --tool-grid-gap: clamp(10px, 2.4vw, 14px);
    --tool-card-max-width: none;
    --tool-card-height: clamp(158px, 24vw, 190px);
    --tool-card-radius: clamp(18px, 3.4vw, 22px);
    --tool-card-padding-y: clamp(12px, 2.8vw, 16px);
    --tool-card-padding-x: clamp(10px, 2.6vw, 14px);
    --tool-card-gap: clamp(6px, 1.6vw, 8px);
    --tool-card-icon-box: clamp(38px, 5.8vw, 46px);
    --tool-card-icon-radius: clamp(12px, 2vw, 14px);
    --tool-card-title-size: clamp(0.82rem, 1.55vw + 0.44rem, 0.94rem);
    --tool-card-title-hover-size: clamp(0.84rem, 1.6vw + 0.46rem, 0.98rem);
    --tool-card-desc-size: clamp(0.7rem, 1.1vw + 0.48rem, 0.78rem);
    --tool-card-desc-line-height: 1.5;
    --tool-card-desc-expand-height: 48px;
  }

  .tools__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .category-head {
    align-items: flex-start;
    flex-direction: column;
    padding: clamp(18px, 3.2vw, 22px);
  }

  .category-head__action {
    width: auto;
    justify-content: center;
  }
}

@media (max-width: 760px) {
  .studio__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .studio__footer-actions {
    width: 100%;
  }

  .studio__nav {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .studio__utility-actions {
    justify-content: flex-start;
  }

  .studio__submit,
  .studio__stop {
    width: auto;
    justify-content: center;
  }

  .studio__history-head,
  .studio__history-item {
    align-items: flex-start;
  }

  .message {
    max-width: 100%;
  }

  .message--assistant {
    max-width: 100%;
  }

  .message__avatar {
    width: 28px;
    height: 28px;
    border-radius: 10px;
  }
}

@media (max-width: 640px) {
  .home {
    --tool-grid-gap: clamp(10px, 3.1vw, 12px);
    --tool-card-height: clamp(146px, 40vw, 176px);
    --tool-card-radius: clamp(17px, 4.2vw, 20px);
    --tool-card-padding-y: clamp(11px, 3vw, 14px);
    --tool-card-padding-x: clamp(10px, 2.7vw, 12px);
    --tool-card-gap: clamp(5px, 1.8vw, 7px);
    --tool-card-icon-box: clamp(34px, 10vw, 40px);
    --tool-card-icon-radius: clamp(11px, 3vw, 13px);
    --tool-card-title-size: clamp(0.76rem, 2.7vw + 0.22rem, 0.88rem);
    --tool-card-title-hover-size: clamp(0.8rem, 2.9vw + 0.22rem, 0.92rem);
    --tool-card-desc-size: clamp(0.64rem, 2.3vw + 0.18rem, 0.74rem);
    --tool-card-desc-line-height: 1.44;
    --tool-card-desc-lines: 2;
    --tool-card-desc-expand-height: 42px;
    padding-inline: clamp(14px, 4vw, 16px);
    padding-bottom: 84px;
  }

  .category-head,
  .studio__composer {
    padding: 18px;
    border-radius: 24px;
  }

  .studio__messages {
    max-height: 440px;
    padding: 8px 6px;
  }

  .studio__chip {
    min-height: 28px;
    padding-inline: 9px;
  }

  .studio__choice,
  .studio__ghost,
  .studio__upload,
  .studio__submit,
  .studio__stop {
    min-height: 30px;
  }

  .message__content {
    font-size: 0.86rem;
  }

  .message--assistant .message__surface {
    padding-left: 12px;
  }

  .category-head {
    gap: 14px;
  }

  .category-head__main {
    align-items: flex-start;
    gap: 12px;
  }

  .category-head__icon {
    width: 46px;
    height: 46px;
    border-radius: 14px;
  }

  .category-head__icon-svg {
    width: 20px;
    height: 20px;
  }

  .category-head__text h3 {
    margin-top: 4px;
    font-size: 1.06rem;
  }

  .category-head__text p {
    font-size: 0.82rem;
    line-height: 1.55;
  }

  .tool-card__icon {
    width: clamp(18px, 5vw, 20px);
    height: clamp(18px, 5vw, 20px);
  }

  .hero-title {
    font-size: clamp(2.4rem, 10vw, 4rem);
  }

  .studio__footer-left {
    width: 100%;
  }

  .studio__history-copy {
    padding-inline: 10px;
  }

  .studio__history-list,
  .studio__messages {
    max-height: 460px;
  }

  .studio__history-overlay {
    padding: 0;
    align-items: stretch;
  }

  .studio__history-drawer {
    width: min(100%, 100vw);
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
}

@media (max-width: 420px) {
  .home {
    --tool-grid-gap: clamp(8px, 2.8vw, 10px);
    --tool-card-height: clamp(134px, 39vw, 150px);
    --tool-card-padding-y: clamp(10px, 2.8vw, 12px);
    --tool-card-padding-x: clamp(9px, 2.6vw, 11px);
    --tool-card-icon-box: clamp(32px, 9.6vw, 36px);
    --tool-card-title-size: clamp(0.72rem, 3vw + 0.12rem, 0.8rem);
    --tool-card-title-hover-size: clamp(0.74rem, 3vw + 0.16rem, 0.84rem);
    --tool-card-desc-size: clamp(0.6rem, 2.4vw + 0.14rem, 0.68rem);
    --tool-card-desc-line-height: 1.38;
    padding-inline: 14px;
  }

  .tools {
    gap: 24px;
  }

  .tools__category {
    gap: 14px;
  }

  .tools__grid {
    gap: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .message__surface,
  .studio__history-copy,
  .studio__history-drawer,
  .studio__chip,
  .studio__pending-item,
  .studio__submit,
  .studio__stop,
  .message__image-progress-rail span {
    transition: none;
  }

  .message__content--streaming::after,
  .studio__spin,
  .message__status-dot,
  .studio__placeholder-flow span::after {
    animation: none;
  }

  .history-overlay-enter-active,
  .history-overlay-leave-active,
  .message-fade-enter-active,
  .message-fade-leave-active {
    transition: none;
  }
}
</style>
