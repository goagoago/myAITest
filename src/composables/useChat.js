import { ref } from 'vue'

// 智谱API配置
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 从环境变量获取 API Key
const getApiKey = () => {
  const key = import.meta.env.VITE_ZHIPU_API_KEY
  if (!key) {
    throw new Error('请配置 VITE_ZHIPU_API_KEY 环境变量')
  }
  return key
}

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
      const requestBody = {
        model: 'glm-4-flash',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 8192,
        stream: true,
      }

      const response = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || errData.msg || `HTTP ${response.status}`)
      }

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
      const requestBody = {
        model: 'glm-4-flash',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 8192,
      }

      const response = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || errData.msg || `HTTP ${response.status}`)
      }

      const data = await response.json()
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
