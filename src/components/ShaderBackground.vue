<template>
  <div class="shader-bg-wrap" aria-hidden="true">
    <div class="shader-bg-base"></div>
    <div class="shader-bg-orb shader-bg-orb--purple"></div>
    <div class="shader-bg-orb shader-bg-orb--blue"></div>
    <div class="shader-bg-orb shader-bg-orb--white"></div>
    <div class="shader-bg-grid"></div>
    <div class="shader-bg-noise"></div>
  </div>
</template>

<style scoped>
.shader-bg-wrap {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #d8dfec 0%, #e6edf8 42%, #dde5f2 100%);
}

.shader-bg-base,
.shader-bg-grid,
.shader-bg-noise,
.shader-bg-orb {
  position: absolute;
  inset: 0;
}

.shader-bg-base {
  background:
    radial-gradient(circle at 50% -8%, rgba(255, 255, 255, 0.6), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
}

.shader-bg-orb {
  filter: blur(46px);
  transform: translate3d(0, 0, 0);
  will-change: transform, opacity;
}

.shader-bg-orb--purple {
  top: -8%;
  left: -10%;
  width: 46vw;
  height: 34vw;
  min-width: 320px;
  min-height: 240px;
  max-width: 720px;
  max-height: 540px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.08) 42%, transparent 72%);
  animation: orbFloatPurple 18s ease-in-out infinite alternate;
}

.shader-bg-orb--blue {
  top: -10%;
  right: -8%;
  width: 42vw;
  height: 30vw;
  min-width: 300px;
  min-height: 220px;
  max-width: 680px;
  max-height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0.08) 40%, transparent 70%);
  animation: orbFloatBlue 20s ease-in-out infinite alternate;
}

.shader-bg-orb--white {
  top: -18%;
  left: 18%;
  width: 64vw;
  height: 38vw;
  min-width: 420px;
  min-height: 260px;
  max-width: 1100px;
  max-height: 620px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.16) 42%, transparent 74%);
  animation: orbFloatWhite 24s ease-in-out infinite alternate;
}

.shader-bg-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 38px 38px;
  opacity: 0.28;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.04));
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.04));
}

.shader-bg-noise {
  opacity: 0.08;
  mix-blend-mode: soft-light;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.9) 0 0.6px, transparent 0.7px),
    radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.7) 0 0.5px, transparent 0.6px),
    radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.8) 0 0.6px, transparent 0.7px),
    radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.65) 0 0.5px, transparent 0.6px);
  background-size: 180px 180px, 220px 220px, 200px 200px, 240px 240px;
}

@keyframes orbFloatPurple {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.88;
  }
  100% {
    transform: translate3d(6%, 4%, 0) scale(1.08);
    opacity: 1;
  }
}

@keyframes orbFloatBlue {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.86;
  }
  100% {
    transform: translate3d(-7%, 5%, 0) scale(1.1);
    opacity: 1;
  }
}

@keyframes orbFloatWhite {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.9;
  }
  100% {
    transform: translate3d(3%, -3%, 0) scale(1.05);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shader-bg-orb {
    animation: none;
  }
}

@media (max-width: 768px) {
  .shader-bg-grid {
    background-size: 28px 28px;
    opacity: 0.22;
  }

  .shader-bg-orb--purple,
  .shader-bg-orb--blue,
  .shader-bg-orb--white {
    filter: blur(34px);
  }
}
</style>
