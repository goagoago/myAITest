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
    default: 'rgba(79, 70, 229, 0.22)',
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
      <div class="text-wrap">
        <h3 class="card-title">{{ name }}</h3>
        <p class="card-description">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card {
  width: 100%;
  max-width: 300px;
  min-width: 0;
  min-height: 220px;
  position: relative;
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 14px 36px rgba(148, 163, 184, 0.14);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.card-glow {
  position: absolute;
  inset: auto -20% -28% auto;
  width: 170px;
  height: 170px;
  border-radius: 999px;
  background: var(--gradient);
  filter: blur(34px);
  opacity: 0.12;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.content {
  position: relative;
  z-index: 1;
  height: 100%;
  min-height: 220px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}

.icon-container {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: white;
  background: var(--gradient);
  box-shadow: 0 14px 26px var(--shadow-color);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.text-wrap {
  display: grid;
  gap: 10px;
}

.card-title {
  color: #0f172a;
  font-size: clamp(1rem, 0.9rem + 0.22vw, 1.16rem);
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
}

.card-description {
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.7;
  margin: 0;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 22px 54px rgba(99, 102, 241, 0.14);
  border-color: rgba(99, 102, 241, 0.14);
  background: rgba(255, 255, 255, 0.94);
}

.card:hover .card-glow {
  opacity: 0.18;
  transform: scale(1.04);
}

.card:hover .icon-container {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px var(--shadow-color);
}

.card:focus-visible {
  outline: 2px solid rgba(79, 70, 229, 0.35);
  outline-offset: 3px;
}

@media (max-width: 768px) {
  .card {
    max-width: none;
    min-height: 188px;
    border-radius: 20px;
  }

  .content {
    min-height: 188px;
    padding: 18px;
    gap: 14px;
  }

  .icon-container {
    width: 50px;
    height: 50px;
    border-radius: 16px;
  }

  .card-description {
    font-size: 0.88rem;
  }
}
</style>
