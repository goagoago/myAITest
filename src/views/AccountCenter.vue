<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDownRight, ArrowUpRight, CalendarCheck2, Clock3, Flame, Gift, History,
  Mail, MessageSquareText, Send, ShieldCheck, Sparkles, TicketPercent,
  UserRound
} from 'lucide-vue-next'
import { MONTHLY_CHECK_IN_REWARD, currentMonthKey } from '../constants/features'
import { useAccountStore } from '../stores/accountStore'
import CheckInCalendar from '../components/account/CheckInCalendar.vue'
import CreditBadge from '../components/account/CreditBadge.vue'

const account = useAccountStore()

const activeMonth = ref(account.currentMonth.value || currentMonthKey())
const activeTab = ref('calendar')
const pageError = ref('')
const profileMessage = ref('')
const passwordMessage = ref('')
const redeemMessage = ref('')
const feedbackMessage = ref('')
const loadingDashboard = ref(false)
const loadingFeedbacks = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const checkingIn = ref(false)
const redeeming = ref(false)
const submittingFeedback = ref(false)

const profileForm = ref({
  nickname: '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const redeemForm = ref({
  code: '',
})

const feedbackForm = ref({
  content: '',
  contact: '',
})

const tabs = [
  { id: 'calendar', label: '签到', icon: CalendarCheck2 },
  { id: 'profile', label: '资料', icon: UserRound },
  { id: 'security', label: '安全', icon: ShieldCheck },
  { id: 'redeem', label: '兑换', icon: TicketPercent },
  { id: 'feedback', label: '反馈', icon: MessageSquareText },
  { id: 'history', label: '记录', icon: History },
]

const profile = computed(() => account.profile.value)
const feedbacks = computed(() => account.feedbackEntries.value)
const displayBalance = computed(() => profile.value?.unlimitedPoints ? '∞' : (profile.value?.pointsBalance ?? 0))
const avatarText = computed(() => (profile.value?.nickname || profile.value?.username || 'U').slice(0, 1).toUpperCase())

const summaryCards = computed(() => [
  {
    title: '余额',
    icon: Sparkles,
    tone: 'gold',
    type: 'credit',
    value: displayBalance.value,
    detail: '当前可用',
  },
  {
    title: '连续签到',
    icon: Flame,
    tone: 'ember',
    type: 'text',
    value: `${profile.value?.checkInStreak ?? 0} 天`,
    detail: '今日状态联动',
  },
  {
    title: '本月签到',
    icon: Clock3,
    tone: 'sky',
    type: 'text',
    value: `${account.monthCheckIns.value.length} 次`,
    detail: `全勤 +${MONTHLY_CHECK_IN_REWARD}`,
  },
])

watch(profile, (user) => {
  if (!user) return
  profileForm.value.nickname = user.nickname || ''
  feedbackForm.value.contact = user.username || ''
}, { immediate: true })

watch(activeMonth, async (month, previousMonth) => {
  if (month === previousMonth) return
  await loadDashboard(month)
})

onMounted(async () => {
  await Promise.all([
    loadDashboard(activeMonth.value),
    loadFeedbacks(),
  ])
})

