import { ref, reactive } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

export function useVideoCompress() {
  const loading = ref(false)
  const error = ref(null)
  const progress = ref(0)
  const phase = ref('')  // 'loading' | 'writing' | 'compressing' | 'reading'
  const loaded = ref(false)
  const result = reactive({
    blob: null,
    url: '',
    originalSize: 0,
    compressedSize: 0,
  })

  let ffmpeg = null

  const loadFFmpeg = async () => {
    if (loaded.value) return
    ffmpeg = new FFmpeg()

    ffmpeg.on('progress', ({ progress: p }) => {
      if (phase.value === 'compressing') {
        progress.value = Math.min(90, Math.round(30 + p * 60))
      }
    })

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message)
    })

    // 从本地 public/ffmpeg/ 加载 ESM 格式 core
    // toBlobURL 将文件 fetch 后转为 blob:// URL，兼容 Worker 的 import()
    const baseURL = '/ffmpeg'
    console.log('[FFmpeg] 开始加载引擎...')
    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
      console.log('[FFmpeg] core.js 就绪')
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      console.log('[FFmpeg] core.wasm 就绪，初始化中...')
      await ffmpeg.load({ coreURL, wasmURL })
    } catch (e) {
      console.error('[FFmpeg] 引擎加载失败:', e)
      throw new Error('FFmpeg 引擎加载失败，请刷新页面重试')
    }
    console.log('[FFmpeg] 引擎加载完成')
    loaded.value = true
  }

  /**
   * 压缩视频
   * @param {File} file - 原始视频文件
   * @param {Object} options - 压缩参数
   * @param {string} options.preset - 预设: 'high' | 'balanced' | 'max'
   * @param {string} options.resolution - 分辨率: 'original' | '1080' | '720' | '480'
   * @param {string} options.format - 输出格式: 'mp4' | 'webm'
   * @param {number} [options.targetSize] - 目标文件大小（字节），传入时忽略 preset
   */
  const compress = async (file, options = {}) => {
    loading.value = true
    error.value = null
    progress.value = 0
    phase.value = 'loading'
    result.blob = null
    result.url = ''
    result.originalSize = file.size
    result.compressedSize = 0

    try {
      progress.value = 2
      await loadFFmpeg()
      progress.value = 15

      phase.value = 'writing'
      const inputName = 'input' + getExtension(file.name)
      const format = options.format || 'mp4'
      const outputName = `output.${format}`

      await ffmpeg.writeFile(inputName, await fetchFile(file))
      progress.value = 20

      // 目标大小模式需要先获取视频时长
      if (options.targetSize) {
        phase.value = 'compressing'
        const duration = await getVideoDuration(file)
        if (!duration || duration <= 0) throw new Error('无法获取视频时长')
        options._duration = duration
        console.log('[FFmpeg] 视频时长:', duration, '秒')
      }

      progress.value = 25
      phase.value = 'compressing'
      const args = buildArgs(inputName, outputName, options)
      console.log('[FFmpeg] 执行命令:', args.join(' '))
      await ffmpeg.exec(args)

      phase.value = 'reading'
      progress.value = 92
      const data = await ffmpeg.readFile(outputName)

      const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4'
      const blob = new Blob([data.buffer], { type: mimeType })

      if (result.url) URL.revokeObjectURL(result.url)
      result.blob = blob
      result.url = URL.createObjectURL(blob)
      result.compressedSize = blob.size

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)

      progress.value = 100
      phase.value = ''
      return result
    } catch (e) {
      error.value = e.message || '压缩失败'
      phase.value = ''
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 通过 HTMLVideoElement 获取视频时长（秒） */
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const duration = video.duration
        URL.revokeObjectURL(video.src)
        resolve(isFinite(duration) ? duration : 0)
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        resolve(0)
      }
      video.src = URL.createObjectURL(file)
    })
  }

  const getExtension = (filename) => {
    const dot = filename.lastIndexOf('.')
    return dot >= 0 ? filename.substring(dot) : '.mp4'
  }

  const buildArgs = (input, output, options) => {
    const { preset = 'balanced', resolution = 'original', format = 'mp4', targetSize, _duration } = options

    const args = ['-i', input]

    // 目标大小模式：根据时长计算视频码率
    if (targetSize && _duration) {
      const audioBitrate = 96 * 1024 // 96kbps 音频
      const totalBits = targetSize * 8
      const videoBitrate = Math.max(50000, Math.floor((totalBits / _duration) - audioBitrate))
      const videoBr = `${Math.floor(videoBitrate / 1000)}k`
      console.log('[FFmpeg] 目标码率:', videoBr)

      if (format === 'webm') {
        args.push('-c:v', 'libvpx-vp9',
          '-b:v', videoBr, '-maxrate', videoBr, '-bufsize', `${Math.floor(videoBitrate * 2 / 1000)}k`,
          '-cpu-used', '8', '-deadline', 'realtime', '-row-mt', '1')
      } else {
        args.push('-c:v', 'libx264',
          '-b:v', videoBr, '-maxrate', videoBr, '-bufsize', `${Math.floor(videoBitrate * 2 / 1000)}k`,
          '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart')
      }
      // 分辨率缩放
      if (resolution !== 'original') {
        const scaleMap = { '1080': '-2:1080', '720': '-2:720', '480': '-2:480' }
        if (scaleMap[resolution]) args.push('-vf', `scale=${scaleMap[resolution]}`)
      }
      args.push('-c:a', 'aac', '-b:a', '96k')
      args.push(output)
      return args
    }

    // 预设模式
    if (format === 'webm') {
      const crfMap = { high: '30', balanced: '38', max: '45' }
      const crf = crfMap[preset] || '38'
      args.push('-c:v', 'libvpx-vp9', '-crf', crf, '-b:v', '0',
        '-cpu-used', '8', '-deadline', 'realtime', '-row-mt', '1')
    } else {
      const crfMap = { high: '28', balanced: '33', max: '40' }
      const crf = crfMap[preset] || '33'
      args.push('-c:v', 'libx264', '-crf', crf,
        '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart')
    }

    if (resolution !== 'original') {
      const scaleMap = { '1080': '-2:1080', '720': '-2:720', '480': '-2:480' }
      if (scaleMap[resolution]) args.push('-vf', `scale=${scaleMap[resolution]}`)
    }

    const audioBrMap = { high: '128k', balanced: '96k', max: '64k' }
    args.push('-c:a', 'aac', '-b:a', audioBrMap[preset] || '96k')
    args.push(output)

    return args
  }

  const reset = () => {
    loading.value = false
    error.value = null
    progress.value = 0
    phase.value = ''
    if (result.url) URL.revokeObjectURL(result.url)
    result.blob = null
    result.url = ''
    result.originalSize = 0
    result.compressedSize = 0
  }

  return {
    loading,
    error,
    progress,
    phase,
    loaded,
    result,
    compress,
    reset,
  }
}
