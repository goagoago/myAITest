<template>
  <div class="page-loader">
    <LottieInteractive
      :animation-data="loadingAnimation"
      :loop="true"
      trigger="auto"
      width="250px"
      height="250px"
    />
  </div>
</template>

<script setup>
import LottieInteractive from './LottieInteractive.vue'
import loadingAnimation from '../assets/lottie/Loading.json'
</script>

<style scoped>
.page-loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(26, 26, 46, 0.8); /* Using --neo-bg with opacity */
  z-index: 9999;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: opacity 0.3s ease;
}
</style>
