<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Plane, PenTool, Globe, Lightbulb, Sparkles, Zap } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const mousePos = ref({ x: 0, y: 0 })

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/travel', label: '旅行规划', icon: Plane },
  { path: '/writer', label: '写作助手', icon: PenTool },
  { path: '/translator', label: '翻译专家', icon: Globe },
  { path: '/mind', label: '头脑风暴', icon: Lightbulb },
]

const isActive = (path) => route.path === path

const handleScroll = () => {
  scrolled.value = window.scrollY > 20
}

const handleMouseMove = (e) => {
  mousePos.value = {
    x: (e.clientX / window.innerWidth) * 100,
    y: (e.clientY / window.innerHeight) * 100
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div class="layout">
    <!-- 粒子背景 -->
    <div class="particles">
      <div v-for="i in 20" :key="i" class="particle" :style="{ '--delay': `${i * 0.5}s`, '--x': `${(i * 5) % 100}%` }"></div>
    </div>

    <!-- 动态光晕跟随鼠标 -->
    <div
      class="cursor-glow"
      :style="{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }"
    ></div>

    <!-- 背景装饰 -->
    <div class="bg-effects">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
    </div>

    <!-- 顶部导航 -->
    <header class="navbar" :class="{ 'navbar--scrolled': scrolled }">
      <div class="navbar__inner">
        <router-link to="/" class="logo">
          <div class="logo__icon-wrap">
            <Zap class="logo__icon" :size="22" />
          </div>
          <span class="logo__text">AI Box</span>
          <span class="logo__badge">Pro</span>
        </router-link>

        <nav class="nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav__link"
            :class="{ 'nav__link--active': isActive(item.path) }"
          >
            <component :is="item.icon" :size="18" class="nav__icon" />
            <span class="nav__label">{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="nav__actions">
          <button class="nav__github">
            <Sparkles :size="18" />
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer__content">
        <div class="footer__brand">
          <Zap :size="20" class="footer__icon" />
          <span>AI Box</span>
        </div>
        <!-- <p class="footer__text">Powered by 智谱 GLM-4 · 永久免费使用</p> -->
        <div class="footer__links">
          <a href="#">关于</a>
          <span>·</span>
          <a href="#">隐私</a>
          <span>·</span>
          <a href="#">条款</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  position: relative;
}

/* 粒子 */
.particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  left: var(--x);
  bottom: -10px;
  width: 3px;
  height: 3px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 50%;
  opacity: 0;
  animation: particle-rise 15s linear infinite;
  animation-delay: var(--delay);
}

@keyframes particle-rise {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100vh) translateX(30px) scale(0.5);
    opacity: 0;
  }
}

/* 鼠标跟随光晕 */
.cursor-glow {
  position: fixed;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  transform: translate(-50%, -50%);
  transition: left 0.3s ease-out, top 0.3s ease-out;
}

/* 背景效果 */
.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  animation: morphBlob 25s ease-in-out infinite;
}

.blob-1 {
  width: 700px;
  height: 700px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  top: -300px;
  left: -200px;
  animation-delay: 0s;
}

.blob-2 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  bottom: -200px;
  right: -150px;
  animation-delay: -8s;
}

.blob-3 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  top: 40%;
  left: 60%;
  animation-delay: -16s;
}

.orb {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  top: 20%;
  right: 10%;
  animation-duration: 25s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  bottom: 30%;
  left: 5%;
  animation-duration: 18s;
  animation-delay: -5s;
}

/* 导航栏 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.navbar--scrolled {
  padding: 10px 0;
  background: rgba(15, 12, 41, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}

.navbar__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.logo__icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: transform 0.3s, box-shadow 0.3s;
}

.logo:hover .logo__icon-wrap {
  transform: scale(1.05) rotate(-5deg);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5);
}

.logo__text {
  font-size: 1.375rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
}

.logo__badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.2), rgba(102, 126, 234, 0.2));
  border: 1px solid rgba(240, 147, 251, 0.3);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* 导航链接 */
.nav {
  display: flex;
  gap: 6px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.nav__link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.nav__link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity 0.3s;
}

.nav__link:hover {
  color: var(--text-primary);
}

.nav__link:hover::before {
  opacity: 0.1;
}

.nav__link--active {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

.nav__link--active::before {
  opacity: 0.15;
}

.nav__link--active .nav__icon {
  color: var(--accent);
}

.nav__icon {
  flex-shrink: 0;
  transition: color 0.3s, transform 0.3s;
}

.nav__link:hover .nav__icon {
  transform: scale(1.1);
}

.nav__label {
  position: relative;
  z-index: 1;
}

/* 导航操作 */
.nav__actions {
  display: flex;
  gap: 8px;
}

.nav__github {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.nav__github:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--accent);
  border-color: var(--accent);
  transform: rotate(15deg);
}

/* 主内容 */
.main {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 80px);
  padding-top: 100px;
}

/* 页脚 */
.footer {
  position: relative;
  z-index: 1;
  padding: 60px 20px 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer__content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.footer__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
}

.footer__icon {
  color: var(--primary);
}

.footer__text {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.footer__links {
  display: flex;
  gap: 12px;
  font-size: 0.8125rem;
}

.footer__links a {
  color: var(--text-muted);
  transition: color 0.3s;
}

.footer__links a:hover {
  color: var(--text-primary);
}

.footer__links span {
  color: var(--text-muted);
  opacity: 0.5;
}

/* 页面切换动画 */
.page-enter-active {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-leave-active {
  animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse;
}

/* 响应式 */
@media (max-width: 900px) {
  .nav {
    padding: 4px;
    gap: 2px;
  }

  .nav__link {
    padding: 8px 12px;
  }

  .nav__label {
    display: none;
  }

  .logo__badge {
    display: none;
  }
}

@media (max-width: 600px) {
  .navbar__inner {
    padding: 0 16px;
  }

  .logo__text {
    display: none;
  }

  .nav__actions {
    display: none;
  }
}
</style>
