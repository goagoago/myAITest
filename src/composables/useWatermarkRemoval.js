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
   * 将 HTMLImageElement 加载完成
   */
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  /**
   * 从 maskCanvas 中获取涂抹区域的 bounding box
   * 返回 { x, y, w, h } 或 null（无涂抹）
   */
  const getMaskBoundingBox = (maskCanvas) => {
    const ctx = maskCanvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const data = imageData.data
    let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0
    let found = false

    for (let y = 0; y < maskCanvas.height; y++) {
      for (let x = 0; x < maskCanvas.width; x++) {
        const idx = (y * maskCanvas.width + x) * 4
        // 检查 alpha 通道，涂抹过的像素 alpha > 0
        if (data[idx + 3] > 10) {
          found = true
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (!found) return null
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
  }

  /**
   * 局部去水印：裁剪涂抹区域 → API处理 → 贴回原图
   * @param {File} file - 原始图片文件
   * @param {HTMLCanvasElement} maskCanvas - 涂抹画布（与显示的图片等大小）
   * @param {number} displayWidth - 图片在页面上的显示宽度
   * @param {number} displayHeight - 图片在页面上的显示高度
   * @param {string} customPrompt - 自定义提示词
   */
  const removeWatermarkByMask = async (file, maskCanvas, displayWidth, displayHeight, customPrompt = '') => {
    loading.value = true
    error.value = null
    resultImageUrl.value = ''
    progress.value = 5

    try {
      // 1. 获取涂抹区域的 bounding box（基于 maskCanvas 坐标）
      const bbox = getMaskBoundingBox(maskCanvas)
      if (!bbox) {
        throw new Error('请先在图片上涂抹标记水印区域')
      }

      progress.value = 10

      // 2. 加载原始完整图片
      const originalBase64 = await fileToBase64(file)
      const originalImg = await loadImage(originalBase64)
      const origW = originalImg.naturalWidth
      const origH = originalImg.naturalHeight

      // 3. 计算从 maskCanvas 坐标到原图坐标的缩放比例
      const scaleX = origW / displayWidth
      const scaleY = origH / displayHeight

      // 将 bbox 映射到原图坐标
      let cropX = Math.floor(bbox.x * scaleX)
      let cropY = Math.floor(bbox.y * scaleY)
      let cropW = Math.ceil(bbox.w * scaleX)
      let cropH = Math.ceil(bbox.h * scaleY)

      // 4. 添加 padding（原图尺寸的 12%，至少 50px）
      const padX = Math.max(50, Math.floor(origW * 0.12))
      const padY = Math.max(50, Math.floor(origH * 0.12))

      cropX = Math.max(0, cropX - padX)
      cropY = Math.max(0, cropY - padY)
      cropW = Math.min(origW - cropX, cropW + padX * 2)
      cropH = Math.min(origH - cropY, cropH + padY * 2)

      progress.value = 20

      // 5. 裁剪出局部区域
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = cropW
      cropCanvas.height = cropH
      const cropCtx = cropCanvas.getContext('2d')
      cropCtx.drawImage(originalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      const croppedBase64 = cropCanvas.toDataURL('image/png')

      progress.value = 30

      // 6. 发送裁剪区域给 API
      const prompt = customPrompt || 'Remove all watermarks, logos, text overlays, and semi-transparent marks from this image. Restore the background naturally. Keep the original image content, colors, and details intact.'

      const response = await fetch(WATERMARK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image: croppedBase64 }),
      })

      progress.value = 70

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || errData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const processedUrl = data.images?.[0]?.url
      if (!processedUrl) {
        throw new Error('未能获取到处理后的图片')
      }

      progress.value = 80

      // 7. 加载 API 返回的处理后裁剪图（已由中间件转为 base64）
      const processedImg = await loadImage(processedUrl)

      // 8. 合成：将处理后的裁剪图贴回原图
      const compositeCanvas = document.createElement('canvas')
      compositeCanvas.width = origW
      compositeCanvas.height = origH
      const compCtx = compositeCanvas.getContext('2d')

      // 先画原图
      compCtx.drawImage(originalImg, 0, 0)

      // 再将处理后的裁剪区域贴到对应位置
      compCtx.drawImage(processedImg, 0, 0, processedImg.naturalWidth, processedImg.naturalHeight, cropX, cropY, cropW, cropH)

      progress.value = 95

      // 9. 输出合成结果
      const resultBlob = await new Promise(resolve => compositeCanvas.toBlob(resolve, 'image/png'))
      const resultUrl = URL.createObjectURL(resultBlob)

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

  /**
   * 全图去水印（原有逻辑）
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
    removeWatermarkByMask,
    reset,
  }
}
