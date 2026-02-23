import { ref, computed, watch } from 'vue'
import { saveAs } from 'file-saver'

/**
 * 证件照标准尺寸预设 (300 DPI)
 */
export const PHOTO_PRESETS = [
  { id: '1inch', label: '1 寸', width: 295, height: 413, mm: '25×35mm', desc: '常用于简历、考试报名' },
  { id: '2inch', label: '2 寸', width: 413, height: 579, mm: '35×49mm', desc: '常用于护照、签证' },
  { id: 'small1', label: '小 1 寸', width: 260, height: 378, mm: '22×32mm', desc: '常用于驾驶证、身份证' },
  { id: 'small2', label: '小 2 寸', width: 413, height: 531, mm: '35×45mm', desc: '常用于护照、港澳通行证' },
  { id: 'big1', label: '大 1 寸', width: 390, height: 567, mm: '33×48mm', desc: '常用于中国护照' },
  { id: 'big2', label: '大 2 寸', width: 413, height: 626, mm: '35×53mm', desc: '常用于部分签证' },
]

/**
 * 背景色预设
 */
export const BG_COLORS = [
  { id: 'red', label: '红色', color: '#d03030' },
  { id: 'blue', label: '蓝色', color: '#438edb' },
  { id: 'white', label: '白色', color: '#ffffff' },
  { id: 'gradient-blue', label: '渐变蓝', color: 'linear-gradient(180deg, #5da0e8 0%, #3a7bc8 100%)' },
  { id: 'transparent', label: '透明', color: 'transparent' },
]

