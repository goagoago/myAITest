import { ref } from 'vue'

const SITE_URLS = [
  'https://www.xu-it.com/',
  'https://www.xu-it.com/id-photo',
  'https://www.xu-it.com/watermark-removal',
  'https://www.xu-it.com/image-compress',
  'https://www.xu-it.com/remove-bg',
  'https://www.xu-it.com/doc-convert',
  'https://www.xu-it.com/qr-code',
  'https://www.xu-it.com/ocr',
  'https://www.xu-it.com/id-generator',
  'https://www.xu-it.com/resume-builder',
  'https://www.xu-it.com/media/record',
  'https://www.xu-it.com/media/compress',
  'https://www.xu-it.com/media/audio-convert',
  'https://www.xu-it.com/travel',
  'https://www.xu-it.com/writer',
  'https://www.xu-it.com/translator',
  'https://www.xu-it.com/mind',
]

export function useBaiduPush() {
  const loading = ref(false)
  const result = ref(null)
  const error = ref(null)

  async function pushUrls(urls = SITE_URLS) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      const res = await fetch('/api/baidu/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urls),
      })

      const data = await res.json()
      if (data.code === 200) {
        result.value = data.data
      } else {
        error.value = data.message || '推送失败'
      }
    } catch (e) {
      error.value = e.message || '推送失败'
    } finally {
      loading.value = false
    }
  }

  return { loading, result, error, pushUrls, siteUrls: SITE_URLS }
}
