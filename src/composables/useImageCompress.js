import { ref, reactive } from 'vue'

export function useImageCompress() {
  const loading = ref(false)
  const error = ref(null)
  const progress = ref(0)
  const result = reactive({
    blob: null,
    url: '',
    originalSize: 0,
    compressedSize: 0,
    width: 0,
    height: 0,
  })

  /**
   * 加载图片为 HTMLImageElement
   */
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = src
    })
  }

  /**
   * 将 File 转为 Object URL
   */
  const fileToUrl = (file) => URL.createObjectURL(file)

  /**
   * 核心压缩逻辑
   * @param {File} file - 原始图片
   * @param {Object} options - 压缩参数
   * @param {string} options.mode - 压缩模式: 'quality' | 'resize' | 'format' | 'target' | 'smart'
   * @param {number} options.quality - 质量 0-1 (mode=quality/smart)
   * @param {string} options.format - 输出格式: 'jpeg' | 'png' | 'webp'
   * @param {number} options.maxWidth - 最大宽度 (mode=resize)
   * @param {number} options.maxHeight - 最大高度 (mode=resize)
   * @param {number} options.scale - 缩放比例 0-1 (mode=resize)
   * @param {number} options.targetSizeKB - 目标大小KB (mode=target)
   */
  const compress = async (file, options = {}) => {
    loading.value = true
    error.value = null
    progress.value = 5
    result.blob = null
    result.url = ''
    result.originalSize = file.size
    result.compressedSize = 0

    try {
      const url = fileToUrl(file)
      const img = await loadImage(url)
      URL.revokeObjectURL(url)

      progress.value = 20

      let targetWidth = img.naturalWidth
      let targetHeight = img.naturalHeight
      const mode = options.mode || 'smart'
      let format = options.format || 'jpeg'
      let quality = options.quality ?? 0.8

      // 根据模式调整参数
      if (mode === 'smart') {
        // 智能模式：根据文件大小自动选择参数
        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > 5) {
          quality = 0.6
          const ratio = Math.min(1, 2000 / Math.max(targetWidth, targetHeight))
          targetWidth = Math.round(targetWidth * ratio)
          targetHeight = Math.round(targetHeight * ratio)
        } else if (sizeMB > 2) {
          quality = 0.7
        } else if (sizeMB > 1) {
          quality = 0.75
        } else {
          quality = 0.8
        }
        format = 'jpeg'
      }

      if (mode === 'resize') {
        if (options.scale && options.scale < 1) {
          targetWidth = Math.round(img.naturalWidth * options.scale)
          targetHeight = Math.round(img.naturalHeight * options.scale)
        }
        if (options.maxWidth && targetWidth > options.maxWidth) {
          const ratio = options.maxWidth / targetWidth
          targetWidth = options.maxWidth
          targetHeight = Math.round(targetHeight * ratio)
        }
        if (options.maxHeight && targetHeight > options.maxHeight) {
          const ratio = options.maxHeight / targetHeight
          targetHeight = options.maxHeight
          targetWidth = Math.round(targetWidth * ratio)
        }
      }

      progress.value = 40

      const mimeType = `image/${format}`

      // 目标大小模式：二分法逼近
      if (mode === 'target' && options.targetSizeKB) {
        const targetBytes = options.targetSizeKB * 1024
        let lo = 0.01, hi = 1.0
        let bestBlob = null

        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2
          const blob = await canvasToBlob(img, targetWidth, targetHeight, mimeType, mid)
          progress.value = 40 + Math.floor((i / 12) * 45)

          if (blob.size <= targetBytes) {
            bestBlob = blob
            lo = mid
          } else {
            hi = mid
          }
        }

        // 如果最低质量还是超了，尝试缩小尺寸
        if (!bestBlob) {
          let scale = 0.9
          while (scale > 0.1) {
            const w = Math.round(targetWidth * scale)
            const h = Math.round(targetHeight * scale)
            const blob = await canvasToBlob(img, w, h, mimeType, 0.5)
            if (blob.size <= targetBytes) {
              bestBlob = blob
              targetWidth = w
              targetHeight = h
              break
            }
            scale -= 0.1
          }
        }

        if (!bestBlob) {
          bestBlob = await canvasToBlob(img, targetWidth, targetHeight, mimeType, 0.01)
        }

        setResult(bestBlob, targetWidth, targetHeight)
      } else {
        // 常规压缩
        const blob = await canvasToBlob(img, targetWidth, targetHeight, mimeType, quality)
        progress.value = 85
        setResult(blob, targetWidth, targetHeight)
      }

      progress.value = 100
      return result
    } catch (e) {
      error.value = e.message || '压缩失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Canvas 绘制并导出 Blob
   */
  const canvasToBlob = (img, width, height, mimeType, quality) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // 白底（JPEG 需要）
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas 导出失败'))
        },
        mimeType,
        quality
      )
    })
  }

  const setResult = (blob, width, height) => {
    if (result.url) URL.revokeObjectURL(result.url)
    result.blob = blob
    result.url = URL.createObjectURL(blob)
    result.compressedSize = blob.size
    result.width = width
    result.height = height
  }

  const reset = () => {
    loading.value = false
    error.value = null
    progress.value = 0
    if (result.url) URL.revokeObjectURL(result.url)
    result.blob = null
    result.url = ''
    result.originalSize = 0
    result.compressedSize = 0
    result.width = 0
    result.height = 0
  }

  return {
    loading,
    error,
    progress,
    result,
    compress,
    reset,
  }
}
