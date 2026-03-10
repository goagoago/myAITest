import { ref } from 'vue'
import { aiClient } from '../services/aiClient'

export function useImage() {
  const loading = ref(false)
  const error = ref(null)
  const imageUrl = ref('')
  const progress = ref(0)

  const generateImage = async (prompt, options = {}) => {
    loading.value = true
    error.value = null
    imageUrl.value = ''
    progress.value = 10

    try {
      const { image_size = '1024x1024' } = options

      progress.value = 30

      const data = await aiClient.image.generate({
        prompt,
        model: 'Kwai-Kolors/Kolors',
        image_size,
        num_inference_steps: 25,
      })

      progress.value = 70

      progress.value = 100

      const url = data.images?.[0]?.url
      if (!url) {
        throw new Error('未能获取到图片URL')
      }

      imageUrl.value = url
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
    imageUrl.value = ''
    progress.value = 0
  }

  return {
    loading,
    error,
    imageUrl,
    progress,
    generateImage,
    reset,
  }
}
