<script setup>
import MainLayout from './layouts/MainLayout.vue'
import { useSeo } from './composables/useSeo.js'

// 全局 SEO：根据路由自动切换 title / meta
useSeo()
</script>

<template>
  <MainLayout />
</template>
