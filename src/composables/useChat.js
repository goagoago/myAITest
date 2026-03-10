import { ref } from 'vue'
import { aiClient } from '../services/aiClient'

/**
 * 聊天 composable
 * 通过服务端代理 /api/chat 调用 AI 接口，API Key 不暴露到前端
 */
export function useChat() {
  const loading = ref(false)
  const error = ref(null)
  const result = ref('')
  const streamingText = ref('')

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
      })

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
              const content = parsed.choices?.[0]?.delta?.content || ''
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
      })
      result.value = data.choices?.[0]?.message?.content || ''
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
