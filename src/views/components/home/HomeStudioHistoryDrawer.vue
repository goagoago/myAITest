<script setup>
import { Trash2, X } from 'lucide-vue-next'

defineProps({
  open: Boolean,
  hasHistory: Boolean,
  historyTurnsCount: {
    type: Number,
    default: 0,
  },
  historyGroups: {
    type: Array,
    default: () => [],
  },
  selectedHistoryTurnId: {
    type: String,
    default: '',
  },
  formatHistoryTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['close', 'reset', 'select', 'delete'])
</script>

<template>
  <Teleport to="body">
    <Transition name="history-overlay">
      <div
        v-if="open"
        class="studio__history-overlay"
        @click.self="emit('close')"
      >
        <aside class="studio__history-drawer" aria-label="近 7 天历史记录">
          <div class="studio__history-head">
            <div>
              <p class="studio__history-title">近 7 天</p>
              <p class="studio__history-note">
                {{ hasHistory ? `${historyTurnsCount} 条记录` : '暂无记录' }}
              </p>
            </div>

            <div class="studio__history-actions">
              <button
                v-if="hasHistory"
                class="studio__history-clear"
                type="button"
                @click="emit('reset')"
              >
                清空
              </button>
              <button
                class="studio__history-close"
                type="button"
                @click="emit('close')"
              >
                <X :size="16" />
              </button>
            </div>
          </div>

          <div v-if="hasHistory" class="studio__history-list">
            <section
              v-for="group in historyGroups"
              :key="group.label"
              class="studio__history-group"
            >
              <p class="studio__history-label">{{ group.label }}</p>

              <div class="studio__history-items">
                <article
                  v-for="item in group.items"
                  :key="item.turnId"
                  class="studio__history-item"
                  :class="{ 'studio__history-item--active': selectedHistoryTurnId === item.turnId }"
                >
                  <button
                    class="studio__history-link"
                    type="button"
                    @click="emit('select', item)"
                  >
                    <span class="studio__history-dot"></span>
                    <span class="studio__history-copy">
                      <span class="studio__history-summary">{{ item.summary }}</span>
                      <span class="studio__history-preview">{{ item.preview }}</span>
                      <span class="studio__history-meta">
                        {{ formatHistoryTime(item.createdAt) }} · {{ item.mode === 'image' ? '生图' : '对话' }}
                      </span>
                    </span>
                  </button>

                  <button
                    class="studio__history-delete"
                    type="button"
                    @click.stop="emit('delete', item.turnId)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </article>
              </div>
            </section>
          </div>

          <div v-else class="studio__history-empty">
            近 7 天还没有记录
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
