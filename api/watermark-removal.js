// Vercel Serverless Function - 代理硅基流动图片去水印API
// 使用 Node.js runtime（非 Edge）以支持大体积 base64 图片传输

export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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
    const { prompt, image, num_inference_steps, guidance_scale } = req.body

    if (!image) {
      return res.status(400).json({ error: '请提供图片' })
    }

    const steps = Math.min(Math.max(parseInt(num_inference_steps) || 50, 20), 100)
    const guidance = Math.min(Math.max(parseFloat(guidance_scale) || 7.5, 1), 20)

    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen-Image-Edit',
        prompt: prompt || 'Remove all watermarks, logos, text overlays, and semi-transparent marks from this image.',
        image,
        num_inference_steps: steps,
        guidance_scale: guidance,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Watermark Removal API Error]', response.status, errorText)
      return res.status(response.status).json({ error: `API错误: ${response.status}`, detail: errorText })
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

    return res.status(200).json(result)
  } catch (error) {
    console.error('[Watermark Removal Error]', error)
    return res.status(500).json({ error: error.message })
  }
}
