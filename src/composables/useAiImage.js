import { ref } from 'vue'
import { aiClient } from '../services/aiClient'
import { buildApiUrl } from '../services/apiClient'
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

const FORCE_HTTPS_HOSTS = new Set(['www.xu-it.com', 'xu-it.com'])

const toDataUrl = (item) => {
  const raw = item?.b64_json || item?.base64 || item?.b64
  return raw ? `data:image/png;base64,${raw}` : ''
}

const resolveRawUrl = (item) => {
  if (typeof item?.url === 'string' && item.url) return item.url
  if (typeof item?.image_url === 'string' && item.image_url) return item.image_url
  if (typeof item?.imageUrl === 'string' && item.imageUrl) return item.imageUrl
  if (typeof item?.output_url === 'string' && item.output_url) return item.output_url
  if (typeof item?.image_url?.url === 'string' && item.image_url.url) return item.image_url.url
  return ''
}

const normalizeRemoteUrl = (value) => {
  if (!value) return ''
  const resolved = /^(?:https?:)?\/\//.test(value)
    ? value
    : buildApiUrl(value)
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(resolved, base)
    if (parsed.protocol === 'http:' && (
      FORCE_HTTPS_HOSTS.has(parsed.hostname)
      || (typeof window !== 'undefined' && window.location.protocol === 'https:')
    )) {
      parsed.protocol = 'https:'
    }
    return parsed.toString()
  } catch {
    return resolved
  }
}

const toImageAsset = (item) => {
  const dataUrl = toDataUrl(item)
  const remoteUrl = normalizeRemoteUrl(resolveRawUrl(item))
  const displayUrl = dataUrl || remoteUrl || ''

  return {
    url: remoteUrl || displayUrl,
    displayUrl,
    downloadUrl: dataUrl || remoteUrl || displayUrl,
  }
}

const normalizeImages = (payload) => {
  const data = Array.isArray(payload?.data) ? payload.data : []
  return data
    .map((item, index) => {
      const asset = toImageAsset(item)
      return {
        id: `${payload?.created || Date.now()}-${index}`,
        url: asset.url,
        displayUrl: asset.displayUrl,
        downloadUrl: asset.downloadUrl,
        revisedPrompt: item?.revised_prompt || '',
      }
    })
    .filter(item => item.displayUrl)
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
      if (data?.billingToken) {
        await aiClient.images.confirm(data.billingToken, { featureCode, signal: controller.signal })
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
