<script setup>
import { ref, computed } from 'vue'
import { useChat } from '../composables/useChat.js'
import { marked } from 'marked'
import {
  PenTool, Sparkles, Type, AlignLeft, Briefcase, MessageCircle,
  ArrowRight, Loader2, FileText, Wand2, Clock
} from 'lucide-vue-next'

const content = ref('')
const mode = ref('polish')

const modes = [
  { value: 'polish', label: '润色优化', icon: Sparkles },
  { value: 'expand', label: '扩写丰富', icon: AlignLeft },
  { value: 'simplify', label: '精简压缩', icon: Type },
  { value: 'formal', label: '正式商务', icon: Briefcase },
  { value: 'casual', label: '轻松口语', icon: MessageCircle },
  { value: 'continue', label: '智能续写', icon: ArrowRight },
]

const { loading, error, result, streamingText, sendMessageStream } = useChat()

// 加载提示语
const loadingTips = [
  '分析文本结构...',
  '优化语言表达...',
  '调整修辞手法...',
  '润色文字细节...',
  '生成最终结果...',
]
const currentTipIndex = ref(0)
let tipInterval = null

const prompts = {
  polish: `请对以下文本进行【全面润色优化】：
1. 提升文采和表达，使用更优美、精准的词汇
2. 优化句式结构，增强可读性
3. 保持原意不变，不要改变核心内容
4. 注意前后文的连贯性和逻辑性`,
  expand: `请对以下文本进行【详细扩写】：
1. 增加更多细节描写和具体例子
2. 丰富论述内容，深化主题
3. 扩写后的内容应该是原文的2-3倍
4. 保持原有风格和主旨`,
  simplify: `请对以下文本进行【精简压缩】：
1. 保留核心内容和关键信息
2. 删除冗余表达和重复内容
3. 使表达更加简洁有力
4. 压缩后应保留原意的精华`,
  formal: `请将以下文本改写为【正式商务风格】：
1. 使用严谨专业的语言
2. 避免口语化和随意的表达
3. 结构清晰，逻辑严密
4. 适合商务场合使用`,
  casual: `请将以下文本改写为【轻松口语风格】：
1. 使用自然亲切的语言
2. 可适当使用一些口语表达
3. 让内容更易于阅读和理解
4. 保持友好随和的语气`,
  continue: `请根据以下文本【智能续写】：
1. 仔细分析原文的风格、语气和主题
2. 续写内容应与原文无缝衔接
3. 续写长度至少为原文的50%
4. 保持逻辑连贯和内容相关`,
}

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
  if (!content.value.trim() || loading.value) return

  startTipRotation()

  try {
    await sendMessageStream([
      { role: 'system', content: '你是一位专业的文字编辑和写作助手，拥有丰富的写作经验。请认真完成用户的写作任务，输出高质量的内容。' },
      { role: 'user', content: `${prompts[mode.value]}\n\n原文：\n${content.value}` },
    ])
  } catch (e) {
    console.error(e)
  } finally {
    stopTipRotation()
  }
}

const currentMode = computed(() => modes.find(m => m.value === mode.value))
const displayContent = computed(() => streamingText.value || result.value)
const renderedResult = computed(() => displayContent.value ? marked(displayContent.value, { breaks: true }) : '')
const charCount = computed(() => displayContent.value.length)
</script>

<template>
  <div class="page">
    <div class="container">
      <header class="page-header">
        <div class="page-header__icon">
          <PenTool :size="32" />
        </div>
        <div>
          <h1 class="page-header__title">写作助手</h1>
          <p class="page-header__desc">文章润色、续写、风格改写</p>
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
          <component :is="m.icon" :size="18" />
          <span>{{ m.label }}</span>
        </button>
      </div>

      <div class="card">
        <div class="card__input-area">
          <FileText :size="20" class="card__input-icon" />
          <textarea v-model="content" class="textarea" placeholder="在这里输入或粘贴你的文本内容..." rows="8"></textarea>
        </div>
        <div class="card__footer">
          <span class="char-count">{{ content.length }} 字</span>
          <button class="btn-primary" :disabled="!content.trim() || loading" @click="generate">
            <Loader2 v-if="loading" :size="18" class="spinner" />
            <template v-else>
              <component :is="currentMode?.icon" :size="18" />
              <span>{{ currentMode?.label }}</span>
            </template>
          </button>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <Transition name="fade-up">
        <div v-if="displayContent" class="result-card">
          <div class="result-card__header">
            <div class="result-card__header-left">
              <span class="result-card__dot" :class="{ 'result-card__dot--active': loading }"></span>
              <Wand2 :size="18" />
              <span>处理结果</span>
            </div>
            <div class="result-card__header-right">
              <Clock :size="14" />
              <span>{{ charCount }} 字</span>
              <span v-if="loading" class="streaming-badge">{{ loadingTips[currentTipIndex] }}</span>
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
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 15px 40px -10px rgba(108, 92, 231, 0.5);
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
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
  animation: fadeInUp 0.6s ease 0.05s backwards;
}

.mode {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.mode:hover {
  border-color: rgba(108, 92, 231, 0.5);
  background: rgba(108, 92, 231, 0.1);
}

.mode--active {
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
  border-color: transparent;
  color: white;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  padding: 28px;
  margin-bottom: 28px;
  backdrop-filter: blur(20px);
  animation: fadeInUp 0.6s ease 0.1s backwards;
}

.card__input-area {
  position: relative;
}

.card__input-icon {
  position: absolute;
  top: 18px;
  left: 18px;
  color: var(--text-muted);
  opacity: 0.5;
}

.textarea {
  width: 100%;
  min-height: 200px;
  padding: 18px 18px 18px 52px;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--text-primary);
  resize: none;
  outline: none;
  line-height: 1.8;
}

.textarea::placeholder { color: var(--text-muted); }

.card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.char-count {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
  border: none;
  border-radius: 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(108, 92, 231, 0.5);
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
  background: linear-gradient(135deg, rgba(162,155,254,0.15), rgba(108,92,231,0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-weight: 600;
  color: var(--text-primary);
}

.result-card__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-card__header-left svg { color: #6c5ce7; }

.result-card__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.streaming-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #a29bfe, #6c5ce7);
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

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px #55efc4; }
  50% { box-shadow: 0 0 20px #55efc4, 0 0 30px #55efc4; }
}

.result-card__body {
  padding: 32px;
  line-height: 1.9;
  color: var(--text-primary);
  max-height: 55vh;
  overflow-y: auto;
  white-space: pre-wrap;
}

.fade-up-enter-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-up-leave-active { transition: all 0.3s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(30px); }
.fade-up-leave-to { opacity: 0; }
</style>
