<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plane, PenTool, Globe, Lightbulb, ArrowRight, Zap, Shield, Sparkles, Clock,
  ChevronRight, Star, Users, TrendingUp, Wand2, Eraser
} from 'lucide-vue-next'

const router = useRouter()

const tools = [
  {
    id: 'watermark-removal',
    path: '/watermark-removal',
    icon: Eraser,
    name: '图片去水印',
    desc: '智能识别并去除各类复杂水印，一键还原清晰图片',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadowColor: 'rgba(16, 185, 129, 0.35)',
    features: ['复杂水印', 'Logo去除', '智能修复'],
  },
  {
    id: 'ai-studio',
    path: '/ai-studio',
    icon: Wand2,
    name: 'AI 创作',
    desc: 'AI图片、视频与搞笑视频生成，输入文字或上传图片即可创作',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadowColor: 'rgba(245, 158, 11, 0.35)',
    features: ['图片生成', '视频生成', '搞笑视频'],
  },
  {
    id: 'travel',
    path: '/travel',
    icon: Plane,
    name: '旅行规划',
    desc: '智能生成个性化旅行行程方案，让每一次出行都完美',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    shadowColor: 'rgba(239, 68, 68, 0.35)',
    features: ['行程规划', '预算估算', '景点推荐'],
  },
  {
    id: 'writer',
    path: '/writer',
    icon: PenTool,
    name: '写作助手',
    desc: '文章润色、续写、风格改写，让你的文字更有力量',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    shadowColor: 'rgba(249, 115, 22, 0.35)',
    features: ['智能润色', '风格转换', '内容续写'],
  },
  {
    id: 'translator',
    path: '/translator',
    icon: Globe,
    name: '翻译专家',
    desc: '多语言智能翻译与本地化，打破语言的边界',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    shadowColor: 'rgba(20, 184, 166, 0.35)',
    features: ['多语言支持', '语境理解', '专业术语'],
  },
  {
    id: 'mind',
    path: '/mind',
    icon: Lightbulb,
    name: '头脑风暴',
    desc: '创意激发与思维拓展工具，让灵感源源不断',
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    shadowColor: 'rgba(234, 179, 8, 0.35)',
    features: ['创意发散', 'SWOT分析', '思维导图'],
  },
]

const features = [
  { icon: Zap, title: '极速响应', desc: '基于智谱 GLM-4 大模型，毫秒级生成' },
  { icon: Shield, title: '安全可靠', desc: '数据加密传输，不存储隐私信息' },
  { icon: Sparkles, title: '智能精准', desc: '深度理解语境，输出超越预期' },
  { icon: Clock, title: '永久免费', desc: '所有功能完全免费，无需注册' },
]

const stats = [
  { value: '10K+', label: '活跃用户', icon: Users },
  { value: '99.9%', label: '满意度', icon: Star },
  { value: '50ms', label: '平均响应', icon: TrendingUp },
]
</script>

