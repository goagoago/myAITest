import { ref } from 'vue'
import { createWorker, PSM } from 'tesseract.js'
import { aiClient } from '../services/aiClient'

export function useOcr() {
  const loading = ref(false)
  const progress = ref(0)
  const progressStage = ref('')
  const resultText = ref('')
  const error = ref('')

  let worker = null

  /**
   * 将 File 转为 base64 data URL
   */
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  /**
   * 压缩图片用于 API 上传
   * Vercel Edge Function body 限制 4.5MB，base64 会比原图大 33%
   * 所以需要把图片压到 ~2MB 以下
   */
  const compressForUpload = (file) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const MAX_SIDE = 1200
      let w = img.width
      let h = img.height
      if (w > MAX_SIDE || h > MAX_SIDE) {
        const ratio = Math.min(MAX_SIDE / w, MAX_SIDE / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      // 逐步降低质量直到 base64 小于 2MB
      let quality = 0.8
      let dataUrl = canvas.toDataURL('image/jpeg', quality)
      while (dataUrl.length > 2 * 1024 * 1024 && quality > 0.3) {
        quality -= 0.1
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })

  /**
   * 使用智谱视觉模型识别文字（云端，效果最好）
   * 依次尝试 glm-4v-flash → glm-4.6v-flash
   */
  const recognizeWithVision = async (file) => {
    progressStage.value = '压缩图片中...'
    progress.value = 10

    const base64 = await compressForUpload(file)

    const models = ['glm-4v-flash']
    let lastError = null

    for (const model of models) {
      progressStage.value = 'AI 识别中...'
      progress.value = 30

      try {
        const data = await aiClient.chat.complete({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: base64 },
                },
                {
                  type: 'text',
                  text: '请识别这张图片中的所有文字内容，完整准确地输出原文，保持原始排版格式。只输出识别到的文字，不要添加任何额外说明。',
                },
              ],
            },
          ],
        })

        progress.value = 80

        const text = data.choices?.[0]?.message?.content || ''
        if (!text) {
          lastError = new Error('未能识别到文字')
          continue
        }

        progress.value = 100
        return text
      } catch (e) {
        lastError = e
        console.warn(`${model} error:`, e)
        continue
      }
    }

    throw lastError || new Error('所有模型均识别失败')
  }

  /**
   * 图片预处理：灰度化 → 对比度增强 → 二值化 → 放大小图
   */
  const preprocessImage = (file) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let scale = 1
      if (img.width < 1000) scale = Math.ceil(1000 / img.width)
      scale = Math.min(scale, 3)

      const w = img.width * scale
      const h = img.height * scale
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data
      const gray = new Uint8Array(w * h)

      for (let i = 0; i < gray.length; i++) {
        gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])
      }

      let min = 255, max = 0
      for (let i = 0; i < gray.length; i++) {
        if (gray[i] < min) min = gray[i]
        if (gray[i] > max) max = gray[i]
      }
      const range = max - min || 1
      for (let i = 0; i < gray.length; i++) {
        gray[i] = Math.round(((gray[i] - min) / range) * 255)
      }

      const threshold = otsuThreshold(gray)
      for (let i = 0; i < gray.length; i++) {
        const val = gray[i] > threshold ? 255 : 0
        data[i * 4] = val
        data[i * 4 + 1] = val
        data[i * 4 + 2] = val
      }

      ctx.putImageData(imageData, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })

  function otsuThreshold(grayArr) {
    const histogram = new Array(256).fill(0)
    for (let i = 0; i < grayArr.length; i++) histogram[grayArr[i]]++
    const total = grayArr.length
    let sum = 0
    for (let i = 0; i < 256; i++) sum += i * histogram[i]
    let sumB = 0, wB = 0, maxVariance = 0, bestThreshold = 0
    for (let t = 0; t < 256; t++) {
      wB += histogram[t]
      if (wB === 0) continue
      const wF = total - wB
      if (wF === 0) break
      sumB += t * histogram[t]
      const mB = sumB / wB
      const mF = (sum - sumB) / wF
      const variance = wB * wF * (mB - mF) * (mB - mF)
      if (variance > maxVariance) { maxVariance = variance; bestThreshold = t }
    }
    return bestThreshold
  }

  /**
   * 使用 Tesseract.js 本地识别（离线备选）
   */
  const recognizeWithTesseract = async (file, lang) => {
    progressStage.value = '图片预处理中...'
    const input = await preprocessImage(file)

    progressStage.value = '加载识别引擎...'
    worker = await createWorker(lang, 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') progressStage.value = '加载核心引擎...'
        else if (m.status === 'loading language traineddata') progressStage.value = '加载语言模型...'
        else if (m.status === 'initializing api') progressStage.value = '初始化引擎...'
        else if (m.status === 'recognizing text') {
          progressStage.value = '识别文字中...'
          progress.value = Math.round(m.progress * 100)
        }
      },
    })

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    })

    const { data: { text } } = await worker.recognize(input)
    return text
  }

  /**
   * 使用 PaddleOCR 后端识别（支持图片和 PDF）
   */
  const recognizeWithPaddle = async (file) => {
    progressStage.value = '上传文件中...'
    progress.value = 10

    const formData = new FormData()
    formData.append('file', file)

    progressStage.value = 'PaddleOCR 识别中...'
    progress.value = 30

    const res = await fetch('/api/ocr/recognize', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `服务端错误: ${res.status}`)
    }

    progress.value = 80

    const json = await res.json()
    if (json.code !== 200) {
      throw new Error(json.message || '识别失败')
    }

    progress.value = 100
    return json.data?.text || ''
  }

  /**
   * 识别文件中的文字
   * @param {File} file - 图片或 PDF 文件
   * @param {string} lang - 语言代码（仅离线模式使用）
   * @param {string} engine - 'paddle' PaddleOCR | 'vision' 云端AI | 'local' 本地离线
   */
  const recognize = async (file, lang = 'chi_sim+eng', engine = 'paddle') => {
    if (!file) {
      error.value = '请先上传文件'
      return
    }

    loading.value = true
    progress.value = 0
    progressStage.value = ''
    error.value = ''
    resultText.value = ''

    try {
      let text
      if (engine === 'paddle') {
        text = await recognizeWithPaddle(file)
      } else if (engine === 'vision') {
        text = await recognizeWithVision(file)
      } else {
        text = await recognizeWithTesseract(file, lang)
      }
      resultText.value = text
    } catch (e) {
      console.error('OCR 识别失败:', e)
      const msgs = {
        paddle: 'PaddleOCR 识别失败（' + e.message + '），请检查后端服务是否启动',
        vision: 'AI 识别失败（' + e.message + '），请切换到其他模式重试',
        local: 'OCR 识别失败，请重试或更换图片',
      }
      error.value = msgs[engine] || e.message
    } finally {
      if (worker) {
        await worker.terminate()
        worker = null
      }
      loading.value = false
      progressStage.value = ''
    }
  }

  const reset = () => {
    loading.value = false
    progress.value = 0
    progressStage.value = ''
    resultText.value = ''
    error.value = ''
  }

  return {
    loading,
    progress,
    progressStage,
    resultText,
    error,
    recognize,
    reset,
  }
}
