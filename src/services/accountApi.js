import { requestJson } from './apiClient'

const withMonth = (path, month) => {
  if (!month) return path
  const glue = path.includes('?') ? '&' : '?'
  return `${path}${glue}month=${encodeURIComponent(month)}`
}

export const accountApi = {
  getHumanCheck: () => requestJson('/api/auth/human-check'),

  sendEmailCode: (payload) => requestJson('/api/auth/email-code', {
    method: 'POST',
    json: payload,
  }),

  register: (payload) => requestJson('/api/auth/register', {
    method: 'POST',
    json: payload,
  }),

  login: (payload) => requestJson('/api/auth/login', {
    method: 'POST',
    json: payload,
  }),

  getDashboard: (month) => requestJson(withMonth('/api/account/dashboard', month), {
    auth: true,
  }),

  updateProfile: (payload, month) => requestJson(withMonth('/api/account/profile', month), {
    method: 'PUT',
    auth: true,
    json: payload,
  }),

  changePassword: (payload) => requestJson('/api/account/password', {
    method: 'PUT',
    auth: true,
    json: payload,
  }),

  getFeedbacks: () => requestJson('/api/account/feedbacks', {
    auth: true,
  }),

  submitFeedback: (payload) => requestJson('/api/account/feedbacks', {
    method: 'POST',
    auth: true,
    json: payload,
  }),

  checkIn: (month) => requestJson(withMonth('/api/account/check-in', month), {
    method: 'POST',
    auth: true,
  }),

  redeemCode: (payload, month) => requestJson(withMonth('/api/account/redeem-code', month), {
    method: 'POST',
    auth: true,
    json: payload,
  }),
}
