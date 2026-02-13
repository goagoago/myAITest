<script setup>
import { ref, computed } from 'vue'
import { useChat } from '../composables/useChat.js'
import { marked } from 'marked'
import { Globe, ArrowLeftRight, Languages, Loader2, Send, Clock } from 'lucide-vue-next'

const content = ref('')
const sourceLang = ref('auto')
const targetLang = ref('en')

const languages = [
  { value: 'auto', label: '自动检测', flag: '🌐' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'en', label: '英语', flag: '🇺🇸' },
  { value: 'ja', label: '日语', flag: '🇯🇵' },
  { value: 'ko', label: '韩语', flag: '🇰🇷' },
  { value: 'fr', label: '法语', flag: '🇫🇷' },
  { value: 'de', label: '德语', flag: '🇩🇪' },
  { value: 'es', label: '西班牙语', flag: '🇪🇸' },
  { value: 'ru', label: '俄语', flag: '🇷🇺' },
]

const { loading, error, result, streamingText, sendMessageStream } = useChat()

const getLangName = (code) => languages.find(l => l.value === code)?.label || code
const swapLangs = () => { if (sourceLang.value !== 'auto') [sourceLang.value, targetLang.value] = [targetLang.value, sourceLang.value] }

const translate = async () => {
  if (!content.value.trim() || loading.value) return
  const sourceText = sourceLang.value === 'auto' ? '自动检测语言' : getLangName(sourceLang.value)
  try {
    await sendMessageStream([
      { role: 'system', content: '你是一位专业翻译，精通多国语言。翻译准确流畅，符合目标语言的表达习惯。' },
      { role: 'user', content: `请将以下文本从${sourceText}翻译成${getLangName(targetLang.value)}。

要求：
1. 翻译准确，保持原意
2. 符合目标语言的表达习惯
3. 只输出翻译结果，不要输出其他内容

原文：
${content.value}` },
    ])
  } catch (e) { console.error(e) }
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
          <Globe :size="32" />
        </div>
        <div>
          <h1 class="page-header__title">翻译专家</h1>
          <p class="page-header__desc">多语言智能翻译与本地化</p>
        </div>
      </header>

      <div class="lang-bar">
        <div class="lang-select-wrap">
          <select v-model="sourceLang" class="lang-select">
            <option v-for="lang in languages" :key="lang.value" :value="lang.value">
              {{ lang.flag }} {{ lang.label }}
            </option>
          </select>
        </div>
        <button class="swap-btn" @click="swapLangs" :disabled="sourceLang === 'auto'">
          <ArrowLeftRight :size="20" />
        </button>
        <div class="lang-select-wrap">
          <select v-model="targetLang" class="lang-select">
            <option v-for="lang in languages.filter(l => l.value !== 'auto')" :key="lang.value" :value="lang.value">
              {{ lang.flag }} {{ lang.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="translate-grid">
        <div class="card">
          <div class="card__header">
            <Languages :size="18" />
            <span>原文</span>
            <span class="char-count">{{ content.length }} 字</span>
          </div>
          <textarea v-model="content" class="textarea" placeholder="输入要翻译的文本..." rows="10"></textarea>
        </div>
        <div class="card">
          <div class="card__header">
            <Send :size="18" />
            <span>译文</span>
            <div v-if="displayContent" class="card__header-meta">
              <Clock :size="14" />
              <span>{{ charCount }} 字</span>
              <span v-if="loading" class="streaming-badge">翻译中...</span>
            </div>
          </div>
          <div class="result-area">
            <div v-if="loading && !displayContent" class="loading-state">
              <Loader2 :size="24" class="spinner" />
              <span>翻译中...</span>
            </div>
            <div v-else-if="displayContent" v-html="renderedResult" class="result-content"></div>
            <span v-else class="placeholder-text">译文将显示在这里</span>
          </div>
        </div>
      </div>

      <button class="btn-primary" :disabled="!content.trim() || loading" @click="translate">
        <Loader2 v-if="loading" :size="20" class="spinner" />
        <template v-else>
          <Globe :size="20" />
          <span>开始翻译</span>
        </template>
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 0 24px 80px; }
.container { max-width: 1000px; margin: 0 auto; }

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
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 15px 40px -10px rgba(9, 132, 227, 0.5);
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

.lang-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  animation: fadeInUp 0.6s ease 0.05s backwards;
}

.lang-select-wrap {
  flex: 1;
}

.lang-select {
  width: 100%;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  font-size: 1rem;
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  transition: all 0.3s;
}

.lang-select:focus {
  border-color: rgba(9, 132, 227, 0.5);
  box-shadow: 0 0 0 4px rgba(9, 132, 227, 0.1);
}

.swap-btn {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.swap-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: white;
  border-color: transparent;
  transform: rotate(180deg);
}

.swap-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.translate-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 28px;
  animation: fadeInUp 0.6s ease 0.1s backwards;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.card__header svg { color: var(--primary); }

.card__header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
}

.streaming-badge {
  padding: 3px 8px;
  background: linear-gradient(135deg, #74b9ff, #0984e3);
  border-radius: 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.char-count {
  margin-left: auto;
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.textarea {
  width: 100%;
  min-height: 280px;
  padding: 24px;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--text-primary);
  resize: none;
  outline: none;
  line-height: 1.8;
}

.textarea::placeholder { color: var(--text-muted); }

.result-area {
  min-height: 280px;
  padding: 24px;
  line-height: 1.8;
  color: var(--text-primary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--text-muted);
}

.placeholder-text { color: var(--text-muted); }

.result-content { white-space: pre-wrap; }

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  border: none;
  border-radius: 18px;
  font-size: 1.0625rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
  animation: fadeInUp 0.6s ease 0.15s backwards;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 20px 50px -15px rgba(9, 132, 227, 0.5);
}

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner { animation: rotate 1s linear infinite; }
@keyframes rotate { to { transform: rotate(360deg); } }

.error {
  color: #ff6b6b;
  font-size: 0.9375rem;
  margin-top: 20px;
  text-align: center;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 12px;
}

@media (max-width: 768px) {
  .translate-grid { grid-template-columns: 1fr; }
  .lang-bar { flex-wrap: wrap; }
  .lang-select-wrap { flex: 1 1 40%; }
}
</style>
