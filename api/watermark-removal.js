// Vercel Serverless Function - 代理硅基流动图片去水印API
// 使用 Node.js runtime（非 Edge）以支持大体积 base64 图片传输

export const config = {
  maxDuration: 60,
}

const ALLOWED_ORIGINS = [
  'https://www.2074912.xyz',
  'https://2074912.xyz',
]

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowed)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|tiff?|svg)(\?|$)/i
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\?|$)/i
const IMAGE_MIME = /^image\//
const VIDEO_MIME = /^video\//
const HTML_MIME = /^text\/html/
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024  // 50MB

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 从 HTML 页面中提取媒体 URL（支持小红书、微博等社交平台分享链接）
 * 优先提取 og:video，其次 og:image
 */
function extractMediaFromHtml(html) {
  // 提取所有 og:video 和 og:video:url
  const videoMatches = []
  const videoRe = /property=["']og:video(?::url)?["'][^>]*content=["']([^"']+)["']/gi
  const videoRe2 = /content=["']([^"']+)["'][^>]*property=["']og:video(?::url)?["']/gi
  let m
  while ((m = videoRe.exec(html)) !== null) videoMatches.push(m[1])
  while ((m = videoRe2.exec(html)) !== null) videoMatches.push(m[1])

  // 提取所有 og:image
  const imageMatches = []
  const imageRe = /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi
  const imageRe2 = /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi
  while ((m = imageRe.exec(html)) !== null) imageMatches.push(m[1])
  while ((m = imageRe2.exec(html)) !== null) imageMatches.push(m[1])

  // 去重
  const videos = [...new Set(videoMatches)].filter(u => u.startsWith('http'))
  const images = [...new Set(imageMatches)].filter(u => u.startsWith('http'))

  // 优先返回视频，其次返回第一张图片
  if (videos.length > 0) {
    return { type: 'video', url: videos[0], allImages: images }
  }
  if (images.length > 0) {
    return { type: 'image', url: images[0], allImages: images }
  }
  return null
}

/**
 * 下载指定媒体URL，返回 { type, data(base64), contentType }
 */
async function downloadMedia(mediaUrl, expectedType) {
  const resp = await fetch(mediaUrl, {
    headers: { 'User-Agent': BROWSER_UA, 'Referer': mediaUrl },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })
  if (!resp.ok) {
    throw new Error(`下载媒体失败: HTTP ${resp.status}`)
  }

  const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim()
  let mediaType = expectedType
  if (IMAGE_MIME.test(contentType)) mediaType = 'image'
  else if (VIDEO_MIME.test(contentType)) mediaType = 'video'

  const maxSize = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
  const arrayBuffer = await resp.arrayBuffer()
  if (arrayBuffer.byteLength > maxSize) {
    throw new Error(`文件过大（${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB），${mediaType === 'image' ? '图片' : '视频'}最大支持 ${maxSize / 1024 / 1024}MB`)
  }

  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const finalContentType = contentType || (mediaType === 'image' ? 'image/png' : 'video/mp4')
  return { type: mediaType, data: base64, contentType: finalContentType }
}

async function handleFetchUrl(req, res) {
  const { url } = req.body
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '请提供有效的URL' })
  }

  let parsedUrl
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('invalid protocol')
    }
  } catch {
    return res.status(400).json({ error: 'URL格式不正确' })
  }

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    })

    if (!resp.ok) {
      return res.status(400).json({ error: `无法下载资源: HTTP ${resp.status}` })
    }

    const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim()

    // ── 直接是图片/视频 ──
    let mediaType = null
    if (IMAGE_MIME.test(contentType)) mediaType = 'image'
    else if (VIDEO_MIME.test(contentType)) mediaType = 'video'
    else if (IMAGE_EXTENSIONS.test(parsedUrl.pathname)) mediaType = 'image'
    else if (VIDEO_EXTENSIONS.test(parsedUrl.pathname)) mediaType = 'video'

    if (mediaType) {
      const maxSize = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
      const arrayBuffer = await resp.arrayBuffer()
      if (arrayBuffer.byteLength > maxSize) {
        return res.status(400).json({
          error: `文件过大（${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB），${mediaType === 'image' ? '图片' : '视频'}最大支持 ${maxSize / 1024 / 1024}MB`
        })
      }
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const finalContentType = contentType || (mediaType === 'image' ? 'image/png' : 'video/mp4')
      return res.status(200).json({ type: mediaType, data: base64, contentType: finalContentType })
    }

    // ── HTML 页面：解析 og 标签提取媒体 ──
    if (HTML_MIME.test(contentType)) {
      const html = await resp.text()
      const extracted = extractMediaFromHtml(html)

      if (!extracted) {
        return res.status(400).json({ error: '页面中未找到图片或视频，请直接粘贴图片/视频的链接' })
      }

      console.log(`[Fetch URL] 从HTML提取到 ${extracted.type}: ${extracted.url.slice(0, 100)}...`)

      const result = await downloadMedia(extracted.url, extracted.type)

      // 如果是图片类型且有多张图片，附带全部图片URL供前端展示
      if (extracted.allImages && extracted.allImages.length > 1) {
        result.allImages = extracted.allImages
      }

      return res.status(200).json(result)
    }

    return res.status(400).json({ error: '无法识别资源类型，请确认链接为图片或视频' })
  } catch (err) {
    console.error('[Fetch URL Error]', err)
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(400).json({ error: '下载超时，请检查链接是否可访问' })
    }
    return res.status(500).json({ error: '下载资源失败: ' + (err.message || '未知错误') })
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: '服务端未配置 SILICONFLOW_API_KEY 环境变量' })
  }

  try {
    const { action } = req.body

    // ── URL代理下载 ──
    if (action === 'fetch-url') {
      return await handleFetchUrl(req, res)
    }

    const { prompt, image, num_inference_steps, guidance_scale } = req.body

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: '请提供图片' })
    }

    // 限制 base64 图片大小（约 10MB）
    if (image.length > 14_000_000) {
      return res.status(400).json({ error: '图片过大，请上传小于 10MB 的图片' })
    }

    const steps = Math.min(Math.max(parseInt(num_inference_steps) || 50, 20), 50)
    const guidance = Math.min(Math.max(parseFloat(guidance_scale) || 7.5, 1), 20)

    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen-Image-Edit',
        prompt: typeof prompt === 'string' ? prompt.slice(0, 2000) : 'Remove all watermarks from this image.',
        image,
        num_inference_steps: steps,
        guidance_scale: guidance,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Watermark Removal API Error]', response.status, errorText)
      return res.status(response.status).json({ error: `API错误: ${response.status}` })
    }

    const result = await response.json()

    // 将返回的图片URL下载转为base64，避免前端跨域问题
    const imageUrl = result.images?.[0]?.url
    if (imageUrl) {
      try {
        const imgResp = await fetch(imageUrl)
        if (imgResp.ok) {
          const arrayBuffer = await imgResp.arrayBuffer()
          const contentType = imgResp.headers.get('content-type') || 'image/png'
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          result.images[0].url = `data:${contentType};base64,${base64}`
        }
      } catch (imgErr) {
        console.error('[Watermark Image Download Error]', imgErr)
      }
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('[Watermark Removal Error]', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
}