const formatDate = (value, withTime = false) => {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

const transactionLabel = (type) => ({
  CHECK_IN: '签到',
  CONSUME: '消费',
  REFUND: '返还',
  REDEEM: '兑换',
}[type] || '记录')

const feedbackStatusLabel = (status) => ({
  PENDING: '处理中',
  READ: '已查看',
  DONE: '已处理',
}[status] || '已提交')

const formatTransactionBalance = (item) => item?.unlimitedAfter ? '∞' : item.balanceAfter

async function loadDashboard(month = activeMonth.value) {
  loadingDashboard.value = true
  pageError.value = ''
  try {
    await account.refreshDashboard(month)
  } catch (error) {
    pageError.value = error.message
  } finally {
    loadingDashboard.value = false
  }
}

async function loadFeedbacks() {
  loadingFeedbacks.value = true
  feedbackMessage.value = ''
  try {
    await account.refreshFeedbacks()
  } catch (error) {
    feedbackMessage.value = error.message
  } finally {
    loadingFeedbacks.value = false
  }
}

const changeMonth = (delta) => {
  const [year, month] = activeMonth.value.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  activeMonth.value = currentMonthKey(date)
}

const handleCheckIn = async () => {
  checkingIn.value = true
  profileMessage.value = ''
  pageError.value = ''
  try {
    activeMonth.value = currentMonthKey()
    await account.checkIn(activeMonth.value)
    profileMessage.value = '签到成功'
  } catch (error) {
    pageError.value = error.message
  } finally {
    checkingIn.value = false
  }
}

const saveProfile = async () => {
  savingProfile.value = true
  profileMessage.value = ''
  try {
    await account.updateProfile({ nickname: profileForm.value.nickname }, activeMonth.value)
    profileMessage.value = '昵称已更新'
  } catch (error) {
    profileMessage.value = error.message
  } finally {
    savingProfile.value = false
  }
}

const savePassword = async () => {
  passwordMessage.value = ''
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordMessage.value = '两次输入的新密码不一致'
    return
  }

  savingPassword.value = true
  try {
    await account.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    })
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
    passwordMessage.value = '密码修改成功'
  } catch (error) {
    passwordMessage.value = error.message
  } finally {
    savingPassword.value = false
  }
}

const handleRedeem = async () => {
  redeeming.value = true
  redeemMessage.value = ''
  try {
    const response = await account.redeemCode(redeemForm.value.code, activeMonth.value)
    redeemForm.value.code = ''
    redeemMessage.value = response?.unlimitedGranted
      ? '兑换成功 ∞'
      : `兑换成功 +${response?.awardedPoints ?? 0}`
  } catch (error) {
    redeemMessage.value = error.message
  } finally {
    redeeming.value = false
  }
}

const handleFeedback = async () => {
  submittingFeedback.value = true
  feedbackMessage.value = ''
  try {
    await account.submitFeedback({
      content: feedbackForm.value.content,
      contact: feedbackForm.value.contact,
    })
    feedbackForm.value.content = ''
    feedbackMessage.value = '反馈已提交'
  } catch (error) {
    feedbackMessage.value = error.message
  } finally {
    submittingFeedback.value = false
  }
}
</script>

