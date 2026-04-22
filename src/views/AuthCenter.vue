<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UserRoundPlus, LogIn, Sparkles, RefreshCw, MailCheck
} from 'lucide-vue-next'
import { useAccountStore } from '../stores/accountStore'
import { accountApi } from '../services/accountApi'

const router = useRouter()
const route = useRoute()
const account = useAccountStore()

const activeTab = ref(route.query.mode === 'register' ? 'register' : 'login')
const busy = ref(false)
const formError = ref('')
const challengeLoading = ref(false)
const sendCodeLoading = ref(false)
const codeCountdown = ref(0)
const challenge = ref(null)
const debugCode = ref('')
const verifyModalOpen = ref(false)
const verifyAnswer = ref('')
const verifyError = ref('')

let codeTimer = null

const loginForm = ref({
  email: '',
  password: '',
})

const registerForm = ref({
  email: '',
  nickname: '',
  emailCode: '',
  password: '',
  confirmPassword: '',
})

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect ? redirect : '/'
})

watch(() => route.query.mode, (mode) => {
  activeTab.value = mode === 'register' ? 'register' : 'login'
})

watch(activeTab, (tab) => {
  formError.value = ''
  debugCode.value = ''
  verifyModalOpen.value = false
  verifyError.value = ''
  verifyAnswer.value = ''
})

watch(() => account.isLoggedIn.value, (loggedIn) => {
  if (loggedIn) {
    router.replace(redirectTarget.value)
  }
}, { immediate: true })

const clearCodeCountdown = () => {
  clearInterval(codeTimer)
  codeTimer = null
}

const startCodeCountdown = (seconds) => {
  clearCodeCountdown()
  codeCountdown.value = seconds
  codeTimer = window.setInterval(() => {
    if (codeCountdown.value <= 1) {
      clearCodeCountdown()
      codeCountdown.value = 0
      return
    }
    codeCountdown.value -= 1
  }, 1000)
}

const fetchChallenge = async () => {
  challengeLoading.value = true
  try {
    challenge.value = await accountApi.getHumanCheck()
    verifyError.value = ''
  } catch (error) {
    if (verifyModalOpen.value) {
      verifyError.value = error.message
    } else {
      formError.value = error.message
    }
  } finally {
    challengeLoading.value = false
  }
}

const closeVerifyModal = () => {
  verifyModalOpen.value = false
  verifyError.value = ''
  verifyAnswer.value = ''
  challenge.value = null
}

const openVerifyModal = async () => {
  formError.value = ''
  debugCode.value = ''
  verifyError.value = ''
  verifyAnswer.value = ''
  verifyModalOpen.value = true
  await fetchChallenge()
}

const submitLogin = async () => {
  busy.value = true
  formError.value = ''
  try {
    await account.login({
      email: loginForm.value.email,
      password: loginForm.value.password,
    })
    router.replace(redirectTarget.value)
  } catch (error) {
    formError.value = error.message
  } finally {
    busy.value = false
  }
}

const sendEmailCode = async () => {
  verifyError.value = ''
  sendCodeLoading.value = true

  try {
    const response = await accountApi.sendEmailCode({
      email: registerForm.value.email,
      challengeId: challenge.value?.challengeId,
      answer: verifyAnswer.value,
    })
    debugCode.value = response?.debugCode || ''
    startCodeCountdown(response?.resendAfterSeconds || 60)
    closeVerifyModal()
  } catch (error) {
    verifyError.value = error.message
    await fetchChallenge()
  } finally {
    sendCodeLoading.value = false
  }
}

const submitRegister = async () => {
  formError.value = ''
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    formError.value = '两次输入的密码不一致'
    return
  }

  busy.value = true
  try {
    await account.register({
      email: registerForm.value.email,
      nickname: registerForm.value.nickname,
      emailCode: registerForm.value.emailCode,
      password: registerForm.value.password,
    })
    router.replace(redirectTarget.value)
  } catch (error) {
    formError.value = error.message
  } finally {
    busy.value = false
  }
}

