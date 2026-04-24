<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResponsive } from '../composables/useResponsive'
import {
  Home, Zap, Eraser, FileText,
  ImageDown, MonitorPlay, ChevronDown, Image, Wrench, Menu, X, Camera, QrCode, ScanLine, Scissors, CreditCard, Video, ScrollText,
  UserRound, LogIn, LogOut, FileSpreadsheet
} from 'lucide-vue-next'
import ToolsBoxMark from '../components/brand/ToolsBoxMark.vue'
import PageLoader from '../components/PageLoader.vue'
import { AUTH_REQUIRED_EVENT } from '../services/apiClient'
import { useAccountStore } from '../stores/accountStore'
import CreditBadge from '../components/account/CreditBadge.vue'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const mobileMenuOpen = ref(false)
const openDropdown = ref(null)
const isLoading = ref(false)
const { isMobile } = useResponsive()
const account = useAccountStore()
const isLoggedIn = computed(() => account.isLoggedIn.value)
const accountName = computed(() => account.displayName.value)
const accountEmail = computed(() => account.profile.value?.username || '')
const accountBalance = computed(() => account.pointsBalance.value)
const flatToolRoutes = new Set(['/qr-scan', '/media/gif', '/data-convert'])
const isFlatToolRoute = computed(() => flatToolRoutes.has(route.path))

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
      { path: '/media/gif', label: 'GIF 工具', icon: Video, desc: '视频转GIF/动图压缩' },
    ],
  },
  {
    id: 'utility',
    label: '实用工具',
    icon: Wrench,
    children: [
      { path: '/doc-convert', label: '文档转换', icon: FileText, desc: '7种格式互转' },
      { path: '/data-convert', label: '数据转换', icon: FileSpreadsheet, desc: 'Excel/CSV/JSON互转' },
      { path: '/qr-code', label: 'QR码生成', icon: QrCode, desc: '二维码生成美化' },
      { path: '/qr-scan', label: '二维码解析', icon: ScanLine, desc: '上传图片直接扫码' },
      { path: '/ocr', label: 'OCR识别', icon: ScanLine, desc: '图片文字识别' },
      { path: '/id-generator', label: '身份证号', icon: CreditCard, desc: '随机号码生成' },
      { path: '/resume-builder', label: '简历工坊', icon: ScrollText, desc: 'Markdown编辑与PDF导出' },
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

const goToAuth = () => {
  router.push({
    name: 'AuthCenter',
    query: { redirect: route.fullPath },
  })
  openDropdown.value = null
  mobileMenuOpen.value = false
}

const goToAccount = () => {
  navigateTo('/account')
}

const handleLogout = () => {
  account.logout()
  openDropdown.value = null
  mobileMenuOpen.value = false
  if (route.path === '/account') {
    router.replace({ name: 'AuthCenter' })
  }
}

const handleAuthRequired = (event) => {
  if (route.name === 'AuthCenter') return
  const redirect = event.detail?.redirect || route.fullPath
  const featureCode = event.detail?.featureCode
  router.push({
    name: 'AuthCenter',
    query: {
      redirect,
      ...(featureCode ? { feature: featureCode } : {}),
    },
  })
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
  window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
  clearTimeout(dropdownTimer)
})
</script>

<template>
  <div
    class="layout"
    :class="{
      'layout--mobile': isMobile,
      'layout--desktop': !isMobile,
      'layout--flat-tools': isFlatToolRoute,
    }"
  >
    <!-- 全局加载动画 -->
    <PageLoader v-if="isLoading" />

    <!-- 顶部导航 — 新拟物凸起 -->
    <header class="navbar" :class="{ 'navbar--scrolled': scrolled }">
      <div class="navbar__inner">
        <!-- Logo -->
        <router-link to="/" class="logo">
          <div class="logo__icon-wrap">
            <ToolsBoxMark />
          </div>
          <span class="logo__text">
            <span>Tools</span>
            <span class="logo__text-accent">Box</span>
          </span>
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
              <div
                v-if="openDropdown === group.id"
                :class="['dropdown', { 'dropdown--wide': group.children.length > 3 }]"
              >
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

        <div class="navbar__actions">
          <div
            v-if="isLoggedIn"
            class="nav__dropdown nav__dropdown--account"
            @mouseenter="showDropdown('account')"
            @mouseleave="hideDropdown()"
          >
            <button
              class="account-trigger"
              :class="{ 'account-trigger--active': route.path === '/account' || openDropdown === 'account' }"
              @click="goToAccount"
            >
              <span class="account-trigger__name">{{ accountName }}</span>
              <div class="account-trigger__avatar">{{ accountName.slice(0, 1) }}</div>
              <ChevronDown class="nav__chevron" :class="{ 'nav__chevron--open': openDropdown === 'account' }" />
            </button>

            <Transition name="dropdown">
              <div v-if="openDropdown === 'account'" class="dropdown dropdown--account">
                <div class="account-menu__head">
                  <div class="account-menu__identity">
                    <div class="account-menu__avatar">{{ accountName.slice(0, 1) }}</div>
                    <div>
                      <span>{{ accountName }}</span>
                      <small>{{ accountEmail || '已登录' }}</small>
                    </div>
                  </div>
                  <CreditBadge :value="accountBalance" small strong />
                </div>
                <button class="dropdown__item" @click="goToAccount">
                  <div class="dropdown__icon">
                    <UserRound class="dropdown__icon-svg" />
                  </div>
                  <div class="dropdown__text">
                    <span class="dropdown__name">个人中心</span>
                    <span class="dropdown__desc">资料、安全、兑换</span>
                  </div>
                </button>
                <button class="dropdown__item" @click="handleLogout">
                  <div class="dropdown__icon">
                    <LogOut class="dropdown__icon-svg" />
                  </div>
                  <div class="dropdown__text">
                    <span class="dropdown__name">退出登录</span>
                    <span class="dropdown__desc">退出当前账号</span>
                  </div>
                </button>
              </div>
            </Transition>
          </div>

          <button v-else class="auth-cta" @click="goToAuth">
            <LogIn :size="16" />
            <span>登录</span>
          </button>
        </div>

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
        <div class="mobile-menu__account">
          <template v-if="isLoggedIn">
            <div class="mobile-menu__account-card">
              <div class="mobile-menu__avatar">{{ accountName.slice(0, 1) }}</div>
              <div>
                <strong>{{ accountName }}</strong>
                <CreditBadge :value="accountBalance" small />
              </div>
            </div>
            <button class="mobile-menu__link" @click="goToAccount">
              <UserRound class="mobile-menu__icon" />
              <span>个人中心</span>
            </button>
            <button class="mobile-menu__link" @click="handleLogout">
              <LogOut class="mobile-menu__icon" />
              <span>退出登录</span>
            </button>
          </template>
          <template v-else>
            <div class="mobile-menu__auth-card">
              <p>登录后可保存账号数据并进入个人中心。</p>
              <button class="mobile-menu__auth" @click="goToAuth">
                <LogIn :size="16" />
                <span>登录 / 注册</span>
              </button>
            </div>
          </template>
        </div>

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
          <div class="page-frame">
            <component :is="Component" />
          </div>
        </transition>
      </router-view>
    </main>


  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  background: transparent;
}

