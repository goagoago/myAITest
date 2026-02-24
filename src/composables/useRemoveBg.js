import { ref } from 'vue'

export function useRemoveBg() {
  const sourceImage = ref(null)   // 原图 dataURL
  const resultImage = ref(null)   // 抠图结果 dataURL
  const loading = ref(false)
  const progress = ref('')
  const error = ref('')

  // 背景替换
  const bgMode = ref('transparent') // 'transparent' | 'color' | 'blur'
  const bgColor = ref('#ffffff')
  const composedImage = ref(null)   // 合成后的 dataURL

  /**
   * 加载图片并执行 AI 抠图
   */
  const processImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      error.value = '请上传图片文件'
      return
    }

    error.value = ''
    loading.value = true
    progress.value = '正在加载 AI 模型...'
    resultImage.value = null
    composedImage.value = null

    // 预览原图
    sourceImage.value = URL.createObjectURL(file)

    try {
      const { removeBackground } = await import('@imgly/background-removal')

      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (key === 'compute:inference') {
            progress.value = '正在识别主体并去除背景...'
          } else if (key.startsWith('fetch:')) {
            if (total > 0) {
              const pct = Math.round((current / total) * 100)
              progress.value = `正在下载 AI 模型... ${pct}%`
            }
          }
        },
      })

      // 转为 dataURL
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      resultImage.value = dataUrl
      progress.value = ''

      // 默认合成透明背景
      composeWithBg()
    } catch (e) {
      console.error('AI 抠图失败:', e)
      error.value = 'AI 抠图失败，请换一张图片重试'
      progress.value = ''
    } finally {
      loading.value = false
    }
  }

  /**
   * 合成背景
   */
  const composeWithBg = () => {
    if (!resultImage.value) return

    if (bgMode.value === 'transparent') {
      composedImage.value = resultImage.value
      return
    }

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')

      if (bgMode.value === 'color') {
        ctx.fillStyle = bgColor.value
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)
      composedImage.value = canvas.toDataURL('image/png')
    }
    img.src = resultImage.value
  }

  /**
   * 下载结果图
   */
  const downloadResult = () => {
    const url = composedImage.value || resultImage.value
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = `removed-bg-${Date.now()}.png`
    link.click()
  }

  /**
   * 重置
   */
  const resetAll = () => {
    if (sourceImage.value) URL.revokeObjectURL(sourceImage.value)
    sourceImage.value = null
    resultImage.value = null
    composedImage.value = null
    loading.value = false
    progress.value = ''
    error.value = ''
    bgMode.value = 'transparent'
    bgColor.value = '#ffffff'
  }

  return {
    sourceImage,
    resultImage,
    composedImage,
    loading,
    progress,
    error,
    bgMode,
    bgColor,
    processImage,
    composeWithBg,
    downloadResult,
    resetAll,
  }
}
