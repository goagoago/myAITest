<script setup>
import { computed } from 'vue'
import { CalendarCheck2, Check, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import CreditBadge from './CreditBadge.vue'

const props = defineProps({
  month: {
    type: String,
    required: true,
  },
  records: {
    type: Array,
    default: () => [],
  },
  dailyReward: {
    type: Number,
    default: 3,
  },
  checkedInToday: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['previous', 'next', 'check-in'])

const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
const todayKey = new Date().toISOString().slice(0, 10)

const recordSet = computed(() => new Set(props.records.map(item => item.date)))

const monthDate = computed(() => {
  const [year, month] = props.month.split('-').map(Number)
  return new Date(year, month - 1, 1)
})

const monthTitle = computed(() => {
  const [year, month] = props.month.split('-')
  return `${year} / ${`${Number(month)}`.padStart(2, '0')}`
})

const canGoNext = computed(() => props.month < todayKey.slice(0, 7))

const checkedCount = computed(() => props.records.length)

const cells = computed(() => {
  const date = monthDate.value
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()
  const result = []

  for (let i = 0; i < startWeekday; i += 1) {
    result.push(null)
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cellDate = new Date(date.getFullYear(), date.getMonth(), day)
    const key = `${cellDate.getFullYear()}-${`${cellDate.getMonth() + 1}`.padStart(2, '0')}-${`${cellDate.getDate()}`.padStart(2, '0')}`
    result.push({
      day,
      key,
      checked: recordSet.value.has(key),
      isToday: key === todayKey,
    })
  }

  return result
})
</script>

<template>
  <section class="calendar">
    <div class="calendar__head">
      <div>
        <span class="calendar__label">签到日历</span>
        <h3>{{ monthTitle }}</h3>
      </div>

      <div class="calendar__head-side">
        <CreditBadge :value="checkedCount" small muted />
        <div class="calendar__controls">
          <button class="calendar__nav" @click="emit('previous')">
            <ChevronLeft :size="16" />
          </button>
          <button class="calendar__nav" :disabled="!canGoNext" @click="emit('next')">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div class="calendar__weekdays">
      <span v-for="label in weekLabels" :key="label">{{ label }}</span>
    </div>

    <div class="calendar__grid">
      <div
        v-for="(cell, index) in cells"
        :key="cell?.key || `blank-${index}`"
        class="calendar__cell"
        :class="{
          'calendar__cell--blank': !cell,
          'calendar__cell--checked': cell?.checked,
          'calendar__cell--today': cell?.isToday,
        }"
      >
        <template v-if="cell">
          <span class="calendar__day">{{ cell.day }}</span>
          <span v-if="cell.checked" class="calendar__check">
            <Check :size="18" />
          </span>
          <span v-else-if="cell.isToday" class="calendar__hint">今日</span>
        </template>
      </div>
    </div>

    <button class="calendar__action" :disabled="loading || checkedInToday" @click="emit('check-in')">
      <CalendarCheck2 :size="18" />
      <span>{{ checkedInToday ? '今日已签到' : '立即签到' }}</span>
      <CreditBadge v-if="!checkedInToday" :value="dailyReward" small strong />
    </button>
  </section>
</template>

<style scoped lang="scss">
.calendar {
  display: grid;
  gap: 18px;
}

.calendar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.calendar__label {
  display: inline-block;
  margin-bottom: 8px;
  color: rgba(70, 92, 132, 0.72);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.calendar__head h3 {
  font-size: clamp(1.34rem, 2vw, 1.72rem);
  color: #15213a;
}

.calendar__head-side {
  display: flex;
  align-items: center;
  gap: 10px;
}

.calendar__controls {
  display: flex;
  gap: 8px;
}

.calendar__nav {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: #1f3359;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 12px 24px rgba(106, 123, 159, 0.14);
  cursor: pointer;
}

.calendar__nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calendar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(135deg, #0f172a, #1d4ed8 58%, #10b981);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 22px 40px rgba(37, 99, 235, 0.22);
  cursor: pointer;
}

.calendar__action:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.calendar__weekdays,
.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar__weekdays span {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(72, 88, 122, 0.78);
}

.calendar__cell {
  min-height: 84px;
  border-radius: 18px;
  padding: 12px 10px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(135, 149, 180, 0.14);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 12px 22px rgba(112, 125, 160, 0.09);
}

.calendar__cell--blank {
  visibility: hidden;
}

.calendar__cell--checked {
  background: linear-gradient(160deg, rgba(16, 185, 129, 0.16), rgba(37, 99, 235, 0.1));
  border-color: rgba(16, 185, 129, 0.24);
}

.calendar__cell--today {
  outline: 2px solid rgba(37, 99, 235, 0.28);
  outline-offset: 1px;
}

.calendar__day {
  font-size: 1rem;
  font-weight: 800;
  color: #1a2640;
}

.calendar__hint {
  color: #1d4ed8;
  font-size: 0.82rem;
  font-weight: 700;
}

.calendar__check {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  background: rgba(16, 185, 129, 0.16);
  color: #059669;
}

@media (max-width: 640px) {
  .calendar__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .calendar__head-side {
    width: 100%;
    justify-content: space-between;
  }

  .calendar__cell {
    min-height: 70px;
    padding: 10px 8px;
  }
}
</style>
