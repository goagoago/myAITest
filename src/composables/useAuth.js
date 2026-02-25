import { ref, computed } from 'vue'

const AUTH_API = 'http://localhost:8080/api/auth'

const token = ref(localStorage.getItem('token') || '')
const username = ref(localStorage.getItem('username') || '')

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value)

  function setAuth(newToken, newUsername) {
    token.value = newToken
    username.value = newUsername
    localStorage.setItem('token', newToken)
    localStorage.setItem('username', newUsername)
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('username')
  }

  async function login(user, pass) {
    const res = await fetch(`${AUTH_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass }),
    })
    const data = await res.json()
    if (data.success) {
      setAuth(data.token, data.username)
    }
    return data
  }

  async function register(user, pass, email) {
    const res = await fetch(`${AUTH_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass, email }),
    })
    const data = await res.json()
    if (data.success) {
      setAuth(data.token, data.username)
    }
    return data
  }

  async function sendResetCode(user) {
    const res = await fetch(`${AUTH_API}/send-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user }),
    })
    return res.json()
  }

  async function resetPassword(user, code, newPassword) {
    const res = await fetch(`${AUTH_API}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, code, newPassword }),
    })
    return res.json()
  }

  return {
    token,
    username,
    isLoggedIn,
    login,
    register,
    logout,
    sendResetCode,
    resetPassword,
  }
}
