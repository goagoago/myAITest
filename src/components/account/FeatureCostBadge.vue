<script setup>
import { computed } from 'vue'
import { useAccountStore } from '../../stores/accountStore'
import CreditBadge from './CreditBadge.vue'

const props = defineProps({
  featureCode: {
    type: String,
    required: true,
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
const value = computed(() => account.getFeatureCost(props.featureCode))
</script>

<template>
  <CreditBadge :value="value" :small="small" :muted="muted" :strong="strong" />
</template>
