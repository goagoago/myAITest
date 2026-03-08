<script setup>
defineProps({
  name: String,
  description: String,
  gradient: {
    type: String,
    default: 'linear-gradient(145deg, #12c98e, #0ea572)',
  },
  shadowColor: {
    type: String,
    default: 'rgba(16, 185, 129, 0.3)',
  }
})
</script>

<template>
  <div class="card" :style="{ '--gradient': gradient, '--shadow-color': shadowColor }">
    <div class="content">
      <div class="icon-container">
        <slot name="icon"></slot>
      </div>
      <h3 class="card-title">{{ name }}</h3>
      <p class="card-description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 300px;
  height: 220px;
  background: var(--neo-surface);
  position: relative;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: var(--neo-shadow-up);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* The new gradient border implementation */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--gradient);
  border-radius: 24px;
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: 0;
}

.content {
  position: absolute;
  inset: 1px; /* To prevent flickering edges */
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  background: var(--neo-surface);
  border-radius: 23px; /* Slightly smaller than parent */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  transition: all 0.4s ease, background 0.2s ease;
  z-index: 1;
}

.icon-container {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: white;
  background: var(--gradient);
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.4), -3px -3px 8px rgba(255, 255, 255, 0.02);
  transition: all 0.35s var(--transition-bounce);
}

.card-title {
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  transition: all 0.3s ease;
}

.card-description {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  height: 0;
  padding: 0 20px;
  overflow: hidden;
  opacity: 0;
  transition: height 0.4s ease, opacity 0.3s ease, transform 0.4s ease;
}


/* --- Hover States --- */

.card:hover {
  transform: translateY(-8px) scale(1.05);
  box-shadow: var(--neo-shadow-up-lg), 0 0 50px -10px var(--shadow-color);
}

.card:hover::before {
  opacity: 1; /* Reveal the gradient background */
}

.card:hover .content {
  transform: translateY(0); /* Content position doesn't need to change now */
  background: var(--neo-surface-raised);
  inset: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
}

.card:hover .icon-container {
  transform: scale(0.9) translateY(-15px);
}

.card:hover .card-title {
  font-size: 1.25rem;
  transform: translateY(-15px);
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card:hover .card-description {
  height: 40px; /* Approx 2 lines */
  opacity: 1;
  transform: translateY(-10px);
}
</style>
