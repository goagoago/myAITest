<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Home, Plane, PenTool, Globe, Lightbulb, Sparkles, Zap, Eraser, FileText,
  ImageDown, MonitorPlay, ChevronDown, Image, Wrench, Bot, Menu, X, Camera, QrCode, ScanLine, Scissors, CreditCard, Video
} from 'lucide-vue-next'
import CursorEffect from '../components/CursorEffect.vue'
import LottieInteractive from '../components/LottieInteractive.vue'
import toolboxAnim from '../assets/lottie/toolbox.js'
import PageLoader from '../components/PageLoader.vue'

import bgVideo from '../assets/BG.mp4'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const mobileMenuOpen = ref(false)
const openDropdown = ref(null)
const isLoading = ref(false)

// 全局加载逻辑
let loadingTimer = null
router.beforeEach(() => {
  console.log('Router: beforeEach triggered')
  clearTimeout(loadingTimer)
  // 200ms 后再显示 loading，防止快速切换时闪烁
  loadingTimer = setTimeout(() => {
    console.log('Router: Setting isLoading to true')
    isLoading.value = true
  }, 200)
})
router.afterEach(() => {
  console.log('Router: afterEach triggered')
  clearTimeout(loadingTimer)
  // 保证 loading 至少可见 300ms，防止体验突兀
  setTimeout(() => {
    console.log('Router: Setting isLoading to false')
    isLoading.value = false
  }, 300)
})


const navGroups = [
  {
    id: 'image',
    label: '图片工具',
    icon: Image,
    children: [
      { path: '/watermark-removal', label: '水印工具', icon: Eraser, desc: '去水印/加水印' },
      { path: '/image-compress', label: '图片压缩', icon: ImageDown, desc: '多模式压缩' },
      { path: '/id-photo', label: '证件照', icon: Camera, desc: '证件照制作' },
      { path: '/remove-bg', label: 'AI抠图', icon: Scissors, desc: '智能去除背景' },
    ],
  },
  {
    id: 'utility',
    label: '实用工具',
    icon: Wrench,
    children: [
      { path: '/doc-convert', label: '文档转换', icon: FileText, desc: '7种格式互转' },
      { path: '/screen-record', label: '屏幕录制', icon: MonitorPlay, desc: '浏览器端录屏' },
      { path: '/qr-code', label: 'QR码生成', icon: QrCode, desc: '二维码生成美化' },
      { path: '/ocr', label: 'OCR识别', icon: ScanLine, desc: '图片文字识别' },
      { path: '/id-generator', label: '身份证号', icon: CreditCard, desc: '随机号码生成' },
      { path: '/video-compress', label: '视频压缩', icon: Video, desc: '浏览器端压缩' },
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
    <video class="global-bg" autoplay loop muted playsinline :src="bgVideo"></video>

    <!-- 全局加载动画 -->
    <PageLoader v-if="isLoading" />

    <!-- 自定义光标 -->
    <CursorEffect />

    <!-- 顶部导航 — 新拟物凸起 -->
    <header class="navbar" :class="{ 'navbar--scrolled': scrolled }">
      <div class="navbar__inner">
        <!-- Logo — Lottie动画 -->
        <router-link to="/" class="logo">
          <div class="logo__icon-wrap">
            <LottieInteractive
              :animation-data="toolboxAnim"
              trigger="hover"
              :loop="false"
              width="26px"
              height="26px"
            />
          </div>
          <span class="logo__text">Tools Box</span>
        </router-link>

        <!-- 桌面端导航 — 新拟物分段器 -->
        <nav class="nav">
          <router-link
            to="/"
            class="nav__link"
            :class="{ 'nav__link--active': isActive('/') }"
          >
            <Home :size="17" class="nav__icon" />
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
              <component :is="group.icon" :size="17" class="nav__icon" />
              <span class="nav__label">{{ group.label }}</span>
              <ChevronDown :size="13" class="nav__chevron" :class="{ 'nav__chevron--open': openDropdown === group.id }" />
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
                    <component :is="item.icon" :size="17" />
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

    <!-- 主内容 — 3D页面转场 -->
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="page3d" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 — 新拟物 -->
    <footer class="footer">
      <div class="footer__content">
        <div class="footer__brand">
          <div class="footer__logo-dot"></div>
          <span>Tools Box</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  position: relative;
  background-color: transparent; /* Ensure layout background is transparent */
}

.global-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
  filter: brightness(0.7);
}

/* ═══════════════════════════════════════════════════════════
   导航栏 — 新拟物凸起
   ═══════════════════════════════════════════════════════════ */

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 0;
  transition: all 0.4s var(--transition-smooth);
}

.navbar--scrolled {
  padding: 8px 0;
  background: rgba(26, 26, 46, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.03);
}

.navbar__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo — 新拟物凸起 */
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo__icon-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neo-surface-raised);
  border-radius: 14px;
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.5),
    -3px -3px 10px rgba(255, 255, 255, 0.03),
    inset 0 1px 1px rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.15);
  transition: all 0.35s var(--transition-bounce);
  overflow: hidden;
}

