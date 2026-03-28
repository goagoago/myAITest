<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
let rafId = 0
let resizeHandler = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 1.8)
  const blobs = [
    {
      x: 0.18,
      y: 0.18,
      radius: 0.22,
      color: '139, 92, 246',
      alpha: 0.18,
      speedX: 0.00045,
      speedY: 0.00032,
      phase: 0,
    },
    {
      x: 0.82,
      y: 0.14,
      radius: 0.2,
      color: '59, 130, 246',
      alpha: 0.16,
      speedX: -0.00038,
      speedY: 0.00028,
      phase: 1.8,
    },
    {
      x: 0.52,
      y: 0.08,
      radius: 0.26,
      color: '255, 255, 255',
      alpha: 0.24,
      speedX: 0.00025,
      speedY: 0.00018,
      phase: 3.2,
    },
    {
      x: 0.58,
      y: 0.72,
      radius: 0.24,
      color: '6, 182, 212',
      alpha: 0.12,
      speedX: -0.00022,
      speedY: -0.00024,
      phase: 4.4,
    },
  ]

  const setSize = () => {
    const width = window.innerWidth
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const drawGrid = (width, height) => {
    const step = isMobile() ? 36 : 44
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  const render = (time) => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const t = time * 0.001

    ctx.clearRect(0, 0, width, height)

    const base = ctx.createLinearGradient(0, 0, 0, height)
    base.addColorStop(0, '#d7dfef')
    base.addColorStop(0.4, '#e3eaf7')
    base.addColorStop(1, '#dde5f2')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, width, height)

    blobs.forEach((blob, index) => {
      const motion = prefersReducedMotion() ? 0 : 1
      const cx = (blob.x + Math.sin(t * (0.18 + index * 0.03) + blob.phase) * blob.speedX * time * motion) * width
      const cy = (blob.y + Math.cos(t * (0.16 + index * 0.025) + blob.phase) * blob.speedY * time * motion) * height
      const radius = Math.max(width, height) * blob.radius
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      gradient.addColorStop(0, `rgba(${blob.color}, ${blob.alpha})`)
      gradient.addColorStop(0.45, `rgba(${blob.color}, ${blob.alpha * 0.45})`)
      gradient.addColorStop(1, `rgba(${blob.color}, 0)`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    })

    const topGlow = ctx.createRadialGradient(width * 0.5, -height * 0.1, 0, width * 0.5, -height * 0.1, width * 0.48)
    topGlow.addColorStop(0, 'rgba(255,255,255,0.38)')
    topGlow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = topGlow
    ctx.fillRect(0, 0, width, height)

    drawGrid(width, height)

    rafId = window.requestAnimationFrame(render)
  }

  resizeHandler = () => setSize()
  setSize()
  window.addEventListener('resize', resizeHandler, { passive: true })
  rafId = window.requestAnimationFrame(render)
})

onUnmounted(() => {
  if (rafId) window.cancelAnimationFrame(rafId)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <canvas ref="canvasRef" class="shader-bg" aria-hidden="true"></canvas>
</template>

<style scoped>
.shader-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
