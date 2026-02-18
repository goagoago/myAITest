<script setup>
import { ref, computed } from 'vue'
import { useImage } from '../composables/useImage'
import { useVideo } from '../composables/useVideo'
import {
  Image, Video, Sparkles, Wand2, Download, RefreshCw, Loader2,
  ImagePlus, Film, Palette, Maximize2, Clock, Check, X, AlertCircle
} from 'lucide-vue-next'

// 当前激活的Tab
const activeTab = ref('image')

// 图片生成
const imagePrompt = ref('')
const imageSize = ref('1024x1024')
const {
  loading: imageLoading,
  error: imageError,
  imageUrl,
  progress: imageProgress,
  generateImage,
  reset: resetImage
} = useImage()

// 视频生成
const videoPrompt = ref('')
const {
  loading: videoLoading,
  error: videoError,
  videoUrl,
  status: videoStatus,
  progress: videoProgress,
  generateVideo,
  cancel: cancelVideo,
  reset: resetVideo
} = useVideo()

// 历史记录
const imageHistory = ref([])
const videoHistory = ref([])

// 图片尺寸选项
const imageSizes = [
  { value: '1024x1024', label: '1:1 方形', icon: '⬛' },
  { value: '1024x576', label: '16:9 横版', icon: '▬' },
  { value: '576x1024', label: '9:16 竖版', icon: '▮' },
  { value: '768x1024', label: '3:4 竖版', icon: '▯' },
]

// 示例提示词
const imageExamples = [
  '一只可爱的橘猫躺在阳光下的窗台上，旁边有绿植，温馨治愈风格',
  '赛博朋克风格的未来城市，霓虹灯闪烁，雨夜，电影感',
  '中国山水画风格的桂林风景，云雾缭绕，意境悠远',
  '宇航员在月球表面行走，地球在远处升起，科幻写实风格',
]

const videoExamples = [
  '一阵微风吹过，樱花从树上飘落，花瓣在空中旋转',
  '海浪轻轻拍打沙滩，日落时分，金色的阳光洒在海面上',
  '一只蝴蝶在花丛中翩翩起舞，从一朵花飞向另一朵花',
  '城市夜景，车流穿梭，霓虹灯闪烁，延时摄影效果',
]

// 生成图片
const handleGenerateImage = async () => {
  if (!imagePrompt.value.trim() || imageLoading.value) return

  try {
    const url = await generateImage(imagePrompt.value, {
      image_size: imageSize.value,
    })

    // 添加到历史记录
    imageHistory.value.unshift({
      id: Date.now(),
      prompt: imagePrompt.value,
      url,
      size: imageSize.value,
      time: new Date().toLocaleTimeString(),
    })

    // 只保留最近10条
    if (imageHistory.value.length > 10) {
      imageHistory.value = imageHistory.value.slice(0, 10)
    }
  } catch (e) {
    console.error('图片生成失败:', e)
  }
}

// 生成视频
const handleGenerateVideo = async () => {
  if (!videoPrompt.value.trim() || videoLoading.value) return

  try {
    const url = await generateVideo(videoPrompt.value)

    // 添加到历史记录
    videoHistory.value.unshift({
      id: Date.now(),
      prompt: videoPrompt.value,
      url,
      time: new Date().toLocaleTimeString(),
    })

    // 只保留最近10条
    if (videoHistory.value.length > 10) {
      videoHistory.value = videoHistory.value.slice(0, 10)
    }
  } catch (e) {
    console.error('视频生成失败:', e)
  }
}

// 使用示例
const useExample = (example, type) => {
  if (type === 'image') {
    imagePrompt.value = example
  } else {
    videoPrompt.value = example
  }
}

// 下载文件
const downloadFile = async (url, filename) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (e) {
    window.open(url, '_blank')
  }
}

// 状态文字
const statusText = computed(() => {
  const statusMap = {
    submitting: '正在提交请求...',
    processing: '视频生成中，请耐心等待...',
    completed: '生成完成！',
    failed: '生成失败',
    timeout: '生成超时',
    cancelled: '已取消',
    error: '发生错误',
  }
  return statusMap[videoStatus.value] || ''
})
</script>

