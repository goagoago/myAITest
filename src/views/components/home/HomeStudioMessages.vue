<script setup>
import { Check, Copy, Download, PencilLine, Sparkles } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  timelineRef: {
    type: [Object, Function],
    default: null,
  },
  messages: {
    type: Array,
    default: () => [],
  },
  copiedMessageId: {
    type: String,
    default: '',
  },
  highlightedTurnId: {
    type: String,
    default: '',
  },
  editingDraft: {
    type: String,
    default: '',
  },
  renderMarkdown: {
    type: Function,
    required: true,
  },
  resolveAttachmentIcon: {
    type: Function,
    required: true,
  },
  formatFileSize: {
    type: Function,
    required: true,
  },
  canEditMessage: {
    type: Function,
    required: true,
  },
  isEditingMessage: {
    type: Function,
    required: true,
  },
  isPendingAssistantMessage: {
    type: Function,
    required: true,
  },
  showImageProgress: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'update:editingDraft',
  'copy',
  'download-image',
  'start-edit',
  'clear-edit',
  'save-edit',
])

const triggerMessageEdit = (message) => {
  if (!props.canEditMessage(message) || props.isEditingMessage(message)) return
  emit('start-edit', message)
}

const updateEditingDraft = (event) => {
  emit('update:editingDraft', event.target.value)
}

let scrollFrame = 0
const timelineEl = ref(null)

const assignTimelineEl = (el) => {
  timelineEl.value = el

  const externalRef = props.timelineRef
  if (!externalRef) return
  if (typeof externalRef === 'function') {
    externalRef(el)
    return
  }
  if (typeof externalRef === 'object' && 'value' in externalRef) {
    externalRef.value = el
  }
}

// 解析父组件传入的 timelineRef，可能是 ref 对象或 callback ref
const resolveTimelineEl = () => {
  if (timelineEl.value) return timelineEl.value
  const t = props.timelineRef
  if (!t) return null
  if (typeof t === 'object' && 'value' in t) return t.value
  return null
}

const cancelQueuedScroll = () => {
  if (typeof window === 'undefined' || !scrollFrame) return
  window.cancelAnimationFrame(scrollFrame)
  scrollFrame = 0
}

const syncToLatestMessage = (passes = 4) => {
  const run = (remaining) => {
    const el = resolveTimelineEl()
    if (el && el.scrollHeight > 0) {
      el.scrollTop = el.scrollHeight
    }
    if (remaining <= 1 || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      scrollFrame = 0
      return
    }
    scrollFrame = window.requestAnimationFrame(() => run(remaining - 1))
  }

  cancelQueuedScroll()
  nextTick(() => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      scrollFrame = window.requestAnimationFrame(() => run(passes))
      return
    }
    run(1)
  })
}

// 子组件兜底：挂载完成后立即对齐到最新消息（解决 v-if + Teleport 引发的 race）
onMounted(() => {
  syncToLatestMessage()
})

onBeforeUnmount(() => {
  cancelQueuedScroll()
})

// 消息条数 / 当前会话最后一条消息变化后，再兜底滚到底部。
watch(
  () => [
    props.messages.length,
    props.messages.at(-1)?.id || '',
    props.messages.at(-1)?.sessionId || '',
  ].join(':'),
  () => {
    syncToLatestMessage()
  },
  { flush: 'post' },
)
</script>