.layout--flat-tools {
  background: #f6f7f9;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 10px 0;
  background: rgba(249, 250, 251, 0.94);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  transition: padding 0.24s ease, background-color 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
}

.navbar,
.main,
.footer {
  position: relative;
}

.navbar {
  z-index: 1000;
}

.main,
.footer {
  z-index: 2;
}

.main {
  flex: 1;
  width: 100%;
  padding-top: clamp(78px, 8vw, 98px);
}

.layout--flat-tools .main {
  padding-top: 18px;
}

.page-frame {
  width: 100%;
  min-height: calc(100vh - clamp(78px, 8vw, 98px));
}

.layout--flat-tools .page-frame {
  min-height: calc(100vh - 18px);
}

.layout--flat-tools .navbar {
  background: rgba(249, 250, 251, 0.98);
}

.navbar--scrolled {
  padding: 8px 0;
  background: rgba(249, 250, 251, 0.98);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
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

.navbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

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
  padding: 4px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.16);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.logo:hover .logo__icon-wrap {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  border-color: rgba(100, 116, 139, 0.22);
}

.logo__text {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.logo__text-accent {
  color: #2563eb;
}

.nav {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.nav__link {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.8vw, 8px);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 700;
  color: #5b677a;
  transition: all 0.25s var(--transition-smooth);
  text-decoration: none;
  position: relative;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.nav__link:hover {
  color: #111827;
  background: rgba(241, 245, 249, 0.96);
  border-color: rgba(148, 163, 184, 0.18);
}

.nav__link--active {
  color: #111827;
  background: rgba(226, 232, 240, 0.95);
  border-color: rgba(148, 163, 184, 0.26);
}

.nav__link--active .nav__icon {
  color: #111827;
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
  z-index: 1100;
}

.auth-cta,
.account-trigger {
  min-height: 46px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  color: #111827;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.auth-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-weight: 800;
  cursor: pointer;
  background: #111827;
  color: #fff;
}

.account-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 0 14px;
  cursor: pointer;
}

.account-trigger--active {
  border-color: rgba(100, 116, 139, 0.28);
  background: rgba(248, 250, 252, 0.98);
}

.account-trigger__name {
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.92rem;
  font-weight: 800;
}

.account-trigger__avatar {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 800;
}

.dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  min-width: clamp(210px, 18vw, 260px);
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
  z-index: 1200;
}

