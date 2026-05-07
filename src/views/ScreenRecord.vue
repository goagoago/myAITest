<script setup>
import '../styles/internal-page.scss'
import { ref, computed } from 'vue'
import { useScreenRecord } from '../composables/useScreenRecord'
import FeatureCostBadge from '../components/account/FeatureCostBadge.vue'
import {
  MonitorPlay, Circle, Pause, Play, Square, Download,
  RefreshCw, AlertCircle, Mic, MicOff, Volume2, VolumeX,
  Info, Clock, Video
} from 'lucide-vue-next'

const {
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
} = useScreenRecord()

// 录制选项
const systemAudio = ref(true)
const microphone = ref(false)

// 格式化时间
const formattedTime = computed(() => {
  const h = Math.floor(duration.value / 3600)
  const m = Math.floor((duration.value % 3600) / 60)
  const s = duration.value % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
})

function pad(n) {
  return n.toString().padStart(2, '0')
}

// 文件大小
const fileSize = computed(() => {
  if (!resultBlob.value) return ''
  const size = resultBlob.value.size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})

const handleStart = async () => {
  try {
    await startRecording({
      systemAudio: systemAudio.value,
      microphone: microphone.value,
    })
  } catch (e) {
    // error 已在 composable 中设置
  }
}

const handleDownload = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  downloadRecording(`屏幕录制_${timestamp}`)
}

const resetAll = () => {
  reset()
}
</script>

<template>
  <div class="screen-record internal-page">
    <!-- 头部 -->
    <header class="header">
      <div class="header__content">
        <div class="header__badge">
          <MonitorPlay :size="14" />
          <span>屏幕录制</span>
        </div>
        <h1 class="header__title">
          <span>屏幕录制，</span>
          <span class="gradient-text">一键开始</span>
        </h1>
        <p class="header__desc">
          纯浏览器端录屏，支持系统声音和麦克风录制，无需安装插件
        </p>
      </div>
    </header>

    <div class="main-area">
      <!-- 录制控制面板 -->
      <div class="panel panel--control">
        <!-- 未在录制：设置 + 开始按钮 -->
        <template v-if="!recording && !resultUrl">
          <h3 class="section-label">
            <Video :size="16" />
            <span>录制设置</span>
          </h3>

          <!-- 音频选项 -->
          <div class="audio-options">
            <button
              :class="['audio-btn', { 'audio-btn--active': systemAudio }]"
              @click="systemAudio = !systemAudio"
            >
              <Volume2 v-if="systemAudio" :size="20" />
              <VolumeX v-else :size="20" />
              <div class="audio-btn__text">
                <span class="audio-btn__label">系统声音</span>
                <span class="audio-btn__desc">{{ systemAudio ? '已开启' : '已关闭' }}</span>
              </div>
            </button>

            <button
              :class="['audio-btn', { 'audio-btn--active': microphone }]"
              @click="microphone = !microphone"
            >
              <Mic v-if="microphone" :size="20" />
              <MicOff v-else :size="20" />
              <div class="audio-btn__text">
                <span class="audio-btn__label">麦克风</span>
                <span class="audio-btn__desc">{{ microphone ? '已开启' : '已关闭' }}</span>
              </div>
            </button>
          </div>

          <div class="info-tip">
            <Info :size="16" />
            <span>点击开始后，浏览器会弹出选择共享屏幕/窗口/标签页的对话框。系统声音需要勾选"共享音频"选项。</span>
          </div>

          <!-- 开始录制 -->
          <button class="start-btn" @click="handleStart">
            <Circle :size="22" class="rec-dot" />
            <span>开始录制</span>
            <FeatureCostBadge feature-code="screen-record" strong />
          </button>
        </template>

        <!-- 录制中 -->
        <template v-if="recording">
          <div class="recording-indicator">
            <span class="rec-pulse"></span>
            <span class="rec-text">{{ paused ? '已暂停' : '录制中' }}</span>
          </div>

          <!-- 计时器 -->
          <div class="timer">
            <Clock :size="20" />
            <span class="timer-value">{{ formattedTime }}</span>
          </div>

          <!-- 控制按钮 -->
          <div class="controls">
            <button
              v-if="!paused"
              class="control-btn control-btn--pause"
              @click="pauseRecording"
            >
              <Pause :size="22" />
              <span>暂停</span>
            </button>
            <button
              v-else
              class="control-btn control-btn--resume"
              @click="resumeRecording"
            >
              <Play :size="22" />
              <span>继续</span>
            </button>
            <button
              class="control-btn control-btn--stop"
              @click="stopRecording"
            >
              <Square :size="20" />
              <span>停止录制</span>
            </button>
          </div>

          <!-- 音频状态 -->
          <div class="audio-status">
            <span :class="['status-tag', { 'status-tag--on': systemAudio }]">
              <Volume2 :size="12" />
              系统声音{{ systemAudio ? ' ON' : ' OFF' }}
            </span>
            <span :class="['status-tag', { 'status-tag--on': microphone }]">
              <Mic :size="12" />
              麦克风{{ microphone ? ' ON' : ' OFF' }}
            </span>
          </div>
        </template>

        <!-- 录制完成 -->
        <template v-if="!recording && resultUrl">
          <div class="done-indicator">
            <MonitorPlay :size="20" />
            <span>录制完成</span>
          </div>

          <div class="result-meta">
            <div class="meta-item">
              <span class="meta-label">时长</span>
              <span class="meta-value">{{ formattedTime }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">大小</span>
              <span class="meta-value">{{ fileSize }}</span>
            </div>
          </div>

          <div class="done-actions">
            <button class="action-btn action-btn--primary" @click="handleDownload">
              <Download :size="18" />
              <span>下载视频</span>
            </button>
            <button class="action-btn" @click="resetAll">
              <RefreshCw :size="18" />
              <span>重新录制</span>
            </button>
          </div>
        </template>

        <!-- 错误 -->
        <div v-if="error" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- 预览面板 -->
      <div class="panel panel--preview">
        <div v-if="resultUrl" class="video-preview">
          <video
            :src="resultUrl"
            controls
            class="preview-video"
          ></video>
        </div>
        <div v-else class="preview-placeholder">
          <div class="placeholder-icon">
            <MonitorPlay :size="56" />
          </div>
          <p v-if="recording" class="placeholder-text">正在录制屏幕...</p>
          <p v-else class="placeholder-text">录制预览将在这里显示</p>
          <span class="placeholder-tip">录制结束后可在此预览和下载</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped lang="scss">
.screen-record {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* 头部 */
.header {
  padding: 60px 0 40px;
  text-align: center;
}

.header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.15));
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #f87171;
  margin-bottom: 24px;
}

