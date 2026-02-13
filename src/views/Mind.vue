<script setup>
import { ref, computed } from 'vue'
import { useChat } from '../composables/useChat.js'
import { marked } from 'marked'
import {
  Lightbulb, Sparkles, Scale, BarChart3, ListChecks, HelpCircle,
  Target, Loader2, Brain, Clock
} from 'lucide-vue-next'

const topic = ref('')
const mode = ref('brainstorm')

const modes = [
  { value: 'brainstorm', label: '创意发散', icon: Sparkles, prompt: `请围绕以下主题进行【创意发散】：

要求：
1. 从至少5个不同角度进行思考
2. 每个角度提供2-3个具体的创意点子
3. 创意要有新意、可行性和启发性
4. 使用清晰的分类和编号
5. 每个创意简要说明其价值或应用场景` },
  { value: 'pros-cons', label: '利弊分析', icon: Scale, prompt: `请对以下主题进行【全面的利弊分析】：

要求：
1. 优点部分：列出至少5个主要优势
2. 缺点部分：列出至少5个潜在风险或不足
3. 每个观点需要具体说明原因
4. 最后给出综合建议
5. 使用表格或清晰的对比形式` },
  { value: 'swot', label: 'SWOT分析', icon: BarChart3, prompt: `请对以下主题进行【详细的SWOT分析】：

要求：
1. Strengths（优势）：列出3-5个内部优势
2. Weaknesses（劣势）：列出3-5个内部劣势
3. Opportunities（机会）：列出3-5个外部机会
4. Threats（威胁）：列出3-5个外部威胁
5. 每个要点需要具体说明
6. 最后给出基于SWOT的战略建议` },
  { value: 'steps', label: '步骤拆解', icon: ListChecks, prompt: `请将以下任务进行【详细的步骤拆解】：

要求：
1. 分解为清晰的执行步骤
2. 每个步骤需要具体可操作
3. 标注每个步骤的关键要点和注意事项
4. 说明步骤之间的依赖关系
5. 预估每个步骤的难度或时间
6. 提供可能遇到的问题及解决方案` },
  { value: 'questions', label: '提问引导', icon: HelpCircle, prompt: `请针对以下主题提出【有深度的引导性问题】：

要求：
1. 提出至少10个高质量问题
2. 问题要有深度，能启发思考
3. 覆盖不同维度（why/what/how/who/when/where）
4. 问题之间要有逻辑递进
5. 每个问题简要说明为什么这个问题重要` },
]

const { loading, error, result, streamingText, sendMessageStream } = useChat()
const currentMode = computed(() => modes.find(m => m.value === mode.value))

// 加载提示语
const loadingTips = [
  '激发创意思维...',
  '分析多个维度...',
  '整理思路框架...',
  '深度挖掘洞见...',
  '生成分析结果...',
]
const currentTipIndex = ref(0)
let tipInterval = null

const startTipRotation = () => {
  currentTipIndex.value = 0
  tipInterval = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % loadingTips.length
  }, 2000)
}

const stopTipRotation = () => {
  if (tipInterval) {
    clearInterval(tipInterval)
    tipInterval = null
  }
}

const generate = async () => {
  if (!topic.value.trim() || loading.value) return

  startTipRotation()

  try {
    await sendMessageStream([
      { role: 'system', content: '你是一位创意顾问和思维教练，善于激发创意、分析问题。请用结构化的方式呈现回答，使用emoji让内容更生动，确保内容完整详细。' },
      { role: 'user', content: `${currentMode.value?.prompt}\n\n主题：${topic.value}` },
    ])
  } catch (e) { console.error(e) } finally {
    stopTipRotation()
  }
}

const displayContent = computed(() => streamingText.value || result.value)
const renderedResult = computed(() => displayContent.value ? marked(displayContent.value, { breaks: true }) : '')
const charCount = computed(() => displayContent.value.length)
</script>

