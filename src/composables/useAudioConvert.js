import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import { saveAs } from 'file-saver'

export function useAudioConvert() {
  const loading = ref(false)
  const error = ref(null)
  const progress = ref(0)
  const loaded = ref(false)
  const convertedFileName = ref('')
  let ffmpeg = null

  const loadFFmpeg = async () => {
    if (loaded.value) return
    ffmpeg = new FFmpeg()

    ffmpeg.on('progress', ({ progress: p }) => {
      progress.value = Math.min(95, Math.round(p * 100))
    })

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message)
    })

    const baseURL = '/ffmpeg'
    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      await ffmpeg.load({ coreURL, wasmURL })
    } catch (e) {
      console.error('[FFmpeg] Engine load failed:', e)
      throw new Error('FFmpeg engine failed to load. Please refresh and try again.')
    }
    loaded.value = true
  }

  const convertAudio = async (file, targetFormat, options = {}) => {
    loading.value = true
    error.value = null
    progress.value = 0

    try {
      await loadFFmpeg()
      progress.value = 5

      const inputName = `input.${file.name.split('.').pop()}`
      const outputName = `output.${targetFormat}`

      await ffmpeg.writeFile(inputName, await fetchFile(file))
      progress.value = 10

      const args = ['-i', inputName]

      // Add advanced options
      if (options.sampleRate && options.sampleRate !== 'auto') {
        args.push('-ar', options.sampleRate)
      }
      if (options.bitrate && ['mp3', 'aac', 'ogg', 'm4a'].includes(targetFormat)) {
        args.push('-b:a', `${options.bitrate}k`)
      }
      if (options.flacCompression !== undefined && targetFormat === 'flac') {
        args.push('-compression_level', options.flacCompression.toString())
      }

      args.push(outputName)

      console.log('[FFmpeg] Executing command:', args.join(' '))
      await ffmpeg.exec(args)
      progress.value = 98

      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([data.buffer], { type: `audio/${targetFormat}` })
      
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'))
      convertedFileName.value = `${baseName}.${targetFormat}`
      
      saveAs(blob, convertedFileName.value)

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)

      progress.value = 100
      return true
    } catch (e) {
      error.value = e.message || 'Conversion failed'
      console.error(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    loading.value = false
    error.value = null
    progress.value = 0
    convertedFileName.value = ''
  }

  return {
    loading,
    error,
    progress,
    loaded,
    convertedFileName,
    convertAudio,
    reset,
  }
}
