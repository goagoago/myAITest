<script setup>
import { Download, RefreshCw, Upload, Copy, Check, LoaderCircle, Zap } from 'lucide-vue-next'

defineProps({
  importLoading: {
    type: Boolean,
    default: false,
  },
  copied: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'fillDemo',
  'reset',
  'import',
  'exportMarkdown',
  'copyMarkdown',
  'exportPdf',
])
</script>

<template>
  <section class="toolbar">
    <div class="toolbar__left">
      <button class="btn btn--accent" @click="emit('fillDemo')">
        <Zap :size="16" />
        <span>填充示例</span>
      </button>
      <button class="btn btn--ghost" @click="emit('reset')">
        <RefreshCw :size="16" />
        <span>清空重置</span>
      </button>
    </div>
    <div class="toolbar__right">
      <label class="btn btn--ghost btn--file" :class="{ 'btn--loading': importLoading }">
        <input type="file" accept=".pdf,.doc,.docx" @change="emit('import', $event)" :disabled="importLoading" />
        <component :is="importLoading ? LoaderCircle : Upload" :size="16" :class="{ spinning: importLoading }" />
        <span>{{ importLoading ? '导入中...' : '导入 PDF/WORD' }}</span>
      </label>
      <button class="btn btn--ghost" @click="emit('exportMarkdown')">导出 MD</button>
      <button class="btn btn--ghost" @click="emit('copyMarkdown')">
        <component :is="copied ? Check : Copy" :size="14" />
        <span>{{ copied ? '已复制' : '复制 MD' }}</span>
      </button>
      <button class="btn btn--primary" @click="emit('exportPdf')">
        <Download :size="16" />
        <span>导出 PDF</span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.toolbar__left,
.toolbar__right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .toolbar {
    flex-direction: column;
  }
}
</style>
