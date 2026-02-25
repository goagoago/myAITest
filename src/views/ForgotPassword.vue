<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { KeyRound, User, ShieldCheck, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const { sendResetCode, resetPassword } = useAuth()

const step = ref(1) // 1: 输入用户名 → 2: 输入验证码和新密码
const form = ref({ username: '', code: '', newPassword: '', confirmPassword: '' })
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')
const debugCode = ref('') // 本地调试显示验证码

async function handleSendCode() {
  error.value = ''
  if (!form.value.username) {
    error.value = '请输入用户名'
    return
  }
  loading.value = true
  try {
    const res = await sendResetCode(form.value.username)
    if (res.success) {
      debugCode.value = res.code || ''
      step.value = 2
    } else {
      error.value = res.message
    }
  } catch (e) {
    error.value = '网络错误，请确认后端服务已启动'
  } finally {
    loading.value = false
  }
}

async function handleReset() {
  error.value = ''
  if (!form.value.code) {
    error.value = '请输入验证码'
    return
  }
  if (form.value.newPassword.length < 6) {
    error.value = '新密码至少6个字符'
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    const res = await resetPassword(form.value.username, form.value.code, form.value.newPassword)
    if (res.success) {
      success.value = '密码重置成功！正在跳转到登录页面...'
      setTimeout(() => router.push('/login'), 2000)
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
      <button class="auth-back" @click="step === 1 ? router.push('/login') : (step = 1)">
        <ArrowLeft :size="18" />
        <span>{{ step === 1 ? '返回登录' : '上一步' }}</span>
      </button>

      <div class="auth-header">
        <div class="auth-icon">
          <KeyRound :size="28" />
        </div>
        <h1 class="auth-title">忘记密码</h1>
        <p class="auth-subtitle">{{ step === 1 ? '输入用户名获取验证码' : '输入验证码设置新密码' }}</p>
      </div>

      <!-- Step 1: 输入用户名 -->
      <form v-if="step === 1" class="auth-form" @submit.prevent="handleSendCode">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <div class="form-input-wrap">
            <User :size="18" class="form-input-icon" />
            <input
              v-model="form.username"
              type="text"
              class="form-input"
              placeholder="请输入注册时的用户名"
            />
          </div>
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button type="submit" class="form-btn" :disabled="loading">
          <span v-if="loading" class="form-btn-spinner"></span>
          <span v-else>获取验证码</span>
        </button>
      </form>

      <!-- Step 2: 输入验证码和新密码 -->
      <form v-else class="auth-form" @submit.prevent="handleReset">
        <!-- 本地调试：显示验证码 -->
        <div v-if="debugCode" class="debug-code">
          <ShieldCheck :size="16" />
          <span>本地调试验证码：<strong>{{ debugCode }}</strong></span>
        </div>

        <div class="form-group">
          <label class="form-label">验证码</label>
          <div class="form-input-wrap">
            <ShieldCheck :size="18" class="form-input-icon" />
            <input
              v-model="form.code"
              type="text"
              class="form-input"
              placeholder="输入6位验证码"
              maxlength="6"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">新密码</label>
          <div class="form-input-wrap">
            <Lock :size="18" class="form-input-icon" />
            <input
              v-model="form.newPassword"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="至少6个字符"
            />
            <button type="button" class="form-input-toggle" @click="showPassword = !showPassword">
              <component :is="showPassword ? EyeOff : Eye" :size="18" />
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">确认新密码</label>
          <div class="form-input-wrap">
            <Lock :size="18" class="form-input-icon" />
            <input
              v-model="form.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="再次输入新密码"
            />
          </div>
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>
        <div v-if="success" class="form-success">{{ success }}</div>

        <button type="submit" class="form-btn" :disabled="loading || !!success">
          <span v-if="loading" class="form-btn-spinner"></span>
          <span v-else>重置密码</span>
        </button>
      </form>

      <p class="auth-footer">
        想起来了？
        <router-link to="/login" class="form-link">返回登录</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex; align-items: center; justify-content: center;
  min-height: calc(100vh - 100px); padding: 40px 20px;
}

.auth-card {
  width: 100%; max-width: 420px;
  background: var(--surface-card); border: 1px solid var(--border);
  border-radius: 24px; padding: 40px 36px;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
}

.auth-back {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--text-muted);
  font-size: 0.8125rem; cursor: pointer; transition: color 0.2s;
  margin-bottom: 24px;
}
.auth-back:hover { color: var(--primary); }

.auth-header { text-align: center; margin-bottom: 32px; }

.auth-icon {
  width: 56px; height: 56px; margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
  background: var(--gradient-2); border-radius: 16px; color: white;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);
}

.auth-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; }
.auth-subtitle { font-size: 0.875rem; color: var(--text-muted); margin-top: 6px; }

.auth-form { display: flex; flex-direction: column; gap: 18px; }

.debug-code {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px; color: var(--accent); font-size: 0.8125rem;
}
.debug-code strong { font-size: 1.125rem; letter-spacing: 0.15em; }

.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }

.form-input-wrap { position: relative; display: flex; align-items: center; }
.form-input-icon { position: absolute; left: 14px; color: var(--text-muted); pointer-events: none; z-index: 1; }

.form-input {
  width: 100%; padding: 12px 14px 12px 42px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; color: var(--text-primary);
  font-size: 0.9375rem; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input::placeholder { color: var(--text-muted); }
.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }

.form-input-toggle {
  position: absolute; right: 12px; background: none; border: none;
  color: var(--text-muted); cursor: pointer; padding: 4px;
  display: flex; align-items: center; transition: color 0.2s;
}
.form-input-toggle:hover { color: var(--text-secondary); }

.form-link { font-size: 0.8125rem; font-weight: 500; color: var(--primary); text-decoration: none; }
.form-link:hover { opacity: 0.8; }

.form-error {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px; color: #f87171; font-size: 0.8125rem;
}

.form-success {
  padding: 10px 14px;
  background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 10px; color: var(--primary); font-size: 0.8125rem;
}

.form-btn {
  width: 100%; padding: 13px;
  background: var(--gradient-1); border: none; border-radius: 12px;
  color: white; font-size: 1rem; font-weight: 700;
  cursor: pointer; transition: opacity 0.2s, transform 0.2s;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}
.form-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.form-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.form-btn-spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer { text-align: center; margin-top: 24px; font-size: 0.875rem; color: var(--text-muted); }

@media (max-width: 480px) { .auth-card { padding: 28px 20px; border-radius: 20px; } }
</style>
