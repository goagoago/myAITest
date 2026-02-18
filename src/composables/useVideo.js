import { ref } from 'vue'

const VIDEO_API_URL = '/api/video'

export function useVideo() {
  const loading = ref(false)
  const error = ref(null)
  const videoUrl = ref('')
  const status = ref('')
  const progress = ref(0)
  const requestId = ref('')

  let pollTimer = null
  let cancelled = false

  const submitVideo = async (prompt, retryCount = 0) => {
    if (cancelled) throw new Error('已取消')

    const response = await fetch(`${VIDEO_API_URL}?action=submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })

    if (response.status === 429 && retryCount < 3) {
      const waitSec = 10 + retryCount * 10
      status.value = 'rate_limited'
      error.value = `模型访问量过大，${waitSec}秒后自动重试（第${retryCount + 1}次）...`
      console.log(`[Video] 提交限流，${waitSec}秒后重试...`)
      await new Promise(r => setTimeout(r, waitSec * 1000))
      if (cancelled) throw new Error('已取消')
      error.value = null
      return submitVideo(prompt, retryCount + 1)
    }

    if (response.status === 429) {
      throw new Error('模型当前访问量过大，请稍后再试')
    }

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.detail || errData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('[Video Submit Response]', data)
    return data.requestId
  }

  const checkStatus = async (rid, retryCount = 0) => {
    if (cancelled) throw new Error('已取消')

    const response = await fetch(`${VIDEO_API_URL}?action=status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: rid }),
    })

    if (response.status === 429 && retryCount < 3) {
      const waitSec = 5 + retryCount * 5
      console.log(`[Video] 限流，${waitSec}秒后重试...`)
      await new Promise(r => setTimeout(r, waitSec * 1000))
      if (cancelled) throw new Error('已取消')
      return checkStatus(rid, retryCount + 1)
    }

    if (response.status === 429) {
      throw new Error('模型当前访问量过大，请稍后再试')
    }

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.detail || errData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  }

  const generateVideo = async (prompt) => {
    loading.value = true
    error.value = null
    videoUrl.value = ''
    status.value = 'submitting'
    progress.value = 5
    cancelled = false

    try {
      // 提交请求
      const rid = await submitVideo(prompt)
      requestId.value = rid
      status.value = 'processing'
      progress.value = 15

      // 轮询状态
      return new Promise((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 120 // 最多轮询10分钟（每5秒一次）

        const poll = async () => {
          if (cancelled) {
            clearInterval(pollTimer)
            pollTimer = null
            return
          }

          try {
            attempts++
            const result = await checkStatus(rid)

            // 调试输出
            console.log(`[Video Poll #${attempts}]`, result)

            // 更新进度 (15% - 95%)
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
            // PROCESSING 状态继续轮询
          } catch (e) {
            if (cancelled) return
            clearInterval(pollTimer)
            pollTimer = null
            status.value = 'error'
            loading.value = false
            reject(e)
          }
        }

        // 立即执行一次，然后每5秒轮询
        poll()
        pollTimer = setInterval(poll, 5000)
      })
    } catch (e) {
      if (cancelled) return
      error.value = e.message
      status.value = 'error'
      loading.value = false
      throw e
    }
  }

  const cancel = () => {
    cancelled = true
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    loading.value = false
    status.value = 'cancelled'
    error.value = null
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