<template>
  <div class="account-page">
    <section class="account-shell account-shell--hero">
      <div class="account-top">
        <div class="account-identity">
          <div class="account-identity__avatar">{{ avatarText }}</div>
          <div>
            <span class="account-identity__eyebrow">Profile</span>
            <h1>{{ profile?.nickname || '个人中心' }}</h1>
            <div class="account-identity__meta">
              <span><UserRound :size="14" /> {{ profile?.username || '--' }}</span>
              <span><Clock3 :size="14" /> {{ formatDate(profile?.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-grid">
        <article v-for="card in summaryCards" :key="card.title" class="summary-card" :data-tone="card.tone">
          <div class="summary-card__head">
            <div class="summary-card__icon">
              <component :is="card.icon" :size="18" />
            </div>
            <span>{{ card.title }}</span>
          </div>
          <CreditBadge v-if="card.type === 'credit'" :value="card.value" strong />
          <strong v-else class="summary-card__value">{{ card.value }}</strong>
          <p>{{ card.detail }}</p>
        </article>
      </div>

      <p v-if="pageError" class="status status--error">{{ pageError }}</p>
      <p v-else-if="profileMessage" class="status status--success">{{ profileMessage }}</p>
    </section>

    <div class="account-tabs" role="tablist" aria-label="个人中心标签">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="account-tabs__item"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <section v-if="activeTab === 'calendar'" class="account-shell">
      <CheckInCalendar
        :month="activeMonth"
        :records="account.monthCheckIns.value"
        :daily-reward="account.dailyCheckInReward.value"
        :checked-in-today="Boolean(profile?.checkedInToday)"
        :loading="checkingIn"
        @previous="changeMonth(-1)"
        @next="changeMonth(1)"
        @check-in="handleCheckIn"
      />
    </section>

    <section v-else-if="activeTab === 'profile'" class="tab-grid">
      <div class="account-shell form-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">资料</span>
            <h2>修改昵称</h2>
          </div>
          <UserRound :size="18" />
        </div>

        <label class="field">
          <span>昵称</span>
          <input v-model.trim="profileForm.nickname" type="text" maxlength="20" placeholder="请输入昵称" />
        </label>

        <button class="panel-button" :disabled="savingProfile" @click="saveProfile">
          {{ savingProfile ? '保存中...' : '保存' }}
        </button>
      </div>

      <div class="account-shell info-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">信息</span>
            <h2>账号信息</h2>
          </div>
          <Sparkles :size="18" />
        </div>

        <div class="info-list">
          <div class="info-item">
            <span>邮箱</span>
            <strong>{{ profile?.username || '--' }}</strong>
          </div>
          <div class="info-item">
            <span>注册时间</span>
            <strong>{{ formatDate(profile?.createdAt) }}</strong>
          </div>
          <div class="info-item">
            <span>当前余额</span>
            <CreditBadge :value="displayBalance" />
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'security'" class="account-shell form-card">
      <div class="section-head">
        <div>
          <span class="section-head__eyebrow">安全</span>
          <h2>修改密码</h2>
        </div>
        <ShieldCheck :size="18" />
      </div>

      <label class="field">
        <span>当前密码</span>
        <input v-model="passwordForm.currentPassword" type="password" placeholder="请输入当前密码" />
      </label>
      <label class="field">
        <span>新密码</span>
        <input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
      </label>
      <label class="field">
        <span>确认新密码</span>
        <input v-model="passwordForm.confirmPassword" type="password" placeholder="再次输入新密码" />
      </label>

      <p v-if="passwordMessage" class="status" :class="passwordMessage.includes('成功') ? 'status--success' : 'status--error'">
        {{ passwordMessage }}
      </p>

      <button class="panel-button panel-button--dark" :disabled="savingPassword" @click="savePassword">
        {{ savingPassword ? '提交中...' : '更新密码' }}
      </button>
    </section>

    <section v-else-if="activeTab === 'redeem'" class="tab-grid tab-grid--redeem">
      <div class="account-shell redeem-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">兑换</span>
            <h2>输入兑换码</h2>
          </div>
          <TicketPercent :size="18" />
        </div>

        <label class="field field--redeem">
          <span>兑换码</span>
          <input v-model.trim="redeemForm.code" type="text" maxlength="64" placeholder="输入兑换码" />
        </label>

        <button class="panel-button panel-button--accent" :disabled="redeeming || !redeemForm.code" @click="handleRedeem">
          <Gift :size="18" />
          <span>{{ redeeming ? '兑换中...' : '立即兑换' }}</span>
        </button>

        <p v-if="redeemMessage" class="status" :class="redeemMessage.includes('成功') ? 'status--success' : 'status--error'">
          {{ redeemMessage }}
        </p>
      </div>

      <div class="account-shell info-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">当前</span>
            <h2>余额状态</h2>
          </div>
          <Sparkles :size="18" />
        </div>

        <div class="info-list">
          <div class="info-item">
            <span>可用</span>
            <CreditBadge :value="displayBalance" />
          </div>
          <div class="info-item">
            <span>最近记录</span>
            <strong>{{ account.recentTransactions.value[0]?.description || '暂无' }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'feedback'" class="tab-grid">
      <div class="account-shell form-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">反馈</span>
            <h2>提交建议</h2>
          </div>
          <MessageSquareText :size="18" />
        </div>

        <label class="field field--textarea">
          <span>内容</span>
          <textarea v-model.trim="feedbackForm.content" rows="6" maxlength="500" placeholder="说说你想优化的地方"></textarea>
        </label>

        <label class="field field--disabled">
          <span>联系方式</span>
          <input v-model.trim="feedbackForm.contact" type="text" maxlength="120" disabled />
        </label>

        <p v-if="feedbackMessage" class="status" :class="feedbackMessage.includes('已提交') ? 'status--success' : 'status--error'">
          {{ feedbackMessage }}
        </p>

        <button class="panel-button panel-button--accent" :disabled="submittingFeedback || !feedbackForm.content" @click="handleFeedback">
          <Send :size="18" />
          <span>{{ submittingFeedback ? '提交中...' : '提交反馈' }}</span>
        </button>
      </div>

      <div class="account-shell feedback-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">历史</span>
            <h2>最近反馈</h2>
          </div>
          <Mail :size="18" />
        </div>

        <div v-if="loadingFeedbacks" class="empty-state">加载中...</div>
        <div v-else-if="!feedbacks.length" class="empty-state">还没有反馈记录。</div>

        <div v-else class="feedback-list">
          <article v-for="item in feedbacks" :key="item.id" class="feedback-item">
            <div class="feedback-item__head">
              <span class="feedback-item__status">{{ feedbackStatusLabel(item.status) }}</span>
              <span>{{ formatDate(item.createdAt, true) }}</span>
            </div>
            <p>{{ item.content }}</p>
            <small v-if="item.contact">{{ item.contact }}</small>
          </article>
        </div>
      </div>
    </section>

    <section v-else class="account-shell">
      <div class="section-head">
        <div>
          <span class="section-head__eyebrow">记录</span>
          <h2>收支流水</h2>
        </div>
        <History :size="18" />
      </div>

      <div v-if="!account.recentTransactions.value.length" class="empty-state">
        暂无记录。
      </div>

      <div v-else class="timeline-list">
        <article v-for="item in account.recentTransactions.value" :key="item.id" class="timeline-item">
          <div class="timeline-item__icon" :class="item.deltaPoints > 0 ? 'is-positive' : 'is-negative'">
            <ArrowUpRight v-if="item.deltaPoints > 0" :size="16" />
            <ArrowDownRight v-else :size="16" />
          </div>

          <div class="timeline-item__content">
            <div class="timeline-item__line">
              <strong>{{ item.description }}</strong>
              <span class="timeline-item__type">{{ transactionLabel(item.type) }}</span>
            </div>
            <p>{{ item.featureName || '余额变动' }} · {{ formatDate(item.createdAt, true) }}</p>
          </div>

          <div class="timeline-item__meta">
            <div class="timeline-item__delta">
              <span>{{ item.deltaPoints > 0 ? '+' : '-' }}</span>
              <CreditBadge :value="Math.abs(item.deltaPoints)" small />
            </div>
            <div class="timeline-item__after">
              <span>余额</span>
              <CreditBadge :value="formatTransactionBalance(item)" small muted />
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.account-page {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(18px, 3vw, 28px) var(--page-padding) 72px;
  display: grid;
  gap: 18px;
}

.account-shell,
.account-tabs {
  border-radius: 28px;
  border: 1px solid rgba(108, 124, 162, 0.16);
  box-shadow: 0 26px 56px rgba(111, 126, 159, 0.14);
  background: linear-gradient(180deg, rgba(252, 254, 255, 0.95), rgba(236, 243, 252, 0.92));
}

.account-shell {
  padding: clamp(20px, 2.8vw, 28px);
}

.account-shell--hero {
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 28%),
    radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(252, 254, 255, 0.95), rgba(236, 243, 252, 0.92));
}

.account-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.account-identity {
  display: flex;
  align-items: center;
  gap: 16px;
}

.account-identity__avatar {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #0f172a, #2563eb);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 900;
  box-shadow: 0 18px 32px rgba(37, 99, 235, 0.18);
}

.account-identity__eyebrow,
.section-head__eyebrow {
  display: inline-block;
  color: rgba(70, 92, 132, 0.72);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.account-identity h1 {
  margin-top: 8px;
  color: #101b32;
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1;
}

.account-identity__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.account-identity__meta span {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.78);
  color: #445674;
  font-size: 0.84rem;
  font-weight: 700;
}

.panel-button {
  min-height: 48px;
  border: none;
  border-radius: 18px;
  font-weight: 800;
  cursor: pointer;
}

.panel-button--accent {
  background: linear-gradient(135deg, #0f172a, #1d4ed8 58%, #10b981);
  color: #fff;
  box-shadow: 0 22px 42px rgba(37, 99, 235, 0.22);
}

.panel-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  background: #10213e;
  color: #fff;
}

.panel-button--dark {
  background: linear-gradient(135deg, #111827, #1f2937);
}

.panel-button:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.summary-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(129, 143, 175, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 14px 28px rgba(111, 126, 159, 0.1);
}

.summary-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #445674;
  font-size: 0.9rem;
  font-weight: 700;
}

.summary-card__icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.06);
}

