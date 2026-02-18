// Vercel Edge Function - 代理硅基流动图片生成API
export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

    if (!prompt) {
      return new Response(JSON.stringify({ error: '请提供图片描述' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const apiKey = process.env.SILICONFLOW_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '服务端未配置 SILICONFLOW_API_KEY 环境变量' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
        prompt,
        image_size,
        num_inference_steps,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SiliconFlow API Error:', errorText)
      return new Response(JSON.stringify({ error: `API Error: ${response.status}`, detail: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    console.error('Handler Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
