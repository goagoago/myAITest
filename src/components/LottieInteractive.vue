<script setup>
import { ref } from 'vue'
import { useLottie } from '../composables/useLottie.js'

const props = defineProps({
  animationData: { type: Object, required: true },
  trigger: { type: String, default: 'auto' }, // auto|hover|click|scroll|mousemove|eyeTrack|reactive
  loop: { type: Boolean, default: true },
  autoplay: { type: Boolean, default: true },
  speed: { type: Number, default: 1 },
  width: { type: String, default: '100%' },
  height: { type: String, default: '100%' },
  particleEffect: { type: Boolean, default: false },
  eyeTrack: { type: Boolean, default: false },
  idleAnimation: { type: Boolean, default: false },
  clickReaction: { type: String, default: null }, // 'bounce'|'spin'|'shake'|'jump'
  onComplete: { type: Function, default: null },
})

const emit = defineEmits(['click', 'complete'])

// 计算实际的 trigger，eyeTrack prop 优先
const effectiveTrigger = props.eyeTrack ? 'eyeTrack' : props.trigger

const { containerRef, play, stop, pause, goToFrame, triggerClickReaction } = useLottie({
  animationData: props.animationData,
  trigger: effectiveTrigger,
  loop: props.loop,
  autoplay: props.autoplay,
  speed: props.speed,
  onComplete: () => emit('complete'),
  idleAnimation: props.idleAnimation,
  clickReaction: props.clickReaction,
})

// 粒子特效
const particles = ref([])
let particleId = 0

const spawnParticles = (e) => {
  if (!props.particleEffect) return
  const rect = e.currentTarget.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top

  const shapes = ['star', 'heart', 'circle']
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#ec4899']
  const count = 8 + Math.floor(Math.random() * 5)

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const velocity = 40 + Math.random() * 60
    const id = particleId++
    particles.value.push({
      id,
      x: cx,
      y: cy,
      dx: Math.cos(angle) * velocity,
      dy: Math.sin(angle) * velocity - 30,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 720,
    })
  }

  // 自动清除
  setTimeout(() => {
    particles.value = particles.value.filter(p => p.id >= id - count + 1 ? false : true)
  }, 800)
}

const handleClick = (e) => {
  emit('click', e)
  spawnParticles(e)
  triggerClickReaction()
}

defineExpose({ play, stop, pause, goToFrame })
</script>

<template>
  <div
    class="lottie-interactive-wrap"
    :style="{ width, height }"
    @click="handleClick"
  >
    <div
      ref="containerRef"
      class="lottie-interactive"
      :class="{ 'lottie-eye-track': eyeTrack || trigger === 'eyeTrack' || trigger === 'reactive' }"
    ></div>

    <!-- 粒子特效层 -->
    <TransitionGroup name="particle" tag="div" class="particle-layer" v-if="particleEffect">
      <span
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :class="p.shape"
        :style="{
          left: p.x + 'px',
          top: p.y + 'px',
          '--dx': p.dx + 'px',
          '--dy': p.dy + 'px',
          '--rot': p.rotation + 'deg',
          '--rot-speed': p.rotSpeed + 'deg',
          '--color': p.color,
          '--size': p.size + 'px',
        }"
      ></span>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.lottie-interactive-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lottie-interactive {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform 0.1s ease-out;
}

.lottie-interactive :deep(svg) {
  width: 100% !important;
  height: 100% !important;
}

/* 眼球跟踪 — 内部 SVG 微位移 */
.lottie-eye-track {
  --eye-x: 0px;
  --eye-y: 0px;
}

.lottie-eye-track :deep(svg) {
  transform: translate(var(--eye-x), var(--eye-y));
  transition: transform 0.15s ease-out;
}

/* 点击反应动画 */
:deep(.lottie-bounce) {
  animation: lottieBounce 0.5s var(--transition-bounce);
}
:deep(.lottie-spin) {
  animation: lottieSpin 0.5s ease;
}
:deep(.lottie-shake) {
  animation: lottieShake 0.4s ease;
}
:deep(.lottie-jump) {
  animation: lottieJump 0.6s var(--transition-bounce);
}

@keyframes lottieBounce {
  0% { transform: scale(1); }
  30% { transform: scale(0.85); }
  60% { transform: scale(1.15); }
  80% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

@keyframes lottieSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(0.9); }
  100% { transform: rotate(360deg) scale(1); }
}

@keyframes lottieShake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px) rotate(-3deg); }
  30% { transform: translateX(5px) rotate(2deg); }
  45% { transform: translateX(-4px) rotate(-1deg); }
  60% { transform: translateX(3px) rotate(1deg); }
  75% { transform: translateX(-2px); }
}

@keyframes lottieJump {
  0% { transform: translateY(0) scale(1, 1); }
  20% { transform: translateY(0) scale(1.1, 0.9); }
  40% { transform: translateY(-20px) scale(0.95, 1.05); }
  60% { transform: translateY(-10px) scale(1, 1); }
  80% { transform: translateY(0) scale(1.05, 0.95); }
  100% { transform: translateY(0) scale(1, 1); }
}

/* 粒子特效层 */
.particle-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 10;
}

.particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  animation: particleFly 0.7s ease-out forwards;
}

.particle.circle {
  background: var(--color);
  border-radius: 50%;
}

.particle.star {
  background: var(--color);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.particle.heart {
  background: var(--color);
  clip-path: polygon(50% 85%, 5% 40%, 5% 20%, 25% 0%, 50% 15%, 75% 0%, 95% 20%, 95% 40%);
}

@keyframes particleFly {
  0% {
    transform: translate(0, 0) rotate(var(--rot)) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) rotate(calc(var(--rot) + var(--rot-speed))) scale(0);
    opacity: 0;
  }
}

.particle-enter-active {
  animation: particleFly 0.7s ease-out forwards;
}
.particle-leave-active {
  transition: opacity 0.2s;
}
.particle-leave-to {
  opacity: 0;
}
</style>
