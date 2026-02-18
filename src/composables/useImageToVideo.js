import { ref } from 'vue'

const VIDEO_API_URL = '/api/video'

export function useImageToVideo() {
  const loading = ref(false)
  const error = ref(null)
  const videoUrl = ref('')
  const status = ref('')
  const progress = ref(0)
  const requestId = ref('')

  let pollTimer = null

  /**
   * 将 File 对象转为 base64 data URI
   */
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const submitVideo = async (prompt, imageBase64, retryCount = 0) => {
    const response = await fetch(`${VIDEO_API_URL}?action=submit&mode=i2v`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_url: imageBase64 }),
    })

    if (response.status === 429 && retryCount < 3) {
      console.log(`[I2V] 提交限流，${10 + retryCount * 10}秒后重试...`)
      await new Promise(r => setTimeout(r, (10 + retryCount * 10) * 1000))
      return submitVideo(prompt, imageBase64, retryCount + 1)
    }

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.detail || errData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('[I2V Submit Response]', data)
    return data.requestId
  }

  const checkStatus = async (rid, retryCount = 0) => {
    const response = await fetch(`${VIDEO_API_URL}?action=status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: rid }),
    })

    if (response.status === 429 && retryCount < 3) {
      console.log(`[I2V] 限流，${5 + retryCount * 5}秒后重试...`)
      await new Promise(r => setTimeout(r, (5 + retryCount * 5) * 1000))
      return checkStatus(rid, retryCount + 1)
    }

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.detail || errData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 图生视频
   * @param {File} file - 图片文件
   * @param {string} prompt - 描述视频动作的提示词
   */
  const generateVideo = async (file, prompt) => {
    loading.value = true
    error.value = null
    videoUrl.value = ''
    status.value = 'uploading'
    progress.value = 5

    try {
      // 图片转 base64
      const imageBase64 = await fileToBase64(file)
      status.value = 'submitting'
      progress.value = 10

      // 提交请求
      const rid = await submitVideo(prompt, imageBase64)
      requestId.value = rid
      status.value = 'processing'
      progress.value = 15

      // 轮询状态
      return new Promise((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 120

        const poll = async () => {
          try {
            attempts++
            const result = await checkStatus(rid)
            console.log(`[I2V Poll #${attempts}]`, result)

            progress.value = Math.min(15 + attempts * 0.7, 95)

            if (result.status === 'SUCCESS') {
              clearInterval(pollTimer)
              pollTimer = null
              progress.value = 100
              status.value = 'completed'

              const url = result.videoUrl
              if (!url) {
                throw new Error('未能获取到视频URL')
              }

              videoUrl.value = url
              loading.value = false
              resolve(url)
            } else if (result.status === 'FAIL') {
              clearInterval(pollTimer)
              pollTimer = null
              status.value = 'failed'
              loading.value = false
              reject(new Error('视频生成失败'))
            } else if (attempts >= maxAttempts) {
              clearInterval(pollTimer)
              pollTimer = null
              status.value = 'timeout'
              loading.value = false
              reject(new Error('视频生成超时，请稍后重试'))
            }
          } catch (e) {
            clearInterval(pollTimer)
            pollTimer = null
            status.value = 'error'
            loading.value = false
            reject(e)
          }
        }

        poll()
        pollTimer = setInterval(poll, 5000)
      })
    } catch (e) {
      error.value = e.message
      status.value = 'error'
      loading.value = false
      throw e
    }
  }

  const cancel = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    loading.value = false
    status.value = 'cancelled'
  }

  const reset = () => {
    cancel()
    error.value = null
    videoUrl.value = ''
    status.value = ''
    progress.value = 0
    requestId.value = ''
  }

  return {
    loading,
    error,
    videoUrl,
    status,
    progress,
    requestId,
    generateVideo,
    cancel,
    reset,
  }
}
