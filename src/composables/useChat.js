import { ref } from 'vue'
import { aiClient } from '../services/aiClient'
import { useAccountStore } from '../stores/accountStore'

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

  // 流式输出
  const sendMessageStream = async (messages, onChunk) => {
    loading.value = true
    error.value = null
    result.value = ''
    streamingText.value = ''

    try {
      const response = await aiClient.chat.stream({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 8192,
        stream: true,
      }, { featureCode })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

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
        }
      }

      result.value = fullText
      if (featureCode) {
        account.refreshDashboard().catch(() => {})
      }
      return fullText
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // 普通请求
  const sendMessage = async (messages) => {
    loading.value = true
    error.value = null
    result.value = ''

    try {
      const data = await aiClient.chat.complete({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 8192,
      }, { featureCode })
      const responseText = data?.output
        ? data.output
            .flatMap(item => item.content || [])
            .filter(item => item.type === 'output_text')
            .map(item => item.text)
            .join('')
        : ''
      result.value = responseText || data.choices?.[0]?.message?.content || ''
      if (featureCode) {
        account.refreshDashboard().catch(() => {})
      }
      return result.value
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, result, streamingText, sendMessage, sendMessageStream }
}