export function useIdPhoto() {
  // 原始图片
  const sourceFile = ref(null)
  const sourceImage = ref(null)      // 原始 HTMLImageElement
  const sourceWidth = ref(0)
  const sourceHeight = ref(0)

  // AI 抠图后的透明人像
  const personImage = ref(null)      // 抠图后的 HTMLImageElement（透明背景）
  const personReady = ref(false)     // 人像是否已处理完成

  // 处理状态
  const processing = ref(false)
  const processProgress = ref('')    // 进度文字
  const processError = ref(null)

  // 输出配置
  const selectedPreset = ref('1inch')
  const customMode = ref(false)
  const customWidth = ref(295)
  const customHeight = ref(413)
  const selectedBgColor = ref('blue')
  const customBgColor = ref('#438edb')

  // 裁剪状态
  const cropX = ref(0)
  const cropY = ref(0)
  const cropScale = ref(1)

  // 输出
  const outputDataUrl = ref(null)

  /* ═══════ 计算属性 ═══════ */

  const outputWidth = computed(() => {
    if (customMode.value) return Math.max(1, Math.round(customWidth.value))
    const preset = PHOTO_PRESETS.find(p => p.id === selectedPreset.value)
    return preset ? preset.width : 295
  })

  const outputHeight = computed(() => {
    if (customMode.value) return Math.max(1, Math.round(customHeight.value))
    const preset = PHOTO_PRESETS.find(p => p.id === selectedPreset.value)
    return preset ? preset.height : 413
  })

  const activeBgColor = computed(() => {
    if (selectedBgColor.value === 'custom') return customBgColor.value
    const found = BG_COLORS.find(c => c.id === selectedBgColor.value)
    return found ? found.color : '#438edb'
  })

  /* ═══════ 加载图片 + AI 抠图 ═══════ */

  const loadImage = async (file) => {
    sourceFile.value = file
    processError.value = null
    personReady.value = false
    outputDataUrl.value = null

    // 1. 加载原始图片显示预览
    const img = await createImageFromFile(file)
    if (!img) return
    sourceImage.value = img
    sourceWidth.value = img.naturalWidth
    sourceHeight.value = img.naturalHeight

    // 2. AI 抠图
    processing.value = true
    processProgress.value = '正在加载 AI 模型...'

    try {
      const { removeBackground } = await import('@imgly/background-removal')

      processProgress.value = '正在识别人像并去除背景...'

      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (key === 'compute:inference') {
            processProgress.value = '正在识别人像...'
          } else if (key.startsWith('fetch:')) {
            // 模型下载进度
            if (total > 0) {
              const pct = Math.round((current / total) * 100)
              processProgress.value = `正在下载 AI 模型... ${pct}%`
            }
          }
        },
      })

      // 3. 将抠图结果转为 Image 元素
      const personImg = await createImageFromBlob(blob)
      if (!personImg) throw new Error('抠图结果无法加载')

      personImage.value = personImg
      personReady.value = true
      processProgress.value = ''

      // 4. 初始化裁剪并渲染
      resetCrop()
      renderOutput()
    } catch (e) {
      console.error('AI 抠图失败:', e)
      processError.value = 'AI 人像识别失败，请换一张照片重试'
      processProgress.value = ''
    } finally {
      processing.value = false
    }
  }

  /* ═══════ 工具函数 ═══════ */

  const createImageFromFile = (file) => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  const createImageFromBlob = (blob) => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        resolve(img)
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  /* ═══════ 裁剪 ═══════ */

  const resetCrop = () => {
    if (!personImage.value) return
    const sw = personImage.value.naturalWidth
    const sh = personImage.value.naturalHeight
    const ow = outputWidth.value
    const oh = outputHeight.value

    // cover 模式：人像填满画布（透明背景下背景色通过透明区域显示）
    const fitScale = Math.max(ow / sw, oh / sh)
    cropScale.value = fitScale
    cropX.value = (sw * fitScale - ow) / 2
    cropY.value = (sh * fitScale - oh) / 2
  }

  /* ═══════ 渲染输出 ═══════ */

  const renderOutput = () => {
    if (!personImage.value) {
      outputDataUrl.value = null
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const w = outputWidth.value
    const h = outputHeight.value
    canvas.width = w
    canvas.height = h

    // 1. 画背景色
    const bg = activeBgColor.value
    if (bg === 'transparent') {
      ctx.clearRect(0, 0, w, h)
    } else if (bg.startsWith('linear-gradient')) {
      const colorMatch = bg.match(/#[0-9a-fA-F]{6}/g)
      if (colorMatch && colorMatch.length >= 2) {
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, colorMatch[0])
        grad.addColorStop(1, colorMatch[1])
        ctx.fillStyle = grad
      } else {
        ctx.fillStyle = '#438edb'
      }
      ctx.fillRect(0, 0, w, h)
    } else {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
    }

    // 2. 绘制透明人像
    const scale = cropScale.value
    const pImg = personImage.value
    const scaledW = pImg.naturalWidth * scale
    const scaledH = pImg.naturalHeight * scale
    const drawX = -cropX.value
    const drawY = -cropY.value

    ctx.drawImage(
      pImg,
      0, 0, pImg.naturalWidth, pImg.naturalHeight,
      drawX, drawY, scaledW, scaledH
    )

    outputDataUrl.value = canvas.toDataURL('image/png')
  }

  /* ═══════ 下载 ═══════ */

  const downloadPhoto = (format = 'png') => {
    if (!outputDataUrl.value) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const w = outputWidth.value
    const h = outputHeight.value
    canvas.width = w
    canvas.height = h

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const quality = format === 'jpg' ? 0.95 : undefined

      canvas.toBlob((blob) => {
        if (!blob) return
        const preset = PHOTO_PRESETS.find(p => p.id === selectedPreset.value)
        const sizeName = customMode.value ? `${w}x${h}` : (preset?.label || `${w}x${h}`)
        const baseName = sourceFile.value?.name?.replace(/\.[^.]+$/, '') || '证件照'
        saveAs(blob, `${baseName}_${sizeName}.${format}`)
      }, mimeType, quality)
    }
    img.src = outputDataUrl.value
  }

  /**
   * 排版打印：多张排列到 6 寸纸 (1800×1200px @300dpi)
   */
  const downloadPrintLayout = () => {
    if (!outputDataUrl.value) return

    const paperW = 1800
    const paperH = 1200
    const pw = outputWidth.value
    const ph = outputHeight.value
    const gap = 20

    const cols = Math.floor((paperW + gap) / (pw + gap))
    const rows = Math.floor((paperH + gap) / (ph + gap))

    const canvas = document.createElement('canvas')
    canvas.width = paperW
    canvas.height = paperH
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, paperW, paperH)

    const img = new Image()
    img.onload = () => {
      const startX = Math.floor((paperW - cols * pw - (cols - 1) * gap) / 2)
      const startY = Math.floor((paperH - rows * ph - (rows - 1) * gap) / 2)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (pw + gap)
          const y = startY + r * (ph + gap)
          ctx.drawImage(img, x, y, pw, ph)
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) return
        const preset = PHOTO_PRESETS.find(p => p.id === selectedPreset.value)
        const sizeName = customMode.value ? `${pw}x${ph}` : (preset?.label || '')
        saveAs(blob, `证件照排版_${sizeName}_${cols}x${rows}.jpg`)
      }, 'image/jpeg', 0.95)
    }
    img.src = outputDataUrl.value
  }

  /* ═══════ 重置 ═══════ */

  const resetAll = () => {
    if (sourceImage.value) URL.revokeObjectURL(sourceImage.value.src)
    if (personImage.value) URL.revokeObjectURL(personImage.value.src)
    sourceImage.value = null
    sourceFile.value = null
    sourceWidth.value = 0
    sourceHeight.value = 0
    personImage.value = null
    personReady.value = false
    processing.value = false
    processProgress.value = ''
    processError.value = null
    outputDataUrl.value = null
    cropX.value = 0
    cropY.value = 0
    cropScale.value = 1
  }

  // 背景色/裁剪/尺寸变化时自动重新渲染（抠图后瞬间完成）
  watch([cropX, cropY, cropScale, outputWidth, outputHeight, selectedBgColor, customBgColor], () => {
    if (personReady.value) {
      renderOutput()
    }
  })

  return {
    sourceImage,
    sourceFile,
    sourceWidth,
    sourceHeight,
    personImage,
    personReady,
    processing,
    processProgress,
    processError,
    selectedPreset,
    customMode,
    customWidth,
    customHeight,
    selectedBgColor,
    customBgColor,
    cropX,
    cropY,
    cropScale,
    outputDataUrl,
    outputWidth,
    outputHeight,
    activeBgColor,
    loadImage,
    resetCrop,
    renderOutput,
    downloadPhoto,
    downloadPrintLayout,
    resetAll,
    PHOTO_PRESETS,
    BG_COLORS,
  }
}
