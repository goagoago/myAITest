<script setup>
import { BotMessageSquare, History, ImagePlus, SquarePen } from 'lucide-vue-next'
import FeatureCostBadge from '../../../components/account/FeatureCostBadge.vue'

defineProps({
  studioModes: {
    type: Array,
    default: () => [],
  },
  studioMode: {
    type: String,
    default: 'chat',
  },
  studioBusy: Boolean,
  historyTurnsCount: {
    type: Number,
    default: 0,
  },
  studioFeatureCode: {
    type: String,
    default: 'ai-chat',
  },
})

const emit = defineEmits(['set-mode', 'new-conversation', 'toggle-history'])
</script>

<template>
  <div class="studio__nav" aria-label="聊天控制栏">
    <div class="studio__mode-tabs" role="tablist" aria-label="AI 模式">
      <button
        v-for="mode in studioModes"
        :key="mode.value"
        type="button"
        class="studio__choice"
        :class="{ 'studio__choice--active': studioMode === mode.value }"
        :disabled="studioBusy"
        @click="emit('set-mode', mode.value)"
      >
        <component :is="mode.value === 'image' ? ImagePlus : BotMessageSquare" :size="14" />
        <span>{{ mode.label }}</span>
      </button>
    </div>

    <div class="studio__utility-actions">
      <button class="studio__ghost" type="button" @click="emit('new-conversation')">
        <SquarePen :size="14" />
        <span>新建</span>
      </button>
      <button class="studio__ghost" type="button" @click="emit('toggle-history')">
        <History :size="14" />
        <span>{{ historyTurnsCount ? `历史 ${historyTurnsCount}` : '历史' }}</span>
      </button>
      <FeatureCostBadge :feature-code="studioFeatureCode" strong />
    </div>
  </div>
</template>