.logo:hover .logo__icon-wrap {
  transform: scale(1.08) rotate(-5deg);
  box-shadow:
    6px 6px 18px rgba(0, 0, 0, 0.5),
    -4px -4px 12px rgba(255, 255, 255, 0.04),
    0 0 20px rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.35);
}

.logo__text {
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* ═══════════════════════════════════════════════════════════
   桌面端导航 — 新拟物分段器
   ═══════════════════════════════════════════════════════════ */

.nav {
  display: flex;
  gap: 3px;
  padding: 5px;
  background: var(--neo-surface);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  box-shadow:
    var(--neo-shadow-up-sm),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.nav__link {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.25s var(--transition-smooth);
  text-decoration: none;
  position: relative;
  background: none;
  border: none;
  cursor: none;
  white-space: nowrap;
}

.nav__link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: var(--neo-shadow-up-sm);
}

.nav__link--active {
  color: var(--primary);
  background: var(--neo-bg-dark);
  box-shadow: var(--neo-shadow-down-sm);
}

.nav__link--active .nav__icon {
  color: var(--primary);
  filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));
}

.nav__icon {
  flex-shrink: 0;
  transition: all 0.25s;
}

.nav__label {
  position: relative;
  z-index: 1;
}

.nav__chevron {
  transition: transform 0.25s;
  opacity: 0.5;
  flex-shrink: 0;
}

.nav__chevron--open {
  transform: rotate(180deg);
}

.nav__dropdown {
  position: relative;
}

/* ═══════════════════════════════════════════════════════════
   下拉菜单 — 新拟物3D浮起
   ═══════════════════════════════════════════════════════════ */

.dropdown {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 230px;
  padding: 8px;
  background: var(--neo-surface);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  box-shadow:
    var(--neo-shadow-up-lg),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  z-index: 200;
}

/* 下拉菜单装饰线 */
.dropdown::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent);
}

.dropdown__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: none;
  border: none;
  cursor: none;
  transition: all 0.25s;
  text-align: left;
}

.dropdown__item:hover {
  background: var(--neo-bg-dark);
  box-shadow: var(--neo-shadow-down-sm);
}

.dropdown__item--active {
  background: var(--neo-bg-dark);
  box-shadow: var(--neo-shadow-down-sm);
}

.dropdown__icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neo-surface-raised);
  border-radius: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.25s;
  box-shadow: var(--neo-shadow-up-sm);
}

.dropdown__item:hover .dropdown__icon {
  background: linear-gradient(145deg, #12c98e, #0ea572);
  color: white;
  box-shadow:
    var(--neo-shadow-up-sm),
    0 0 12px rgba(16, 185, 129, 0.3);
}

.dropdown__item--active .dropdown__icon {
  background: linear-gradient(145deg, #12c98e, #0ea572);
  color: white;
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
  transition: opacity 0.25s, transform 0.3s var(--transition-bounce);
}
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.95);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-5px) scale(0.98);
}

/* ═══════════════════════════════════════════════════════════
   移动端菜单 — 新拟物
   ═══════════════════════════════════════════════════════════ */

.mobile-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--neo-surface);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  box-shadow: var(--neo-shadow-up-sm);
  color: var(--text-secondary);
  cursor: none;
  transition: all 0.3s;
}

.mobile-toggle:hover {
  box-shadow: var(--neo-shadow-up);
  color: var(--text-primary);
}

.mobile-toggle:active {
  box-shadow: var(--neo-shadow-pressed);
  transform: scale(0.95);
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 150;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background: var(--neo-bg);
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.5);
  z-index: 200;
  padding: 80px 20px 20px;
  overflow-y: auto;
}

.mobile-menu__group {
  margin-top: 12px;
}

.mobile-menu__group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 8px;
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
  padding: 13px 14px;
  border-radius: 14px;
  background: none;
  border: none;
  cursor: none;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.25s;
  text-align: left;
  margin-bottom: 4px;
}

.mobile-menu__link:hover {
  background: var(--neo-surface);
  box-shadow: var(--neo-shadow-up-sm);
  color: var(--text-primary);
}

.mobile-menu__link--active {
  background: var(--neo-bg-dark);
  box-shadow: var(--neo-shadow-down-sm);
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
  transition: transform 0.35s var(--transition-bounce);
}
.slide-leave-active {
  transition: transform 0.25s;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* ═══════════════════════════════════════════════════════════
   主内容 & 页脚 — 新拟物
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
  padding: 40px 20px 32px;
}

.footer__content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 28px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.footer__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.footer__logo-dot {
  width: 10px;
  height: 10px;
  background: linear-gradient(145deg, #12c98e, #0ea572);
  border-radius: 50%;
  box-shadow:
    2px 2px 5px rgba(0, 0, 0, 0.3),
    -1px -1px 3px rgba(16, 185, 129, 0.15),
    0 0 10px rgba(16, 185, 129, 0.3);
}

/* 页面切换 3D 动画 */
.page3d-enter-active {
  animation: page3DIn 0.45s var(--transition-smooth);
}

.page3d-leave-active {
  animation: page3DOut 0.25s ease;
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
}
</style>
