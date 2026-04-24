import { ref } from 'vue'

export function useQrScan() {
  const loading = ref(false)
  const error = ref('')
  const supported = ref(false)
  const supportChecked = ref(false)
  const results = ref([])
  let detector = null

  const initDetector = async () => {
    if (supportChecked.value) return supported.value

    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      supportChecked.value = true
      supported.value = false
      return false
    }

    try {
      if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
        const formats = await window.BarcodeDetector.getSupportedFormats()
        supported.value = formats.includes('qr_code')
      } else {
        supported.value = true
      }

      if (supported.value) {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      }
    } catch {
      supported.value = false
    } finally {
      supportChecked.value = true
    }

    return supported.value
  }

  const scan = async (file) => {
    if (!file) {
      throw new Error('请先上传图片')
    }

    const ready = await initDetector()
    if (!ready || !detector) {
      error.value = '当前浏览器暂不支持二维码解析，请使用最新版 Chrome 或 Edge'
      results.value = []
      return []
    }

    loading.value = true
    error.value = ''
    results.value = []

    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const { width, height } = scaleSize(bitmap.width, bitmap.height, 2048)
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close?.()

      const detected = await detector.detect(canvas)
      results.value = detected
        .filter(item => item.rawValue)
        .map((item, index) => ({
          id: `${index}-${item.rawValue}`,
          format: item.format || 'qr_code',
          rawValue: item.rawValue,
        }))

      if (!results.value.length) {
        error.value = '未识别到二维码，请尝试更清晰的图片'
      }

      return results.value
    } catch (e) {
      error.value = e.message || '二维码解析失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    loading.value = false
    error.value = ''
    results.value = []
  }

  return {
    loading,
    error,
    supported,
    supportChecked,
    results,
    initDetector,
    scan,
    reset,
  }
}

function scaleSize(width, height, maxSide) {
  if (width <= maxSide && height <= maxSide) {
    return { width, height }
  }
  const ratio = Math.min(maxSide / width, maxSide / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}
