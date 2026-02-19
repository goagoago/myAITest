<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Home, Plane, PenTool, Globe, Lightbulb, Sparkles, Zap, Eraser, FileText,
  ImageDown, MonitorPlay, ChevronDown, Image, Wrench, Bot, Menu, X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const mobileMenuOpen = ref(false)
const openDropdown = ref(null)

const navGroups = [
  {
    id: 'image',
    label: '图片工具',
    icon: Image,
    children: [
      { path: '/watermark-removal', label: '去水印', icon: Eraser, desc: '智能去除水印' },
      { path: '/image-compress', label: '图片压缩', icon: ImageDown, desc: '多模式压缩' },
    ],
  },
  {
    id: 'utility',
    label: '实用工具',
    icon: Wrench,
    children: [
      { path: '/doc-convert', label: '文档转换', icon: FileText, desc: 'PDF与Word互转' },
      { path: '/screen-record', label: '屏幕录制', icon: MonitorPlay, desc: '浏览器端录屏' },
    ],
  },
  {
    id: 'ai',
    label: 'AI 助手',
    icon: Bot,
    children: [
      { path: '/ai-studio', label: 'AI 创作', icon: Sparkles, desc: '图片视频生成' },
      { path: '/travel', label: '旅行规划', icon: Plane, desc: '智能行程方案' },
      { path: '/writer', label: '写作助手', icon: PenTool, desc: '润色续写改写' },
      { path: '/translator', label: '翻译专家', icon: Globe, desc: '多语言翻译' },
      { path: '/mind', label: '头脑风暴', icon: Lightbulb, desc: '创意思维拓展' },
    ],
  },
]

const isActive = (path) => route.path === path

const isGroupActive = (group) => {
  return group.children.some(child => route.path === child.path)
}

let dropdownTimer = null
const showDropdown = (id) => {
  clearTimeout(dropdownTimer)
  openDropdown.value = id
}
const hideDropdown = () => {
  dropdownTimer = setTimeout(() => {
    openDropdown.value = null
  }, 150)
}

const navigateTo = (path) => {
  router.push(path)
  openDropdown.value = null
  mobileMenuOpen.value = false
}

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
  clearTimeout(dropdownTimer)
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

        <!-- 桌面端导航 -->
        <nav class="nav">
          <router-link
            to="/"
            class="nav__link"
            :class="{ 'nav__link--active': isActive('/') }"
          >
            <Home :size="18" class="nav__icon" />
            <span class="nav__label">首页</span>
          </router-link>

          <div
            v-for="group in navGroups"
            :key="group.id"
            class="nav__dropdown"
            @mouseenter="showDropdown(group.id)"
            @mouseleave="hideDropdown()"
          >
            <button
              class="nav__link nav__link--trigger"
              :class="{ 'nav__link--active': isGroupActive(group) }"
            >
              <component :is="group.icon" :size="18" class="nav__icon" />
              <span class="nav__label">{{ group.label }}</span>
              <ChevronDown :size="14" class="nav__chevron" :class="{ 'nav__chevron--open': openDropdown === group.id }" />
            </button>

            <Transition name="dropdown">
              <div v-if="openDropdown === group.id" class="dropdown">
                <button
                  v-for="item in group.children"
                  :key="item.path"
                  class="dropdown__item"
                  :class="{ 'dropdown__item--active': isActive(item.path) }"
                  @click="navigateTo(item.path)"
                >
                  <div class="dropdown__icon">
                    <component :is="item.icon" :size="18" />
                  </div>
                  <div class="dropdown__text">
                    <span class="dropdown__name">{{ item.label }}</span>
                    <span class="dropdown__desc">{{ item.desc }}</span>
                  </div>
                </button>
              </div>
            </Transition>
          </div>
        </nav>

        <!-- 移动端菜单按钮 -->
        <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
          <component :is="mobileMenuOpen ? X : Menu" :size="22" />
        </button>
      </div>
    </header>

    <!-- 移动端侧边菜单 -->
    <Transition name="overlay">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false"></div>
    </Transition>
    <Transition name="slide">
      <div v-if="mobileMenuOpen" class="mobile-menu">
        <button
          class="mobile-menu__link"
          :class="{ 'mobile-menu__link--active': isActive('/') }"
          @click="navigateTo('/')"
        >
          <Home :size="20" />
          <span>首页</span>
        </button>

        <div v-for="group in navGroups" :key="group.id" class="mobile-menu__group">
          <div class="mobile-menu__group-label">
            <component :is="group.icon" :size="16" />
            <span>{{ group.label }}</span>
          </div>
          <button
            v-for="item in group.children"
            :key="item.path"
            class="mobile-menu__link"
            :class="{ 'mobile-menu__link--active': isActive(item.path) }"
            @click="navigateTo(item.path)"
          >
            <component :is="item.icon" :size="20" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </Transition>

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

/* ═══════════════════════════════════════════════════════════
   导航栏
   ═══════════════════════════════════════════════════════════ */

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
  flex-shrink: 0;
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

/* ═══════════════════════════════════════════════════════════
   桌面端导航
   ═══════════════════════════════════════════════════════════ */

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
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
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

.nav__chevron {
  transition: transform 0.2s;
  opacity: 0.5;
  flex-shrink: 0;
}

.nav__chevron--open {
  transform: rotate(180deg);
}

/* 下拉菜单容器 */
.nav__dropdown {
  position: relative;
}

/* ═══════════════════════════════════════════════════════════
   下拉菜单
   ═══════════════════════════════════════════════════════════ */

.dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 220px;
  padding: 8px;
  background: rgba(20, 20, 24, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 200;
}

/* 下拉菜单小箭头 */
.dropdown::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: rgba(20, 20, 24, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.dropdown__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.dropdown__item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.dropdown__item--active {
  background: rgba(16, 185, 129, 0.1);
}

.dropdown__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.2s;
}

.dropdown__item:hover .dropdown__icon {
  background: rgba(16, 185, 129, 0.15);
  color: var(--primary);
}

.dropdown__item--active .dropdown__icon {
  background: rgba(16, 185, 129, 0.15);
  color: var(--primary);
}

.dropdown__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dropdown__desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* 下拉菜单动画 */
.dropdown-enter-active {
  transition: opacity 0.2s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* ═══════════════════════════════════════════════════════════
   移动端菜单
   ═══════════════════════════════════════════════════════════ */

.mobile-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.mobile-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background: rgba(15, 15, 18, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 200;
  padding: 80px 20px 20px;
  overflow-y: auto;
}

.mobile-menu__group {
  margin-top: 8px;
}

.mobile-menu__group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mobile-menu__link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
  text-align: left;
}

.mobile-menu__link:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.mobile-menu__link--active {
  background: rgba(16, 185, 129, 0.1);
  color: var(--primary);
}

/* 移动端动画 */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-leave-active {
  transition: transform 0.25s;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* ═══════════════════════════════════════════════════════════
   主内容 & 页脚
   ═══════════════════════════════════════════════════════════ */

.main {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 80px);
  padding-top: 100px;
}

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

/* ═══════════════════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 900px) {
  .nav {
    display: none;
  }

  .mobile-toggle {
    display: flex;
  }
}

@media (max-width: 600px) {
  .navbar__inner {
    padding: 0 16px;
  }

  .logo__text {
    display: none;
  }

  .logo__badge {
    display: none;
  }
}
</style>
