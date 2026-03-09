<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  options: {
    type: Array,
    required: true,
    default: () => [], // Should be in { value, label } format
  },
  disabled: {
    type: Boolean,
    default: false,
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectRef = ref(null)

const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue) || { label: 'Select...' }
})

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const selectOption = (option) => {
  if (props.disabled) return
  emit('update:modelValue', option.value)
  isOpen.value = false
}

const handleClickOutside = (event) => {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="custom-select" ref="selectRef" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <button class="select-trigger" @click="toggleDropdown" :disabled="disabled">
      <span>{{ selectedOption.label }}</span>
      <ChevronDown :size="16" class="select-arrow" />
    </button>
    <transition name="fade">
      <ul v-if="isOpen" class="select-options">
        <li
          v-for="option in options"
          :key="option.value"
          :class="{ 'is-selected': option.value === modelValue }"
          @click="selectOption(option)"
        >
          <span>{{ option.label }}</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
}

.select-trigger {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.custom-select.is-disabled .select-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-trigger:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.2);
}

.custom-select.is-open .select-trigger {
  border-color: var(--primary, #fb923c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #fb923c) 20%, transparent);
}

.select-arrow {
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.custom-select.is-open .select-arrow {
  transform: rotate(180deg);
}

.select-options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #2c2c3a; /* Darker background for contrast */
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  list-style: none;
  padding: 6px;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
}

.select-options li {
  padding: 10px 12px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease-out;
}

.select-options li:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.select-options li.is-selected {
  background: color-mix(in srgb, var(--primary, #fb923c) 25%, transparent);
  color: var(--primary-foreground, #fff);
  font-weight: 500;
}

/* Scrollbar styles */
.select-options::-webkit-scrollbar {
  width: 6px;
}
.select-options::-webkit-scrollbar-track {
  background: transparent;
}
.select-options::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
.select-options::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
