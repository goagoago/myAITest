import { ref } from 'vue'
import { aiClient } from '../services/aiClient'
import { normalizeModelError } from '../services/modelError'
import { useAccountStore } from '../stores/accountStore'

const isAbortError = (error) => (
  error?.name === 'AbortError'
  || error?.code === 'ABORT_ERR'
  || error?.isAbort === true
)

const createAbortError = (partialText = '') => {
  const error = new Error('已停止')
  error.name = 'AbortError'
  error.code = 'ABORT_ERR'
  error.isAbort = true
  error.partialText = partialText
  return error
}

/**
 * 聊天 composable
 * 通过服务端代理 /api/chat 调用 AI 接口，API Key 不暴露到前端
 */
export function useChat(featureCode = '') {
  const loading = ref(false)
  const error = ref(null)
  const result = ref('')
  const streamingText = ref('')
  const account = useAccountStore()
  let activeController = null
  let activeReader = null

  const stop = () => {
    activeReader?.cancel('aborted by user').catch(() => {})
    activeController?.abort()
    loading.value = false
  }

  // 流式输出
  const sendMessageStream = async (messages, onChunk) => {
    const controller = new AbortController()
    activeController = controller
    loading.value = true
    error.value = null
    result.value = ''
    streamingText.value = ''
    let fullText = ''

    try {
      const response = await aiClient.chat.stream({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 8192,
        stream: true,
      }, { featureCode, signal: controller.signal })

      const reader = response.body.getReader()
      activeReader = reader
      const decoder = new TextDecoder()
      let pending = ''

      const handleSseLine = (line) => {
        if (!line.startsWith('data:')) return

        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          let content = ''
          if (parsed.type === 'response.output_text.delta') {
            content = parsed.delta || ''
          } else if (parsed.type === 'response.output_text' || parsed.type === 'response.output_text.done') {
            content = parsed.text || ''
          } else {
            content = parsed.choices?.[0]?.delta?.content || ''
          }

          if (content) {
            fullText += content
            streamingText.value = fullText
            if (onChunk) onChunk(content, fullText)
          }
        } catch {}
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        pending += decoder.decode(value, { stream: true })
        const lines = pending.split('\n')
        pending = lines.pop() || ''

        for (const line of lines) {
          handleSseLine(line)
        }
      }

      if (pending.trim()) {
        handleSseLine(pending.trim())
      }

      if (!fullText.trim()) {
        throw normalizeModelError(new Error('empty model response'))
      }

      result.value = fullText
      if (featureCode) {
        account.refreshDashboard().catch(() => {})
      }
      return fullText
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) {
        const aborted = createAbortError(fullText)
        result.value = fullText
        streamingText.value = fullText
        error.value = aborted.message
        throw aborted
      }
      const normalized = normalizeModelError(e)
      result.value = ''
      streamingText.value = ''
      error.value = normalized.message
      throw normalized
    } finally {
      activeReader = null
      if (activeController === controller) {
        activeController = null
      }
      loading.value = false
    }
  }

  // 普通请求
  const sendMessage = async (messages) => {
    const controller = new AbortController()
    activeController = controller
    loading.value = true
    error.value = null
    result.value = ''

    try {
      const data = await aiClient.chat.complete({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 8192,
      }, { featureCode, signal: controller.signal })
      const responseText = data?.output
        ? data.output
            .flatMap(item => item.content || [])
            .filter(item => item.type === 'output_text')
            .map(item => item.text)
            .join('')
        : ''
      result.value = responseText || data.choices?.[0]?.message?.content || ''
      if (!String(result.value || '').trim()) {
        throw normalizeModelError(new Error('empty model response'))
      }
      if (featureCode) {
        account.refreshDashboard().catch(() => {})
      }
      return result.value
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) {
        const aborted = createAbortError(result.value)
        error.value = aborted.message
        throw aborted
      }
      const normalized = normalizeModelError(e)
      result.value = ''
      streamingText.value = ''
      error.value = normalized.message
      throw normalized
    } finally {
      if (activeController === controller) {
        activeController = null
      }
      loading.value = false
    }
  }

  return { loading, error, result, streamingText, sendMessage, sendMessageStream, stop }
}
