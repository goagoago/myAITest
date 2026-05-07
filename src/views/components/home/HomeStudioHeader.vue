<script setup>
import { BotMessageSquare, History, ImagePlus, Maximize2, Minimize2, SquarePen } from 'lucide-vue-next'
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
  isFullscreen: Boolean,
})

const emit = defineEmits(['set-mode', 'new-conversation', 'toggle-history', 'toggle-fullscreen'])
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
      <button
        type="button"
        class="studio__ghost studio__ghost--fullscreen"
        :class="{ 'studio__ghost--fullscreen-active': isFullscreen }"
        :title="isFullscreen ? '退出全屏 (Esc)' : '全屏显示'"
        @click="emit('toggle-fullscreen')"
      >
        <component :is="isFullscreen ? Minimize2 : Maximize2" :size="14" />
        <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
      </button>
      <FeatureCostBadge :feature-code="studioFeatureCode" strong />
    </div>
  </div>
</template>
