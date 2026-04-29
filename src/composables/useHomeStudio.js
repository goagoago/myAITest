import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { marked } from 'marked'
import { File, FileImage, FileText, FileSpreadsheet, MonitorPlay, Music, Presentation, Archive } from 'lucide-vue-next'
import { useBaiduPush } from './useBaiduPush'
import { useChat } from './useChat'
import { useAiImage } from './useAiImage'
import { useAccountStore } from '../stores/accountStore'

export function useHomeStudio() {
  const CHAT_RETENTION_MS = 1000 * 60 * 60 * 24 * 7
  const MAX_ATTACHMENTS = 4
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  const ATTACHMENT_TEXT_LIMIT = 12000
  const PDF_PAGE_LIMIT = 8
  const IMAGE_OUTPUT_SIZE = '1024x1024'
  const CHAT_ACCEPTED_FILE_TYPES = [
    'image/*',
    '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm', '.rtf',
    '.pdf', '.docx', '.docm', '.xlsx', '.xls', '.xlsm',
  ]
  const IMAGE_REFERENCE_FILE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
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
      label: 'AI 生图（gpt-image）',
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
  const attachmentAccept = computed(() => (
    studioMode.value === 'image'
      ? IMAGE_REFERENCE_FILE_TYPES.join(',')
      : CHAT_ACCEPTED_FILE_TYPES.join(',')
  ))
  const attachmentHint = computed(() => {
    if (attachmentLoading.value) {
      return studioMode.value === 'image' ? '读取参考图中...' : '解析附件中...'
    }
    return studioMode.value === 'image'
      ? '可上传 PNG / JPG / WEBP 参考图'
      : currentModeMeta.value.hint
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
  const resolveImageDownloadExtension = (url = '', contentType = '') => {
    const type = String(contentType || '').toLowerCase()
    if (type.includes('png')) return 'png'
    if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
    if (type.includes('webp')) return 'webp'
    if (type.includes('gif')) return 'gif'
    const pathname = (() => {
      try {
        return new URL(url).pathname || ''
      } catch {
        return ''
      }
    })()
    const match = pathname.match(/\.([a-z0-9]+)$/i)
    return match?.[1]?.toLowerCase() || 'png'
  }
  const triggerDirectDownload = (href, filename) => {
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  const isLocalDownloadableUrl = (value = '') => value.startsWith('data:') || value.startsWith('blob:')
  const downloadStudioImage = async ({ image, index = 0 } = {}) => {
    const displayUrl = String(image?.displayUrl || '')
    const downloadUrl = String(image?.downloadUrl || '')
    const rawUrl = String(image?.url || '')
    const candidates = [
      displayUrl,
      downloadUrl,
      rawUrl,
    ].filter(Boolean)

    const targetUrl = candidates[0]
    if (!targetUrl || typeof window === 'undefined' || typeof document === 'undefined') return
    studioError.value = ''
    const filename = `toolsbox-ai-image-${Date.now()}-${index + 1}.${resolveImageDownloadExtension(targetUrl)}`

    const localCandidate = candidates.find(isLocalDownloadableUrl)

    if (localCandidate) {
      triggerDirectDownload(localCandidate, filename)
      return
    }

    if (isLocalDownloadableUrl(targetUrl)) {
      triggerDirectDownload(targetUrl, filename)
      return
    }

    try {
      const response = await fetch(targetUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const extension = resolveImageDownloadExtension(targetUrl, blob.type || response.headers.get('content-type'))
      triggerDirectDownload(objectUrl, `toolsbox-ai-image-${Date.now()}-${index + 1}.${extension}`)
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl)
      }, 1000)
    } catch (error) {
      try {
        const fallbackUrl = candidates.find(item => item !== targetUrl) || targetUrl
        triggerDirectDownload(fallbackUrl, filename)
      } catch {
        studioError.value = error instanceof Error && error.message
          ? `下载失败：${error.message}`
          : '下载失败，请稍后重试'
      }
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
                downloadUrl: image.downloadUrl || image.url,
                displayUrl: image.displayUrl || image.url,
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
  const isReferenceImageFile = (file) => {
    const type = (file.type || '').toLowerCase()
    const ext = getFileExtension(file.name)
    return ['image/png', 'image/jpeg', 'image/webp'].includes(type)
      || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)
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
    if (studioMode.value === 'image' && targets.some(file => !isReferenceImageFile(file))) {
      studioError.value = '生图模式仅支持 PNG / JPG / WEBP 参考图'
      return
    }
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
    if (!['chat', 'image'].includes(studioMode.value)) return
    e.preventDefault()
    e.stopPropagation()
    dragActive.value = true
  }

  const onDragOver = (e) => {
    if (!['chat', 'image'].includes(studioMode.value)) return
    e.preventDefault()
    e.stopPropagation()
    dragActive.value = true
  }

  const onDragLeave = (e) => {
    if (!['chat', 'image'].includes(studioMode.value)) return
    e.preventDefault()
    e.stopPropagation()
    dragActive.value = false
  }

  const onDrop = async (e) => {
    if (!['chat', 'image'].includes(studioMode.value)) return
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
  const buildImagePayload = (prompt, attachments = []) => {
    const payload = {
      prompt,
      size: IMAGE_OUTPUT_SIZE,
    }
    const referenceImages = attachments
      .filter(item => item.kind === 'image' && item.dataUrl)
      .map(item => ({
        image_url: item.dataUrl,
      }))

    if (referenceImages.length) {
      payload.images = referenceImages
    }

    return payload
  }
  const buildChatHistory = (messages, sessionId, excludedMessageId = '') => messages
    .filter(item => item.sessionId === sessionId && item.mode === 'chat' && item.kind === 'text' && item.content && !item.system)
    .filter(item => item.id !== excludedMessageId)
    .map(item => ({
      role: item.role,
      content: item.payloadContent || item.content,
    }))
  const buildChatAssistantMessage = ({ turnId, sessionId, createdAt = Date.now() }) => ({
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
  })
  const buildImageAssistantMessage = ({ turnId, sessionId, createdAt = Date.now() }) => ({
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
  })
  const replaceMessageAndTrimSession = (message, content) => {
    const targetIndex = studioMessages.value.findIndex(item => item.id === message.id)
    if (targetIndex < 0) return null

    const targetMessage = studioMessages.value[targetIndex]
    const sessionId = targetMessage.sessionId
    const nextMessages = studioMessages.value
      .map((item, index) => {
        if (index !== targetIndex) return item
        const nextItem = {
          ...item,
          content,
        }
        if (item.mode === 'chat') {
          nextItem.payloadContent = content
        }
        return nextItem
      })
      .filter((item, index) => !(item.sessionId === sessionId && index > targetIndex))

    return {
      sessionId,
      nextMessages,
      updatedTarget: nextMessages.find(item => item.id === message.id) || null,
    }
  }

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
  const generateImageReply = async ({ prompt, assistantMessage, payload = null }) => {
    try {
      const images = await generateAiImage(payload || {
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

  const submitChat = async (content, attachments = []) => {
    const sessionId = ensureCurrentSessionId('chat')
    const history = buildChatHistory(studioMessages.value, sessionId)

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
    const assistantMessage = buildChatAssistantMessage({ turnId, sessionId, createdAt })

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

  const submitImage = async (content, attachments = []) => {
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
      attachments: toDisplayAttachments(attachments),
      turnId,
      sessionId,
      createdAt,
    }
    const assistantMessage = buildImageAssistantMessage({ turnId, sessionId, createdAt })

    studioMessages.value = [...studioMessages.value, userMessage, assistantMessage]
    activeRunMode.value = 'image'
    activeAssistantMessageId.value = assistantMessage.id
    selectedHistoryTurnId.value = turnId
    composerInput.value = ''
    pendingAttachments.value = []
    studioError.value = ''
    syncTimeline()
    await generateImageReply({
      prompt,
      assistantMessage,
      payload: buildImagePayload(prompt, attachments),
    })
  }

  const saveEditedMessage = async (message) => {
    if (!canEditMessage(message) || studioBusy.value) return
    const content = editingDraft.value.trim()
    if (!content) return

    const replayContext = replaceMessageAndTrimSession(message, content)
    if (!replayContext?.updatedTarget) return

    const { nextMessages, sessionId, updatedTarget } = replayContext
    const assistantMessage = updatedTarget.mode === 'image'
      ? buildImageAssistantMessage({
          turnId: updatedTarget.turnId,
          sessionId,
        })
      : buildChatAssistantMessage({
          turnId: updatedTarget.turnId,
          sessionId,
        })

    applyMessages([...nextMessages, assistantMessage])
    currentSessionId.value = sessionId
    studioMode.value = updatedTarget.mode
    activeRunMode.value = updatedTarget.mode
    activeAssistantMessageId.value = assistantMessage.id
    selectedHistoryTurnId.value = updatedTarget.turnId
    studioError.value = ''
    clearEditingState()
    syncTimeline()

    if (updatedTarget.mode === 'image') {
      await generateImageReply({
        prompt: content,
        assistantMessage,
      })
      return
    }

    await streamChatReply({
      history: buildChatHistory(nextMessages, sessionId, updatedTarget.id),
      payloadContent: content,
      assistantMessage,
    })
  }

  const submitStudio = async (preset = '') => {
    const content = (preset || composerInput.value).trim()
    if (studioMode.value === 'image') {
      await submitImage(content, pendingAttachments.value)
      return
    }
    if (!content && !pendingAttachments.value.length) return
    await submitChat(content, pendingAttachments.value)
  }

  return {
    isDev,
    pushLoading,
    pushResult,
    pushError,
    pushUrls,
    studioSection,
    studioTimeline,
    composerInput,
    studioMode,
    pendingAttachments,
    studioError,
    dragActive,
    historyPanelOpen,
    selectedHistoryTurnId,
    copiedMessageId,
    placeholderFlowText,
    fileInput,
    studioModes,
    visibleStudioMessages,
    hasMessages,
    composerPlaceholder,
    composerActionLabel,
    composerBusyLabel,
    attachmentAccept,
    attachmentHint,
    latestMessageId,
    showPlaceholderFlow,
    canSubmit,
    renderMarkdown,
    resolveAttachmentIcon,
    canEditMessage,
    isEditingMessage,
    clearEditingState,
    startEditingMessage,
    copyAssistantMessage,
    downloadStudioImage,
    startNewConversation,
    isPendingAssistantMessage,
    showImageProgress,
    interruptStudio,
    syncTimeline,
    historyTurnsCount,
    hasHistory,
    historyGroups,
    formatHistoryTime,
    selectHistoryTurn,
    deleteTurn,
    removeAttachment,
    closeHistoryPanel,
    setStudioMode,
    resetStudio,
    formatFileSize,
    handleFiles,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    saveEditedMessage,
    submitStudio,
    studioBusy,
    canInterrupt,
    studioFeatureCode,
    showSuggestions,
    activeSuggestions,
    composerFocused,
    editingDraft,
    highlightedTurnId,
    studioMessages,
  }
}