<template>
  <div class="page">
    <div class="container">
      <header class="page-header">
        <div class="page-header__icon">
          <Lightbulb :size="32" />
        </div>
        <div>
          <h1 class="page-header__title">头脑风暴</h1>
          <p class="page-header__desc">创意激发与思维拓展</p>
        </div>
      </header>

      <div class="modes">
        <button
          v-for="m in modes"
          :key="m.value"
          class="mode"
          :class="{ 'mode--active': mode === m.value }"
          @click="mode = m.value"
        >
          <component :is="m.icon" :size="20" class="mode__icon" />
          <span class="mode__label">{{ m.label }}</span>
        </button>
      </div>

      <div class="card">
        <label class="label">
          <Target :size="16" />
          <span>输入你的主题或问题</span>
        </label>
        <textarea
          v-model="topic"
          class="textarea"
          :placeholder="`例如：${mode === 'brainstorm' ? '如何提升团队协作效率' : '新产品的市场定位'}`"
          rows="4"
        ></textarea>
        <button class="btn-primary" :disabled="!topic.trim() || loading" @click="generate">
          <template v-if="loading">
            <Loader2 :size="20" class="spinner" />
            <span>{{ loadingTips[currentTipIndex] }}</span>
          </template>
          <template v-else>
            <component :is="currentMode?.icon" :size="20" />
            <span>开始{{ currentMode?.label }}</span>
          </template>
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <Transition name="fade-up">
        <div v-if="displayContent" class="result-card">
          <div class="result-card__header">
            <div class="result-card__header-left">
              <span class="result-card__dot" :class="{ 'result-card__dot--active': loading }"></span>
              <Brain :size="18" />
              <span>{{ currentMode?.label }}结果</span>
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
.page { padding: 0 24px 80px; }
.container { max-width: 800px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 36px;
  animation: fadeInUp 0.6s ease;
}

.page-header__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 15px 40px -10px rgba(0, 184, 148, 0.5);
}

.page-header__title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.page-header__desc {
  font-size: 1.0625rem;
  color: var(--text-secondary);
}

.modes {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 28px;
  animation: fadeInUp 0.6s ease 0.05s backwards;
}

.mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.mode:hover {
  border-color: rgba(0, 184, 148, 0.4);
  background: rgba(0, 184, 148, 0.1);
}

.mode--active {
  background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);
  border-color: transparent;
}

.mode__icon {
  color: var(--text-secondary);
  transition: color 0.3s;
}

.mode--active .mode__icon {
  color: #1a1c2e;
}

.mode__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  transition: color 0.3s;
}

.mode--active .mode__label {
  color: #1a1c2e;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  padding: 32px;
  margin-bottom: 28px;
  backdrop-filter: blur(20px);
  animation: fadeInUp 0.6s ease 0.1s backwards;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.label svg { color: #00b894; }

.textarea {
  width: 100%;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  font-size: 1rem;
  color: var(--text-primary);
  resize: none;
  outline: none;
  line-height: 1.7;
  margin-bottom: 24px;
  transition: all 0.3s;
}

.textarea:focus {
  border-color: rgba(0, 184, 148, 0.5);
  box-shadow: 0 0 0 4px rgba(0, 184, 148, 0.1);
}

.textarea::placeholder { color: var(--text-muted); }

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);
  border: none;
  border-radius: 18px;
  font-size: 1.0625rem;
  font-weight: 600;
  color: #1a1c2e;
  cursor: pointer;
  transition: all 0.4s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 20px 50px -15px rgba(0, 184, 148, 0.5);
}

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner { animation: rotate 1s linear infinite; }
@keyframes rotate { to { transform: rotate(360deg); } }

.error {
  color: #ff6b6b;
  font-size: 0.9375rem;
  margin-bottom: 20px;
  text-align: center;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 12px;
}

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
  background: linear-gradient(135deg, rgba(85,239,196,0.15), rgba(0,184,148,0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-weight: 600;
  color: var(--text-primary);
}

.result-card__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-card__header-left svg { color: #00b894; }

.result-card__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.streaming-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #55efc4, #00b894);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1a1c2e;
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

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px #55efc4; }
  50% { box-shadow: 0 0 20px #55efc4, 0 0 30px #55efc4; }
}

.result-card__body {
  padding: 32px;
  line-height: 1.9;
  color: var(--text-primary);
  max-height: 65vh;
  overflow-y: auto;
}

.result-card__body :deep(h1),
.result-card__body :deep(h2),
.result-card__body :deep(h3) {
  font-weight: 700;
  margin-top: 1.75em;
  margin-bottom: 0.75em;
}

.result-card__body :deep(h1):first-child,
.result-card__body :deep(h2):first-child,
.result-card__body :deep(h3):first-child {
  margin-top: 0;
}

.result-card__body :deep(strong) { color: #00b894; }

.result-card__body :deep(ul),
.result-card__body :deep(ol) { padding-left: 1.75em; }

.result-card__body :deep(li) { margin: 10px 0; }

.fade-up-enter-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-up-leave-active { transition: all 0.3s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(30px); }
.fade-up-leave-to { opacity: 0; }

@media (max-width: 700px) {
  .modes { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 500px) {
  .modes { grid-template-columns: repeat(2, 1fr); }
}
</style>
