// Vercel Edge Function - 代理智谱CogVideoX视频生成API
export const config = {
  runtime: 'edge',
}

const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4'

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

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '服务端未配置 ZHIPU_API_KEY 环境变量' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'submit'

  try {
    const body = await request.json()

    // 提交视频生成请求
    if (action === 'submit') {
      const { prompt } = body

      if (!prompt) {
        return new Response(JSON.stringify({ error: '请提供视频描述' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      const response = await fetch(`${ZHIPU_API_BASE}/videos/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'cogvideox-flash',  // 免费模型
          prompt,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Zhipu Video Submit Error:', errorText)
        return new Response(JSON.stringify({ error: `API Error: ${response.status}`, detail: errorText }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      const data = await response.json()
      // 返回任务ID
      return new Response(JSON.stringify({
        requestId: data.id,
        taskStatus: data.task_status
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 查询视频生成状态
    if (action === 'status') {
      const { requestId } = body

      if (!requestId) {
        return new Response(JSON.stringify({ error: '请提供 requestId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      const response = await fetch(`${ZHIPU_API_BASE}/async-result/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Zhipu Video Status Error:', errorText)
        return new Response(JSON.stringify({ error: `API Error: ${response.status}`, detail: errorText }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      const data = await response.json()
      console.log('Zhipu Video Status Response:', JSON.stringify(data))

      // 统一返回格式，确保status字段始终存在
      const result = {
        status: data.task_status || 'UNKNOWN', // PROCESSING, SUCCESS, FAIL
        videoUrl: null,
        coverUrl: null,
      }

      if (data.task_status === 'SUCCESS' && data.video_result) {
        result.videoUrl = data.video_result[0]?.url
        result.coverUrl = data.video_result[0]?.cover_image_url
      }

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({ error: '无效的 action 参数' }), {
      status: 400,
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
