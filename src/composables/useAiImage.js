import { ref } from 'vue'
import { aiClient } from '../services/aiClient'
import { normalizeModelError } from '../services/modelError'
import { useAccountStore } from '../stores/accountStore'

const isAbortError = (error) => (
  error?.name === 'AbortError'
  || error?.code === 'ABORT_ERR'
  || error?.isAbort === true
)

const createAbortError = () => {
  const error = new Error('已停止')
  error.name = 'AbortError'
  error.code = 'ABORT_ERR'
  error.isAbort = true
  return error
}

const toImageUrl = (item) => {
  if (item?.url) return item.url
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
  return ''
}

const normalizeImages = (payload) => {
  const data = Array.isArray(payload?.data) ? payload.data : []
  return data
    .map((item, index) => ({
      id: `${payload?.created || Date.now()}-${index}`,
      url: toImageUrl(item),
      revisedPrompt: item?.revised_prompt || '',
    }))
    .filter(item => item.url)
}

export function useAiImage(featureCode = 'ai-image') {
  const loading = ref(false)
  const error = ref(null)
  const images = ref([])
  const raw = ref(null)
  const progress = ref(0)
  const progressLabel = ref('')
  const account = useAccountStore()
  let activeController = null
  let progressTimer = 0

  const progressStages = [
    { limit: 14, label: '正在理解提示词' },
    { limit: 34, label: '正在搭建画面构图' },
    { limit: 58, label: '正在补充主体细节' },
    { limit: 82, label: '正在整理光影质感' },
    { limit: 92, label: '正在输出最终画面' },
  ]

  const emitProgress = (value, label, onProgress) => {
    progress.value = value
    progressLabel.value = label
    onProgress?.({ value, label })
  }

  const stopProgress = () => {
    if (progressTimer && typeof window !== 'undefined') {
      window.clearInterval(progressTimer)
    }
    progressTimer = 0
  }

  const startProgress = (onProgress) => {
    stopProgress()
    emitProgress(6, progressStages[0].label, onProgress)

    if (typeof window === 'undefined') return

    progressTimer = window.setInterval(() => {
      const current = progress.value
      const stage = progressStages.find(item => current < item.limit) || progressStages.at(-1)
      if (!stage) return

      const next = Math.min(stage.limit, current + Math.max(2, Math.round((stage.limit - current) * 0.32)))
      emitProgress(next, stage.label, onProgress)

      if (next >= progressStages.at(-1).limit) {
        stopProgress()
      }
    }, 900)
  }

  const stop = () => {
    activeController?.abort()
    stopProgress()
    loading.value = false
  }

  const generate = async (payload, options = {}) => {
    const controller = new AbortController()
    activeController = controller
    loading.value = true
    error.value = null
    raw.value = null
    images.value = []
    startProgress(options.onProgress)

    try {
      const data = await aiClient.images.generate(payload, { featureCode, signal: controller.signal })
      raw.value = data
      images.value = normalizeImages(data)
      if (!images.value.length) {
        throw normalizeModelError(new Error('empty image response'))
      }
      stopProgress()
      emitProgress(100, '图片已生成', options.onProgress)
      if (featureCode) {
        account.refreshDashboard().catch(() => {})
      }
      return images.value
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) {
        stopProgress()
        emitProgress(progress.value || 0, '已停止', options.onProgress)
        const aborted = createAbortError()
        error.value = aborted.message
        throw aborted
      }
      const normalized = normalizeModelError(e)
      raw.value = null
      images.value = []
      error.value = normalized.message
      stopProgress()
      emitProgress(0, '', options.onProgress)
      throw normalized
    } finally {
      if (activeController === controller) {
        activeController = null
      }
      loading.value = false
    }
  }

  return {
    loading,
    error,
    images,
    raw,
    progress,
    progressLabel,
    generate,
    stop,
  }
}
