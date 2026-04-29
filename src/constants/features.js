export const FEATURE_CATALOG = [
  { code: 'watermark-removal', name: '图片去水印', category: '图片工具', description: '智能识别并去除图片或 PDF 水印', cost: 3 },
  { code: 'image-compress', name: '图片压缩', category: '图片工具', description: '按尺寸、质量或目标大小压缩图片', cost: 0 },
  { code: 'id-photo', name: '证件照制作', category: '图片工具', description: 'AI 抠图并输出标准证件照', cost: 0 },
  { code: 'remove-bg', name: 'AI 抠图', category: '图片工具', description: '自动去除图片背景并导出透明图', cost: 0 },
  { code: 'video-compress', name: '视频压缩', category: '音视频工具', description: '浏览器端压缩视频并导出', cost: 0 },
  { code: 'screen-record', name: '屏幕录制', category: '音视频工具', description: '录制屏幕、系统声音与麦克风', cost: 0 },
  { code: 'audio-convert', name: '音频转换', category: '音视频工具', description: '浏览器端转换音频格式', cost: 0 },
  { code: 'gif-tools', name: 'GIF 工具', category: '音视频工具', description: '视频转 GIF、GIF 压缩与 GIF 转 MP4', cost: 0 },
  { code: 'doc-convert', name: '文档转换', category: '文档与效率', description: '服务端路径按次收费，本地路径免费', cost: 2 },
  { code: 'data-convert', name: '数据转换', category: '文档与效率', description: 'Excel、CSV、JSON 互转与清洗', cost: 0 },
  { code: 'qr-code', name: '二维码生成', category: '文档与效率', description: '生成并美化二维码', cost: 0 },
  { code: 'qr-scan', name: '二维码解析', category: '文档与效率', description: '解析图片中的二维码内容', cost: 0 },
  { code: 'ocr', name: 'OCR 识别', category: '文档与效率', description: '识别图片或 PDF 文字', cost: 2 },
  { code: 'id-generator', name: '身份证号生成', category: '文档与效率', description: '按规则批量生成测试身份证号', cost: 0 },
  { code: 'resume-builder', name: 'AI 简历工坊', category: '文档与效率', description: 'AI 简历整理、润色和评审', cost: 3 },
  { code: 'travel', name: '旅行规划', category: 'AI 助手', description: '按天数和预算生成旅行方案', cost: 3 },
  { code: 'writer', name: '写作助手', category: 'AI 助手', description: '润色、扩写和续写文本', cost: 3 },
  { code: 'translator', name: '翻译专家', category: 'AI 助手', description: '多语言翻译与表达优化', cost: 3 },
  { code: 'mind', name: '头脑风暴', category: 'AI 助手', description: '创意发散与问题拆解', cost: 3 },
  { code: 'ai-chat', name: 'AI 聊天', category: 'AI 助手', description: '首页通用对话、问答和方案整理', cost: 3 },
  { code: 'ai-image', name: 'AI 生图', category: 'AI 助手', description: '输入提示词生成图片和视觉草图', cost: 10 },
]

export const FEATURE_MAP = FEATURE_CATALOG.reduce((acc, item) => {
  acc[item.code] = item
  return acc
}, {})

export const DAILY_CHECK_IN_REWARD = 10
export const MONTHLY_CHECK_IN_REWARD = 10

export const currentMonthKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

export const getFeatureMeta = (featureCode) => FEATURE_MAP[featureCode] || null
