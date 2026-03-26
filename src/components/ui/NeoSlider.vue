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
  <input
    type="range"
    class="neo-slider"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :style="{ '--slider-progress': `${progress}%` }"
    @pointerdown="onPointerDown"
    @input="onInput"
    @keyup="onKeyboardRelease"
  />
</template>

<style scoped lang="scss">
.neo-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  outline: none;
  cursor: ew-resize;
  accent-color: #34d399;
  background: linear-gradient(
    90deg,
    #10b981 0%,
    #3b82f6 var(--slider-progress),
    rgba(255, 255, 255, 0.16) var(--slider-progress),
    rgba(255, 255, 255, 0.16) 100%
  );
}

.neo-slider:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.neo-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: transparent;
}

.neo-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -5px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: linear-gradient(135deg, #34d399, #10b981);
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.neo-slider:hover:not(:disabled)::-webkit-slider-thumb {
  transform: scale(1.08);
}

.neo-slider:active:not(:disabled)::-webkit-slider-thumb {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(16, 185, 129, 0.35);
}

.neo-slider::-moz-range-track {
  height: 6px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.neo-slider::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981, #3b82f6);
}

.neo-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: linear-gradient(135deg, #34d399, #10b981);
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.45);
}

.neo-slider:focus-visible {
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.16);
}
</style>
