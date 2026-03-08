import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import lottie from 'lottie-web'

/**
 * useLottie composable — 封装 Lottie 动画加载、播放控制、鼠标交互
 * @param {Object} options
 * @param {Object} options.animationData - Lottie JSON 数据
 * @param {string} options.trigger - 触发模式: 'auto'|'hover'|'click'|'scroll'|'mousemove'|'eyeTrack'|'reactive'
 * @param {boolean} options.loop - 是否循环
 * @param {boolean} options.autoplay - 是否自动播放
 * @param {number} options.speed - 播放速度
 * @param {Function} options.onComplete - 播放完成回调
 * @param {boolean} options.idleAnimation - 空闲时呼吸微动画
 * @param {string} options.clickReaction - 点击反应类型: 'bounce'|'spin'|'shake'|'jump'
 */
export function useLottie(options = {}) {
  const {
    animationData = null,
    trigger = 'auto',
    loop = true,
    autoplay = true,
    speed = 1,
    onComplete = null,
    idleAnimation = false,
    clickReaction = null,
  } = options

  const containerRef = ref(null)
  const animInstance = ref(null)
  const isPlaying = ref(false)
  const currentFrame = ref(0)

  // 空闲呼吸动画
  let idleRafId = null
  let idlePhase = 0

  const startIdleAnimation = () => {
    if (!idleAnimation || !containerRef.value) return
    const animate = () => {
      idlePhase += 0.02
      const scaleVal = 1 + Math.sin(idlePhase) * 0.03
      const rotateVal = Math.sin(idlePhase * 0.7) * 1.5
      if (containerRef.value) {
        containerRef.value.style.transform = `scale(${scaleVal}) rotate(${rotateVal}deg)`
      }
      idleRafId = requestAnimationFrame(animate)
    }
    idleRafId = requestAnimationFrame(animate)
  }

  const stopIdleAnimation = () => {
    if (idleRafId) {
      cancelAnimationFrame(idleRafId)
      idleRafId = null
    }
    if (containerRef.value) {
      containerRef.value.style.transform = ''
    }
  }

  // 点击反应动画
  const triggerClickReaction = () => {
    if (!clickReaction || !containerRef.value) return
    const el = containerRef.value
    el.classList.remove('lottie-bounce', 'lottie-spin', 'lottie-shake', 'lottie-jump')
    // 强制 reflow
    void el.offsetWidth
    el.classList.add(`lottie-${clickReaction}`)
    setTimeout(() => el.classList.remove(`lottie-${clickReaction}`), 600)
  }

  const init = () => {
    if (!containerRef.value || !animationData) return

    const shouldAutoplay = trigger === 'auto' || trigger === 'reactive'
    const shouldLoop = trigger === 'auto' || trigger === 'reactive'

    animInstance.value = lottie.loadAnimation({
      container: containerRef.value,
      renderer: 'svg',
      loop: shouldLoop ? loop : false,
      autoplay: shouldAutoplay ? autoplay : false,
      animationData,
    })

    animInstance.value.setSpeed(speed)

    // 播放完成回调
    if (onComplete) {
      animInstance.value.addEventListener('complete', onComplete)
    }

    if (trigger === 'hover') {
      containerRef.value.addEventListener('mouseenter', play)
      containerRef.value.addEventListener('mouseleave', () => {
        stop()
        animInstance.value?.goToAndStop(0, true)
      })
    }

    if (trigger === 'click') {
      containerRef.value.addEventListener('click', () => {
        animInstance.value?.goToAndStop(0, true)
        play()
        triggerClickReaction()
      })
    }

    if (trigger === 'mousemove') {
      containerRef.value.addEventListener('mousemove', handleMouseMove)
    }

    if (trigger === 'scroll') {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    // 眼球跟随鼠标（全局鼠标位置映射到动画帧）
    if (trigger === 'eyeTrack') {
      animInstance.value.goToAndStop(0, true)
      document.addEventListener('mousemove', handleEyeTrack)
    }

    // 组合模式：auto播放 + 眼球跟随 + 点击反应
    if (trigger === 'reactive') {
      document.addEventListener('mousemove', handleEyeTrackOverlay)
      containerRef.value.addEventListener('click', () => {
        triggerClickReaction()
      })
    }

    // 空闲呼吸动画
    if (idleAnimation && trigger !== 'reactive') {
      startIdleAnimation()
    }
  }

  const play = () => {
    animInstance.value?.play()
    isPlaying.value = true
  }

  const stop = () => {
    animInstance.value?.stop()
    isPlaying.value = false
  }

  const pause = () => {
    animInstance.value?.pause()
    isPlaying.value = false
  }

  const goToFrame = (frame) => {
    animInstance.value?.goToAndStop(frame, true)
    currentFrame.value = frame
  }

  const handleMouseMove = (e) => {
    if (!animInstance.value || !containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const totalFrames = animInstance.value.totalFrames
    const frame = Math.floor(x * totalFrames)
    animInstance.value.goToAndStop(Math.max(0, Math.min(frame, totalFrames - 1)), true)
  }

  const handleScroll = () => {
    if (!animInstance.value || !containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const viewH = window.innerHeight
    const progress = Math.max(0, Math.min(1, 1 - (rect.top / viewH)))
    const frame = Math.floor(progress * animInstance.value.totalFrames)
    animInstance.value.goToAndStop(Math.max(0, Math.min(frame, animInstance.value.totalFrames - 1)), true)
  }

  // 眼球跟随：通过 CSS transform 让容器微动偏移模拟眼球跟踪
  const handleEyeTrack = (e) => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / window.innerWidth * 8
    const dy = (e.clientY - cy) / window.innerHeight * 6
    // 给 SVG 内的眼球层施加位移（通过 CSS 变量）
    containerRef.value.style.setProperty('--eye-x', `${dx}px`)
    containerRef.value.style.setProperty('--eye-y', `${dy}px`)
  }

  // reactive 模式下的眼球跟踪叠加层（不影响主动画播放）
  const handleEyeTrackOverlay = (e) => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / window.innerWidth * 6
    const dy = (e.clientY - cy) / window.innerHeight * 4
    containerRef.value.style.setProperty('--eye-x', `${dx}px`)
    containerRef.value.style.setProperty('--eye-y', `${dy}px`)
  }

  const destroy = () => {
    if (trigger === 'scroll') {
      window.removeEventListener('scroll', handleScroll)
    }
    if (trigger === 'eyeTrack') {
      document.removeEventListener('mousemove', handleEyeTrack)
    }
    if (trigger === 'reactive') {
      document.removeEventListener('mousemove', handleEyeTrackOverlay)
    }
    stopIdleAnimation()
    animInstance.value?.destroy()
    animInstance.value = null
  }

  onMounted(() => {
    nextTick(init)
  })

  onBeforeUnmount(() => {
    destroy()
  })

  return {
    containerRef,
    animInstance,
    isPlaying,
    currentFrame,
    play,
    stop,
    pause,
    goToFrame,
    destroy,
    triggerClickReaction,
  }
}