<template>
  <div :ref="assignTimelineEl" class="studio__messages">
    <TransitionGroup tag="div" name="message-fade" class="studio__message-list">
      <article
        v-for="message in messages"
        :key="message.id"
        class="message"
        :data-turn-id="message.turnId || ''"
        :class="[
          `message--${message.role}`,
          {
            'message--pending': isPendingAssistantMessage(message),
            'message--highlighted': message.turnId && message.turnId === highlightedTurnId,
          },
        ]"
      >
        <div v-if="message.role === 'assistant'" class="message__avatar">
          <Sparkles :size="15" stroke-width="2" />
        </div>

        <div class="message__body">
          <div
            class="message__surface"
            @click="triggerMessageEdit(message)"
          >
            <div v-if="message.role === 'assistant' && message.statusLabel && message.mode === 'chat'" class="message__status">
              <span class="message__status-dot"></span>
              <span>{{ message.statusLabel }}</span>
            </div>

            <div v-if="message.attachments?.length" class="message__attachments">
              <div
                v-for="attachment in message.attachments"
                :key="attachment.id"
                class="message__attachment"
                :class="`message__attachment--${attachment.kind}`"
              >
                <img
                  v-if="attachment.previewUrl"
                  :src="attachment.previewUrl"
                  :alt="attachment.name"
                  class="studio__pending-thumb"
                />
                <component
                  v-else
                  :is="resolveAttachmentIcon(attachment.iconKey)"
                  :size="18"
                  class="message__attachment-icon"
                  :class="`message__attachment-icon--${attachment.visualType}`"
                />
                <div class="message__attachment-info">
                  <span class="message__attachment-name">{{ attachment.name }}</span>
                  <span v-if="attachment.size" class="message__attachment-size">{{ formatFileSize(attachment.size) }}</span>
                  <span v-if="attachment.note" class="message__attachment-size">{{ attachment.note }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="showImageProgress(message)"
              class="message__image-progress"
              :class="{ 'message__image-progress--stopped': message.state === 'stopped' }"
            >
              <div class="message__image-progress-head">
                <div class="message__image-progress-copy">
                  <span class="message__image-progress-badge">
                    {{ message.state === 'stopped' ? '已停止' : `${Math.max(1, Math.round(message.progress || 0))}%` }}
                  </span>
                  <strong>{{ message.progressLabel || '正在生成图片' }}</strong>
                </div>
                <span class="message__image-progress-note">
                  {{ message.state === 'stopped' ? '你已手动中断本次生成' : '可随时打断，重新换个方向' }}
                </span>
              </div>
              <div class="message__image-progress-rail">
                <span :style="{ width: `${Math.max(8, Math.min(100, message.progress || 0))}%` }"></span>
              </div>
            </div>

            <div v-if="isEditingMessage(message)" class="message__editor">
              <textarea
                :value="editingDraft"
                class="message__editor-input"
                rows="4"
                @click.stop
                @input="updateEditingDraft"
              />
              <div class="message__editor-actions">
                <button type="button" class="message__tool message__tool--editor" @click.stop="emit('clear-edit')">
                  取消
                </button>
                <button
                  type="button"
                  class="message__tool message__tool--strong message__tool--editor-strong"
                  @click.stop="emit('save-edit', message)"
                >
                  保存并重发
                </button>
              </div>
            </div>

            <div v-if="message.kind === 'image' && message.images?.length" class="message__image-result">
              <div class="message__image-grid">
                <figure v-for="(image, index) in message.images" :key="image.id" class="message__image-card">
                  <img
                    :src="image.displayUrl || image.url"
                    alt="AI 生成图片"
                    class="message__generated-image"
                  />
                  <div class="message__image-card-foot" :class="{ 'message__image-card-foot--end': !image.revisedPrompt }">
                    <figcaption v-if="image.revisedPrompt" class="message__image-meta">{{ image.revisedPrompt }}</figcaption>
                    <button
                      type="button"
                      class="message__image-link message__image-link--icon"
                      title="下载原图"
                      aria-label="下载原图"
                      @click.stop="emit('download-image', { image, index, message })"
                    >
                      <Download :size="12" />
                    </button>
                  </div>
                </figure>
              </div>
            </div>

            <div
              v-else-if="message.content"
              class="message__content"
              :class="[
                {
                  'message__content--caption': message.kind === 'image' && message.images?.length,
                  'message__content--streaming': isPendingAssistantMessage(message),
                },
              ]"
              v-html="renderMarkdown(message.content)"
            ></div>

            <div
              v-if="(message.role === 'assistant' && message.mode === 'chat' && message.content) || canEditMessage(message)"
              class="message__tools"
              :class="{ 'message__tools--assistant': message.role === 'assistant' }"
            >
              <button
                v-if="message.role === 'assistant' && message.mode === 'chat' && message.content"
                type="button"
                class="message__tool message__tool--icon"
                :class="{ 'message__tool--active': copiedMessageId === message.id }"
                title="复制"
                aria-label="复制"
                @click.stop="emit('copy', message)"
              >
                <component :is="copiedMessageId === message.id ? Check : Copy" :size="12" />
              </button>
              <button
                v-if="canEditMessage(message)"
                type="button"
                class="message__tool message__tool--icon message__tool--edit"
                title="编辑"
                aria-label="编辑"
                @click.stop="emit('start-edit', message)"
              >
                <PencilLine :size="12" />
              </button>
            </div>
          </div>
        </div>
      </article>
    </TransitionGroup>
  </div>
</template>
