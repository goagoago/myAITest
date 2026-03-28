<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
const fallbackVisible = ref(false)
let animationId = 0
let resizeHandler = null
let loseContextHandler = null
let restoreContextHandler = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_motion;
varying vec2 v_uv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

mat2 rotate2d(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * (0.1 * u_motion + 0.008);

  vec3 baseA = vec3(0.84, 0.88, 0.95);
  vec3 baseB = vec3(0.90, 0.93, 0.98);
  vec3 color = mix(baseA, baseB, uv.y + 0.08 * sin(t));

  vec2 q = p;
  q *= rotate2d(0.22 * sin(t * 0.8));
  float field1 = fbm(q * 1.35 + vec2(t * 0.9, -t * 0.45));
  float field2 = fbm((q + field1) * 1.9 - vec2(t * 0.55, t * 0.25));
  float field3 = fbm((q - field2) * 2.35 + vec2(-t * 0.35, t * 0.42));

  float blend = smoothstep(0.18, 0.86, field1 * 0.55 + field2 * 0.3 + field3 * 0.22);
  color += vec3(0.17, 0.15, 0.34) * blend * 0.28;
  color += vec3(0.10, 0.32, 0.58) * smoothstep(0.24, 0.88, field2) * 0.2;
  color += vec3(0.96, 0.97, 1.0) * smoothstep(0.42, 0.98, field3) * 0.14;

  vec2 glow1Pos = vec2(-0.82 + 0.14 * sin(t * 0.9), 0.86 + 0.04 * cos(t * 0.7));
  vec2 glow2Pos = vec2(0.9 + 0.08 * cos(t * 0.6), 0.88 + 0.03 * sin(t * 0.8));
  vec2 glow3Pos = vec2(0.0, 1.18 + 0.02 * sin(t * 0.5));

  float glow1 = 1.0 - smoothstep(0.0, 1.12, length(p - glow1Pos));
  float glow2 = 1.0 - smoothstep(0.0, 1.0, length(p - glow2Pos));
  float glow3 = 1.0 - smoothstep(0.0, 1.42, length(p - glow3Pos));

  color += vec3(0.44, 0.38, 0.93) * glow1 * 0.18;
  color += vec3(0.20, 0.56, 0.94) * glow2 * 0.16;
  color += vec3(1.0, 1.0, 1.0) * glow3 * 0.24;

  float vignette = smoothstep(1.28, 0.18, length(p));
  color *= vignette + 0.12;

  float grid = 0.0;
  vec2 g = uv * vec2(22.0, 18.0);
  vec2 gv = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = min(gv.x, gv.y);
  grid = 1.0 - min(line, 1.0);
  color += vec3(1.0) * grid * 0.02;

  gl_FragColor = vec4(color, 1.0);
}
`

function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  return program
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) {
    fallbackVisible.value = true
    return
  }

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
  })

  if (!gl) {
    fallbackVisible.value = true
    return
  }

  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
  if (!program) {
    fallbackVisible.value = true
    return
  }

  fallbackVisible.value = false

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  const timeLocation = gl.getUniformLocation(program, 'u_time')
  const motionLocation = gl.getUniformLocation(program, 'u_motion')

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW
  )

  const setSize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const render = (now) => {
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
    gl.uniform1f(timeLocation, now * 0.001)
    gl.uniform1f(motionLocation, prefersReducedMotion() ? 0.0 : 1.0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    animationId = window.requestAnimationFrame(render)
  }

  loseContextHandler = (event) => {
    event.preventDefault()
    fallbackVisible.value = true
    if (animationId) window.cancelAnimationFrame(animationId)
  }

  restoreContextHandler = () => {
    fallbackVisible.value = false
    setSize()
    animationId = window.requestAnimationFrame(render)
  }

  resizeHandler = () => setSize()
  canvas.addEventListener('webglcontextlost', loseContextHandler, false)
  canvas.addEventListener('webglcontextrestored', restoreContextHandler, false)
  window.addEventListener('resize', resizeHandler, { passive: true })

  setSize()
  animationId = window.requestAnimationFrame(render)
})

onUnmounted(() => {
  if (animationId) window.cancelAnimationFrame(animationId)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (canvasRef.value && loseContextHandler) {
    canvasRef.value.removeEventListener('webglcontextlost', loseContextHandler)
  }
  if (canvasRef.value && restoreContextHandler) {
    canvasRef.value.removeEventListener('webglcontextrestored', restoreContextHandler)
  }
})
</script>

<template>
  <div class="shader-bg-wrap" aria-hidden="true">
    <div v-if="fallbackVisible" class="shader-fallback"></div>
    <canvas ref="canvasRef" class="shader-bg"></canvas>
  </div>
</template>

<style scoped>
.shader-bg-wrap {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.shader-bg,
.shader-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.shader-bg {
  display: block;
}

.shader-fallback {
  background:
    radial-gradient(circle at 14% 16%, rgba(139, 92, 246, 0.18), transparent 20%),
    radial-gradient(circle at 84% 14%, rgba(59, 130, 246, 0.18), transparent 18%),
    radial-gradient(circle at 50% -4%, rgba(255, 255, 255, 0.48), transparent 34%),
    linear-gradient(180deg, #d7dfef 0%, #e3eaf7 42%, #dde5f2 100%);
  animation: shaderFallbackFloat 14s ease-in-out infinite alternate;
}

.shader-fallback::before,
.shader-fallback::after {
  content: '';
  position: absolute;
  inset: 0;
}

.shader-fallback::before {
  background:
    radial-gradient(circle at 28% 38%, rgba(255, 255, 255, 0.18), transparent 18%),
    radial-gradient(circle at 70% 56%, rgba(6, 182, 212, 0.12), transparent 20%);
  filter: blur(28px);
  animation: shaderFallbackGlow 18s ease-in-out infinite;
}

.shader-fallback::after {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 38px 38px;
  opacity: 0.32;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.04));
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.04));
}

@keyframes shaderFallbackFloat {
  0% {
    transform: scale(1) translate3d(0, 0, 0);
  }
  100% {
    transform: scale(1.04) translate3d(0, -1.5%, 0);
  }
}

@keyframes shaderFallbackGlow {
  0%, 100% {
    transform: translate3d(0, 0, 0);
    opacity: 0.8;
  }
  50% {
    transform: translate3d(1.2%, -1.5%, 0);
    opacity: 1;
  }
}
</style>
