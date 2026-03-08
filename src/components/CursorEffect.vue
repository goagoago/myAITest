<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const cursor = ref({ x: -100, y: -100 })
const trail = ref({ x: -100, y: -100 })
const isHovering = ref(false)
const isClicking = ref(false)
const ripples = ref([])

let animFrame = null

const lerp = (a, b, t) => a + (b - a) * t

const updateTrail = () => {
  trail.value.x = lerp(trail.value.x, cursor.value.x, 0.15)
  trail.value.y = lerp(trail.value.y, cursor.value.y, 0.15)
  animFrame = requestAnimationFrame(updateTrail)
}

const handleMove = (e) => {
  cursor.value.x = e.clientX
  cursor.value.y = e.clientY
}

const handleDown = (e) => {
  isClicking.value = true
  // 创建点击波纹
  const id = Date.now()
  ripples.value.push({ id, x: e.clientX, y: e.clientY })
  // 清理旧波纹
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 800)
}

const handleUp = () => {
  isClicking.value = false
}

const handleOver = (e) => {
  const tag = e.target.closest('button, a, [role="button"], input, .clickable, .tool-card, .nav__link, .chip, .mode-card, .action-btn')
  isHovering.value = !!tag
}

onMounted(() => {
  // 仅桌面端启用
  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', handleMove, { passive: true })
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('mouseover', handleOver, { passive: true })
    animFrame = requestAnimationFrame(updateTrail)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMove)
  document.removeEventListener('mousedown', handleDown)
  document.removeEventListener('mouseup', handleUp)
  document.removeEventListener('mouseover', handleOver)
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<template>
  <!-- 主光标 -->
  <div
    class="cursor-dot"
    :class="{ 'cursor-dot--hover': isHovering, 'cursor-dot--click': isClicking }"
    :style="{ left: cursor.x + 'px', top: cursor.y + 'px' }"
  ></div>

  <!-- 跟随光晕 -->
  <div
    class="cursor-glow"
    :class="{ 'cursor-glow--hover': isHovering }"
    :style="{ left: trail.x + 'px', top: trail.y + 'px' }"
  ></div>

  <!-- 点击波纹 -->
  <div
    v-for="ripple in ripples"
    :key="ripple.id"
    class="cursor-ripple"
    :style="{ left: ripple.x + 'px', top: ripple.y + 'px' }"
  ></div>
</template>

<style scoped>
.cursor-dot,
.cursor-glow,
.cursor-ripple {
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  transform: translate(-50%, -50%);
}

/* 主光标点 */
.cursor-dot {
  width: 8px;
  height: 8px;
  background: var(--primary, #10b981);
  border-radius: 50%;
  box-shadow:
    0 0 10px rgba(16, 185, 129, 0.6),
    0 0 20px rgba(16, 185, 129, 0.3);
  transition: width 0.25s, height 0.25s, background 0.25s, box-shadow 0.25s;
}

.cursor-dot--hover {
  width: 16px;
  height: 16px;
  background: rgba(16, 185, 129, 0.3);
  border: 2px solid var(--primary, #10b981);
  box-shadow:
    0 0 20px rgba(16, 185, 129, 0.5),
    0 0 40px rgba(16, 185, 129, 0.2);
}

.cursor-dot--click {
  width: 6px;
  height: 6px;
  background: var(--accent, #f59e0b);
  box-shadow:
    0 0 15px rgba(245, 158, 11, 0.7),
    0 0 30px rgba(245, 158, 11, 0.3);
}

/* 跟随光晕 */
.cursor-glow {
  width: 36px;
  height: 36px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  transition: width 0.3s, height 0.3s, background 0.3s;
}

.cursor-glow--hover {
  width: 56px;
  height: 56px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
}

/* 点击波纹 */
.cursor-ripple {
  width: 6px;
  height: 6px;
  border: 2px solid rgba(245, 158, 11, 0.6);
  border-radius: 50%;
  animation: ripple-expand 0.8s ease-out forwards;
}

@keyframes ripple-expand {
  0% {
    width: 6px;
    height: 6px;
    opacity: 1;
    border-width: 2px;
  }
  100% {
    width: 80px;
    height: 80px;
    opacity: 0;
    border-width: 1px;
  }
}

/* 移动端隐藏 */
@media (pointer: coarse) {
  .cursor-dot,
  .cursor-glow,
  .cursor-ripple {
    display: none;
  }
}
</style>
