import { ref } from 'vue'
import { buildApiUrl } from '../services/aiClient'

export function useWatermarkRemoval() {
  const loading = ref(false)
  const error = ref(null)
  const resultImageUrl = ref('')
  const progress = ref(0)

  /**
   * 调用后端 YOLO+LaMa 去水印服务
   */
  const removeWatermark = async (file) => {
    loading.value = true
    error.value = null
    resultImageUrl.value = ''
    progress.value = 10

    try {
      const formData = new FormData()
      formData.append('file', file)

      progress.value = 20

      const url = buildApiUrl('/api/watermark/remove')
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      progress.value = 80

      if (!res.ok) {
        throw new Error(`服务端错误: ${res.status}`)
      }

      const blob = await res.blob()
      if (!blob.size) {
        throw new Error('未能获取到处理后的图片')
      }

      const resultUrl = URL.createObjectURL(blob)
      progress.value = 100
      resultImageUrl.value = resultUrl
      return resultUrl
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
