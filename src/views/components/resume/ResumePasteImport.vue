<script setup>
import { ClipboardPaste, ChevronDown, Sparkles, LoaderCircle } from 'lucide-vue-next'

const props = defineProps({
  rawText: {
    type: String,
    default: '',
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  aiFormatLoading: {
    type: Boolean,
    default: false,
  },
  aiFormatError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:rawText', 'update:collapsed', 'format'])

const onInput = (event) => emit('update:rawText', event.target.value)
const toggle = () => emit('update:collapsed', !props.collapsed)
</script>

<template>
  <section class="paste-section card">
    <button class="paste-section__toggle" @click="toggle">
      <ClipboardPaste :size="15" />
      <span>粘贴文字导入</span>
      <ChevronDown :size="15" class="paste-section__arrow" :class="{ 'paste-section__arrow--open': !collapsed }" />
    </button>
    <div v-show="!collapsed" class="paste-section__body">
      <p class="paste-section__hint">粘贴简历内容，支持由 AI 智能格式化后导入</p>
      <textarea
        :value="rawText"
        class="paste-section__textarea"
        rows="8"
        placeholder="在此粘贴简历内容（纯文本或 Markdown 均可）..."
        @input="onInput"
      ></textarea>
      <p v-if="aiFormatError" class="paste-section__error">{{ aiFormatError }}</p>
      <div class="paste-section__actions">
        <button class="btn btn--primary btn--small" @click="emit('format')" :disabled="!rawText.trim() || aiFormatLoading">
          <component :is="aiFormatLoading ? LoaderCircle : Sparkles" :size="14" :class="{ spinning: aiFormatLoading }" />
          <span>{{ aiFormatLoading ? '格式化中...' : '格式化导入' }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

.paste-section {
  margin-bottom: 16px;
  padding: 0;
  overflow: hidden;
}

.paste-section__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.86rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.paste-section__toggle:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}

.paste-section__arrow {
  margin-left: auto;
  transition: transform 0.25s;
}

.paste-section__arrow--open {
  transform: rotate(180deg);
}

.paste-section__body {
  padding: 0 16px 16px;
}

.paste-section__hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0 0 10px;
}

.paste-section__textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: 'Menlo', 'Consolas', 'Monaco', monospace;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.65;
}

.paste-section__textarea:focus {
  outline: none;
  border-color: rgba(19, 195, 139, 0.4);
  box-shadow: 0 0 0 3px rgba(19, 195, 139, 0.1);
}

.paste-section__actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  justify-content: flex-end;
}

.paste-section__error {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  font-size: 0.78rem;
}
</style>