.header__badge svg { color: #f87171; }

.header__title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__desc {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

/* 主区域 */
.main-area {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 32px;
  margin-bottom: 48px;
}

.panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 28px;
}

.panel--preview {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

/* 录制设置 */
.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.section-label svg { color: var(--text-muted); }

.audio-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.audio-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  color: #475569;
  text-align: left;
}

.audio-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.audio-btn--active {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.36);
  color: #7f1d1d;
}

.audio-btn__text { display: flex; flex-direction: column; gap: 2px; }

.audio-btn__label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.audio-btn__desc {
  font-size: 0.75rem;
  color: inherit;
}

.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  font-size: 0.8125rem;
  color: rgba(147, 197, 253, 0.9);
  line-height: 1.5;
  margin-bottom: 24px;
}

.info-tip svg { color: #60a5fa; flex-shrink: 0; margin-top: 1px; }

/* 开始按钮 */
.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 18px 32px;
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  border: none;
  border-radius: 16px;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  cursor: pointer;
  transition: all 0.4s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -10px rgba(239, 68, 68, 0.5);
}

.rec-dot {
  fill: currentColor;
  animation: pulse-rec 1.5s ease infinite;
}

@keyframes pulse-rec {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 录制中 */
.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
}

.rec-pulse {
  width: 12px;
  height: 12px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse-glow-red 1.5s ease infinite;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
}

@keyframes pulse-glow-red {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.rec-text {
  font-size: 1.125rem;
  font-weight: 700;
  color: #f87171;
}

.timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 16px;
  margin-bottom: 24px;
}

.timer svg { color: #f87171; }

.timer-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.control-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: none;
  border-radius: 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.control-btn--pause {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.control-btn--pause:hover {
  background: rgba(245, 158, 11, 0.25);
}

.control-btn--resume {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.control-btn--resume:hover {
  background: rgba(34, 197, 94, 0.25);
}

.control-btn--stop {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.control-btn--stop:hover {
  background: rgba(239, 68, 68, 0.25);
}

.audio-status {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-muted);
}

.status-tag--on {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

/* 录制完成 */
.done-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  font-size: 1.125rem;
  font-weight: 700;
  color: #4ade80;
}

.done-indicator svg { color: #4ade80; }

.result-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.meta-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.done-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.action-btn--primary {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  border: none;
  color: white;
}

.action-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -8px rgba(239, 68, 68, 0.5);
}

/* 预览面板 */
.video-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-video {
  width: 100%;
  max-height: 500px;
  border-radius: 16px;
  background: #000;
  outline: none;
}

.preview-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.placeholder-icon {
  width: 110px;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  margin-bottom: 20px;
}

.placeholder-icon svg { opacity: 0.4; }

.placeholder-text {
  font-size: 1rem;
  margin-bottom: 6px;
}

.placeholder-tip {
  font-size: 0.8125rem;
  opacity: 0.6;
}

/* 错误 */
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

/* 功能说明 */
.features-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.feature-item {
  padding: 28px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  text-align: center;
  transition: all 0.3s;
}

.feature-item:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 15px 40px -15px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.feature-item h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.feature-item p {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 响应式 */
@media (max-width: 900px) {
  .screen-record { padding: 0 20px 60px; }
  .header__title { font-size: 2rem; }
  .main-area { grid-template-columns: 1fr; }
  .features-section { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .features-section { grid-template-columns: 1fr; }
  .controls { flex-direction: column; }
}
</style>
