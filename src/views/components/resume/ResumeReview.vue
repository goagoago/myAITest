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
    <p v-if="aiReviewError" class="review__error">{{ aiReviewError }}</p>
    <div v-else class="review__body">
      <div class="review__summary">
        <span class="review__badge">评分 {{ aiReviewResult.score }}</span>
        <span class="review__text">{{ aiReviewResult.summary }}</span>
      </div>
      <ul v-if="aiReviewResult.suggestions?.length" class="review__list">
        <li v-for="(item, idx) in aiReviewResult.suggestions" :key="idx" class="review__item">
          <span class="review__item-text">{{ item.text }}</span>
          <span class="review__stars" :aria-label="`重要程度 ${item.importance} 星`">
            <span v-for="n in 5" :key="n" class="review__star" :class="{ 'review__star--on': n <= item.importance }">★</span>
          </span>
        </li>
      </ul>
      <p v-else class="review__hint">整体质量不错，建议保持当前结构与量化成果表达。</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

.review {
  margin: 0 0 16px;
  padding: 14px 16px;
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
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.review__badge {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(19, 195, 139, 0.14);
  border: 1px solid rgba(19, 195, 139, 0.3);
  color: #57ddb3;
  font-size: 0.75rem;
}

.review__text {
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.review__list {
  margin: 6px 0 0 18px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.7;
}

.review__item {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.review__item-text {
  flex: 1;
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
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.review__error {
  margin: 0;
  color: #f87171;
  font-size: 0.82rem;
}
</style>
