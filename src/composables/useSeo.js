import { watch } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 页面级 SEO 配置
 * 每个路由对应独立的 title + description + keywords
 */
const SEO_CONFIG = {
  '/': {
    title: 'AI Box Pro - 免费在线AI工具箱 | 图片处理·文档转换·AI创作',
    description: 'AI Box Pro 是一款免费在线AI工具箱，提供AI证件照制作、图片去水印、图片压缩、文档格式转换、AI图片视频生成、屏幕录制等多种实用工具，无需下载，打开即用。',
    keywords: 'AI工具箱,在线工具,免费工具,AI工具,效率工具',
  },
  '/id-photo': {
    title: '在线AI证件照制作 - 一寸二寸证件照·智能换背景色 | AI Box Pro',
    description: '免费在线AI证件照制作工具，支持一寸、二寸、小一寸、小二寸等标准尺寸，AI智能抠图换背景，红底蓝底白底一键切换，自定义像素尺寸，排版打印下载。',
    keywords: '证件照制作,在线证件照,一寸照片,二寸照片,证件照换底色,AI证件照,证件照背景色,免费证件照',
  },
  '/watermark-removal': {
    title: '在线AI去水印工具 - 智能识别去除图片水印 | AI Box Pro',
    description: '免费在线AI去水印工具，利用AI智能识别并去除图片中的水印、文字、Logo，保留原图画质，无需安装软件，上传图片即可处理。',
    keywords: '去水印,图片去水印,在线去水印,AI去水印,免费去水印,去除水印',
  },
  '/image-compress': {
    title: '在线图片压缩工具 - 高质量多模式压缩 | AI Box Pro',
    description: '免费在线图片压缩工具，支持智能压缩、质量压缩、尺寸压缩多种模式，压缩率高且画质保持优秀，支持JPG、PNG、WebP等格式。',
    keywords: '图片压缩,在线压缩,图片缩小,压缩图片,图片优化,批量压缩',
  },
  '/doc-convert': {
    title: '在线文档转换工具 - PDF/Word/Markdown等格式互转 | AI Box Pro',
    description: '免费在线文档格式转换工具，支持PDF转Word、Word转PDF、Markdown转PDF、HTML转PDF、图片转PDF、PDF转图片等7种转换模式，浏览器端处理，安全隐私。',
    keywords: '文档转换,PDF转Word,Word转PDF,Markdown转PDF,格式转换,在线转换,免费转换',
  },
  '/screen-record': {
    title: '在线屏幕录制工具 - 浏览器端录屏 | AI Box Pro',
    description: '免费在线屏幕录制工具，无需安装软件，浏览器直接录屏，支持全屏、窗口、标签页录制，可录制系统声音和麦克风，录制文件本地保存。',
    keywords: '屏幕录制,在线录屏,浏览器录屏,免费录屏,录屏工具',
  },
  '/ai-studio': {
    title: '在线AI创作工具 - AI图片生成·AI视频生成 | AI Box Pro',
    description: '免费在线AI创作平台，支持文字生成图片、文字生成视频、图片生成视频，输入描述即可生成高质量AI作品。',
    keywords: 'AI创作,AI绘画,AI生图,AI视频,文生图,文生视频,AI图片生成',
  },
  '/travel': {
    title: 'AI旅行规划助手 - 智能行程方案生成 | AI Box Pro',
    description: '免费AI旅行规划助手，输入目的地和天数，AI自动生成详细旅行行程，包含景点推荐、交通建议、美食攻略等。',
    keywords: 'AI旅行规划,旅行攻略,行程规划,旅游助手,AI行程',
  },
  '/writer': {
    title: 'AI写作助手 - 润色·续写·改写 | AI Box Pro',
    description: '免费AI写作助手，支持文章润色、续写、改写、扩写，提升写作效率和文本质量，适用于工作报告、论文、自媒体创作。',
    keywords: 'AI写作,写作助手,文章润色,AI续写,AI改写,写作工具',
  },
  '/translator': {
    title: 'AI翻译专家 - 多语言智能翻译 | AI Box Pro',
    description: '免费AI翻译工具，支持中英日韩法德等多语言互译，翻译准确自然，适合文档翻译、学习和商务沟通。',
    keywords: 'AI翻译,在线翻译,多语言翻译,智能翻译,免费翻译',
  },
  '/mind': {
    title: 'AI头脑风暴 - 创意思维拓展工具 | AI Box Pro',
    description: '免费AI头脑风暴工具，输入主题即可获得多角度创意灵感，适用于产品策划、营销方案、内容创作等场景。',
    keywords: 'AI头脑风暴,创意工具,灵感生成,思维拓展,AI创意',
  },
}

/**
 * 页面级 SEO — 在 App.vue 或 layout 中调用一次即可
 * 根据路由自动切换 title / meta description / keywords / canonical
 */
export function useSeo() {
  const route = useRoute()

  const updateMeta = (name, content) => {
    let el = document.querySelector(`meta[name="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  const updateMetaProperty = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('property', property)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  const updateCanonical = (url) => {
    let el = document.querySelector('link[rel="canonical"]')
    if (!el) {
      el = document.createElement('link')
      el.setAttribute('rel', 'canonical')
      document.head.appendChild(el)
    }
    el.setAttribute('href', url)
  }

  watch(
    () => route.path,
    (path) => {
      const config = SEO_CONFIG[path] || SEO_CONFIG['/']
      const url = `https://www.2074912.xyz${path === '/' ? '' : path}`

      // Title
      document.title = config.title

      // Meta
      updateMeta('description', config.description)
      updateMeta('keywords', config.keywords)

      // Canonical
      updateCanonical(url)

      // Open Graph
      updateMetaProperty('og:title', config.title)
      updateMetaProperty('og:description', config.description)
      updateMetaProperty('og:url', url)

      // Twitter
      updateMeta('twitter:title', config.title)
      updateMeta('twitter:description', config.description)
    },
    { immediate: true },
  )
}
