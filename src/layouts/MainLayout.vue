<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Plane, PenTool, Globe, Lightbulb, Sparkles, Zap, Eraser } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/watermark-removal', label: '去水印', icon: Eraser },
  { path: '/ai-studio', label: 'AI 创作', icon: Sparkles },
  { path: '/travel', label: '旅行规划', icon: Plane },
  { path: '/writer', label: '写作助手', icon: PenTool },
  { path: '/translator', label: '翻译专家', icon: Globe },
  { path: '/mind', label: '头脑风暴', icon: Lightbulb },
]

const isActive = (path) => route.path === path

let ticking = false
const handleScroll = () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      scrolled.value = window.scrollY > 20
      ticking = false
    })
    ticking = true
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="layout">
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
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  position: relative;
}

/* 导航栏 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 0;
  transition: padding 0.3s, background 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.navbar--scrolled {
  padding: 10px 0;
  background: rgba(9, 9, 11, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
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
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
  transition: transform 0.3s, box-shadow 0.3s;
}

.logo:hover .logo__icon-wrap {
  transform: scale(1.05) rotate(-5deg);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.45);
}

.logo__text {
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.logo__badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(245, 158, 11, 0.15));
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* 导航链接 */
.nav {
  display: flex;
  gap: 4px;
  padding: 5px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
}

.nav__link {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.2s, background 0.2s;
  text-decoration: none;
  position: relative;
}

.nav__link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
}

.nav__link--active {
  color: var(--primary);
  background: rgba(16, 185, 129, 0.1);
}

.nav__link--active .nav__icon {
  color: var(--primary);
}

.nav__icon {
  flex-shrink: 0;
  transition: color 0.2s;
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
  border-color: rgba(245, 158, 11, 0.3);
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

/* 页面切换动画 */
.page-enter-active {
  animation: fadeInUp 0.4s ease;
}

.page-leave-active {
  animation: fadeInUp 0.25s ease reverse;
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
