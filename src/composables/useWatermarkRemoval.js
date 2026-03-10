import { ref } from 'vue'
import { aiClient } from '../services/aiClient'

export function useWatermarkRemoval() {
  const loading = ref(false)
  const error = ref(null)
  const resultImageUrl = ref('')
  const progress = ref(0)

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const callApi = async (base64Image, prompt, steps = 50, guidance = 7.5) => {
    const data = await aiClient.watermark.remove({
      prompt,
      image: base64Image,
      num_inference_steps: steps,
      guidance_scale: guidance,
    })
    const url = data.images?.[0]?.url
    if (!url) throw new Error('未能获取到处理后的图片')
    return url
  }

  /**
   * 自动检测水印区域
   *
   * 原理：将原图缩小后发给 AI，对比 AI 输出和原图的差异，
   * 差异大的区域就是水印所在。返回这些区域的 bounding boxes。
   */
  const detectWatermarkRegions = async (originalImg, prompt, steps, guidance) => {
    const origW = originalImg.naturalWidth
    const origH = originalImg.naturalHeight

    // 用较大的检测图提高精度（之前768太小，容易漏检）
    const detectMaxEdge = 1024
    let dw = origW, dh = origH
    if (Math.max(dw, dh) > detectMaxEdge) {
      const ratio = detectMaxEdge / Math.max(dw, dh)
      dw = Math.round(dw * ratio)
      dh = Math.round(dh * ratio)
    }

    const detectCanvas = document.createElement('canvas')
    detectCanvas.width = dw
    detectCanvas.height = dh
    detectCanvas.getContext('2d').drawImage(originalImg, 0, 0, dw, dh)
    const detectBase64 = detectCanvas.toDataURL('image/png', 0.92)

    // 让 AI 处理检测图（用更高的steps提高检测精度）
    const processedUrl = await callApi(detectBase64, prompt, Math.min(steps, 50), guidance)
    const processedImg = await loadImage(processedUrl)

    // 将 AI 输出绘制到与检测图同样大小的 canvas
    const procCanvas = document.createElement('canvas')
    procCanvas.width = dw
    procCanvas.height = dh
    procCanvas.getContext('2d').drawImage(processedImg, 0, 0, dw, dh)

    // 逐像素计算差异
    const origData = detectCanvas.getContext('2d').getImageData(0, 0, dw, dh).data
    const procData = procCanvas.getContext('2d').getImageData(0, 0, dw, dh).data

    // 将图片分成小格子，计算每个格子的平均差异
    const gridSize = 12  // 更小的格子 = 更精确的定位
    const gridCols = Math.ceil(dw / gridSize)
    const gridRows = Math.ceil(dh / gridSize)
    const gridDiff = new Float32Array(gridCols * gridRows)

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        let totalDiff = 0, count = 0
        const startX = gx * gridSize
        const startY = gy * gridSize
        const endX = Math.min(startX + gridSize, dw)
        const endY = Math.min(startY + gridSize, dh)

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * dw + x) * 4
            const dr = Math.abs(origData[idx] - procData[idx])
            const dg = Math.abs(origData[idx + 1] - procData[idx + 1])
            const db = Math.abs(origData[idx + 2] - procData[idx + 2])
            // 综合 RGB 差异（加权感知亮度）
            totalDiff += dr * 0.3 + dg * 0.59 + db * 0.11
            count++
          }
        }
        gridDiff[gy * gridCols + gx] = totalDiff / count
      }
    }

    // 用自适应阈值：取 P75 分位 + 偏移，更容易检出轻微水印
    const sorted = [...gridDiff].sort((a, b) => a - b)
    const p75 = sorted[Math.floor(sorted.length * 0.75)]
    const threshold = Math.max(18, p75 + 10)

    // 标记水印格子
    const watermarkGrid = new Uint8Array(gridCols * gridRows)
    for (let i = 0; i < gridDiff.length; i++) {
      if (gridDiff[i] > threshold) watermarkGrid[i] = 1
    }

    // 膨胀水印格子（向外扩展 3 格，确保完整覆盖水印边缘）
    const dilated = new Uint8Array(watermarkGrid.length)
    const dilateR = 3
    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        for (let dy = -dilateR; dy <= dilateR; dy++) {
          for (let dx = -dilateR; dx <= dilateR; dx++) {
            const ny = gy + dy, nx = gx + dx
            if (ny >= 0 && ny < gridRows && nx >= 0 && nx < gridCols) {
              if (watermarkGrid[ny * gridCols + nx]) {
                dilated[gy * gridCols + gx] = 1
              }
            }
          }
        }
      }
    }

    // 将相邻的水印格子合并成连通区域（bounding boxes）
    const visited = new Uint8Array(dilated.length)
    const regions = []
    const scaleX = origW / dw
    const scaleY = origH / dh

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const idx = gy * gridCols + gx
        if (!dilated[idx] || visited[idx]) continue

        // BFS 找连通区域
        let minGx = gx, maxGx = gx, minGy = gy, maxGy = gy
        const queue = [{ x: gx, y: gy }]
        visited[idx] = 1

        while (queue.length > 0) {
          const { x, y } = queue.shift()
          minGx = Math.min(minGx, x)
          maxGx = Math.max(maxGx, x)
          minGy = Math.min(minGy, y)
          maxGy = Math.max(maxGy, y)

          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
              const nIdx = ny * gridCols + nx
              if (dilated[nIdx] && !visited[nIdx]) {
                visited[nIdx] = 1
                queue.push({ x: nx, y: ny })
              }
            }
          }
        }

        // 映射回原图坐标 + 更大的 padding 确保上下文足够
        const pad = Math.max(60, Math.round(Math.max(origW, origH) * 0.08))
        const rx = Math.max(0, Math.round(minGx * gridSize * scaleX) - pad)
        const ry = Math.max(0, Math.round(minGy * gridSize * scaleY) - pad)
        const rw = Math.min(origW - rx, Math.round((maxGx + 1) * gridSize * scaleX) - rx + pad * 2)
        const rh = Math.min(origH - ry, Math.round((maxGy + 1) * gridSize * scaleY) - ry + pad * 2)

        // 过滤掉太小的区域（噪声）
        if (rw > 20 && rh > 20) {
          regions.push({ x: rx, y: ry, w: rw, h: rh })
        }
      }
    }

    return regions
  }

  /**
   * 裁剪原图的一个区域，发给 API 处理，返回处理后的 Image
   */
  const processRegion = async (originalImg, region, prompt, steps, guidance) => {
    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = region.w
    cropCanvas.height = region.h
    cropCanvas.getContext('2d').drawImage(
      originalImg, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h
    )
    const cropBase64 = cropCanvas.toDataURL('image/png')
    const resultUrl = await callApi(cropBase64, prompt, steps, guidance)
    return await loadImage(resultUrl)
  }

  // ══════════════════════════════════════════════════════════
  // 局部去水印（涂抹模式）
  // ══════════════════════════════════════════════════════════

  const getMaskBoundingBox = (maskCanvas) => {
    const ctx = maskCanvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const data = imageData.data
    let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0
    let found = false
    for (let y = 0; y < maskCanvas.height; y++) {
      for (let x = 0; x < maskCanvas.width; x++) {
        const idx = (y * maskCanvas.width + x) * 4
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

  const removeWatermarkByMask = async (file, maskCanvas, displayWidth, displayHeight, customPrompt = '') => {
    loading.value = true
    error.value = null
    resultImageUrl.value = ''
    progress.value = 5

    try {
      const bbox = getMaskBoundingBox(maskCanvas)
      if (!bbox) throw new Error('请先在图片上涂抹标记水印区域')

      progress.value = 10

      const originalBase64 = await fileToBase64(file)
      const originalImg = await loadImage(originalBase64)
      const origW = originalImg.naturalWidth
      const origH = originalImg.naturalHeight
      const scaleX = origW / displayWidth
      const scaleY = origH / displayHeight

      let cropX = Math.floor(bbox.x * scaleX)
      let cropY = Math.floor(bbox.y * scaleY)
      let cropW = Math.ceil(bbox.w * scaleX)
      let cropH = Math.ceil(bbox.h * scaleY)
      const padX = Math.max(50, Math.floor(origW * 0.12))
      const padY = Math.max(50, Math.floor(origH * 0.12))
      cropX = Math.max(0, cropX - padX)
      cropY = Math.max(0, cropY - padY)
      cropW = Math.min(origW - cropX, cropW + padX * 2)
      cropH = Math.min(origH - cropY, cropH + padY * 2)

      progress.value = 20

      const prompt = customPrompt || 'Remove the watermark from this image. Keep everything else exactly the same — same colors, lighting, textures, and details. Only remove the watermark.'

      const region = { x: cropX, y: cropY, w: cropW, h: cropH }
      const processedImg = await processRegion(originalImg, region, prompt, 75, 9)

      progress.value = 80

      // 贴回原图
      const compositeCanvas = document.createElement('canvas')
      compositeCanvas.width = origW
      compositeCanvas.height = origH
      const compCtx = compositeCanvas.getContext('2d')
      compCtx.drawImage(originalImg, 0, 0)
      compCtx.drawImage(processedImg, 0, 0, processedImg.naturalWidth, processedImg.naturalHeight, cropX, cropY, cropW, cropH)

      progress.value = 95
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
   * 将处理后的区域用羽化边缘混合贴回原图，避免硬边界
   */
  const blendRegion = (compCtx, originalImg, processedImg, region, feather = 20) => {
    const { x, y, w, h } = region

    // 先创建一个临时 canvas 绘制处理结果
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = w
    tmpCanvas.height = h
    const tmpCtx = tmpCanvas.getContext('2d')
    tmpCtx.drawImage(processedImg, 0, 0, processedImg.naturalWidth, processedImg.naturalHeight, 0, 0, w, h)

    // 获取处理后的像素和原图对应区域的像素
    const procData = tmpCtx.getImageData(0, 0, w, h)
    const procPixels = procData.data

    const origCanvas = document.createElement('canvas')
    origCanvas.width = w
    origCanvas.height = h
    origCanvas.getContext('2d').drawImage(originalImg, x, y, w, h, 0, 0, w, h)
    const origPixels = origCanvas.getContext('2d').getImageData(0, 0, w, h).data

    // 在边缘做羽化混合：边缘部分保留更多原图，中心部分用处理结果
    const f = Math.min(feather, Math.floor(Math.min(w, h) / 4))
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        // 计算到边缘的最小距离
        const distToEdge = Math.min(px, py, w - 1 - px, h - 1 - py)
        if (distToEdge < f) {
          // 边缘区域做渐变混合
          const alpha = distToEdge / f  // 0(边缘)→1(内部)
          const idx = (py * w + px) * 4
          procPixels[idx]     = Math.round(origPixels[idx]     * (1 - alpha) + procPixels[idx]     * alpha)
          procPixels[idx + 1] = Math.round(origPixels[idx + 1] * (1 - alpha) + procPixels[idx + 1] * alpha)
          procPixels[idx + 2] = Math.round(origPixels[idx + 2] * (1 - alpha) + procPixels[idx + 2] * alpha)
        }
      }
    }

    tmpCtx.putImageData(procData, 0, 0)
    compCtx.drawImage(tmpCanvas, 0, 0, w, h, x, y, w, h)
  }

  // ══════════════════════════════════════════════════════════
  // 全图去水印（自动检测 + 局部处理 + 羽化混合）
  //
  // 思路：
  // 第一步：用检测图让 AI 处理一遍，对比原图找出"哪些区域有水印"
  // 第二步：只对检测到的水印区域，从原图裁剪出来单独处理
  // 第三步：用羽化混合把处理好的区域贴回原图，消除拼接痕迹
  // 第四步（可选）：二次精修，清除残留
  // ══════════════════════════════════════════════════════════

  const removeWatermark = async (file, customPrompt = '', options = {}) => {
    loading.value = true
    error.value = null
    resultImageUrl.value = ''
    progress.value = 5

    const quality = options.quality || 'standard'
    const twoPass = quality === 'high' ? true : (options.twoPass || false)

    const qualityConfig = {
      fast:     { steps: 40, guidance: 7.5 },
      standard: { steps: 50, guidance: 9 },
      high:     { steps: 50, guidance: 10 },
    }
    const cfg = qualityConfig[quality] || qualityConfig.standard

    const prompt = customPrompt || 'Remove the watermark from this image completely. Keep everything else exactly the same — same colors, lighting, textures, and details. Only remove the watermark, do not change the background.'

    try {
      const originalBase64 = await fileToBase64(file)
      const originalImg = await loadImage(originalBase64)
      const origW = originalImg.naturalWidth
      const origH = originalImg.naturalHeight

      progress.value = 10

      // ── 第一步：自动检测水印区域 ──
      const regions = await detectWatermarkRegions(originalImg, prompt, cfg.steps, cfg.guidance)

      progress.value = 35

      if (regions.length === 0) {
        // 没检测到明显水印，直接处理整图
        const canvas = document.createElement('canvas')
        canvas.width = origW
        canvas.height = origH
        canvas.getContext('2d').drawImage(originalImg, 0, 0)
        const base64 = canvas.toDataURL('image/png', 0.95)
        const url = await callApi(base64, prompt, cfg.steps, cfg.guidance)
        progress.value = 100
        resultImageUrl.value = url
        return url
      }

      // ── 第二步：逐区域裁剪 + 处理 + 羽化混合 ──
      const compositeCanvas = document.createElement('canvas')
      compositeCanvas.width = origW
      compositeCanvas.height = origH
      const compCtx = compositeCanvas.getContext('2d')
      compCtx.drawImage(originalImg, 0, 0)

      // 羽化边缘宽度：根据图片大小自适应
      const feather = Math.max(15, Math.round(Math.min(origW, origH) * 0.03))

      const totalRegions = regions.length
      for (let i = 0; i < totalRegions; i++) {
        const region = regions[i]
        const processed = await processRegion(originalImg, region, prompt, cfg.steps, cfg.guidance)

        // 用羽化混合贴回去（消除硬边界）
        blendRegion(compCtx, originalImg, processed, region, feather)

        progress.value = 35 + Math.floor(((i + 1) / totalRegions) * (twoPass ? 30 : 55))
      }

      // ── 第三步（可选/high默认开启）：二次精修 ──
      if (twoPass) {
        const secondPrompt = 'Carefully check this image and remove any remaining watermark traces, faint text shadows, or artifacts. Keep everything else exactly the same.'

        for (let i = 0; i < totalRegions; i++) {
          const region = regions[i]
          // 从当前合成结果裁剪
          const cropCanvas = document.createElement('canvas')
          cropCanvas.width = region.w
          cropCanvas.height = region.h
          cropCanvas.getContext('2d').drawImage(
            compositeCanvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h
          )
          const cropBase64 = cropCanvas.toDataURL('image/png')
          const resultUrl = await callApi(cropBase64, secondPrompt, cfg.steps, cfg.guidance)
          const processed = await loadImage(resultUrl)

          blendRegion(compCtx, originalImg, processed, region, feather)

          progress.value = 65 + Math.floor(((i + 1) / totalRegions) * 25)
        }
      }

      progress.value = 95

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
