// Vercel Edge Function - 代理硅基流动图片生成API
export const config = {
  runtime: 'edge',
}

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

  try {
    const body = await request.json()
    const {
      prompt,
      model = 'black-forest-labs/FLUX.1-schnell',
      image_size = '1024x1024',
      num_inference_steps = 20,
    } = body

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: '请提供图片描述' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 限制 prompt 长度
    const safePrompt = prompt.slice(0, 2000)
    const safeSteps = Math.min(Math.max(parseInt(num_inference_steps) || 20, 1), 50)

    const apiKey = process.env.SILICONFLOW_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '服务端未配置 SILICONFLOW_API_KEY 环境变量' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: safePrompt,
        image_size,
        num_inference_steps: safeSteps,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SiliconFlow API Error:', errorText)
      return new Response(JSON.stringify({ error: `API Error: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
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