onUnmounted(() => {
  clearCodeCountdown()
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__orb auth-page__orb--left"></div>
    <div class="auth-page__orb auth-page__orb--right"></div>
    <div class="auth-page__grid"></div>
    <div class="auth-page__noise"></div>

    <div class="auth-shell">
      <section class="form-panel">
        <div class="form-panel__brand">
          <div class="form-panel__brand-icon">
            <Sparkles :size="18" />
          </div>
          <div class="form-panel__brand-copy">
            <strong>Tools Box</strong>
            <span>邮箱登录 / 注册</span>
          </div>
        </div>

        <div class="form-panel__tabs">
          <button :class="{ 'is-active': activeTab === 'login' }" @click="activeTab = 'login'">
            <LogIn :size="16" />
            <span>登录</span>
          </button>
          <button :class="{ 'is-active': activeTab === 'register' }" @click="activeTab = 'register'">
            <UserRoundPlus :size="16" />
            <span>注册</span>
          </button>
        </div>

        <div class="form-panel__body">
          <div class="form-panel__intro">
            <h2>{{ activeTab === 'login' ? '欢迎回来' : '创建账号' }}</h2>
          </div>

          <form v-if="activeTab === 'login'" class="auth-form" @submit.prevent="submitLogin">
            <label>
              <span>邮箱</span>
              <input v-model.trim="loginForm.email" type="email" placeholder="输入注册邮箱" />
            </label>
            <label>
              <span>密码</span>
              <input v-model="loginForm.password" type="password" placeholder="输入密码" />
            </label>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <button class="submit-button" :disabled="busy">
              {{ busy ? '登录中...' : '立即登录' }}
            </button>
          </form>

          <form v-else class="auth-form" @submit.prevent="submitRegister">
            <label>
              <span>邮箱</span>
              <input v-model.trim="registerForm.email" type="email" placeholder="输入可接收验证码的邮箱" />
            </label>

            <label>
              <span>昵称</span>
              <input v-model.trim="registerForm.nickname" type="text" maxlength="20" placeholder="输入你的昵称" />
            </label>

            <div class="auth-form__inline">
              <label>
                <span>邮箱验证码</span>
                <input
                  v-model.trim="registerForm.emailCode"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="输入 6 位验证码"
                />
              </label>
              <button
                type="button"
                class="send-code-button"
                :disabled="sendCodeLoading || codeCountdown > 0 || !registerForm.email"
                @click="openVerifyModal"
              >
                <MailCheck :size="16" />
                <span>{{ sendCodeLoading ? '发送中...' : codeCountdown > 0 ? `${codeCountdown}s 后重发` : '发送验证码' }}</span>
              </button>
            </div>

            <label>
              <span>密码</span>
              <input v-model="registerForm.password" type="password" placeholder="至少 6 位" />
            </label>
            <label>
              <span>确认密码</span>
              <input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" />
            </label>

            <p v-if="debugCode" class="form-note form-note--debug">调试验证码：{{ debugCode }}</p>
            <p v-if="formError" class="form-error">{{ formError }}</p>

            <button class="submit-button" :disabled="busy">
              {{ busy ? '注册中...' : '创建账号' }}
            </button>
          </form>
        </div>
      </section>
    </div>

    <div v-if="verifyModalOpen" class="verify-modal" @click.self="closeVerifyModal">
      <div class="verify-modal__card" role="dialog" aria-modal="true" aria-labelledby="verify-modal-title">
        <div class="verify-modal__head">
          <div>
            <span class="verify-modal__eyebrow">安全校验</span>
            <h3 id="verify-modal-title">完成校验后发送验证码</h3>
          </div>
          <button type="button" class="verify-modal__close" @click="closeVerifyModal">关闭</button>
        </div>

        <div class="captcha-card captcha-card--modal">
          <div class="captcha-card__head">
            <span>真人校验</span>
            <button type="button" class="captcha-card__refresh" :disabled="challengeLoading || sendCodeLoading" @click="fetchChallenge">
              <RefreshCw :size="14" :class="{ spin: challengeLoading }" />
              <span>换一题</span>
            </button>
          </div>
          <p class="captcha-card__prompt">{{ challengeLoading ? '加载中...' : (challenge?.prompt || '题目加载失败') }}</p>
          <input
            v-model.trim="verifyAnswer"
            type="text"
            inputmode="numeric"
            placeholder="输入计算结果"
            :disabled="challengeLoading || sendCodeLoading"
          />
        </div>

        <p v-if="verifyError" class="form-error">{{ verifyError }}</p>

        <div class="verify-modal__actions">
          <button type="button" class="verify-modal__ghost" :disabled="sendCodeLoading" @click="closeVerifyModal">
            取消
          </button>
          <button
            type="button"
            class="submit-button"
            :disabled="challengeLoading || sendCodeLoading || !challenge?.challengeId || !verifyAnswer"
            @click="sendEmailCode"
          >
            {{ sendCodeLoading ? '校验中...' : '验证并发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-page {
  position: relative;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(18px, 3vw, 28px) var(--page-padding) 64px;
  min-height: calc(100vh - 96px);
  overflow: hidden;
}

.auth-page__orb,
.auth-page__grid {
  position: absolute;
  pointer-events: none;
}

.auth-page__orb {
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.55;
}

.auth-page__orb--left {
  top: 6%;
  left: -96px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.24), transparent 68%);
}

.auth-page__orb--right {
  right: -120px;
  bottom: 4%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.18), transparent 68%);
}

.auth-page__grid {
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(180deg, rgba(255, 255, 255, 0.42), transparent 92%);
}

.auth-page__noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.86), transparent 24%),
    radial-gradient(circle at 50% 78%, rgba(16, 185, 129, 0.08), transparent 28%);
}

.auth-shell {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding-top: clamp(24px, 6vh, 72px);
}

