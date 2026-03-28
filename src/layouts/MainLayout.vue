<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResponsive } from '../composables/useResponsive'
import {
  Home, Plane, PenTool, Globe, Lightbulb, Sparkles, Zap, Eraser, FileText,
  ImageDown, MonitorPlay, ChevronDown, Image, Wrench, Bot, Menu, X, Camera, QrCode, ScanLine, Scissors, CreditCard, Video, ScrollText
} from 'lucide-vue-next'
import CursorEffect from '../components/CursorEffect.vue'
import LottieInteractive from '../components/LottieInteractive.vue'
import toolboxAnim from '../assets/lottie/toolbox.js'
import PageLoader from '../components/PageLoader.vue'


const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const mobileMenuOpen = ref(false)
const openDropdown = ref(null)
const isLoading = ref(false)
const { isMobile } = useResponsive()

// 全局加载逻辑
let loadingTimer = null
router.beforeEach(() => {
  clearTimeout(loadingTimer)
  // 200ms 后再显示 loading，防止快速切换时闪烁
  loadingTimer = setTimeout(() => {
    isLoading.value = true
  }, 200)
})
router.afterEach(() => {
  clearTimeout(loadingTimer)
  // 保证 loading 至少可见 300ms，防止体验突兀
  setTimeout(() => {
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
    id: 'media',
    label: '音视频工具',
    icon: Video,
    children: [
      { path: '/media/compress', label: '视频压缩', icon: Video, desc: '浏览器端压缩' },
      { path: '/media/record', label: '屏幕录制', icon: MonitorPlay, desc: '浏览器端录屏' },
      { path: '/media/audio-convert', label: '音频转换', icon: FileText, desc: '多种格式互转' },
    ],
  },
  {
    id: 'utility',
    label: '实用工具',
    icon: Wrench,
    children: [
      { path: '/doc-convert', label: '文档转换', icon: FileText, desc: '7种格式互转' },
      { path: '/qr-code', label: 'QR码生成', icon: QrCode, desc: '二维码生成美化' },
      { path: '/ocr', label: 'OCR识别', icon: ScanLine, desc: '图片文字识别' },
      { path: '/id-generator', label: '身份证号', icon: CreditCard, desc: '随机号码生成' },
      { path: '/resume-builder', label: '简历工坊', icon: ScrollText, desc: 'Markdown编辑与PDF导出' },
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

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

watch(isMobile, (mobile) => {
  if (!mobile) {
    mobileMenuOpen.value = false
  }
})

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
  <div class="layout" :class="{ 'layout--mobile': isMobile, 'layout--desktop': !isMobile }">
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
              width="100%"
              height="100%"
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
            <Home class="nav__icon" />
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
              <component :is="group.icon" class="nav__icon" />
              <span class="nav__label">{{ group.label }}</span>
              <ChevronDown class="nav__chevron" :class="{ 'nav__chevron--open': openDropdown === group.id }" />
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
                    <component :is="item.icon" class="dropdown__icon-svg" />
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
          <component :is="mobileMenuOpen ? X : Menu" class="mobile-toggle__icon" />
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
          <Home class="mobile-menu__icon" />
          <span>首页</span>
        </button>

        <div v-for="group in navGroups" :key="group.id" class="mobile-menu__group">
          <div class="mobile-menu__group-label">
            <component :is="group.icon" class="mobile-menu__group-icon" />
            <span>{{ group.label }}</span>
          </div>
          <button
            v-for="item in group.children"
            :key="item.path"
            class="mobile-menu__link"
            :class="{ 'mobile-menu__link--active': isActive(item.path) }"
            @click="navigateTo(item.path)"
          >
            <component :is="item.icon" class="mobile-menu__icon" />
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

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  background:
    radial-gradient(circle at 12% 12%, rgba(139, 92, 246, 0.12), transparent 22%),
    radial-gradient(circle at 86% 14%, rgba(59, 130, 246, 0.12), transparent 20%),
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.5), transparent 38%),
    linear-gradient(180deg, #d7dfef 0%, #e2e9f6 36%, #dde5f2 100%);
}

.layout::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.42), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0));
  z-index: 0;
}

.layout::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.02));
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.02));
  opacity: 0.34;
  z-index: 0;
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
  padding: 12px 0;
  transition: all 0.4s var(--transition-smooth);
}

.navbar,
.main,
.footer {
  position: relative;
  z-index: 1;
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
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0 var(--page-padding);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(10px, 2vw, 16px);
}

/* Logo — 新拟物凸起 */
.logo {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.4vw, 12px);
  text-decoration: none;
  flex-shrink: 0;
}

.logo__icon-wrap {
  width: clamp(40px, 3.4vw, 44px);
  height: clamp(40px, 3.4vw, 44px);
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
  font-size: var(--text-xl);
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
  gap: clamp(2px, 0.4vw, 4px);
  padding: clamp(4px, 0.5vw, 6px);
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
  gap: clamp(5px, 0.8vw, 8px);
  padding: clamp(8px, 0.9vw, 10px) clamp(10px, 1.6vw, 16px);
  border-radius: 12px;
  font-size: var(--text-sm);
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
  width: var(--icon-sm);
  height: var(--icon-sm);
}

.nav__label {
  position: relative;
  z-index: 1;
}

.nav__chevron {
  transition: transform 0.25s;
  opacity: 0.5;
  flex-shrink: 0;
  width: var(--icon-xs);
  height: var(--icon-xs);
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
  min-width: clamp(210px, 18vw, 260px);
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
  width: clamp(34px, 2.8vw, 38px);
  height: clamp(34px, 2.8vw, 38px);
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

.dropdown__icon-svg {
  width: var(--icon-sm);
  height: var(--icon-sm);
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
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.dropdown__desc {
  font-size: var(--text-xs);
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
  width: var(--touch-target);
  height: var(--touch-target);
  background: var(--neo-surface);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  box-shadow: var(--neo-shadow-up-sm);
  color: var(--text-secondary);
  cursor: none;
  transition: all 0.3s;
}

.mobile-toggle__icon {
  width: var(--icon-md);
  height: var(--icon-md);
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
  width: min(88vw, 320px);
  height: 100vh;
  height: 100dvh;
  background: var(--neo-bg);
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.5);
  z-index: 200;
  padding: max(76px, calc(env(safe-area-inset-top) + 56px)) 20px max(20px, env(safe-area-inset-bottom)) 20px;
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
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mobile-menu__group-icon {
  width: var(--icon-sm);
  height: var(--icon-sm);
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
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.25s;
  text-align: left;
  margin-bottom: 4px;
}

.mobile-menu__icon {
  width: var(--icon-md);
  height: var(--icon-md);
  flex-shrink: 0;
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
  flex: 1 0 auto;
  min-height: 0;
  padding-top: clamp(84px, 9vw, 92px);
}

.footer {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  padding: clamp(28px, 5vw, 40px) var(--page-padding) clamp(24px, 3.2vw, 32px);
}

.footer__content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 1.8vw, 16px);
  padding: clamp(20px, 3vw, 28px) 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.footer__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.footer__logo-dot {
  width: clamp(8px, 0.8vw, 10px);
  height: clamp(8px, 0.8vw, 10px);
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

.layout--mobile .nav {
  display: none;
}

.layout--mobile .mobile-toggle {
  display: flex;
}

.layout--mobile .logo__text {
  display: none;
}

.layout--mobile .mobile-menu {
  width: min(100vw, 360px);
  border-left: none;
}
</style>
