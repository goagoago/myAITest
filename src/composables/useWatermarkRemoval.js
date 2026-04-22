import { ref } from 'vue'
import { requestBlob } from '../services/apiClient'
import { useAccountStore } from '../stores/accountStore'

export function useWatermarkRemoval() {
  const loading = ref(false)
  const error = ref(null)
  const resultImageUrl = ref('')
  const progress = ref(0)
  const account = useAccountStore()

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

      const blob = await requestBlob('/api/watermark/remove', {
        method: 'POST',
        auth: true,
        featureCode: 'watermark-removal',
        body: formData,
      })

      progress.value = 80
      if (!blob.size) {
        throw new Error('未能获取到处理后的图片')
      }

      const resultUrl = URL.createObjectURL(blob)
      progress.value = 100
      resultImageUrl.value = resultUrl
      account.refreshDashboard().catch(() => {})
      return resultUrl
    } catch (e) {
      error.value = e.message
      account.refreshDashboard().catch(() => {})
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
