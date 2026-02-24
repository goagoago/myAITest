import { ref } from 'vue'

export function useWatermarkAdd() {
  // 原图 / 结果
  const sourceImage = ref(null)       // HTMLImageElement
  const sourceDataUrl = ref('')
  const resultDataUrl = ref('')

  // 启用的水印层（可共存）
  const enableText = ref(true)
  const enableEmoji = ref(false)
  const enableStamp = ref(false)

  // 文字水印
  const text = ref('水印文字')
  const fontSize = ref(32)
  const fontFamily = ref('sans-serif')
  const bold = ref(false)
  const italic = ref(false)
  const color = ref('#ffffff')

  // Emoji 水印
  const emoji = ref('😀')
  const emojiSize = ref(48)

  // 图片水印
  const stampImage = ref(null)        // HTMLImageElement
  const stampDataUrl = ref('')
  const stampSize = ref(80)

  // 通用
  const opacity = ref(0.3)
  const rotation = ref(-30)
  const tileMode = ref(true)
  const tileGap = ref(100)

  // 内部 canvas
  let offCanvas = null
  let offCtx = null

  const loadImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          sourceImage.value = img
          sourceDataUrl.value = e.target.result
          resultDataUrl.value = ''
          resolve(img)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const loadStampImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          stampImage.value = img
          stampDataUrl.value = e.target.result
          resolve(img)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * 收集所有启用的水印层
   */
  const getEnabledLayers = () => {
    const layers = []
    if (enableText.value && text.value) layers.push('text')
    if (enableEmoji.value && emoji.value) layers.push('emoji')
    if (enableStamp.value && stampImage.value) layers.push('image')
    return layers
  }

  /**
   * 测量某一层单个水印的宽高
   */
  const measureLayer = (ctx, layer) => {
    if (layer === 'text') {
      ctx.font = buildFont()
      const m = ctx.measureText(text.value || '水印')
      return { w: m.width, h: fontSize.value }
    } else if (layer === 'emoji') {
      ctx.font = `${emojiSize.value}px sans-serif`
      const m = ctx.measureText(emoji.value)
      return { w: m.width || emojiSize.value, h: emojiSize.value }
    } else {
      const img = stampImage.value
      const ratio = img.naturalWidth / img.naturalHeight
      return { w: stampSize.value, h: stampSize.value / ratio }
    }
  }

  /**
   * 绘制某一层的单个水印项
   */
  const drawLayerItem = (ctx, layer, center = false) => {
    if (layer === 'text') {
      ctx.font = buildFont()
      ctx.fillStyle = color.value
      const t = text.value || '水印'
      ctx.textAlign = center ? 'center' : 'left'
      ctx.textBaseline = center ? 'middle' : 'top'
      ctx.fillText(t, 0, 0)
    } else if (layer === 'emoji') {
      ctx.font = `${emojiSize.value}px sans-serif`
      ctx.textAlign = center ? 'center' : 'left'
      ctx.textBaseline = center ? 'middle' : 'top'
      ctx.fillText(emoji.value, 0, 0)
    } else if (layer === 'image' && stampImage.value) {
      const img = stampImage.value
      const ratio = img.naturalWidth / img.naturalHeight
      const sw = stampSize.value
      const sh = sw / ratio
      if (center) {
        ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh)
      } else {
        ctx.drawImage(img, 0, 0, sw, sh)
      }
    }
  }

  /**
   * 渲染预览
   */
  const renderPreview = () => {
    const src = sourceImage.value
    if (!src) return ''

    const w = src.naturalWidth
    const h = src.naturalHeight
    if (!offCanvas) {
      offCanvas = document.createElement('canvas')
      offCtx = offCanvas.getContext('2d')
    }
    offCanvas.width = w
    offCanvas.height = h

    // 画原图
    offCtx.drawImage(src, 0, 0, w, h)

    const layers = getEnabledLayers()
    if (layers.length === 0) {
      resultDataUrl.value = sourceDataUrl.value
      return sourceDataUrl.value
    }

    // 设置透明度
    offCtx.globalAlpha = opacity.value

    if (tileMode.value) {
      drawTiledMulti(offCtx, w, h, layers)
    } else {
      drawSingleMulti(offCtx, w, h, layers)
    }

    offCtx.globalAlpha = 1
    const url = offCanvas.toDataURL('image/png')
    resultDataUrl.value = url
    return url
  }

  /**
   * 平铺绘制 — 多层交错
   * 每一行在每个单元格里依次放各层，水平排列
   */
  const drawTiledMulti = (ctx, canvasW, canvasH, layers) => {
    const gap = tileGap.value
    const rad = (rotation.value * Math.PI) / 180

    // 测量所有层，计算组合单元格尺寸
    ctx.save()
    const measures = layers.map(l => measureLayer(ctx, l))
    ctx.restore()

    // 单元格 = 所有层水平排列 + 间距
    const innerGap = 20
    let totalW = 0
    let maxH = 0
    for (let i = 0; i < measures.length; i++) {
      totalW += measures[i].w
      if (i > 0) totalW += innerGap
      if (measures[i].h > maxH) maxH = measures[i].h
    }

    const stepX = totalW + gap
    const stepY = maxH + gap
    const diag = Math.sqrt(canvasW * canvasW + canvasH * canvasH)

    for (let y = -diag; y < diag; y += stepY) {
      for (let x = -diag; x < diag; x += stepX) {
        let offsetX = 0
        for (let i = 0; i < layers.length; i++) {
          ctx.save()
          ctx.translate(canvasW / 2, canvasH / 2)
          ctx.rotate(rad)
          ctx.translate(x - canvasW / 2 + offsetX, y - canvasH / 2)
          drawLayerItem(ctx, layers[i], false)
          ctx.restore()
          offsetX += measures[i].w + innerGap
        }
      }
    }
  }

  /**
   * 单个居中绘制 — 多层垂直堆叠
   */
  const drawSingleMulti = (ctx, canvasW, canvasH, layers) => {
    const rad = (rotation.value * Math.PI) / 180
    const layerGap = 16

    ctx.save()
    const measures = layers.map(l => measureLayer(ctx, l))
    ctx.restore()

    let totalH = 0
    for (let i = 0; i < measures.length; i++) {
      totalH += measures[i].h
      if (i > 0) totalH += layerGap
    }

    let offsetY = -totalH / 2
    for (let i = 0; i < layers.length; i++) {
      ctx.save()
      ctx.translate(canvasW / 2, canvasH / 2)
      ctx.rotate(rad)
      ctx.translate(0, offsetY + measures[i].h / 2)
      drawLayerItem(ctx, layers[i], true)
      ctx.restore()
      offsetY += measures[i].h + layerGap
    }
  }

  const buildFont = () => {
    let f = ''
    if (italic.value) f += 'italic '
    if (bold.value) f += 'bold '
    f += `${fontSize.value}px ${fontFamily.value}`
    return f
  }

  const downloadResult = () => {
    if (!resultDataUrl.value) return
    const link = document.createElement('a')
    link.href = resultDataUrl.value
    link.download = `watermarked-${Date.now()}.png`
    link.click()
  }

  const resetAll = () => {
    sourceImage.value = null
    sourceDataUrl.value = ''
    resultDataUrl.value = ''
    stampImage.value = null
    stampDataUrl.value = ''
    enableText.value = true
    enableEmoji.value = false
    enableStamp.value = false
    text.value = '水印文字'
    fontSize.value = 32
    fontFamily.value = 'sans-serif'
    bold.value = false
    italic.value = false
    color.value = '#ffffff'
    emoji.value = '😀'
    emojiSize.value = 48
    stampSize.value = 80
    opacity.value = 0.3
    rotation.value = -30
    tileMode.value = true
    tileGap.value = 100
  }

  return {
    sourceImage, sourceDataUrl, resultDataUrl,
    enableText, enableEmoji, enableStamp,
    text, fontSize, fontFamily, bold, italic, color,
    emoji, emojiSize,
    stampImage, stampDataUrl, stampSize,
    opacity, rotation, tileMode, tileGap,
    loadImage, loadStampImage, renderPreview, downloadResult, resetAll,
  }
}
