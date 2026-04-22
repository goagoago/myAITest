<script setup>
import FeatureCostBadge from '../../../components/account/FeatureCostBadge.vue'
import { ScrollText, Sparkles, LoaderCircle } from 'lucide-vue-next'

defineProps({
  aiReviewLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['review'])
</script>

<template>
  <header class="hero">
    <div class="hero__left">
      <div class="hero__badge">
        <ScrollText :size="14" />
        <span>AI 简历工坊</span>
      </div>
      <h1 class="hero__title">写出更能拿到面试的简历</h1>
      <p class="hero__desc">Markdown 直接编辑、模块拖拽排序、PDF/WORD 导入、实时预览。</p>
    </div>
    <div class="hero__score">
      <button class="btn btn--ghost btn--small hero__review-btn" @click="emit('review')" :disabled="aiReviewLoading">
        <component :is="aiReviewLoading ? LoaderCircle : Sparkles" :size="14" :class="{ spinning: aiReviewLoading }" />
        <span>{{ aiReviewLoading ? '评审中...' : 'AI 评审' }}</span>
        <FeatureCostBadge v-if="!aiReviewLoading" feature-code="resume-builder" strong />
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(22, 184, 133, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #0f8f68;
  font-size: 0.8125rem;
  margin-bottom: 10px;
  box-shadow: 0 10px 22px rgba(101, 118, 151, 0.1);
}

.hero__title {
  font-size: 2.3rem;
  line-height: 1.15;
  color: var(--text-primary);
  margin: 0;
}

.hero__desc {
  margin: 10px 0 0;
  color: var(--text-secondary);
}

.hero__score {
  padding: 16px 22px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(252, 254, 255, 0.92), rgba(236, 242, 249, 0.9));
  border: 1px solid rgba(101, 118, 151, 0.16);
  min-width: 150px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  box-shadow: 0 18px 36px rgba(101, 118, 151, 0.12);
}

.hero__review-btn {
  margin-top: 6px;
}

@media (max-width: 760px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero__title {
    font-size: 1.8rem;
  }
}
</style>
