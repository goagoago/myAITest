<template>
  <div class="page-loader">
    <div class="page-loader__panel" role="status" aria-live="polite" aria-label="页面加载中">
      <div class="page-loader__mark">
        <ToolsBoxMark />
      </div>
      <span class="page-loader__label">加载中</span>
      <span class="page-loader__line" aria-hidden="true"></span>
    </div>
  </div>
</template>

<script setup>
import ToolsBoxMark from './brand/ToolsBoxMark.vue'
</script>

<style scoped lang="scss">
.page-loader {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(244, 246, 248, 0.88);
  z-index: 9999;
}

.page-loader__panel {
  min-width: 164px;
  padding: 18px 18px 16px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
  display: grid;
  justify-items: center;
  gap: 12px;
}

.page-loader__mark {
  width: 44px;
  height: 44px;
}

.page-loader__label {
  font-size: 0.84rem;
  font-weight: 700;
  color: #4b5563;
  letter-spacing: 0.02em;
}

.page-loader__line {
  width: 72px;
  height: 3px;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.92);
  position: relative;
  overflow: hidden;
}

.page-loader__line::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 42%;
  border-radius: inherit;
  background: #111827;
  animation: loaderSlide 0.9s ease-in-out infinite;
}

@keyframes loaderSlide {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(78px);
  }
  100% {
    transform: translateX(170%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-loader__line::after {
    animation: none;
    transform: translateX(36px);
  }
}
</style>
