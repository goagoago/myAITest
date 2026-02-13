<script setup>
import { ref, computed } from 'vue'
import { useChat } from '../composables/useChat.js'
import { marked } from 'marked'
import {
  Plane, MapPin, Calendar, DollarSign, Sparkles, Compass,
  Camera, Utensils, Sun, Building2, ShoppingBag, Send, Loader2, Clock
} from 'lucide-vue-next'

const form = ref({
  destination: '',
  days: 3,
  budget: 3000,
  style: [],
})

const styles = [
  { label: '人文历史', icon: Building2 },
  { label: '自然风光', icon: Compass },
  { label: '美食之旅', icon: Utensils },
  { label: '休闲度假', icon: Sun },
  { label: '摄影打卡', icon: Camera },
  { label: '购物娱乐', icon: ShoppingBag },
]

const { loading, error, result, streamingText, sendMessageStream } = useChat()

// 加载提示语
const loadingTips = [
  '正在规划最佳路线...',
  '搜索特色景点中...',
  '挖掘当地美食...',
  '优化行程安排...',
  '计算预算分配...',
  '生成详细攻略...',
]
const currentTipIndex = ref(0)
let tipInterval = null

const toggleStyle = (label) => {
  const idx = form.value.style.indexOf(label)
  idx > -1 ? form.value.style.splice(idx, 1) : form.value.style.push(label)
}

const buildPrompt = () => {
  const daysList = Array.from({ length: form.value.days }, (_, i) => `第${i + 1}天`).join('、')

  return `你是一位专业旅游规划师，请为以下旅行需求制定【完整详细】的行程规划：

## 旅行需求
- 目的地：${form.value.destination}
- 天数：${form.value.days}天（必须包含${daysList}的完整规划）
- 人均预算：${form.value.budget}元
- 风格偏好：${form.value.style.length > 0 ? form.value.style.join('、') : '综合体验'}

## 输出要求（必须严格遵循）

### 1. 行程概览
简要介绍本次旅行的亮点和特色

### 2. 每日详细行程
【重要】必须输出完整的${form.value.days}天行程，每一天都要包含：

**第X天：主题名称**

🌅 **上午 (8:00-12:00)**
- 景点/活动名称
- 具体地址和交通方式
- 游玩时长和门票价格
- 特别提示

🌞 **下午 (12:00-18:00)**
- 午餐推荐（餐厅名+人均价格+推荐菜品）
- 景点/活动安排
- 详细说明

🌙 **晚上 (18:00-22:00)**
- 晚餐推荐
- 夜间活动/休闲安排
- 住宿建议

### 3. 预算分配
列出各项费用明细（交通、住宿、餐饮、门票、其他）

### 4. 实用贴士
当地注意事项、最佳游玩季节、必备物品等

请使用emoji让内容更生动，确保输出【完整的${form.value.days}天行程】，不要省略任何一天！`
}

const startTipRotation = () => {
  currentTipIndex.value = 0
  tipInterval = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % loadingTips.length
  }, 2500)
}

const stopTipRotation = () => {
  if (tipInterval) {
    clearInterval(tipInterval)
    tipInterval = null
  }
}

const generate = async () => {
  if (!form.value.destination || loading.value) return

  startTipRotation()

  try {
    await sendMessageStream([
      { role: 'system', content: '你是一位经验丰富、细致周到的旅游规划师。你必须输出完整的行程规划，包含用户要求的每一天，绝不省略。' },
      { role: 'user', content: buildPrompt() },
    ])
  } catch (e) {
    console.error(e)
  } finally {
    stopTipRotation()
  }
}

// 显示的内容（流式输出时显示streamingText，否则显示result）
const displayContent = computed(() => streamingText.value || result.value)
const renderedResult = computed(() => displayContent.value ? marked(displayContent.value, { breaks: true }) : '')

// 字数统计
const charCount = computed(() => displayContent.value.length)
</script>

