import { buildApiUrl, requestJson, requestRaw } from './apiClient'

const AI_ENDPOINTS = {
  chat: buildApiUrl('/api/chat'),
  images: buildApiUrl('/api/images/generations'),
}

export async function postAiJson(endpoint, payload, options = {}) {
  return requestJson(endpoint, {
    method: 'POST',
    auth: true,
    featureCode: options.featureCode,
    json: payload,
    signal: options.signal,
  })
}

export async function postAiStream(endpoint, payload, options = {}) {
  return requestRaw(endpoint, {
    method: 'POST',
    auth: true,
    featureCode: options.featureCode,
    json: payload,
    signal: options.signal,
  })
}

export const aiClient = {
  endpoints: AI_ENDPOINTS,
  chat: {
    complete: (payload, options = {}) => postAiJson(AI_ENDPOINTS.chat, payload, options),
    stream: (payload, options = {}) => postAiStream(AI_ENDPOINTS.chat, payload, options),
  },
  images: {
    generate: (payload, options = {}) => postAiJson(AI_ENDPOINTS.images, payload, options),
    confirm: (token, options = {}) => postAiJson(buildApiUrl('/api/images/generations/confirm'), { token }, options),
  },
}