.form-panel {
  border-radius: 34px;
  border: 1px solid rgba(104, 120, 158, 0.16);
  box-shadow: 0 24px 60px rgba(111, 126, 159, 0.16);
  backdrop-filter: blur(18px);
  width: min(100%, 540px);
}

.form-panel {
  position: relative;
  padding: clamp(22px, 3vw, 30px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 246, 252, 0.92));
  display: grid;
  gap: 22px;
}

.form-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 180px;
  border-radius: 34px 34px 120px 120px;
  background: radial-gradient(circle at top, rgba(16, 185, 129, 0.1), transparent 62%);
  pointer-events: none;
}

.form-panel__brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-panel__brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(29, 78, 216, 0.92));
  color: #fff;
  box-shadow: 0 18px 30px rgba(37, 99, 235, 0.24);
}

.form-panel__brand-copy {
  display: grid;
  gap: 2px;
}

.form-panel__brand-copy strong {
  font-size: 1rem;
  color: #14233f;
  letter-spacing: 0.01em;
}

.form-panel__brand-copy span {
  color: #64748b;
  font-size: 0.82rem;
}

.form-panel__tabs {
  position: relative;
  z-index: 1;
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  width: 100%;
  padding: 6px;
  border-radius: 20px;
  background: rgba(220, 228, 240, 0.56);
  gap: 6px;
}

.form-panel__tabs button {
  min-height: 48px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #52637f;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.form-panel__tabs .is-active {
  background: linear-gradient(135deg, #10213e, #1c4f9b 68%, #10b981);
  color: #fff;
  box-shadow: 0 18px 28px rgba(37, 99, 235, 0.24);
}

.form-panel__body {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 18px;
}

.form-panel__intro h2 {
  font-size: clamp(1.7rem, 2vw, 2rem);
  color: #17253f;
}

.auth-form {
  display: grid;
  gap: 18px;
}

.auth-form__inline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.auth-form label {
  display: grid;
  gap: 8px;
}

.auth-form span {
  font-size: 0.88rem;
  font-weight: 700;
  color: #334155;
}

.auth-form input,
.captcha-card input {
  width: 100%;
  min-height: 54px;
  padding: 0 16px;
  border-radius: 18px;
  border: 1px solid rgba(131, 145, 177, 0.2);
  background: rgba(255, 255, 255, 0.86);
  color: #15213a;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.auth-form input:focus,
.captcha-card input:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.captcha-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(235, 241, 249, 0.92), rgba(226, 234, 245, 0.72));
  border: 1px solid rgba(131, 145, 177, 0.14);
}

.captcha-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.captcha-card__head span {
  font-size: 0.9rem;
  font-weight: 800;
  color: #22314b;
}

.captcha-card__refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: #3563b4;
  font-weight: 700;
  cursor: pointer;
}

.captcha-card__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.captcha-card__prompt {
  margin: 0;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  color: #162442;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.send-code-button {
  min-width: 152px;
  min-height: 54px;
  padding: 0 16px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(16, 23, 42, 0.08), rgba(37, 99, 235, 0.08));
  color: #17325e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.send-code-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.12);
}

.send-code-button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.submit-button {
  min-height: 56px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #0f172a, #1d4ed8 58%, #10b981);
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 22px 42px rgba(37, 99, 235, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 26px 44px rgba(37, 99, 235, 0.26);
}

.submit-button:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.form-note {
  color: #607089;
  font-size: 0.86rem;
  line-height: 1.6;
}

.form-note--debug {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(16, 185, 129, 0.08);
  color: #0f766e;
  font-weight: 700;
}

.form-error {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  font-size: 0.9rem;
}

.verify-modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(10px);
}

.verify-modal__card {
  width: min(100%, 440px);
  border-radius: 28px;
  border: 1px solid rgba(123, 139, 172, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(241, 246, 252, 0.94));
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.18);
  padding: 22px;
  display: grid;
  gap: 16px;
}

.verify-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.verify-modal__eyebrow {
  display: inline-block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.verify-modal__head h3 {
  color: #17253f;
  font-size: 1.18rem;
}

.verify-modal__close,
.verify-modal__ghost {
  min-height: 42px;
  padding: 0 14px;
  border: none;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.06);
  color: #334155;
  font-weight: 700;
  cursor: pointer;
}

.verify-modal__close {
  white-space: nowrap;
}

.captcha-card--modal {
  margin-top: 4px;
}

.verify-modal__actions {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .auth-form__inline {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding-bottom: 32px;
  }

  .form-panel {
    border-radius: 28px;
  }

  .auth-shell {
    padding-top: 8px;
  }

  .form-panel {
    padding: 20px;
  }

  .verify-modal {
    padding: 16px;
  }

  .verify-modal__card {
    border-radius: 24px;
    padding: 18px;
  }

  .verify-modal__actions {
    grid-template-columns: 1fr;
  }
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }

  .auth-form input,
  .captcha-card input,
  .send-code-button,
  .submit-button {
    transition: none;
  }
}
</style>
