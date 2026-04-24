import { ref, reactive } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import { useAccountStore } from '../stores/accountStore'

export function useGifTools() {
  const loading = ref(false)
  const error = ref('')
  const progress = ref(0)
  const phase = ref('')
  const loaded = ref(false)
  const result = reactive({
    blob: null,
    url: '',
    mimeType: '',
    extension: '',
    originalSize: 0,
    outputSize: 0,
  })
  const account = useAccountStore()

  let ffmpeg = null

  const loadFFmpeg = async () => {
    if (loaded.value) return

    ffmpeg = new FFmpeg()
    ffmpeg.on('progress', ({ progress: value }) => {
      if (phase.value === 'processing') {
        progress.value = Math.min(92, Math.round(28 + value * 60))
      }
    })

    const baseURL = '/ffmpeg'
    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      await ffmpeg.load({ coreURL, wasmURL })
      loaded.value = true
    } catch (e) {
      throw new Error('FFmpeg 引擎加载失败，请刷新页面后重试')
    }
  }

  const convert = async (file, options = {}) => {
    if (!file) {
      throw new Error('请先选择文件')
    }

    try {
      await account.consumeFeature('gif-tools')
    } catch (e) {
      error.value = e.message || '操作失败，请重试'
      throw e
    }

    loading.value = true
    error.value = ''
    progress.value = 2
    phase.value = 'loading'
    result.originalSize = file.size
    result.outputSize = 0
    clearResult()

    try {
      await loadFFmpeg()
      progress.value = 14

      phase.value = 'writing'
      const mode = options.mode || 'video-to-gif'
      const inputExt = getInputExtension(file, mode)
      const outputExt = mode === 'gif-to-mp4' ? 'mp4' : 'gif'
      const inputName = `input${inputExt}`
      const outputName = `output.${outputExt}`

      await ffmpeg.writeFile(inputName, await fetchFile(file))
      progress.value = 24

      phase.value = 'processing'
      const args = buildArgs(inputName, outputName, options)
      await ffmpeg.exec(args)

      phase.value = 'reading'
      progress.value = 95
      const data = await ffmpeg.readFile(outputName)
      const mimeType = outputExt === 'mp4' ? 'video/mp4' : 'image/gif'
      const blob = new Blob([data.buffer], { type: mimeType })

      result.blob = blob
      result.url = URL.createObjectURL(blob)
      result.mimeType = mimeType
      result.extension = outputExt
      result.outputSize = blob.size

      await cleanupFiles(inputName, outputName)

      progress.value = 100
      phase.value = ''
      return result
    } catch (e) {
      error.value = e.message || 'GIF 工具处理失败'
      phase.value = ''
      throw e
    } finally {
      loading.value = false
    }
  }

  const download = (filename = 'output') => {
    if (!result.url) return
    const link = document.createElement('a')
    link.href = result.url
    link.download = `${filename}.${result.extension || 'gif'}`
    link.click()
  }

  const reset = () => {
    loading.value = false
    error.value = ''
    progress.value = 0
    phase.value = ''
    result.originalSize = 0
    result.outputSize = 0
    clearResult()
  }

  const clearResult = () => {
    if (result.url) URL.revokeObjectURL(result.url)
    result.blob = null
    result.url = ''
    result.mimeType = ''
    result.extension = ''
  }

  const cleanupFiles = async (...names) => {
    if (!ffmpeg) return
    for (const name of names) {
      try {
        await ffmpeg.deleteFile(name)
      } catch {}
    }
  }

  return {
    loading,
    error,
    progress,
    phase,
    loaded,
    result,
    convert,
    download,
    reset,
  }
}

function getInputExtension(file, mode) {
  if (mode === 'video-to-gif') {
    return getSafeExtension(file.name, '.mp4')
  }
  return '.gif'
}

function getSafeExtension(filename, fallback) {
  const dot = filename.lastIndexOf('.')
  if (dot < 0) return fallback
  const ext = filename.slice(dot).toLowerCase()
  return ext.length <= 6 ? ext : fallback
}

function buildArgs(input, output, options) {
  const mode = options.mode || 'video-to-gif'
  const fps = `${Math.max(6, Math.min(24, Number(options.fps) || 12))}`
  const width = `${Math.max(160, Math.min(960, Number(options.width) || 480))}`

  if (mode === 'gif-to-mp4') {
    return [
      '-i', input,
      '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos`,
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      output,
    ]
  }

  const startTime = Math.max(0, Number(options.startTime) || 0)
  const duration = Math.max(1, Number(options.duration) || 5)
  const args = ['-i', input]

  if (mode === 'video-to-gif' && startTime > 0) {
    args.push('-ss', `${startTime}`)
  }
  if (mode === 'video-to-gif' && duration > 0) {
    args.push('-t', `${duration}`)
  }

  const filter = `[0:v]fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`
  args.push(
    '-filter_complex', filter,
    '-loop', '0',
    output,
  )

  return args
}