<template>
  <div class="ai-studio">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <Sparkles :size="14" />
          <span>AI 创作工坊</span>
        </div>
        <h1 class="header__title">
          <span>释放创意，</span>
          <span class="gradient-text">AI 帮你实现</span>
        </h1>
        <p class="header__desc">
          输入文字描述，一键生成精美图片和视频
        </p>
      </div>
    </header>

    <!-- Tab 切换 -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'image' }]"
        @click="activeTab = 'image'"
      >
        <Image :size="20" />
        <span>AI 图片</span>
      </button>
      <button
        :class="['tab', { active: activeTab === 'video' }]"
        @click="activeTab = 'video'"
      >
        <Video :size="20" />
        <span>AI 视频</span>
      </button>
    </div>

    <!-- 主内容区 -->
    <div class="main">
      <!-- 图片生成 -->
      <div v-show="activeTab === 'image'" class="panel">
        <div class="panel__input">
          <!-- 输入区 -->
          <div class="input-section">
            <label class="input-label">
              <Wand2 :size="16" />
              <span>描述你想要的图片</span>
            </label>
            <textarea
              v-model="imagePrompt"
              class="textarea"
              placeholder="例如：一只可爱的橘猫躺在阳光下的窗台上..."
              rows="4"
              :disabled="imageLoading"
            ></textarea>

            <!-- 尺寸选择 -->
            <div class="size-selector">
              <label class="input-label">
                <Maximize2 :size="16" />
                <span>图片尺寸</span>
              </label>
              <div class="size-options">
                <button
                  v-for="size in imageSizes"
                  :key="size.value"
                  :class="['size-btn', { active: imageSize === size.value }]"
                  @click="imageSize = size.value"
                  :disabled="imageLoading"
                >
                  <span class="size-icon">{{ size.icon }}</span>
                  <span>{{ size.label }}</span>
                </button>
              </div>
            </div>

            <!-- 示例提示词 -->
            <div class="examples">
              <span class="examples-label">试试这些：</span>
              <div class="examples-list">
                <button
                  v-for="(example, i) in imageExamples"
                  :key="i"
                  class="example-btn"
                  @click="useExample(example, 'image')"
                  :disabled="imageLoading"
                >
                  {{ example.slice(0, 15) }}...
                </button>
              </div>
            </div>

            <!-- 生成按钮 -->
            <button
              class="generate-btn"
              :disabled="!imagePrompt.trim() || imageLoading"
              @click="handleGenerateImage"
            >
              <Loader2 v-if="imageLoading" :size="20" class="spin" />
              <ImagePlus v-else :size="20" />
              <span>{{ imageLoading ? '生成中...' : '生成图片' }}</span>
            </button>

            <!-- 进度条 -->
            <div v-if="imageLoading" class="progress-bar">
              <div class="progress-fill" :style="{ width: imageProgress + '%' }"></div>
            </div>

            <!-- 错误提示 -->
            <div v-if="imageError" class="error-msg">
              <AlertCircle :size="16" />
              <span>{{ imageError }}</span>
            </div>
          </div>

          <!-- 结果展示 -->
          <div class="result-section">
            <div v-if="imageUrl" class="result-image">
              <img :src="imageUrl" alt="生成的图片" />
              <div class="result-actions">
                <button class="action-btn" @click="downloadFile(imageUrl, `ai-image-${Date.now()}.png`)">
                  <Download :size="18" />
                  <span>下载</span>
                </button>
                <button class="action-btn" @click="resetImage">
                  <RefreshCw :size="18" />
                  <span>重置</span>
                </button>
              </div>
            </div>
            <div v-else class="result-placeholder">
              <div class="placeholder-icon">
                <Image :size="48" />
              </div>
              <p>生成的图片将在这里显示</p>
            </div>
          </div>
        </div>

        <!-- 历史记录 -->
        <div v-if="imageHistory.length" class="history">
          <h3 class="history-title">
            <Clock :size="16" />
            <span>历史记录</span>
          </h3>
          <div class="history-grid">
            <div
              v-for="item in imageHistory"
              :key="item.id"
              class="history-item"
              @click="imageUrl = item.url"
            >
              <img :src="item.url" :alt="item.prompt" />
              <div class="history-info">
                <p class="history-prompt">{{ item.prompt }}</p>
                <span class="history-time">{{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 视频生成 -->
      <div v-show="activeTab === 'video'" class="panel">
        <div class="panel__input">
          <!-- 输入区 -->
          <div class="input-section">
            <label class="input-label">
              <Wand2 :size="16" />
              <span>描述你想要的视频画面</span>
            </label>
            <textarea
              v-model="videoPrompt"
              class="textarea"
              placeholder="例如：一阵微风吹过，樱花从树上飘落，花瓣在空中旋转..."
              rows="4"
              :disabled="videoLoading"
            ></textarea>

            <!-- 提示信息 -->
            <div class="video-tips">
              <Palette :size="14" />
              <span>提示：描述具体的动作和场景变化，效果更好</span>
            </div>

            <!-- 示例提示词 -->
            <div class="examples">
              <span class="examples-label">试试这些：</span>
              <div class="examples-list">
                <button
                  v-for="(example, i) in videoExamples"
                  :key="i"
                  class="example-btn"
                  @click="useExample(example, 'video')"
                  :disabled="videoLoading"
                >
                  {{ example.slice(0, 15) }}...
                </button>
              </div>
            </div>

            <!-- 生成按钮 -->
            <div class="btn-group">
              <button
                class="generate-btn"
                :disabled="!videoPrompt.trim() || videoLoading"
                @click="handleGenerateVideo"
              >
                <Loader2 v-if="videoLoading" :size="20" class="spin" />
                <Film v-else :size="20" />
                <span>{{ videoLoading ? '生成中...' : '生成视频' }}</span>
              </button>
              <button
                v-if="videoLoading"
                class="cancel-btn"
                @click="cancelVideo"
              >
                <X :size="18" />
                <span>取消</span>
              </button>
            </div>

            <!-- 进度条 -->
            <div v-if="videoLoading" class="progress-section">
              <div class="progress-bar">
                <div class="progress-fill progress-fill--animated" :style="{ width: videoProgress + '%' }"></div>
              </div>
              <div class="progress-status">
                <span class="status-text">{{ statusText }}</span>
                <span class="status-percent">{{ videoProgress }}%</span>
              </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="videoError" class="error-msg">
              <AlertCircle :size="16" />
              <span>{{ videoError }}</span>
            </div>
          </div>

          <!-- 结果展示 -->
          <div class="result-section">
            <div v-if="videoUrl" class="result-video">
              <video :src="videoUrl" controls autoplay loop></video>
              <div class="result-actions">
                <button class="action-btn" @click="downloadFile(videoUrl, `ai-video-${Date.now()}.mp4`)">
                  <Download :size="18" />
                  <span>下载</span>
                </button>
                <button class="action-btn" @click="resetVideo">
                  <RefreshCw :size="18" />
                  <span>重置</span>
                </button>
              </div>
            </div>
            <div v-else class="result-placeholder">
              <div class="placeholder-icon">
                <Video :size="48" />
              </div>
              <p>生成的视频将在这里显示</p>
              <span class="placeholder-tip">视频生成通常需要 30-60 秒</span>
            </div>
          </div>
        </div>

        <!-- 历史记录 -->
        <div v-if="videoHistory.length" class="history">
          <h3 class="history-title">
            <Clock :size="16" />
            <span>历史记录</span>
          </h3>
          <div class="history-grid history-grid--video">
            <div
              v-for="item in videoHistory"
              :key="item.id"
              class="history-item history-item--video"
              @click="videoUrl = item.url"
            >
              <video :src="item.url" muted></video>
              <div class="play-overlay">
                <Film :size="24" />
              </div>
              <div class="history-info">
                <p class="history-prompt">{{ item.prompt }}</p>
                <span class="history-time">{{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-studio {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* ═══════════════════════════════════════════════════════════
   头部
   ═══════════════════════════════════════════════════════════ */

.header {
  padding: 60px 0 40px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(239, 68, 68, 0.15));
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #f472b6;
  margin-bottom: 24px;
}

.header__badge svg {
  color: #f472b6;
}

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════════════════════════
   Tab 切换
   ═══════════════════════════════════════════════════════════ */

.tabs {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.tab.active {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(239, 68, 68, 0.15));
  border-color: rgba(236, 72, 153, 0.4);
  color: #f472b6;
}

.tab.active svg {
  color: #f472b6;
}

/* ═══════════════════════════════════════════════════════════
   主面板
   ═══════════════════════════════════════════════════════════ */

.panel__input {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 48px;
}

.input-section,
.result-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 28px;
}

/* 输入标签 */
.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.input-label svg {
  color: var(--primary);
}

/* 文本框 */
.textarea {
  width: 100%;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  font-size: 1rem;
  color: var(--text-primary);
  resize: none;
  transition: all 0.3s;
  font-family: inherit;
}

.textarea::placeholder {
  color: var(--text-muted);
}

.textarea:focus {
  outline: none;
  border-color: rgba(236, 72, 153, 0.5);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 尺寸选择器 */
.size-selector {
  margin-top: 20px;
}

.size-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.size-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.size-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.size-btn.active {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.4);
  color: #f472b6;
}

.size-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.size-icon {
  font-size: 1rem;
}

/* 示例提示词 */
.examples {
  margin-top: 20px;
}

.examples-label {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.examples-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.example-btn {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.example-btn:hover:not(:disabled) {
  background: rgba(236, 72, 153, 0.1);
  border-color: rgba(236, 72, 153, 0.3);
  color: #f472b6;
}

.example-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 视频提示 */
.video-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 12px;
  font-size: 0.8125rem;
  color: #fbbf24;
}

/* 按钮组 */
.btn-group {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

/* 生成按钮 */
.generate-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s;
  margin-top: 24px;
}

.btn-group .generate-btn {
  margin-top: 0;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(236, 72, 153, 0.5);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.cancel-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 进度条 */
.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ec4899, #f43f5e);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill--animated {
  background: linear-gradient(90deg, #ec4899, #f43f5e, #ec4899);
  background-size: 200% 100%;
  animation: progress-shine 2s linear infinite;
}

@keyframes progress-shine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.progress-section {
  margin-top: 16px;
}

.progress-status {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.8125rem;
}

.status-text {
  color: var(--text-secondary);
}

.status-percent {
  color: #f472b6;
  font-weight: 600;
}

/* 错误提示 */
.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  font-size: 0.875rem;
  color: #ef4444;
}

/* ═══════════════════════════════════════════════════════════
   结果展示
   ═══════════════════════════════════════════════════════════ */

.result-section {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.result-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.placeholder-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  margin-bottom: 16px;
}

.placeholder-icon svg {
  opacity: 0.4;
}

.result-placeholder p {
  font-size: 0.9375rem;
  margin-bottom: 4px;
}

.placeholder-tip {
  font-size: 0.8125rem;
  opacity: 0.6;
}

.result-image,
.result-video {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-image img,
.result-video video {
  flex: 1;
  width: 100%;
  max-height: 450px;
  object-fit: contain;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════════════════════
   历史记录
   ═══════════════════════════════════════════════════════════ */

.history {
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.history-title svg {
  color: var(--text-muted);
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.history-grid--video {
  grid-template-columns: repeat(4, 1fr);
}

.history-item {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px -10px rgba(0, 0, 0, 0.4);
}

.history-item img,
.history-item video {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.history-item--video video {
  aspect-ratio: 16/9;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.3s;
}

.history-item--video:hover .play-overlay {
  opacity: 1;
}

.play-overlay svg {
  color: white;
}

.history-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.history-prompt {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.history-time {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
}

/* ═══════════════════════════════════════════════════════════
   动画
   ═══════════════════════════════════════════════════════════ */

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ═══════════════════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 900px) {
  .ai-studio {
    padding: 0 20px 60px;
  }

  .header__title {
    font-size: 2rem;
  }

  .panel__input {
    grid-template-columns: 1fr;
  }

  .history-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .history-grid--video {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .tabs {
    flex-direction: column;
  }

  .tab {
    justify-content: center;
  }

  .size-options {
    flex-direction: column;
  }

  .size-btn {
    justify-content: center;
  }

  .history-grid,
  .history-grid--video {
    grid-template-columns: repeat(2, 1fr);
  }

  .btn-group {
    flex-direction: column;
  }
}
</style>