.dropdown--wide {
  min-width: min(520px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.dropdown--account {
  left: auto;
  right: 0;
  transform: none;
  min-width: 280px;
}

.dropdown--account.dropdown-enter-from,
.dropdown--account.dropdown-leave-to {
  transform: translateY(-10px) scale(0.95);
}

.account-menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px 14px;
  color: #64748b;
  font-size: 0.86rem;
}

.account-menu__identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-menu__avatar {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: #111827;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 800;
}

.account-menu__identity span {
  display: block;
  color: #132039;
  font-weight: 800;
}

.account-menu__identity small {
  color: #64748b;
  font-size: 0.78rem;
}

.dropdown::before {
  content: none;
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
  cursor: pointer;
  transition: all 0.25s;
  text-align: left;
}

.dropdown--wide .dropdown__item {
  align-items: flex-start;
  min-height: 76px;
  margin-bottom: 0;
}

.dropdown__item:hover {
  background: rgba(241, 245, 249, 0.96);
}

.dropdown__item--active {
  background: rgba(226, 232, 240, 0.92);
}

.dropdown__icon {
  width: clamp(34px, 2.8vw, 38px);
  height: clamp(34px, 2.8vw, 38px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.96);
  border-radius: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.25s;
  box-shadow: none;
}

.dropdown__icon-svg {
  width: var(--icon-sm);
  height: var(--icon-sm);
}

.dropdown__item:hover .dropdown__icon {
  background: rgba(219, 234, 254, 0.96);
  color: #2563eb;
}

.dropdown__item--active .dropdown__icon {
  background: rgba(219, 234, 254, 0.96);
  color: #2563eb;
}

.dropdown__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dropdown__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.dropdown__desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
}

/* 下拉菜单动画 */
.dropdown-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dropdown-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
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
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.mobile-toggle__icon {
  width: var(--icon-md);
  height: var(--icon-md);
}

.mobile-toggle:hover {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  color: var(--text-primary);
}

.mobile-toggle:active {
  transform: scale(0.95);
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  z-index: 150;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: min(88vw, 320px);
  height: 100vh;
  height: 100dvh;
  background: rgba(255, 255, 255, 0.98);
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: -12px 0 28px rgba(15, 23, 42, 0.08);
  z-index: 200;
  padding: max(76px, calc(env(safe-area-inset-top) + 56px)) 20px max(20px, env(safe-area-inset-bottom)) 20px;
  overflow-y: auto;
}

.mobile-menu__account {
  margin-bottom: 16px;
}

.mobile-menu__account-card,
.mobile-menu__auth-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.16);
  margin-bottom: 10px;
}

.mobile-menu__account-card strong,
.mobile-menu__auth-card p {
  color: #1a2742;
}

.mobile-menu__account-card > div {
  display: grid;
  gap: 6px;
}

.mobile-menu__avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #fff;
  font-weight: 800;
}

.mobile-menu__auth-card {
  grid-template-columns: 1fr;
}

.mobile-menu__auth-card p {
  color: #52637f;
  line-height: 1.6;
}

.mobile-menu__auth {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: none;
  border-radius: 14px;
  background: #111827;
  color: #fff;
  font-weight: 700;
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
  cursor: pointer;
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
  background: rgba(241, 245, 249, 0.96);
  color: var(--text-primary);
}

.mobile-menu__link--active {
  background: rgba(226, 232, 240, 0.92);
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
  transition: transform 0.22s ease;
}
.slide-leave-active {
  transition: transform 0.18s ease;
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
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.footer__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.footer__logo-dot {
  width: clamp(8px, 0.8vw, 10px);
  height: clamp(8px, 0.8vw, 10px);
  background: #2563eb;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06);
}

.page3d-enter-active {
  animation: page3DIn 0.28s var(--transition-smooth);
}

.page3d-leave-active {
  animation: page3DOut 0.18s ease;
}

.layout--mobile .nav {
  display: none;
}

.layout--mobile .navbar__actions {
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

@media (max-width: 980px) {
  .dropdown--wide {
    min-width: min(420px, calc(100vw - 40px));
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .layout--flat-tools .main {
    padding-top: 12px;
  }

  .layout--flat-tools .page-frame {
    min-height: calc(100vh - 12px);
  }
}
</style>
