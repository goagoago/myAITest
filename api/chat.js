// Vercel Edge Function - 代理智谱API请求
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
    const { messages, stream = false, model = 'glm-4-flash', temperature = 0.7, max_tokens = 8192 } = body

    // 输入校验
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '无效的消息格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 限制消息数量和长度，防止滥用
    const safeMessages = messages.slice(-20).map(m => ({
      role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 10000) : '',
    }))

    const safeTemp = Math.min(Math.max(Number(temperature) || 0.7, 0), 2)
    const safeMaxTokens = Math.min(Math.max(Number(max_tokens) || 4096, 1), 8192)

    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '服务端未配置 ZHIPU_API_KEY 环境变量' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        temperature: safeTemp,
        max_tokens: safeMaxTokens,
        stream,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      return new Response(JSON.stringify({ error: `API Error: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders,
        },
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
