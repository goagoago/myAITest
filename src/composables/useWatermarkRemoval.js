import { ref } from 'vue'

const WATERMARK_API_URL = '/api/watermark-removal'

export function useWatermarkRemoval() {
  const loading = ref(false)
  const error = ref(null)
  const resultImageUrl = ref('')
  const progress = ref(0)

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

  /**
   * 去除图片水印
   * @param {File} file - 图片文件
   * @param {string} customPrompt - 自定义提示词（可选）
   */
  const removeWatermark = async (file, customPrompt = '') => {
    loading.value = true
    error.value = null
    resultImageUrl.value = ''
    progress.value = 10

    try {
      // 转为 base64
      const base64 = await fileToBase64(file)
      progress.value = 30

      const prompt = customPrompt || 'Remove all watermarks, logos, text overlays, and semi-transparent marks from this image. Restore the background naturally. Keep the original image content, colors, and details intact.'

      const response = await fetch(WATERMARK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          image: base64,
        }),
      })

      progress.value = 70

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || errData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      progress.value = 100

      const url = data.images?.[0]?.url
      if (!url) {
        throw new Error('未能获取到处理后的图片')
      }

      resultImageUrl.value = url
      return url
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    loading.value = false
    error.value = null
    resultImageUrl.value = ''
    progress.value = 0
  }

  return {
    loading,
    error,
    resultImageUrl,
    progress,
    removeWatermark,
    reset,
  }
}
