<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  step: {
    type: Number,
    default: 1,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'change-start', 'change-end'])

const dragging = ref(false)

const progress = computed(() => {
  const min = Number(props.min)
  const max = Number(props.max)
  const value = Number(props.modelValue)

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return 0
  }

  const clamped = Math.min(max, Math.max(min, value))
  return ((clamped - min) / (max - min)) * 100
})

const sliderStyle = computed(() => ({
  '--slider-progress': `${progress.value}%`,
}))

const emitEnd = () => {
  if (!dragging.value) return
  dragging.value = false
  emit('change-end')
}

const onPointerDown = () => {
  dragging.value = true
  emit('change-start')
}

const onInput = (event) => {
  const value = Number(event.target.value)
  emit('update:modelValue', value)
}

const onKeyboardRelease = () => {
  emitEnd()
}

window.addEventListener('pointerup', emitEnd)
window.addEventListener('mouseup', emitEnd)
window.addEventListener('touchend', emitEnd)

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', emitEnd)
  window.removeEventListener('mouseup', emitEnd)
  window.removeEventListener('touchend', emitEnd)
})
</script>

<template>
  <div class="neo-slider-wrap" :class="{ 'is-disabled': disabled }" :style="sliderStyle">
    <input
      type="range"
      class="neo-slider"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @pointerdown="onPointerDown"
      @input="onInput"
      @keyup="onKeyboardRelease"
    />
  </div>
</template>

<style scoped lang="scss">
.neo-slider-wrap {
  --slider-progress: 0%;
  position: relative;
  width: 100%;
  padding: 6px 0;
}

.neo-slider-wrap::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 12px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(245, 248, 253, 0.98), rgba(221, 229, 241, 0.96));
  border: 1px solid rgba(101, 118, 151, 0.18);
  box-shadow: inset 0 1px 2px rgba(145, 160, 184, 0.22);
  pointer-events: none;
}

.neo-slider-wrap::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: var(--slider-progress);
  height: 12px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981 0%, #14b8a6 46%, #3b82f6 100%);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.08), 0 6px 14px rgba(59, 130, 246, 0.18);
  pointer-events: none;
}

.neo-slider {
  position: relative;
  z-index: 1;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 24px;
  border-radius: 999px;
  outline: none;
  cursor: ew-resize;
  background: transparent;
}

.neo-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.neo-slider::-webkit-slider-runnable-track {
  height: 12px;
  background: transparent;
}

.neo-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -5px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.96);
  background: linear-gradient(180deg, #ffffff 0%, #eef5ff 100%);
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.26), 0 0 0 5px rgba(59, 130, 246, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.neo-slider:hover:not(:disabled)::-webkit-slider-thumb {
  transform: scale(1.08);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.28), 0 0 0 7px rgba(59, 130, 246, 0.14);
}

.neo-slider:active:not(:disabled)::-webkit-slider-thumb {
  transform: scale(0.98);
  background: linear-gradient(180deg, #ffffff 0%, #dfeeff 100%);
  box-shadow: 0 6px 14px rgba(59, 130, 246, 0.24), 0 0 0 8px rgba(16, 185, 129, 0.12);
}

.neo-slider::-moz-range-track {
  height: 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
}

.neo-slider::-moz-range-progress {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981 0%, #14b8a6 46%, #3b82f6 100%);
  box-shadow: 0 6px 14px rgba(59, 130, 246, 0.18);
}

.neo-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.96);
  background: linear-gradient(180deg, #ffffff 0%, #eef5ff 100%);
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.26), 0 0 0 5px rgba(59, 130, 246, 0.12);
}

.neo-slider:focus-visible {
  box-shadow: none;
}

.neo-slider-wrap:focus-within::before {
  border-color: rgba(59, 130, 246, 0.34);
  box-shadow: inset 0 1px 2px rgba(145, 160, 184, 0.22), 0 0 0 4px rgba(59, 130, 246, 0.08);
}

.neo-slider-wrap.is-disabled::before,
.neo-slider-wrap.is-disabled::after {
  opacity: 0.55;
}
</style>
