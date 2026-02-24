import { ref, reactive } from 'vue'
import QRCode from 'qrcode'

export function useQrCode() {
  const loading = ref(false)
  const error = ref('')
  const qrDataUrl = ref('')

  const options = reactive({
    text: '',
    size: 300,
    foreground: '#000000',
    background: '#ffffff',
    errorCorrectionLevel: 'H',
    logoFile: null,
    logoUrl: '',
  })

  /**
   * 生成二维码（含可选 Logo 叠加）
   * 返回 base64 data URL
   */
  const generate = async () => {
    if (!options.text.trim()) {
      error.value = '请输入文本或链接'
      qrDataUrl.value = ''
      return
    }

    loading.value = true
    error.value = ''

    try {
      // 1. 用 qrcode 库生成 Canvas
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, options.text, {
        width: options.size,
        margin: 2,
        color: {
          dark: options.foreground,
          light: options.background,
        },
        errorCorrectionLevel: options.errorCorrectionLevel,
      })

      // 2. 如果有 Logo，叠加到中心
      if (options.logoUrl) {
        const ctx = canvas.getContext('2d')
        const logoImg = await loadImage(options.logoUrl)
        const logoSize = options.size * 0.22
        const x = (canvas.width - logoSize) / 2
        const y = (canvas.height - logoSize) / 2

        // 白色背景垫底
        const padding = 4
        ctx.fillStyle = options.background
        roundRect(ctx, x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2, 8)
        ctx.fill()

        // 绘制 Logo
        ctx.drawImage(logoImg, x, y, logoSize, logoSize)
      }

      qrDataUrl.value = canvas.toDataURL('image/png')
    } catch (e) {
      console.error('QR 生成失败:', e)
      error.value = '二维码生成失败，请检查输入内容'
      qrDataUrl.value = ''
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置 Logo 文件
   */
  const setLogo = (file) => {
    if (!file) {
      options.logoFile = null
      options.logoUrl = ''
      return
    }
    options.logoFile = file
    if (options.logoUrl) URL.revokeObjectURL(options.logoUrl)
    options.logoUrl = URL.createObjectURL(file)
  }

  /**
   * 清除 Logo
   */
  const clearLogo = () => {
    if (options.logoUrl) URL.revokeObjectURL(options.logoUrl)
    options.logoFile = null
    options.logoUrl = ''
  }

  /**
   * 下载为 PNG
   */
  const download = (filename = 'qrcode.png') => {
    if (!qrDataUrl.value) return
    const link = document.createElement('a')
    link.href = qrDataUrl.value
    link.download = filename
    link.click()
  }

  /**
   * 重置所有状态
   */
  const reset = () => {
    options.text = ''
    options.size = 300
    options.foreground = '#000000'
    options.background = '#ffffff'
    options.errorCorrectionLevel = 'H'
    clearLogo()
    qrDataUrl.value = ''
    error.value = ''
  }

  return {
    loading,
    error,
    qrDataUrl,
    options,
    generate,
    setLogo,
    clearLogo,
    download,
    reset,
  }
}

// ── 辅助函数 ──

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
