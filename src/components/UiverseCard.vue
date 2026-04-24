<script setup>
defineProps({
  name: String,
  description: String,
  gradient: {
    type: String,
    default: 'linear-gradient(145deg, #4f46e5, #06b6d4)',
  },
  shadowColor: {
    type: String,
    default: 'rgba(79, 70, 229, 0.26)',
  }
})
</script>

<template>
  <div class="card" :style="{ '--gradient': gradient, '--shadow-color': shadowColor }">
    <div class="card-glow"></div>
    <div class="content">
      <div class="icon-container">
        <slot name="icon"></slot>
      </div>
      <h3 class="card-title">{{ name }}</h3>
      <p class="card-description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card {
  width: 100%;
  max-width: var(--tool-card-max-width, 300px);
  min-width: 0;
  height: var(--tool-card-height, 236px);
  position: relative;
  border-radius: var(--tool-card-radius, 24px);
  border: 1px solid rgba(70, 85, 130, 0.2);
  background: rgba(232, 237, 248, 0.86);
  box-shadow:
    0 18px 42px rgba(65, 76, 120, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.18);
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.02));
  opacity: 1;
  pointer-events: none;
}

.card-glow {
  position: absolute;
  inset: auto -24% -34% auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: var(--gradient);
  filter: blur(34px);
  opacity: 0.1;
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.content {
  position: absolute;
  inset: 1px;
  width: calc(100% - 2px);
  min-height: calc(100% - 2px);
  padding: var(--tool-card-padding-y, 22px) var(--tool-card-padding-x, 20px);
  background: linear-gradient(180deg, rgba(248, 250, 255, 0.96), rgba(235, 240, 249, 0.92));
  border-radius: calc(var(--tool-card-radius, 24px) - 1px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--tool-card-gap, 10px);
  transition: all 0.36s ease, background 0.24s ease;
  z-index: 1;
  text-align: center;
}

.icon-container {
  width: var(--tool-card-icon-box, clamp(52px, 4vw, 62px));
  height: var(--tool-card-icon-box, clamp(52px, 4vw, 62px));
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tool-card-icon-radius, 18px);
  color: white;
  background: var(--gradient);
  box-shadow:
    0 14px 28px var(--shadow-color),
    inset 0 1px 1px rgba(255, 255, 255, 0.24);
  transition: all 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-title {
  color: #243047;
  font-size: var(--tool-card-title-size, clamp(1rem, 0.92rem + 0.2vw, 1.16rem));
  line-height: var(--tool-card-title-line-height, 1.3);
  font-weight: 700;
  margin: 0;
  transition: all 0.3s ease;
}

.card-description {
  color: #66748f;
  font-size: var(--tool-card-desc-size, 0.9rem);
  line-height: var(--tool-card-desc-line-height, 1.6);
  height: 0;
  padding: 0 var(--tool-card-desc-pad-x, 8px);
  overflow: hidden;
  opacity: 0;
  margin: 0;
  transition: height 0.38s ease, opacity 0.28s ease, transform 0.38s ease;
}

.card:hover {
  transform: translateY(-8px) scale(1.04);
  box-shadow:
    0 28px 64px rgba(88, 98, 145, 0.18),
    0 0 46px -12px var(--shadow-color);
  border-color: rgba(99, 102, 241, 0.24);
}

.card:hover .card-glow {
  opacity: 0.18;
  transform: scale(1.06);
}

.card:hover .content {
  background: linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(240, 244, 252, 0.96));
  inset: 2px;
  width: calc(100% - 4px);
  min-height: calc(100% - 4px);
}

.card:hover .icon-container {
  transform: scale(0.9) translateY(-15px);
}

.card:hover .card-title {
  font-size: var(--tool-card-title-hover-size, clamp(1.08rem, 1rem + 0.26vw, 1.28rem));
  transform: translateY(-15px);
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card:hover .card-description {
  height: var(--tool-card-desc-expand-height, 64px);
  opacity: 1;
  transform: translateY(-10px);
}

.card:focus-visible {
  outline: 2px solid rgba(79, 70, 229, 0.35);
  outline-offset: 3px;
}

@media (hover: none) {
  .card:hover {
    transform: none;
    box-shadow:
      0 18px 42px rgba(65, 76, 120, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
  }

  .card:hover .card-glow {
    opacity: 0.1;
    transform: none;
  }

  .card:hover .content {
    inset: 1px;
    width: calc(100% - 2px);
    height: calc(100% - 2px);
    background: linear-gradient(180deg, rgba(248, 250, 255, 0.96), rgba(235, 240, 249, 0.92));
  }

  .card:hover .icon-container,
  .card:hover .card-title,
  .card:hover .card-description {
    transform: none;
  }

  .card:hover .card-title {
    font-size: var(--tool-card-title-size, clamp(1rem, 0.92rem + 0.2vw, 1.16rem));
    background: none;
    -webkit-background-clip: border-box;
    background-clip: border-box;
    -webkit-text-fill-color: currentColor;
  }

  .card:hover .card-description {
    height: 0;
    opacity: 0;
  }

  .content {
    justify-content: flex-start;
  }

  .card-description,
  .card:hover .card-description {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--tool-card-desc-lines, 2);
    height: auto;
    min-height: calc(var(--tool-card-desc-line-height, 1.5) * var(--tool-card-desc-lines, 2) * 1em);
    padding: 0;
    overflow: hidden;
    opacity: 0.92;
    transform: none;
  }
}
</style>
