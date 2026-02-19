import { ref, onUnmounted } from 'vue'

export function useScreenRecord() {
  const recording = ref(false)
  const paused = ref(false)
  const error = ref(null)
  const duration = ref(0)
  const resultUrl = ref('')
  const resultBlob = ref(null)

  let mediaRecorder = null
  let chunks = []
  let timerInterval = null
  let stream = null
  let audioStream = null

  /**
   * 开始录制
   * @param {Object} options
   * @param {boolean} options.systemAudio - 是否录制系统声音
   * @param {boolean} options.microphone - 是否录制麦克风
   */
  const startRecording = async (options = {}) => {
    error.value = null
    resultUrl.value = ''
    resultBlob.value = null
    chunks = []
    duration.value = 0

    try {
      // 获取屏幕流
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: options.systemAudio || false,
      })

      const tracks = [...stream.getTracks()]

      // 获取麦克风流
      if (options.microphone) {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          audioStream.getAudioTracks().forEach(t => tracks.push(t))
        } catch (e) {
          console.warn('麦克风获取失败:', e)
        }
      }

      const combinedStream = new MediaStream(tracks)

      // 选择支持的格式
      const mimeType = getSupportedMimeType()

      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
        resultBlob.value = blob
        resultUrl.value = URL.createObjectURL(blob)
        cleanup()
      }

      // 用户通过浏览器原生按钮停止共享时
      stream.getVideoTracks()[0].onended = () => {
        if (recording.value) {
          stopRecording()
        }
      }

      mediaRecorder.start(1000) // 每秒收集一次数据
      recording.value = true
      paused.value = false

      // 计时器
      timerInterval = setInterval(() => {
        if (!paused.value) {
          duration.value++
        }
      }, 1000)
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        error.value = '用户取消了屏幕共享'
      } else {
        error.value = e.message || '启动录制失败'
      }
      cleanup()
      throw e
    }
  }

  /**
   * 暂停录制
   */
  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      paused.value = true
    }
  }

  /**
   * 恢复录制
   */
  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      paused.value = false
    }
  }

  /**
   * 停止录制
   */
  const stopRecording = () => {
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      mediaRecorder.stop()
    }
    recording.value = false
    paused.value = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  /**
   * 下载录制文件
   */
  const downloadRecording = (filename) => {
    if (!resultBlob.value) return
    const ext = resultBlob.value.type.includes('webm') ? 'webm' : 'mp4'
    const name = filename || `screen-record-${Date.now()}.${ext}`
    const link = document.createElement('a')
    link.href = resultUrl.value
    link.download = name
    link.click()
  }

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return 'video/webm'
  }

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      stream = null
    }
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop())
      audioStream = null
    }
  }

  const reset = () => {
    stopRecording()
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
    resultBlob.value = null
    error.value = null
    duration.value = 0
  }

  onUnmounted(() => {
    cleanup()
    if (timerInterval) clearInterval(timerInterval)
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  })

  return {
    recording,
    paused,
    error,
    duration,
    resultUrl,
    resultBlob,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    downloadRecording,
    reset,
  }
}