<template>
  <div class="home">
    <!-- Hero 区域 -->
    <section class="hero">
      <div class="hero__content">
        <!-- 徽章 -->
        <div class="hero__badge">
          <span class="badge__pulse"></span>
          <Sparkles :size="14" />
          <span>全新升级 · 免费使用</span>
        </div>

        <!-- 标题 -->
        <h1 class="hero__title">
          <span class="hero__title-line">让 AI 成为你的</span>
          <span class="hero__title-highlight">超级助手</span>
        </h1>

        <!-- 描述 -->
        <p class="hero__desc">
          集成多款智能工具，覆盖旅行、写作、翻译、创意等场景<br>
          一站式解决你的各种需求，释放无限可能
        </p>

        <!-- 统计 -->
        <div class="hero__stats">
          <div v-for="stat in stats" :key="stat.label" class="stat">
            <component :is="stat.icon" :size="20" class="stat__icon" />
            <div class="stat__info">
              <span class="stat__value">{{ stat.value }}</span>
              <span class="stat__label">{{ stat.label }}</span>
            </div>
          </div>
        </div>

        <!-- CTA按钮 -->
        <div class="hero__actions">
          <button class="btn-primary" @click="router.push('/travel')">
            <Zap :size="20" />
            <span>立即体验</span>
            <ArrowRight :size="18" class="btn-arrow" />
          </button>
          <!-- <button class="btn-secondary">
            <span>了解更多</span>
          </button> -->
        </div>
      </div>

    </section>

    <!-- 工具卡片 -->
    <section class="tools">
      <div class="section-header">
        <span class="section-tag">智能工具</span>
        <h2 class="section-title">选择你需要的 AI 能力</h2>
        <p class="section-desc">四大核心功能，满足你的各种需求</p>
      </div>

      <div class="tools__grid">
        <button
          v-for="(tool, index) in tools"
          :key="tool.id"
          class="tool-card"
          :style="{ '--index': index, '--gradient': tool.gradient, '--shadow-color': tool.shadowColor }"
          @click="router.push(tool.path)"
        >
          <!-- 背景装饰 -->
          <div class="tool-card__bg"></div>

          <!-- 内容 -->
          <div class="tool-card__content">
            <div class="tool-card__icon">
              <component :is="tool.icon" :size="28" />
            </div>

            <h3 class="tool-card__name">{{ tool.name }}</h3>
            <p class="tool-card__desc">{{ tool.desc }}</p>

            <!-- 功能标签 -->
            <div class="tool-card__tags">
              <span v-for="feat in tool.features" :key="feat" class="tag">{{ feat }}</span>
            </div>

            <!-- 箭头 -->
            <div class="tool-card__arrow">
              <ChevronRight :size="20" />
            </div>
          </div>
        </button>
      </div>
    </section>

    <!-- 特性说明 -->
    <section class="features">
      <div class="section-header">
        <span class="section-tag">为什么选择我们</span>
        <h2 class="section-title">极致体验，值得信赖</h2>
      </div>

      <div class="features__grid">
        <div v-for="(feat, index) in features" :key="feat.title" class="feature" :style="{ '--index': index }">
          <div class="feature__icon-wrap">
            <component :is="feat.icon" :size="24" class="feature__icon" />
          </div>
          <h3 class="feature__title">{{ feat.title }}</h3>
          <p class="feature__desc">{{ feat.desc }}</p>
        </div>
      </div>
    </section>

    <!-- CTA区域 -->
    <section class="cta">
      <div class="cta__content">
        <h2 class="cta__title">准备好开始了吗？</h2>
        <p class="cta__desc">立即体验AI的强大能力，让工作更高效</p>
        <button class="btn-primary btn-primary--large" @click="router.push('/travel')">
          <Sparkles :size="22" />
          <span>免费开始使用</span>
        </button>
      </div>
      <div class="cta__glow"></div>
    </section>
  </div>
</template>

<style scoped>
.home {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ═══════════════════════════════════════════════════════════
   Hero 区域
   ═══════════════════════════════════════════════════════════ */

.hero {
  padding: 80px 0 100px;
  text-align: center;
  position: relative;
}

.hero__content {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* 徽章 */
.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(245, 158, 11, 0.12));
  border: 1px solid rgba(16, 185, 129, 0.18);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 32px;
  animation: fadeInDown 0.6s ease backwards;
}

.badge__pulse {
  width: 8px;
  height: 8px;
  background: #55efc4;
  border-radius: 50%;
  animation: pulse-glow 2s infinite;
  box-shadow: 0 0 10px #55efc4;
}

.hero__badge svg {
  color: var(--accent);
}

/* 标题 */
.hero__title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.04em;
  margin-bottom: 28px;
  animation: fadeInUp 0.6s ease 0.1s backwards;
}

.hero__title-line {
  display: block;
  color: var(--text-primary);
}

.hero__title-highlight {
  display: block;
  background: linear-gradient(135deg, #34d399 0%, #10b981 35%, #f59e0b 70%, #fbbf24 100%);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 6s ease infinite;
}

/* 描述 */
.hero__desc {
  font-size: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 40px;
  animation: fadeInUp 0.6s ease 0.2s backwards;
}

/* 统计 */
.hero__stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  margin-bottom: 48px;
  animation: fadeInUp 0.6s ease 0.3s backwards;
}

.stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat__icon {
  color: var(--primary);
  opacity: 0.8;
}

.stat__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat__label {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* CTA按钮 */
.hero__actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  animation: fadeInUp 0.6s ease 0.4s backwards;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.4);
}

.btn-primary:hover::before {
  opacity: 1;
}

.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}

.btn-arrow {
  transition: transform 0.3s;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════════════════════
   通用区块样式
   ═══════════════════════════════════════════════════════════ */

.section-header {
  text-align: center;
  margin-bottom: 56px;
}

.section-tag {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 50px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 20px;
  letter-spacing: 0.05em;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.section-desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════════════════════════
   工具卡片
   ═══════════════════════════════════════════════════════════ */

.tools {
  padding: 60px 0 100px;
}

.tools__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

.tool-card {
  position: relative;
  padding: 36px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.4s ease, border-color 0.3s;
  animation: fadeInUp 0.6s ease calc(var(--index) * 0.1s + 0.2s) backwards;
}

.tool-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 25px 60px -20px var(--shadow-color);
}

/* 背景装饰 */
.tool-card__bg {
  position: absolute;
  top: -50%;
  right: -30%;
  width: 300px;
  height: 300px;
  background: var(--gradient);
  opacity: 0;
  transition: opacity 0.5s;
  z-index: 0;
  border-radius: 50%;
}

.tool-card:hover .tool-card__bg {
  opacity: 0.15;
}

.tool-card__content {
  position: relative;
  z-index: 1;
}

/* 图标 */
.tool-card__icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient);
  border-radius: 18px;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px -8px var(--shadow-color);
  transition: transform 0.4s, box-shadow 0.4s;
}

.tool-card:hover .tool-card__icon {
  transform: scale(1.05) rotate(-3deg);
  box-shadow: 0 15px 40px -8px var(--shadow-color);
}

.tool-card__name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.tool-card__desc {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

/* 功能标签 */
.tool-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.tag {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

/* 箭头 */
.tool-card__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: var(--text-secondary);
  transition: all 0.4s;
}

.tool-card:hover .tool-card__arrow {
  background: var(--gradient);
  color: white;
  transform: translateX(4px);
}

/* ═══════════════════════════════════════════════════════════
   特性区域
   ═══════════════════════════════════════════════════════════ */

.features {
  padding: 80px 0;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature {
  padding: 36px 28px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.6s ease calc(var(--index) * 0.1s + 0.2s) backwards;
}

.feature:hover {
  transform: translateY(-8px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 25px 60px -20px rgba(0, 0, 0, 0.4);
}

.feature__icon-wrap {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(245, 158, 11, 0.12));
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 16px;
  margin: 0 auto 20px;
  transition: all 0.4s;
}

.feature:hover .feature__icon-wrap {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-color: transparent;
  transform: scale(1.1) rotate(-5deg);
}

.feature__icon {
  color: var(--primary);
  transition: color 0.3s;
}

.feature:hover .feature__icon {
  color: white;
}

.feature__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.feature__desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ═══════════════════════════════════════════════════════════
   CTA 区域
   ═══════════════════════════════════════════════════════════ */

.cta {
  padding: 100px 0;
  position: relative;
  text-align: center;
}

.cta__content {
  position: relative;
  z-index: 1;
}

.cta__title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.cta__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.btn-primary--large {
  padding: 20px 40px;
  font-size: 1.125rem;
  border-radius: 20px;
}

.cta__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 600px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ═══════════════════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 1000px) {
  .tools__grid {
    grid-template-columns: 1fr;
  }

  .features__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .home {
    padding: 0 20px;
  }

  .hero {
    padding: 40px 0 60px;
  }

  .hero__title {
    font-size: 2.5rem;
  }

  .hero__desc {
    font-size: 1rem;
  }

  .hero__stats {
    flex-direction: column;
    gap: 20px;
  }

  .hero__actions {
    flex-direction: column;
  }

  .btn-primary, .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .section-title {
    font-size: 1.75rem;
  }

  .features__grid {
    grid-template-columns: 1fr;
  }

  .tool-card {
    padding: 28px;
  }

  .cta__title {
    font-size: 1.75rem;
  }
}
</style>
