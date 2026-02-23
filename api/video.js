// Vercel Edge Function - 代理智谱CogVideoX视频生成API
export const config = {
  runtime: 'edge',
}

const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4'

const ALLOWED_ORIGINS = [
  'https://www.2074912.xyz',
  'https://2074912.xyz',
]

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default async function handler(request) {
  const corsHeaders = getCorsHeaders(request)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '服务端未配置 ZHIPU_API_KEY 环境变量' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'submit'

  try {
    const body = await request.json()

    if (action === 'submit') {
      const { prompt } = body
      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: '请提供视频描述' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const mode = url.searchParams.get('mode')
      const videoParams = {
        model: 'cogvideox-flash',
        prompt: prompt.slice(0, 2000),
      }
      if (mode === 'i2v' && body.image_url) {
        videoParams.image_url = body.image_url
        videoParams.with_audio = true
        videoParams.quality = 'speed'
      }

      const response = await fetch(`${ZHIPU_API_BASE}/videos/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(videoParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Zhipu Video Submit Error:', errorText)
        return new Response(JSON.stringify({ error: `API Error: ${response.status}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const data = await response.json()
      return new Response(JSON.stringify({
        requestId: data.id,
        taskStatus: data.task_status
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (action === 'status') {
      const { requestId } = body
      if (!requestId || typeof requestId !== 'string') {
        return new Response(JSON.stringify({ error: '请提供 requestId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      // 防止路径遍历攻击
      const safeId = requestId.replace(/[^a-zA-Z0-9_-]/g, '')

      const response = await fetch(`${ZHIPU_API_BASE}/async-result/${safeId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Zhipu Video Status Error:', errorText)
        return new Response(JSON.stringify({ error: `API Error: ${response.status}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const data = await response.json()
      const result = {
        status: data.task_status || 'UNKNOWN',
        videoUrl: null,
        coverUrl: null,
      }

      if (data.task_status === 'SUCCESS' && data.video_result) {
        result.videoUrl = data.video_result[0]?.url
        result.coverUrl = data.video_result[0]?.cover_image_url
      }

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ error: '无效的 action 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    console.error('Handler Error:', error)
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
