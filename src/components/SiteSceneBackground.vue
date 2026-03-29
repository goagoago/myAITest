<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const sceneRef = ref(null)

let scene = null
let camera = null
let renderer = null
let gridGroup = null
let glowSprite = null
let animationFrameId = 0

const createScene = () => {
  if (!sceneRef.value) return

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xffffff, 20, 82)

  const width = window.innerWidth
  const height = window.innerHeight

  camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 180)
  camera.position.set(0, 5.4, 18)
  camera.lookAt(0, 1.2, -42)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.setClearColor(0xffffff, 0)
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace
  }

  sceneRef.value.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 1.4))

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
  directionalLight.position.set(0, 12, 10)
  scene.add(directionalLight)

  const gridContainer = new THREE.Group()
  gridGroup = new THREE.Group()

  const widthSpan = 78
  const depth = 116
  const verticalSegments = 44
  const horizontalSegments = 32

  const verticalMaterial = new THREE.LineBasicMaterial({
    color: 0x98a3b5,
    transparent: true,
    opacity: 0.96,
  })

  for (let i = 0; i <= verticalSegments; i += 1) {
    const x = -widthSpan / 2 + (widthSpan / verticalSegments) * i
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0, 12),
      new THREE.Vector3(x, 0, -depth),
    ])
    gridGroup.add(new THREE.Line(geometry, verticalMaterial))
  }

  for (let i = 0; i <= horizontalSegments; i += 1) {
    const t = i / horizontalSegments
    const z = 12 - t * t * (depth + 6)
    const edgeFade = 1 - t * 0.72
    const material = new THREE.LineBasicMaterial({
      color: 0x8893a6,
      transparent: true,
      opacity: 0.26 + edgeFade * 0.82,
    })
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-widthSpan / 2, 0, z),
      new THREE.Vector3(widthSpan / 2, 0, z),
    ])
    gridGroup.add(new THREE.Line(geometry, material))
  }

  gridGroup.position.y = -4.2
  gridContainer.add(gridGroup)
  scene.add(gridContainer)

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 1024
  glowCanvas.height = 512
  const glowCtx = glowCanvas.getContext('2d')
  if (glowCtx) {
    const gradient = glowCtx.createRadialGradient(512, 250, 16, 512, 250, 320)
    gradient.addColorStop(0, 'rgba(255,255,255,0.98)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.78)')
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.18)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    glowCtx.fillStyle = gradient
    glowCtx.fillRect(0, 0, glowCanvas.width, glowCanvas.height)
  }

  const glowMap = new THREE.CanvasTexture(glowCanvas)
  glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowMap,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  )
  glowSprite.position.set(0, 4.8, -58)
  glowSprite.scale.set(72, 28, 1)
  scene.add(glowSprite)

  const animate = () => {
    animationFrameId = window.requestAnimationFrame(animate)
    const time = Date.now() * 0.001

    if (gridGroup) {
      const forward = (time * 18) % 8
      gridGroup.position.x = Math.sin(time * 0.7) * 0.45
      gridGroup.position.z = forward
      gridGroup.rotation.z = Math.sin(time * 0.28) * 0.01
    }

    if (camera) {
      camera.position.x = Math.sin(time * 0.18) * 0.24
      camera.position.y = 5.4 + Math.sin(time * 0.32) * 0.08
      camera.lookAt(0, 1.2, -42)
    }

    if (glowSprite) {
      glowSprite.material.opacity = 0.8 + Math.sin(time * 1.1) * 0.1
      glowSprite.position.x = Math.sin(time * 0.3) * 1.2
    }

    renderer?.render(scene, camera)
  }

  animate()
}

const resizeScene = () => {
  if (!camera || !renderer) return
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
}

const destroyScene = () => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }

  if (gridGroup) {
    gridGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose())
        else child.material.dispose()
      }
    })
  }

  if (glowSprite) {
    glowSprite.material?.map?.dispose?.()
    glowSprite.material?.dispose?.()
  }

  if (renderer) {
    renderer.dispose()
    renderer.domElement?.remove()
  }

  scene = null
  camera = null
  renderer = null
  gridGroup = null
  glowSprite = null
}

onMounted(() => {
  createScene()
  window.addEventListener('resize', resizeScene, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeScene)
  destroyScene()
})
</script>

<template>
  <div class="site-scene" aria-hidden="true">
    <div class="site-scene__wash"></div>
    <div class="site-scene__orb site-scene__orb--left"></div>
    <div class="site-scene__orb site-scene__orb--right"></div>
    <div class="site-scene__noise"></div>
    <div ref="sceneRef" class="site-scene__canvas"></div>
  </div>
</template>

<style scoped>
.site-scene {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(180deg, #eef4ff 0%, #f8fbff 38%, #eef3fb 100%);
}

.site-scene__wash,
.site-scene__orb,
.site-scene__noise,
.site-scene__canvas {
  position: absolute;
  inset: 0;
}

.site-scene__wash {
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.88), transparent 35%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.06) 30%, rgba(255, 255, 255, 0));
}

.site-scene__orb {
  border-radius: 999px;
  filter: blur(56px);
  opacity: 0.9;
}

.site-scene__orb--left {
  top: -4%;
  left: -8%;
  width: min(44vw, 720px);
  height: min(34vw, 520px);
  background: radial-gradient(circle, rgba(79, 70, 229, 0.14) 0%, rgba(79, 70, 229, 0.04) 45%, transparent 74%);
}

.site-scene__orb--right {
  top: 2%;
  right: -6%;
  width: min(38vw, 640px);
  height: min(30vw, 460px);
  background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(20, 184, 166, 0.04) 42%, transparent 72%);
}

.site-scene__noise {
  opacity: 0.08;
  mix-blend-mode: soft-light;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.9) 0 0.6px, transparent 0.7px),
    radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.72) 0 0.5px, transparent 0.6px),
    radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.84) 0 0.6px, transparent 0.7px),
    radial-gradient(circle at 72% 82%, rgba(255, 255, 255, 0.68) 0 0.5px, transparent 0.6px);
  background-size: 180px 180px, 220px 220px, 200px 200px, 240px 240px;
}

.site-scene__canvas :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

@media (max-width: 768px) {
  .site-scene__orb {
    filter: blur(40px);
  }
}
</style>
