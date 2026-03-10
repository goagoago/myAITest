const AI_ENDPOINTS = {
  chat: '/api/chat',
  image: '/api/image',
  video: '/api/video',
  watermark: '/api/watermark-removal',
}

function parseErrorMessage(payload, status) {
  if (typeof payload === 'string') {
    return payload || `HTTP ${status}`
  }

  return payload?.error?.message || payload?.detail || payload?.error || `HTTP ${status}`
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}))
  }
  return response.text().catch(() => '')
}

export async function postAiJsonWithStatus(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await parseResponseBody(response)
  return {
    ok: response.ok,
    status: response.status,
    data,
  }
}

export async function postAiJson(endpoint, payload) {
  const { ok, status, data } = await postAiJsonWithStatus(endpoint, payload)
  if (!ok) {
    const error = new Error(parseErrorMessage(data, status))
    error.status = status
    error.payload = data
    throw error
  }
  return data
}

export async function postAiStream(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await parseResponseBody(response)
    const error = new Error(parseErrorMessage(data, response.status))
    error.status = response.status
    error.payload = data
    throw error
  }

  return response
}

export const aiClient = {
  endpoints: AI_ENDPOINTS,
  chat: {
    complete: payload => postAiJson(AI_ENDPOINTS.chat, payload),
    stream: payload => postAiStream(AI_ENDPOINTS.chat, payload),
  },
  image: {
    generate: payload => postAiJson(AI_ENDPOINTS.image, payload),
  },
  video: {
    submit: payload => postAiJsonWithStatus(`${AI_ENDPOINTS.video}?action=submit`, payload),
    submitImageToVideo: payload => postAiJsonWithStatus(`${AI_ENDPOINTS.video}?action=submit&mode=i2v`, payload),
    status: payload => postAiJsonWithStatus(`${AI_ENDPOINTS.video}?action=status`, payload),
  },
  watermark: {
    remove: payload => postAiJson(AI_ENDPOINTS.watermark, payload),
  },
}
