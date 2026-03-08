<script setup>
import { useIdGenerator } from '../composables/useIdGenerator'
import {
  CreditCard, MapPin, User, Calendar, Hash, Copy, Check, RefreshCw, Sparkles, ChevronDown, Download
} from 'lucide-vue-next'

const {
  options,
  results,
  copied,
  provinces,
  cities,
  districts,
  generate,
  copySingle,
  copyAll,
  exportXlsx,
  reset,
} = useIdGenerator()

const yearModes = [
  { value: 'range', label: '年份范围' },
  { value: 'exact', label: '指定年份' },
]

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
const days = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}日` }))

const genderOptions = [
  { value: 'random', label: '随机' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]

const countPresets = [1, 5, 10, 20, 50, 100]
</script>

<template>
  <div class="id-generator">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <CreditCard :size="14" />
          <span>身份证号生成器</span>
        </div>
        <h1 class="header__title">
          <span>随机身份证号生成，</span>
          <span class="gradient-text">灵活定制</span>
        </h1>
        <p class="header__desc">
          支持选择省市区、性别、出生日期，批量生成符合规则的随机身份证号码（仅供测试开发使用）
        </p>
      </div>
    </header>

    <!-- 主内容 -->
    <div class="main-area">
      <!-- 左侧：配置 -->
      <div class="panel panel--input">
        <!-- 地区选择 -->
        <div class="input-section">
          <h3 class="section-label">
            <MapPin :size="16" />
            <span>地区选择</span>
            <span class="section-hint">不选则随机</span>
          </h3>
          <div class="select-row">
            <div class="select-wrap">
              <select v-model="options.provinceCode" class="neo-select">
                <option value="">随机省份</option>
                <option v-for="p in provinces" :key="p.code" :value="p.code">{{ p.name }}</option>
              </select>
              <ChevronDown :size="14" class="select-arrow" />
            </div>
            <div class="select-wrap">
              <select v-model="options.cityCode" class="neo-select" :disabled="!options.provinceCode">
                <option value="">随机城市</option>
                <option v-for="c in cities" :key="c.code" :value="c.code">{{ c.name }}</option>
              </select>
              <ChevronDown :size="14" class="select-arrow" />
            </div>
            <div class="select-wrap">
              <select v-model="options.districtCode" class="neo-select" :disabled="!options.cityCode">
                <option value="">随机区县</option>
                <option v-for="d in districts" :key="d.code" :value="d.code">{{ d.name }}</option>
              </select>
              <ChevronDown :size="14" class="select-arrow" />
            </div>
          </div>
        </div>

        <!-- 性别 -->
        <div class="input-section">
          <h3 class="section-label">
            <User :size="16" />
            <span>性别</span>
          </h3>
          <div class="gender-grid">
            <button
              v-for="g in genderOptions"
              :key="g.value"
              :class="['option-btn', { 'option-btn--active': options.gender === g.value }]"
              @click="options.gender = g.value"
            >{{ g.label }}</button>
          </div>
        </div>

        <!-- 出生日期 -->
        <div class="input-section">
          <h3 class="section-label">
            <Calendar :size="16" />
            <span>出生日期</span>
          </h3>
          <div class="date-config">
            <!-- 年份模式切换 -->
            <div class="year-mode-toggle">
              <button
                v-for="m in yearModes"
                :key="m.value"
                :class="['option-btn', { 'option-btn--active': options.yearMode === m.value }]"
                @click="options.yearMode = m.value"
              >{{ m.label }}</button>
            </div>

            <!-- 年份范围 -->
            <div v-if="options.yearMode === 'range'" class="year-range">
              <div class="year-inputs">
                <input
                  type="number"
                  v-model.number="options.startYear"
                  class="neo-input neo-input--sm"
                  min="1900"
                  max="2025"
                  placeholder="起始年"
                />
                <span class="range-sep">—</span>
                <input
                  type="number"
                  v-model.number="options.endYear"
                  class="neo-input neo-input--sm"
                  min="1900"
                  max="2025"
                  placeholder="结束年"
                />
              </div>
            </div>

            <!-- 指定年份 -->
            <div v-else class="exact-year">
              <input
                type="number"
                v-model.number="options.exactYear"
                class="neo-input neo-input--sm"
                min="1900"
                max="2025"
                placeholder="指定年份"
              />
            </div>

            <div class="month-day-row">
              <div class="select-wrap select-wrap--half">
                <select v-model.number="options.specificMonth" class="neo-select">
                  <option :value="0">随机月份</option>
                  <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
                <ChevronDown :size="14" class="select-arrow" />
              </div>
              <div class="select-wrap select-wrap--half">
                <select v-model.number="options.specificDay" class="neo-select">
                  <option :value="0">随机日期</option>
                  <option v-for="d in days" :key="d.value" :value="d.value">{{ d.label }}</option>
                </select>
                <ChevronDown :size="14" class="select-arrow" />
              </div>
            </div>
          </div>
        </div>

        <!-- 生成数量 -->
        <div class="input-section">
          <h3 class="section-label">
            <Hash :size="16" />
            <span>生成数量</span>
          </h3>
          <div class="count-presets">
            <button
              v-for="c in countPresets"
              :key="c"
              :class="['preset-chip', { 'preset-chip--active': options.count === c }]"
              @click="options.count = c"
            >{{ c }}</button>
          </div>
          <div class="slider-row">
            <input
              type="range"
              class="slider"
              v-model.number="options.count"
              min="1"
              max="200"
              step="1"
            />
            <span class="slider-value">{{ options.count }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row">
          <button class="generate-btn" @click="generate">
            <Sparkles :size="20" />
            <span>生成</span>
          </button>
          <button class="reset-btn" @click="reset">
            <RefreshCw :size="18" />
          </button>
        </div>
      </div>

      <!-- 右侧：结果 -->
      <div class="panel panel--result">
        <div v-if="results.length" class="result-content">
          <div class="result-header">
            <span class="result-count">共 {{ results.length }} 条</span>
            <div class="result-actions">
              <button class="copy-all-btn" @click="copyAll">
                <component :is="copied === 'all' ? Check : Copy" :size="14" />
                <span>{{ copied === 'all' ? '已复制' : '复制全部' }}</span>
              </button>
              <button class="export-btn" @click="exportXlsx">
                <Download :size="14" />
                <span>导出 Excel</span>
              </button>
            </div>
          </div>

          <div class="result-list">
            <div
              v-for="(item, idx) in results"
              :key="idx"
              class="result-item"
            >
              <div class="result-item__main">
                <span class="result-item__index">{{ idx + 1 }}</span>
                <span class="result-item__id">{{ item.id }}</span>
                <button class="result-item__copy" @click="copySingle(item.id)">
                  <component :is="copied === item.id ? Check : Copy" :size="13" />
                </button>
              </div>
              <div class="result-item__meta">
                <span>{{ item.areaName }}</span>
                <span>{{ item.birthday }}</span>
                <span>{{ item.gender }}</span>
                <span>{{ item.age }}岁</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 占位 -->
        <div v-else class="result-placeholder">
          <div class="placeholder-icon">
            <CreditCard :size="48" />
          </div>
          <p>生成结果预览</p>
          <span class="placeholder-tip">在左侧配置参数后点击"生成"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.id-generator {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* 头部 */
.header {
  padding: 60px 0 40px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #60a5fa;
  margin-bottom: 24px;
}

.header__badge svg { color: #60a5fa; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #10b981 50%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

/* 主区域 */
.main-area {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 32px;
}

.panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 28px;
}

.panel--result {
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

/* 区块标题 */
.input-section {
  margin-bottom: 24px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.section-label svg { color: var(--text-muted); }

.section-hint {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: auto;
}

/* 下拉选择 */
.select-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.select-wrap {
  position: relative;
  width: 100%;
}

.select-wrap--half {
  flex: 1;
}

.neo-select {
  width: 100%;
  padding: 12px 36px 12px 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 0.875rem;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.3s;
  font-family: inherit;
}

.neo-select:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.neo-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.neo-select option {
  background: #1e1e33;
  color: var(--text-primary);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

/* 性别按钮 */
.gender-grid {
  display: flex;
  gap: 8px;
}

.option-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.option-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.option-btn--active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.35);
  color: #60a5fa;
}

/* 日期配置 */
.date-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.year-mode-toggle {
  display: flex;
  gap: 8px;
}

.exact-year {
  width: 100%;
}

.field-label {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.year-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.neo-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 0.875rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.3s;
  font-family: inherit;
}

.neo-input--sm {
  padding: 10px 12px;
}

.neo-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.neo-input::placeholder { color: var(--text-muted); }

/* 隐藏 number 输入框的增减箭头 */
.neo-input[type="number"]::-webkit-inner-spin-button,
.neo-input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.neo-input[type="number"] {
  -moz-appearance: textfield;
}

.range-sep {
  color: var(--text-muted);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.month-day-row {
  display: flex;
  gap: 10px;
}

/* 数量预设 */
.count-presets {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.preset-chip {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.preset-chip:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.preset-chip--active {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.4);
  color: #60a5fa;
}

/* Slider */
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #60a5fa;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(96, 165, 250, 0.4);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #60a5fa;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.slider-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #60a5fa;
  min-width: 40px;
  text-align: right;
}

/* 操作按钮 */
.action-row {
  display: flex;
  gap: 12px;
}

.generate-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
}

.generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(59, 130, 246, 0.5);
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

/* 结果区 */
.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.result-count {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.result-actions {
  display: flex;
  gap: 8px;
}

.copy-all-btn,
.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.copy-all-btn {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.copy-all-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
}

.export-btn {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.export-btn:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
}

/* 结果列表 */
.result-list {
  flex: 1;
  overflow-y: auto;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.result-item {
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  transition: all 0.25s;
}

.result-item:hover {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.08);
}

.result-item__main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.result-item__index {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
}

.result-item__id {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  letter-spacing: 0.05em;
  flex: 1;
}

.result-item__copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.25s;
  flex-shrink: 0;
}

.result-item__copy:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.result-item__meta {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding-left: 34px;
}

/* 占位 */
.result-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.placeholder-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  margin-bottom: 16px;
}

.placeholder-icon svg { opacity: 0.4; }

.result-placeholder p {
  font-size: 0.9375rem;
  margin-bottom: 4px;
}

.placeholder-tip {
  font-size: 0.8125rem;
  opacity: 0.6;
}

/* 响应式 */
@media (max-width: 900px) {
  .id-generator { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .result-item__meta {
    flex-wrap: wrap;
    gap: 6px 12px;
  }
  .gender-grid { flex-wrap: wrap; }
  .year-inputs { flex-direction: column; gap: 8px; }
  .range-sep { display: none; }
}
</style>
