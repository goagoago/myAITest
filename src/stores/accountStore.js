import { computed, reactive, readonly } from 'vue'
import { DAILY_CHECK_IN_REWARD, FEATURE_CATALOG, currentMonthKey } from '../constants/features'
import { accountApi } from '../services/accountApi'
import { AUTH_STORAGE_KEY, getStoredSession } from '../services/apiClient'

const state = reactive({
  token: '',
  profile: null,
  featureCatalog: FEATURE_CATALOG,
  monthCheckIns: [],
  recentTransactions: [],
  feedbackEntries: [],
  currentMonth: currentMonthKey(),
  initialized: false,
  bootstrapping: false,
})

let bootstrapPromise = null

const persistToken = () => {
  if (typeof window === 'undefined') return
  if (state.token) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: state.token }))
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

const resetState = () => {
  state.token = ''
  state.profile = null
  state.featureCatalog = FEATURE_CATALOG
  state.monthCheckIns = []
  state.recentTransactions = []
  state.feedbackEntries = []
  state.currentMonth = currentMonthKey()
}

const loadPersistedToken = () => {
  const session = getStoredSession()
  state.token = session?.token || ''
}

const applyDashboard = (dashboard) => {
  if (!dashboard) return null
  state.profile = dashboard.profile || null
  state.featureCatalog = dashboard.featureCatalog?.length ? dashboard.featureCatalog : FEATURE_CATALOG
  state.monthCheckIns = dashboard.monthCheckIns || []
  state.recentTransactions = dashboard.recentTransactions || []
  state.currentMonth = dashboard.month || state.currentMonth
  return dashboard
}

const applyAuthPayload = (payload) => {
  state.token = payload?.token || ''
  persistToken()
  return applyDashboard(payload?.dashboard)
}

const isLoggedIn = computed(() => Boolean(state.token && state.profile))
const hasUnlimitedPoints = computed(() => Boolean(state.profile?.unlimitedPoints))
const pointsBalance = computed(() => hasUnlimitedPoints.value ? '∞' : (state.profile?.pointsBalance ?? 0))
const displayName = computed(() => state.profile?.nickname || state.profile?.username || '访客')
const featureCatalog = computed(() => state.featureCatalog)
const profile = computed(() => state.profile)
const monthCheckIns = computed(() => state.monthCheckIns)
const recentTransactions = computed(() => state.recentTransactions)
const feedbackEntries = computed(() => state.feedbackEntries)
const currentMonth = computed(() => state.currentMonth)
const initialized = computed(() => state.initialized)
const dailyCheckInReward = computed(() => state.profile?.dailyCheckInReward ?? DAILY_CHECK_IN_REWARD)

async function bootstrapSession() {
  if (bootstrapPromise) return bootstrapPromise
  loadPersistedToken()
  if (!state.token) {
    state.initialized = true
    return null
  }

  state.bootstrapping = true
  bootstrapPromise = accountApi.getDashboard(state.currentMonth)
    .then((dashboard) => applyDashboard(dashboard))
    .catch(() => {
      resetState()
      persistToken()
      return null
    })
    .finally(() => {
      state.initialized = true
      state.bootstrapping = false
      bootstrapPromise = null
    })

  return bootstrapPromise
}

async function login(payload) {
  const dashboard = applyAuthPayload(await accountApi.login(payload))
  state.initialized = true
  return dashboard
}

async function register(payload) {
  const dashboard = applyAuthPayload(await accountApi.register(payload))
  state.initialized = true
  return dashboard
}

async function refreshDashboard(month = state.currentMonth) {
  if (!state.token) return null
  const dashboard = await accountApi.getDashboard(month)
  return applyDashboard(dashboard)
}

async function updateProfile(payload, month = state.currentMonth) {
  const dashboard = await accountApi.updateProfile(payload, month)
  return applyDashboard(dashboard)
}

async function changePassword(payload) {
  return accountApi.changePassword(payload)
}

async function checkIn(month = state.currentMonth) {
  const dashboard = await accountApi.checkIn(month)
  return applyDashboard(dashboard)
}

async function consumeFeature(featureCode, month = state.currentMonth) {
  const dashboard = await accountApi.consumePoints(featureCode, month)
  return applyDashboard(dashboard)
}

async function refreshFeedbacks() {
  if (!state.token) return []
  const feedbacks = await accountApi.getFeedbacks()
  state.feedbackEntries = Array.isArray(feedbacks) ? feedbacks : []
  return state.feedbackEntries
}

async function submitFeedback(payload) {
  const feedback = await accountApi.submitFeedback(payload)
  state.feedbackEntries = [feedback, ...state.feedbackEntries.filter(item => item.id !== feedback.id)].slice(0, 10)
  return feedback
}

async function redeemCode(code, month = state.currentMonth) {
  const response = await accountApi.redeemCode({ code }, month)
  applyDashboard(response?.dashboard)
  return response
}

function logout() {
  resetState()
  state.initialized = true
  persistToken()
}

function getFeatureCost(featureCode) {
  return state.featureCatalog.find(item => item.code === featureCode)?.cost
    ?? FEATURE_CATALOG.find(item => item.code === featureCode)?.cost
    ?? 0
}

export function useAccountStore() {
  return {
    state: readonly(state),
    isLoggedIn,
    hasUnlimitedPoints,
    pointsBalance,
    displayName,
    featureCatalog,
    profile,
    monthCheckIns,
    recentTransactions,
    feedbackEntries,
    currentMonth,
    initialized,
    dailyCheckInReward,
    bootstrapSession,
    login,
    register,
    refreshDashboard,
    updateProfile,
    changePassword,
    checkIn,
    consumeFeature,
    refreshFeedbacks,
    submitFeedback,
    redeemCode,
    logout,
    getFeatureCost,
  }
}
