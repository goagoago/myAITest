import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// API Keys 只从环境变量读取，不要硬编码！
// 本地开发时在项目根目录创建 .env.local 文件写入密钥

export default defineConfig(({ mode }) => {
  // loadEnv 第三个参数 '' 表示加载所有变量（不限 VITE_ 前缀）
  const env = loadEnv(mode, process.cwd(), '')
  const SILICONFLOW_API_KEY = env.SILICONFLOW_API_KEY || ''
  const ZHIPU_API_KEY = env.ZHIPU_API_KEY || ''
  const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4'

// 智谱聊天API中间件（替代proxy，解决大body转发问题）
function chatApiMiddleware() {
  return {
    name: 'chat-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/chat' || req.method !== 'POST') {
          return next()
        }

        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        try {
          const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ZHIPU_API_KEY}`,
            },
            body,
          })

          const contentType = response.headers.get('content-type') || 'application/json'
          res.statusCode = response.status
          res.setHeader('Content-Type', contentType)
          res.setHeader('Access-Control-Allow-Origin', '*')

          if (contentType.includes('text/event-stream')) {
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            const reader = response.body.getReader()
            const pump = async () => {
              while (true) {
                const { done, value } = await reader.read()
                if (done) { res.end(); return }
                res.write(value)
              }
            }
            await pump()
          } else {
            const result = await response.text()
            res.end(result)
          }
        } catch (error) {
          console.error('[Chat API Error]', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message }))
        }
      })
    }
  }
}

// 图片去水印API中间件
function watermarkRemovalMiddleware() {
  return {
    name: 'watermark-removal-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/watermark-removal' || req.method !== 'POST') {
          return next()
        }

        // 解析请求体（base64图片可能很大，需要加大限制）
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        try {
          const data = JSON.parse(body)

          // URL代理下载
          if (data.action === 'fetch-url') {
            const targetUrl = data.url
            if (!targetUrl || typeof targetUrl !== 'string') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: '请提供有效的URL' }))
              return
            }

            let parsedUrl
            try {
              parsedUrl = new URL(targetUrl)
              if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'URL格式不正确' }))
              return
            }

            const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

            const fetchResp = await fetch(targetUrl, {
              headers: { 'User-Agent': BROWSER_UA },
              redirect: 'follow',
            })

            if (!fetchResp.ok) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `无法下载资源: HTTP ${fetchResp.status}` }))
              return
            }

            const contentType = (fetchResp.headers.get('content-type') || '').split(';')[0].trim()
            let mediaType = null
            if (/^image\//.test(contentType)) mediaType = 'image'
            else if (/^video\//.test(contentType)) mediaType = 'video'
            else if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(parsedUrl.pathname)) mediaType = 'image'
            else if (/\.(mp4|webm|mov|avi|mkv|flv|m4v)(\?|$)/i.test(parsedUrl.pathname)) mediaType = 'video'

            // 直接是媒体文件
            if (mediaType) {
              const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
              const arrayBuffer = await fetchResp.arrayBuffer()
              if (arrayBuffer.byteLength > maxSize) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `文件过大，${mediaType === 'image' ? '图片' : '视频'}最大支持 ${maxSize / 1024 / 1024}MB` }))
                return
              }

              const base64 = Buffer.from(arrayBuffer).toString('base64')
              const finalContentType = contentType || (mediaType === 'image' ? 'image/png' : 'video/mp4')

              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ type: mediaType, data: base64, contentType: finalContentType }))
              return
            }

            // HTML 页面：解析 og 标签提取媒体
            if (/^text\/html/.test(contentType)) {
              const html = await fetchResp.text()

              // 提取 og:video
              const videoMatches = []
              const videoRe = /property=["']og:video(?::url)?["'][^>]*content=["']([^"']+)["']/gi
              const videoRe2 = /content=["']([^"']+)["'][^>]*property=["']og:video(?::url)?["']/gi
              let m
              while ((m = videoRe.exec(html)) !== null) videoMatches.push(m[1])
              while ((m = videoRe2.exec(html)) !== null) videoMatches.push(m[1])

              // 提取 og:image
              const imageMatches = []
              const imageRe = /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi
              const imageRe2 = /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi
              while ((m = imageRe.exec(html)) !== null) imageMatches.push(m[1])
              while ((m = imageRe2.exec(html)) !== null) imageMatches.push(m[1])

              const videos = [...new Set(videoMatches)].filter(u => u.startsWith('http'))
              const images = [...new Set(imageMatches)].filter(u => u.startsWith('http'))

              const extracted = videos.length > 0
                ? { type: 'video', url: videos[0], allImages: images }
                : images.length > 0
                  ? { type: 'image', url: images[0], allImages: images }
                  : null

              if (!extracted) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: '页面中未找到图片或视频，请直接粘贴图片/视频的链接' }))
                return
              }

              console.log(`[Fetch URL] 从HTML提取到 ${extracted.type}: ${extracted.url.slice(0, 100)}...`)

              // 下载提取到的媒体
              const mediaResp = await fetch(extracted.url, {
                headers: { 'User-Agent': BROWSER_UA, 'Referer': extracted.url },
                redirect: 'follow',
              })
              if (!mediaResp.ok) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `下载媒体失败: HTTP ${mediaResp.status}` }))
                return
              }

              const mediaCt = (mediaResp.headers.get('content-type') || '').split(';')[0].trim()
              let detectedType = extracted.type
              if (/^image\//.test(mediaCt)) detectedType = 'image'
              else if (/^video\//.test(mediaCt)) detectedType = 'video'

              const maxSize = detectedType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
              const arrayBuffer = await mediaResp.arrayBuffer()
              if (arrayBuffer.byteLength > maxSize) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `文件过大，最大支持 ${maxSize / 1024 / 1024}MB` }))
                return
              }

              const base64 = Buffer.from(arrayBuffer).toString('base64')
              const finalContentType = mediaCt || (detectedType === 'image' ? 'image/png' : 'video/mp4')
              const result = { type: detectedType, data: base64, contentType: finalContentType }
              if (extracted.allImages && extracted.allImages.length > 1) {
                result.allImages = extracted.allImages
              }

              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify(result))
              return
            }

            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '无法识别资源类型，请确认链接为图片或视频' }))
            return
          }

          // 原有去水印逻辑
          const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'Qwen/Qwen-Image-Edit',
              prompt: data.prompt,
              image: data.image,
              num_inference_steps: 50,
              guidance_scale: 7.5,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[Watermark Removal API Error]', response.status, errorText)
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(JSON.stringify({ error: `API错误: ${response.status}`, detail: errorText }))
            return
          }

          const result = await response.json()
          console.log('[Watermark Removal API Response]', JSON.stringify(result).slice(0, 200))

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
              // 下载失败则保留原始URL
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(result))
        } catch (error) {
          console.error('[Watermark Removal Error]', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message }))
        }
      })
    }
  }
}

// 视频API中间件
function videoApiMiddleware() {
  return {
    name: 'video-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/video')) {
          return next()
        }

        // 解析请求体
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }
        const data = body ? JSON.parse(body) : {}

        const url = new URL(req.url, 'http://localhost')
        const action = url.searchParams.get('action') || 'submit'

        try {
          let apiUrl, apiBody

          if (action === 'submit') {
            apiUrl = `${ZHIPU_API_BASE}/videos/generations`
            const mode = url.searchParams.get('mode')
            const videoParams = {
              model: 'cogvideox-flash',
              prompt: data.prompt,
            }
            // 图生视频模式：传入 image_url，开启音频，速度优先
            if (mode === 'i2v' && data.image_url) {
              videoParams.image_url = data.image_url
              videoParams.with_audio = true
              videoParams.quality = 'speed'
            }
            apiBody = JSON.stringify(videoParams)
          } else if (action === 'status') {
            apiUrl = `${ZHIPU_API_BASE}/async-result/${data.requestId}`
            apiBody = null
          }

          const response = await fetch(apiUrl, {
            method: action === 'status' ? 'GET' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ZHIPU_API_KEY}`,
            },
            ...(apiBody && { body: apiBody }),
          })

          // 检查API响应状态
          if (!response.ok) {
            const errorText = await response.text()
            console.error('[Video API Error]', response.status, errorText)
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(JSON.stringify({ error: `API错误: ${response.status}`, detail: errorText }))
            return
          }

          const result = await response.json()
          console.log('[Video API Response]', action, JSON.stringify(result))

          // 格式化响应
          let formattedResult
          if (action === 'submit') {
            formattedResult = {
              requestId: result.id,
              taskStatus: result.task_status || 'PROCESSING',
            }
          } else {
            // 确保status字段始终存在
            formattedResult = {
              status: result.task_status || 'UNKNOWN',
              videoUrl: result.video_result?.[0]?.url || null,
              coverUrl: result.video_result?.[0]?.cover_image_url || null,
              // 调试信息
              _raw: result,
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(formattedResult))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message }))
        }
      })
    }
  }
}

  return {
    plugins: [vue(), watermarkRemovalMiddleware(), videoApiMiddleware(), chatApiMiddleware()],
    optimizeDeps: {
      exclude: ['@imgly/background-removal'],
    },
    server: {
      proxy: {
        // 硅基流动图片生成API代理（Kolors模型）
        '/api/image': {
          target: 'https://api.siliconflow.cn/v1',
          changeOrigin: true,
          rewrite: () => '/images/generations',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${SILICONFLOW_API_KEY}`)
            })
          }
        }
      }
    }
  }
})