.summary-card__value {
  display: block;
  margin-top: 16px;
  color: #0f172a;
  font-size: clamp(1.2rem, 2vw, 1.6rem);
}

.summary-card p {
  margin-top: 8px;
  color: #64748b;
  font-size: 0.88rem;
}

.account-tabs {
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.account-tabs__item {
  min-height: 46px;
  border: none;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  color: #51627e;
  font-weight: 800;
  cursor: pointer;
}

.account-tabs__item.is-active {
  background: linear-gradient(135deg, #10213e, #2563eb 68%, #10b981);
  color: #fff;
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.2);
}

.tab-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
}

.tab-grid--redeem {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.section-head h2 {
  margin-top: 8px;
  color: #14233f;
  font-size: 1.28rem;
}

.field {
  display: grid;
  gap: 8px;
}

.field + .field {
  margin-top: 16px;
}

.field span {
  color: #334155;
  font-size: 0.9rem;
  font-weight: 700;
}

.field input,
.field textarea {
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border-radius: 18px;
  border: 1px solid rgba(131, 145, 177, 0.2);
  background: rgba(255, 255, 255, 0.88);
  color: #15213a;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.field textarea {
  min-height: 140px;
  padding: 16px;
  resize: vertical;
}

.field--redeem input {
  min-height: 60px;
  text-transform: uppercase;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.48);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.field--disabled input {
  background: rgba(241, 245, 249, 0.92);
  color: #64748b;
  cursor: not-allowed;
}

.form-card {
  display: grid;
  gap: 18px;
}

.info-card,
.feedback-card {
  display: grid;
  align-content: start;
}

.info-list {
  display: grid;
  gap: 14px;
}

.info-item {
  min-height: 64px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(129, 143, 175, 0.14);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.info-item span {
  color: #64748b;
  font-size: 0.88rem;
  font-weight: 700;
}

.info-item strong {
  color: #0f172a;
  text-align: right;
}

.feedback-list {
  display: grid;
  gap: 12px;
}

.feedback-item {
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(129, 143, 175, 0.14);
}

.feedback-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #64748b;
  font-size: 0.82rem;
}

.feedback-item__status,
.timeline-item__type {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.76rem;
  font-weight: 800;
}

.feedback-item p {
  margin-top: 12px;
  color: #14233f;
  line-height: 1.6;
}

.feedback-item small {
  display: inline-block;
  margin-top: 10px;
  color: #64748b;
}

.timeline-list {
  display: grid;
  gap: 12px;
}

.timeline-item {
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(129, 143, 175, 0.14);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

.timeline-item__icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
}

.timeline-item__icon.is-positive {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.timeline-item__icon.is-negative {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.timeline-item__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.timeline-item__content strong {
  color: #0f172a;
}

.timeline-item__content p {
  margin-top: 8px;
  color: #64748b;
  font-size: 0.88rem;
}

.timeline-item__meta {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.timeline-item__delta,
.timeline-item__after {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.timeline-item__delta span,
.timeline-item__after span {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
}

.status {
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 0.9rem;
}

.status--success {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.status--error {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.empty-state {
  min-height: 180px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.7);
  color: #64748b;
  font-weight: 700;
}

@media (max-width: 1080px) {
  .account-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .tab-grid,
  .tab-grid--redeem {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .account-page {
    padding-bottom: 48px;
  }

  .account-top,
  .summary-grid,
  .timeline-item {
    grid-template-columns: 1fr;
  }

  .account-top {
    display: grid;
  }

  .account-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .account-identity {
    align-items: flex-start;
  }

  .account-identity__meta {
    display: grid;
  }

  .timeline-item__meta {
    justify-items: start;
  }
}

@media (max-width: 560px) {
  .account-shell,
  .account-tabs {
    border-radius: 24px;
  }

  .account-shell {
    padding: 18px;
  }

  .account-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .account-tabs__item {
    min-height: 44px;
    font-size: 0.88rem;
  }
}
</style>
