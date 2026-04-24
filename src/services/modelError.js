export const MODEL_ERROR_MESSAGE = '模型出错，请稍后再试'

const PASSTHROUGH_STATUSES = new Set([401, 402])
const PASSTHROUGH_MESSAGES = new Set([
  '请先登录后再使用该功能',
  '余额不足',
])

const extractMessage = (error) => {
  if (typeof error === 'string') return error
  return typeof error?.message === 'string' ? error.message : ''
}

export const shouldPassthroughModelError = (error) => {
  const message = extractMessage(error)
  return PASSTHROUGH_STATUSES.has(Number(error?.status))
    || PASSTHROUGH_MESSAGES.has(message)
    || message === MODEL_ERROR_MESSAGE
}

export const normalizeModelError = (error) => {
  if (shouldPassthroughModelError(error)) {
    if (error instanceof Error) return error

    const passthrough = new Error(extractMessage(error) || MODEL_ERROR_MESSAGE)
    if (error && typeof error === 'object') {
      passthrough.status = error.status
      passthrough.code = error.code
      passthrough.payload = error.payload
    }
    return passthrough
  }

  const normalized = new Error(MODEL_ERROR_MESSAGE)
  if (error && typeof error === 'object') {
    normalized.status = error.status
    normalized.code = error.code
    normalized.payload = error.payload
    normalized.cause = error
  }
  return normalized
}
