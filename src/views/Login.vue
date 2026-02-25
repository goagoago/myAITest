<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { LogIn, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const { login, isLoggedIn } = useAuth()

if (isLoggedIn.value) router.replace('/')

const form = ref({ username: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  if (!form.value.username || !form.value.password) {
    error.value = '请填写用户名和密码'
    return
  }
  loading.value = true
  try {
    const res = await login(form.value.username, form.value.password)
    if (res.success) {
      router.push('/')
    } else {
      error.value = res.message
    }
  } catch (e) {
    error.value = '网络错误，请确认后端服务已启动'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <button class="auth-back" @click="router.push('/')">
        <ArrowLeft :size="18" />
        <span>返回首页</span>
      </button>

      <div class="auth-header">
        <div class="auth-icon">
          <LogIn :size="28" />
        </div>
        <h1 class="auth-title">欢迎回来</h1>
        <p class="auth-subtitle">登录你的 AI Box 账号</p>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <div class="form-input-wrap">
            <User :size="18" class="form-input-icon" />
            <input
              v-model="form.username"
              type="text"
              class="form-input"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="form-input-wrap">
            <Lock :size="18" class="form-input-icon" />
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button type="button" class="form-input-toggle" @click="showPassword = !showPassword">
              <component :is="showPassword ? EyeOff : Eye" :size="18" />
            </button>
          </div>
        </div>

        <div class="form-actions-row">
          <router-link to="/forgot-password" class="form-link">忘记密码？</router-link>
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button type="submit" class="form-btn" :disabled="loading">
          <span v-if="loading" class="form-btn-spinner"></span>
          <span v-else>登 录</span>
        </button>
      </form>

      <p class="auth-footer">
        还没有账号？
        <router-link to="/register" class="form-link">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 100px);
  padding: 40px 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 40px 36px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
  position: relative;
}

.auth-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: color 0.2s;
  margin-bottom: 24px;
}

.auth-back:hover {
  color: var(--primary);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-1);
  border-radius: 16px;
  color: white;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.auth-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 6px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
  pointer-events: none;
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.form-input-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.form-input-toggle:hover {
  color: var(--text-secondary);
}

.form-actions-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -8px;
}

.form-link {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--primary);
  text-decoration: none;
  transition: opacity 0.2s;
}

.form-link:hover {
  opacity: 0.8;
}

.form-error {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  color: #f87171;
  font-size: 0.8125rem;
}

.form-btn {
  width: 100%;
  padding: 13px;
  background: var(--gradient-1);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.form-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.form-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .auth-card {
    padding: 28px 20px;
    border-radius: 20px;
  }
}
</style>
