import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-aujkenkkrywvltydrzdvpbyfdflnneypmgetxfveicjcqxbw'
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '94c09f3d19b582cafaa8700d63524cbc.4vAoySH9Q0l7xCQW'
const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4'

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

export default defineConfig({
  plugins: [vue(), watermarkRemovalMiddleware(), videoApiMiddleware()],
  server: {
    proxy: {
      // 智谱聊天API代理
      '/api/chat': {
        target: 'https://open.bigmodel.cn/api/paas/v4',
        changeOrigin: true,
        rewrite: () => '/chat/completions',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Authorization', `Bearer ${ZHIPU_API_KEY}`)
          })
        }
      },
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
})
