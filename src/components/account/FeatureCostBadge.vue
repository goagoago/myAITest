<script setup>
import { computed } from 'vue'
import { useAccountStore } from '../../stores/accountStore'
import CreditBadge from './CreditBadge.vue'

const props = defineProps({
  featureCode: {
    type: String,
    default: '',
  },
  value: {
    type: [Number, String],
    default: undefined,
  },
  small: {
    type: Boolean,
    default: true,
  },
  muted: {
    type: Boolean,
    default: false,
  },
  strong: {
    type: Boolean,
    default: false,
  },
})

const account = useAccountStore()
const resolvedValue = computed(() => (
  props.value !== undefined && props.value !== null
    ? props.value
    : account.getFeatureCost(props.featureCode)
))
const displayValue = computed(() => Number(resolvedValue.value) === 0 ? '免费' : resolvedValue.value)
</script>

<template>
  <CreditBadge :value="displayValue" :small="small" :muted="muted" :strong="strong" />
</template>
