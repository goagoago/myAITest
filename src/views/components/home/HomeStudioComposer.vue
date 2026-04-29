<script setup>
import { Loader2, Paperclip, Send, Square, X } from 'lucide-vue-next'

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  focused: Boolean,
  pendingAttachments: {
    type: Array,
    default: () => [],
  },
  studioMode: {
    type: String,
    default: 'chat',
  },
  showPlaceholderFlow: Boolean,
  placeholderFlowText: {
    type: String,
    default: '',
  },
  composerPlaceholder: {
    type: String,
    default: '',
  },
  attachmentAccept: {
    type: String,
    default: '',
  },
  attachmentHint: {
    type: String,
    default: '',
  },
  studioBusy: Boolean,
  composerBusyLabel: {
    type: String,
    default: '',
  },
  canInterrupt: Boolean,
  canSubmit: Boolean,
  composerActionLabel: {
    type: String,
    default: '',
  },
  fileInputRef: {
    type: [Object, Function],
    default: null,
  },
  resolveAttachmentIcon: {
    type: Function,
    required: true,
  },
  formatFileSize: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'update:focused',
  'handle-files',
  'remove-attachment',
  'interrupt',
  'submit',
])

const updateValue = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div v-if="pendingAttachments.length" class="studio__pending">
    <div
      v-for="attachment in pendingAttachments"
      :key="attachment.id"
      class="studio__pending-item"
      :class="`studio__pending-item--${attachment.kind}`"
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
        :size="20"
        class="studio__pending-icon"
        :class="`studio__pending-icon--${attachment.visualType}`"
      />
      <span class="studio__pending-name">{{ attachment.name }}</span>
      <span class="studio__pending-size">{{ formatFileSize(attachment.size) }}</span>
      <button class="studio__pending-remove" type="button" @click="emit('remove-attachment', attachment.id)">
        <X :size="14" />
      </button>
    </div>
  </div>

  <div class="studio__composer">
    <div v-if="showPlaceholderFlow" class="studio__placeholder-flow">
      <span>{{ placeholderFlowText }}</span>
    </div>
    <textarea
      :value="modelValue"
      class="studio__input"
      rows="4"
      :placeholder="showPlaceholderFlow ? '' : composerPlaceholder"
      @input="updateValue"
      @focus="emit('update:focused', true)"
      @blur="emit('update:focused', false)"
      @keydown.enter.exact.prevent="emit('submit')"
    />

    <div class="studio__footer">
      <div class="studio__footer-left">
        <label v-if="studioMode === 'chat' || studioMode === 'image'" class="studio__upload">
          <input
            :ref="fileInputRef"
            type="file"
            multiple
            :accept="attachmentAccept"
            hidden
            @change="emit('handle-files', $event)"
          />
          <Paperclip :size="16" />
          <span>{{ studioMode === 'image' ? '参考图' : '附件' }}</span>
        </label>
        <span class="studio__hint">{{ attachmentHint }}</span>
      </div>

      <div class="studio__footer-actions">
        <div v-if="studioBusy" class="studio__busy-indicator">
          <Loader2 :size="15" class="studio__spin" />
          <span>{{ composerBusyLabel }}</span>
        </div>

        <button
          v-if="canInterrupt"
          class="studio__stop"
          type="button"
          @click="emit('interrupt')"
        >
          <Square :size="15" />
          <span>打断</span>
        </button>

        <button
          v-else
          class="studio__submit"
          type="button"
          :disabled="!canSubmit"
          @click="emit('submit')"
        >
          <Send :size="18" />
          <span>{{ composerActionLabel }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
