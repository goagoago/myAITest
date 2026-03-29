<script setup>
defineProps({
  aiReviewError: {
    type: String,
    default: '',
  },
  aiReviewResult: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <section v-if="aiReviewError || aiReviewResult" class="review card">
    <div class="review__title">AI 评审结果</div>
    <p v-if="aiReviewError" class="review__notice">{{ aiReviewError }}</p>
    <div v-if="aiReviewResult" class="review__body">
      <div class="review__summary">
        <span class="review__badge">评分 {{ aiReviewResult.score }}</span>
        <span class="review__text">{{ aiReviewResult.summary }}</span>
      </div>
      <div v-if="aiReviewResult.dimensions?.length" class="review__dimensions">
        <article v-for="item in aiReviewResult.dimensions" :key="item.name" class="review__dimension">
          <div class="review__dimension-top">
            <span class="review__dimension-name">{{ item.name }}</span>
            <span class="review__dimension-score">{{ item.score }}</span>
          </div>
          <div class="review__progress">
            <span class="review__progress-fill" :style="{ width: `${item.score}%` }"></span>
          </div>
          <p class="review__dimension-comment">{{ item.comment }}</p>
        </article>
      </div>
      <div v-if="aiReviewResult.highlights?.length" class="review__block">
        <div class="review__subtitle">简历亮点</div>
        <ul class="review__highlights">
          <li v-for="(item, idx) in aiReviewResult.highlights" :key="idx">{{ item }}</li>
        </ul>
      </div>
      <div v-if="aiReviewResult.suggestions?.length" class="review__block">
        <div class="review__subtitle">优先优化建议</div>
        <ul class="review__list">
        <li v-for="(item, idx) in aiReviewResult.suggestions" :key="idx" class="review__item">
          <div class="review__item-main">
            <div class="review__item-head">
              <span class="review__tag">{{ item.category || '优化建议' }}</span>
              <span class="review__stars" :aria-label="`重要程度 ${item.importance} 星`">
                <span v-for="n in 5" :key="n" class="review__star" :class="{ 'review__star--on': n <= item.importance }">★</span>
              </span>
            </div>
            <span class="review__item-text">{{ item.text }}</span>
            <span v-if="item.example" class="review__example">参考写法：{{ item.example }}</span>
          </div>
        </li>
      </ul>
      </div>
      <p v-else class="review__hint">整体质量不错，建议继续围绕目标岗位 JD 做关键词精修。</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.card {
  background: linear-gradient(180deg, rgba(252, 254, 255, 0.95), rgba(236, 242, 249, 0.92));
  border: 1px solid rgba(101, 118, 151, 0.16);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 34px rgba(101, 118, 151, 0.12);
}

.review {
  margin: 0 0 16px;
  padding: 14px 16px;
}

.review__body {
  display: grid;
  gap: 14px;
}

.review__title {
  font-size: 0.82rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.review__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.review__badge {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(22, 184, 133, 0.12);
  border: 1px solid rgba(22, 184, 133, 0.22);
  color: #0f8f68;
  font-size: 0.75rem;
}

.review__text {
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.review__dimensions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.review__dimension {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(101, 118, 151, 0.14);
}

.review__dimension-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.review__dimension-name,
.review__dimension-score,
.review__subtitle,
.review__tag {
  font-size: 0.76rem;
  letter-spacing: 0.04em;
}

.review__dimension-name,
.review__subtitle {
  color: var(--text-muted);
}

.review__dimension-score {
  color: #9fe7c9;
}

.review__progress {
  position: relative;
  overflow: hidden;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.review__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #16c58e, #f6c453);
}

.review__dimension-comment {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.6;
}

.review__block {
  display: grid;
  gap: 8px;
}

.review__highlights {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.7;
}

.review__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.review__item {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(101, 118, 151, 0.14);
}

.review__item-main {
  display: grid;
  gap: 6px;
}

.review__item-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.review__tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(19, 195, 139, 0.1);
  border: 1px solid rgba(19, 195, 139, 0.2);
  color: #8fe7c6;
}

.review__item-text {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.84rem;
  line-height: 1.7;
}

.review__example {
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.6;
}

.review__stars {
  display: inline-flex;
  gap: 2px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.2);
}

.review__star--on {
  color: #f6c453;
  text-shadow: 0 0 6px rgba(246, 196, 83, 0.35);
}

.review__hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.review__notice {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #f6c453;
  font-size: 0.82rem;
}

@media (max-width: 760px) {
  .review__dimensions {
    grid-template-columns: 1fr;
  }
}
</style>
