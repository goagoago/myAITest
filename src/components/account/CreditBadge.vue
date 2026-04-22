<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [Number, String],
    default: 0,
  },
  small: {
    type: Boolean,
    default: false,
  },
  muted: {
    type: Boolean,
    default: false,
  },
  strong: {
    type: Boolean,
    default: false,
  },
})

const isInfinite = computed(() => props.value === '∞')
</script>

<template>
  <span
    class="credit-badge"
    :class="{
      'credit-badge--small': small,
      'credit-badge--muted': muted,
      'credit-badge--strong': strong,
      'credit-badge--infinite': isInfinite,
    }"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9.25 8.8 4h6.4L19 9.25 12 20 5 9.25Z" />
      <path d="M8.8 4 12 20 15.2 4" />
      <path d="M5 9.25h14" />
    </svg>
    <strong>{{ value }}</strong>
  </span>
</template>

<style scoped lang="scss">
.credit-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(117, 130, 163, 0.16);
  color: #10213e;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

.credit-badge svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linejoin: round;
  stroke-linecap: round;
  color: #f59e0b;
}

.credit-badge strong {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.credit-badge--small {
  min-height: 30px;
  padding: 0 10px;
  gap: 6px;
}

.credit-badge--small svg {
  width: 14px;
  height: 14px;
}

.credit-badge--small strong {
  font-size: 0.82rem;
}

.credit-badge--muted {
  background: rgba(236, 241, 250, 0.72);
  color: #52637f;
}

.credit-badge--strong {
  background: linear-gradient(135deg, rgba(255, 248, 235, 0.96), rgba(255, 255, 255, 0.9));
  border-color: rgba(245, 158, 11, 0.22);
  box-shadow: 0 14px 28px rgba(245, 158, 11, 0.12);
}

.credit-badge--infinite strong {
  letter-spacing: 0;
  font-size: 1.08rem;
}
</style>
