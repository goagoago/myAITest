<script setup>
import { Upload, X } from 'lucide-vue-next'
import SiteSceneBackground from '../components/SiteSceneBackground.vue'
import HomeToolCategories from './components/home/HomeToolCategories.vue'
import HomeStudioComposer from './components/home/HomeStudioComposer.vue'
import HomeStudioHeader from './components/home/HomeStudioHeader.vue'
import HomeStudioHistoryDrawer from './components/home/HomeStudioHistoryDrawer.vue'
import HomeStudioMessages from './components/home/HomeStudioMessages.vue'
import { useHomeStudio } from '../composables/useHomeStudio'

const {
  isDev,
  pushLoading,
  pushResult,
  pushError,
  pushUrls,
  studioSection,
  setStudioTimeline,
  composerInput,
  studioMode,
  pendingAttachments,
  studioError,
  dragActive,
  historyPanelOpen,
  selectedHistoryTurnId,
  copiedMessageId,
  placeholderFlowText,
  fileInput,
  studioModes,
  visibleStudioMessages,
  hasMessages,
  composerPlaceholder,
  composerActionLabel,
  composerBusyLabel,
  attachmentAccept,
  attachmentHint,
  showPlaceholderFlow,
  canSubmit,
  renderMarkdown,
  resolveAttachmentIcon,
  canEditMessage,
  isEditingMessage,
  clearEditingState,
  startEditingMessage,
  copyAssistantMessage,
  downloadStudioImage,
  startNewConversation,
  isPendingAssistantMessage,
  showImageProgress,
  interruptStudio,
  historyTurnsCount,
  hasHistory,
  historyGroups,
  formatHistoryTime,
  selectHistoryTurn,
  deleteTurn,
  removeAttachment,
  closeHistoryPanel,
  setStudioMode,
  resetStudio,
  formatFileSize,
  handleFiles,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  saveEditedMessage,
  submitStudio,
  studioBusy,
  canInterrupt,
  studioFeatureCode,
  showSuggestions,
  activeSuggestions,
  composerFocused,
  editingDraft,
  highlightedTurnId,
  isStudioFullscreen,
  toggleStudioFullscreen,
} = useHomeStudio()
</script>

<template>
  <div class="home">
    <SiteSceneBackground />

    <section ref="studioSection" class="hero-shell">
      <div class="hero-bg-orb hero-bg-orb--one"></div>
      <div class="hero-bg-orb hero-bg-orb--two"></div>

      <Teleport to="body" :disabled="!isStudioFullscreen">
        <div
          class="studio__shell"
          :class="[
            `studio__shell--${studioMode}`,
            {
              'studio__shell--dragging': dragActive,
              'studio__shell--fullscreen': isStudioFullscreen,
            },
          ]"
          @dragenter="onDragEnter"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <button
            v-if="isStudioFullscreen"
            type="button"
            class="studio__fullscreen-close"
            title="退出全屏 (Esc)"
            aria-label="退出全屏"
            @click="toggleStudioFullscreen"
          >
            <X :size="18" :stroke-width="2.4" />
            <span class="studio__fullscreen-close-kbd">Esc</span>
          </button>

          <div class="studio__workspace">
            <div class="studio__main">
              <HomeStudioHeader
                :studio-modes="studioModes"
                :studio-mode="studioMode"
                :studio-busy="studioBusy"
                :history-turns-count="historyTurnsCount"
                :studio-feature-code="studioFeatureCode"
                :is-fullscreen="isStudioFullscreen"
                @set-mode="setStudioMode"
                @new-conversation="startNewConversation({ mode: studioMode })"
                @toggle-history="historyPanelOpen = !historyPanelOpen"
                @toggle-fullscreen="toggleStudioFullscreen"
              />

              <div v-if="showSuggestions" class="studio__chips">
                <button
                  v-for="item in activeSuggestions"
                  :key="item"
                  type="button"
                  class="studio__chip"
                  @click="submitStudio(item)"
                >
                  {{ item }}
                </button>
              </div>

              <HomeStudioMessages
                v-if="hasMessages"
                v-model:editing-draft="editingDraft"
                :timeline-ref="setStudioTimeline"
                :messages="visibleStudioMessages"
                :copied-message-id="copiedMessageId"
                :highlighted-turn-id="highlightedTurnId"
                :render-markdown="renderMarkdown"
                :resolve-attachment-icon="resolveAttachmentIcon"
                :format-file-size="formatFileSize"
                :can-edit-message="canEditMessage"
                :is-editing-message="isEditingMessage"
                :is-pending-assistant-message="isPendingAssistantMessage"
                :show-image-progress="showImageProgress"
                @copy="copyAssistantMessage"
                @download-image="downloadStudioImage"
                @start-edit="startEditingMessage"
                @clear-edit="clearEditingState"
                @save-edit="saveEditedMessage"
              />

              <HomeStudioComposer
                v-model="composerInput"
                v-model:focused="composerFocused"
                :pending-attachments="pendingAttachments"
                :studio-mode="studioMode"
                :show-placeholder-flow="showPlaceholderFlow"
                :placeholder-flow-text="placeholderFlowText"
                :composer-placeholder="composerPlaceholder"
                :attachment-accept="attachmentAccept"
                :attachment-hint="attachmentHint"
                :studio-busy="studioBusy"
                :composer-busy-label="composerBusyLabel"
                :can-interrupt="canInterrupt"
                :can-submit="canSubmit"
                :composer-action-label="composerActionLabel"
                :file-input-ref="fileInput"
                :resolve-attachment-icon="resolveAttachmentIcon"
                :format-file-size="formatFileSize"
                @handle-files="handleFiles"
                @remove-attachment="removeAttachment"
                @interrupt="interruptStudio"
                @submit="submitStudio()"
              />
            </div>
          </div>
        </div>
      </Teleport>

      <HomeStudioHistoryDrawer
        :open="historyPanelOpen"
        :has-history="hasHistory"
        :history-turns-count="historyTurnsCount"
        :history-groups="historyGroups"
        :selected-history-turn-id="selectedHistoryTurnId"
        :format-history-time="formatHistoryTime"
        @close="closeHistoryPanel"
        @reset="resetStudio"
        @select="selectHistoryTurn"
        @delete="deleteTurn"
      />

      <p v-if="studioError" class="studio__error">{{ studioError }}</p>
    </section>

    <HomeToolCategories />

    <section v-if="isDev" class="baidu-push">
      <div class="baidu-push__inner">
        <span class="baidu-push__label">百度收录推送</span>
        <button class="baidu-push__btn" :disabled="pushLoading" @click="pushUrls()">
          <Upload :size="14" />
          {{ pushLoading ? '推送中...' : '一键推送' }}
        </button>
        <span v-if="pushResult" class="baidu-push__status baidu-push__status--ok">
          成功 {{ pushResult.success }} 条，剩余配额 {{ pushResult.remain }}
        </span>
        <span v-if="pushError" class="baidu-push__status baidu-push__status--err">{{ pushError }}</span>
      </div>
    </section>
  </div>
</template>

<style src="./Home.scss" lang="scss"></style>