<template>
  <div class="page">
    <div class="container">
      <!-- 头部 -->
      <header class="page-header">
        <div class="page-header__icon">
          <Plane :size="32" />
        </div>
        <div>
          <h1 class="page-header__title">旅行规划</h1>
          <p class="page-header__desc">智能生成个性化旅行行程方案</p>
        </div>
      </header>

      <!-- 表单卡片 -->
      <div class="card">
        <div class="form-group">
          <label class="label">
            <MapPin :size="16" />
            <span>目的地</span>
          </label>
          <input
            v-model="form.destination"
            type="text"
            class="input"
            placeholder="想去哪里？例如：京都、巴厘岛、云南大理..."
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">
              <Calendar :size="16" />
              <span>旅行天数</span>
            </label>
            <input v-model.number="form.days" type="number" class="input" min="1" max="14" />
          </div>
          <div class="form-group">
            <label class="label">
              <DollarSign :size="16" />
              <span>人均预算 (元)</span>
            </label>
            <input v-model.number="form.budget" type="number" class="input" min="500" step="500" />
          </div>
        </div>

        <div class="form-group">
          <label class="label">
            <Compass :size="16" />
            <span>旅行风格</span>
            <span class="label-hint">(可多选)</span>
          </label>
          <div class="chips">
            <button
              v-for="s in styles"
              :key="s.label"
              class="chip"
              :class="{ 'chip--active': form.style.includes(s.label) }"
              @click="toggleStyle(s.label)"
            >
              <component :is="s.icon" :size="16" />
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <button class="btn-primary" :disabled="!form.destination || loading" @click="generate">
          <template v-if="loading">
            <Loader2 :size="20" class="spinner" />
            <span>{{ loadingTips[currentTipIndex] }}</span>
          </template>
          <template v-else>
            <Sparkles :size="20" />
            <span>生成行程方案</span>
          </template>
        </button>
      </div>

      <!-- 错误 -->
      <p v-if="error" class="error">{{ error }}</p>

      <!-- 结果 -->
      <Transition name="fade-up">
        <div v-if="displayContent" class="result-card">
          <div class="result-card__header">
            <div class="result-card__header-left">
              <span class="result-card__dot" :class="{ 'result-card__dot--active': loading }"></span>
              <Send :size="18" />
              <span>行程方案</span>
            </div>
            <div class="result-card__header-right">
              <Clock :size="14" />
              <span>{{ charCount }} 字</span>
              <span v-if="loading" class="streaming-badge">生成中...</span>
            </div>
          </div>
          <div class="result-card__body" v-html="renderedResult"></div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 0 24px 80px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

/* 头部 */
.page-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 40px;
  animation: fadeInUp 0.6s ease;
}

.page-header__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 15px 40px -10px rgba(255, 107, 107, 0.5);
}

.page-header__title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.page-header__desc {
  font-size: 1.0625rem;
  color: var(--text-secondary);
}

/* 卡片 */
.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  padding: 36px;
  margin-bottom: 28px;
  backdrop-filter: blur(20px);
  animation: fadeInUp 0.6s ease 0.1s backwards;
}

.form-group {
  margin-bottom: 28px;
}

.form-group:last-of-type {
  margin-bottom: 32px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.label svg {
  color: var(--primary);
}

.label-hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.8125rem;
  margin-left: 4px;
}

.input {
  width: 100%;
  padding: 18px 22px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  font-size: 1rem;
  color: var(--text-primary);
  outline: none;
  transition: all 0.3s ease;
}

.input:focus {
  border-color: rgba(255, 107, 107, 0.5);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.1);
}

.input::placeholder {
  color: var(--text-muted);
}

/* 芯片 */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.chip:hover {
  border-color: rgba(255, 107, 107, 0.4);
  background: rgba(255, 107, 107, 0.1);
}

.chip--active {
  background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
  border-color: transparent;
  color: white;
}

.chip--active svg {
  color: white;
}

/* 按钮 */
.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
  border: none;
  border-radius: 18px;
  font-size: 1.0625rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 64px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 20px 50px -15px rgba(255, 107, 107, 0.5);
}

.btn-primary:disabled {
  opacity: 0.9;
  cursor: wait;
}

.spinner {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error {
  color: #ff6b6b;
  font-size: 0.9375rem;
  margin-bottom: 20px;
  text-align: center;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 12px;
}

/* 结果卡片 */
.result-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.result-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px;
  background: linear-gradient(135deg, rgba(255,107,107,0.15), rgba(254,202,87,0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.result-card__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-card__header-left svg {
  color: #ff6b6b;
}

.result-card__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.streaming-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.result-card__dot {
  width: 10px;
  height: 10px;
  background: #55efc4;
  border-radius: 50%;
  box-shadow: 0 0 10px #55efc4;
}

.result-card__dot--active {
  animation: pulse-glow 1s infinite;
}

.result-card__body {
  padding: 32px;
  line-height: 1.9;
  color: var(--text-primary);
  max-height: 70vh;
  overflow-y: auto;
}

.result-card__body :deep(h1),
.result-card__body :deep(h2),
.result-card__body :deep(h3) {
  font-weight: 700;
  margin-top: 1.75em;
  margin-bottom: 0.75em;
  color: var(--text-primary);
}

.result-card__body :deep(h1):first-child,
.result-card__body :deep(h2):first-child,
.result-card__body :deep(h3):first-child {
  margin-top: 0;
}

.result-card__body :deep(strong) {
  color: #ff6b6b;
}

.result-card__body :deep(ul),
.result-card__body :deep(ol) {
  padding-left: 1.75em;
}

.result-card__body :deep(li) {
  margin: 10px 0;
}

.result-card__body :deep(p) {
  margin: 0.75em 0;
}

/* 过渡 */
.fade-up-enter-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-up-leave-active { transition: all 0.3s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(30px); }
.fade-up-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .form-row { grid-template-columns: 1fr; }
  .card { padding: 28px; }
  .page-header__icon { width: 64px; height: 64px; }
  .page-header__icon svg { width: 28px; height: 28px; }
  .page-header__title { font-size: 1.75rem; }
  .result-card__header { flex-direction: column; gap: 12px; align-items: flex-start; }
}
</style>
