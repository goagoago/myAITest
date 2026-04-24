import { FEATURE_MAP } from '../constants/features'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export const AUTH_STORAGE_KEY = 'toolsbox-auth-session'
export const AUTH_REQUIRED_EVENT = 'toolsbox:auth-required'

const normalizeBase = (base) => {
  if (!base) return ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export const buildApiUrl = (path) => {
  if (/^https?:\/\//.test(path)) return path
  const base = normalizeBase(API_BASE)
  if (!base) return path
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

export const getStoredSession = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const getAuthToken = () => getStoredSession()?.token || ''

const emitAuthRequired = (featureCode) => {
  if (typeof window === 'undefined') return
  const detail = {
    featureCode,
    redirect: `${window.location.pathname}${window.location.search}`,
  }
  window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT, { detail }))
}

const createRequestError = (message, status, payload) => {
  const error = new Error(message)
  error.status = status
  error.code = status
  error.payload = payload
  return error
}

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}))
  }
  return response.text().catch(() => '')
}

const extractErrorMessage = (payload, status) => {
  if (status === 402) return '余额不足'
  if (typeof payload === 'string') {
    return payload || `请求失败（${status}）`
  }
  if (payload?.message) return payload.message
  if (payload?.error?.message) return payload.error.message
  if (payload?.detail) return payload.detail
  if (payload?.error) return payload.error
  return `请求失败（${status}）`
}

const unwrapPayload = (payload, status) => {
  if (payload && typeof payload === 'object' && 'code' in payload && 'message' in payload) {
    if (payload.code !== 200) {
      throw createRequestError(extractErrorMessage(payload, payload.code || status), payload.code || status, payload)
    }
    return payload.data ?? null
  }
  return payload
}

const buildRequestInit = (options = {}) => {
  const { method = 'GET', headers = {}, json, body, auth = false, featureCode, signal } = options
  const finalHeaders = { ...headers }

  if (featureCode) {
    finalHeaders['X-Feature-Code'] = featureCode
  }

  if (auth) {
    const token = getAuthToken()
    if (!token) {
      emitAuthRequired(featureCode)
      throw createRequestError('请先登录后再使用该功能', 401, null)
    }
    finalHeaders.Authorization = `Bearer ${token}`
  }

  let requestBody = body
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(json)
  }

  return { method, headers: finalHeaders, body: requestBody, signal }
}

const handleFailedResponse = async (response, options = {}) => {
  const payload = await parseResponseBody(response)
  if (options.auth && response.status === 401) {
    emitAuthRequired(options.featureCode)
  }
  throw createRequestError(extractErrorMessage(payload, response.status), response.status, payload)
}

export async function requestJson(path, options = {}) {
  const response = await fetch(buildApiUrl(path), buildRequestInit(options))
  const payload = await parseResponseBody(response)
  if (!response.ok) {
    if (options.auth && response.status === 401) {
      emitAuthRequired(options.featureCode)
    }
    throw createRequestError(extractErrorMessage(payload, response.status), response.status, payload)
  }
  return unwrapPayload(payload, response.status)
}

export async function requestBlob(path, options = {}) {
  const response = await fetch(buildApiUrl(path), buildRequestInit(options))
  if (!response.ok) {
    await handleFailedResponse(response, options)
  }
  return response.blob()
}

export async function requestRaw(path, options = {}) {
  const response = await fetch(buildApiUrl(path), buildRequestInit(options))
  if (!response.ok) {
    await handleFailedResponse(response, options)
  }
  return response
}

export const formatFeatureCost = (featureCode) => {
  const meta = FEATURE_MAP[featureCode]
  return meta ? `${meta.cost} 点` : '待定'
}
