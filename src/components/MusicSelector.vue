<script setup>
import { ref, computed } from 'vue'
import { backgroundMusic } from '@/data/music.js'
import { useIndexedDB } from '@/composables/useIndexedDB.js'
import { useAudioRecorder } from '@/composables/useAudioRecorder.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select-music', 'select-voice'])

const { saveAudio, init: initDB } = useIndexedDB()
const { isRecording, recordingTime, maxDuration, audioLevel, startRecording, stopRecording, cancelRecording } = useAudioRecorder()

const activeTab = ref('music')
const selectedMusicId = ref(null)
const recordedVoice = ref(null)
const previewAudio = ref(null)
const isPreviewPlaying = ref(false)

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const progressPercent = computed(() => (recordingTime.value / maxDuration) * 100)

const selectedMusic = computed(() => 
  backgroundMusic.find(m => m.id === selectedMusicId.value)
)

async function handleStartRecording() {
  await initDB()
  recordedVoice.value = null
  await startRecording()
}

async function handleStopRecording() {
  const result = await stopRecording()
  if (result) {
    recordedVoice.value = result
  }
}

function handleCancelRecording() {
  cancelRecording()
  recordedVoice.value = null
}

function playPreview(url) {
  if (previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value = null
    isPreviewPlaying.value = false
  }
  
  const audio = new Audio(url)
  audio.onended = () => {
    isPreviewPlaying.value = false
    previewAudio.value = null
  }
  audio.play()
  previewAudio.value = audio
  isPreviewPlaying.value = true
}

function stopPreview() {
  if (previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value = null
  }
  isPreviewPlaying.value = false
}

async function confirmMusic() {
  if (!selectedMusic.value) return
  
  stopPreview()
  emit('select-music', {
    type: 'background',
    musicId: selectedMusic.value.id,
    name: selectedMusic.value.name,
    artist: selectedMusic.value.artist,
    url: selectedMusic.value.url,
    duration: selectedMusic.value.duration,
    emoji: selectedMusic.value.emoji,
    color: selectedMusic.value.color,
    bgColor: selectedMusic.value.bgColor
  })
  emit('update:modelValue', false)
}

async function confirmVoice() {
  if (!recordedVoice.value) return
  
  stopPreview()
  const voiceId = 'voice_' + Date.now()
  
  await saveAudio(voiceId, recordedVoice.value.blob, recordedVoice.value.duration)
  
  emit('select-voice', {
    type: 'voice',
    voiceId,
    name: '我的语音留言',
    duration: recordedVoice.value.duration,
    url: recordedVoice.value.url
  })
  emit('update:modelValue', false)
}

function closeDialog() {
  stopPreview()
  if (isRecording.value) {
    handleCancelRecording()
  }
  recordedVoice.value = null
  selectedMusicId.value = null
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closeDialog"
      >
        <div class="bg-kraft-50 rounded-sm border-4 border-navy-800 shadow-vintage max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <div class="bg-navy-800 text-kraft-50 px-6 py-4 border-b-4 border-postred-600">
            <h2 class="font-playfair text-xl font-bold tracking-wider flex items-center gap-2">
              🎵 添加音乐
            </h2>
            <p class="text-kraft-300 text-xs font-serif-sc mt-1">选择背景音乐或录制语音留言</p>
          </div>
          
          <div class="flex border-b-2 border-kraft-300">
            <button
              class="flex-1 py-3 text-sm font-serif-sc transition-all"
              :class="activeTab === 'music'
                ? 'bg-kraft-100 text-navy-800 border-b-4 border-postred-500'
                : 'bg-kraft-50 text-kraft-600 hover:bg-kraft-100'"
              @click="activeTab = 'music'; stopPreview()"
            >
              🎶 背景音乐
            </button>
            <button
              class="flex-1 py-3 text-sm font-serif-sc transition-all"
              :class="activeTab === 'voice'
                ? 'bg-kraft-100 text-navy-800 border-b-4 border-postred-500'
                : 'bg-kraft-50 text-kraft-600 hover:bg-kraft-100'"
              @click="activeTab = 'voice'; stopPreview()"
            >
              🎤 语音留言
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-4">
            <div v-show="activeTab === 'music'" class="space-y-3">
              <div
                v-for="music in backgroundMusic"
                :key="music.id"
                class="p-3 rounded-sm border-2 cursor-pointer transition-all flex items-center gap-4 group"
                :class="selectedMusicId === music.id 
                  ? 'border-postred-500 bg-postred-50' 
                  : 'border-kraft-300 hover:border-navy-400 hover:bg-kraft-100'"
                @click="selectedMusicId = music.id"
              >
                <div 
                  class="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md flex-shrink-0"
                  :style="{ backgroundColor: music.bgColor }"
                >
                  {{ music.emoji }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-serif-sc font-bold text-navy-800 truncate">{{ music.name }}</div>
                  <div class="text-xs text-kraft-600">{{ music.artist }} · {{ formatTime(music.duration) }}</div>
                </div>
                <button
                  class="w-10 h-10 rounded-full bg-navy-800 text-kraft-50 flex items-center justify-center hover:bg-navy-700 transition-colors flex-shrink-0"
                  @click.stop="playPreview(music.url)"
                  title="预览"
                >
                  ▶
                </button>
              </div>
            </div>
            
            <div v-show="activeTab === 'voice'" class="space-y-6">
              <div class="text-center">
                <div 
                  class="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-300"
                  :class="isRecording ? 'bg-postred-100 border-4 border-postred-500' : 'bg-kraft-200 border-4 border-kraft-400'"
                  :style="{ transform: `scale(${1 + audioLevel / 500})` }"
                >
                  <div 
                    class="text-5xl transition-all"
                    :class="isRecording ? 'animate-pulse' : ''"
                  >
                    {{ isRecording ? '🔴' : '🎙️' }}
                  </div>
                </div>
                
                <div v-if="isRecording" class="mb-4">
                  <div class="text-2xl font-playfair font-bold text-postred-600 mb-2">
                    {{ formatTime(recordingTime) }} / {{ formatTime(maxDuration) }}
                  </div>
                  <div class="w-full h-2 bg-kraft-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-postred-500 transition-all duration-300"
                      :style="{ width: progressPercent + '%' }"
                    ></div>
                  </div>
                  <div class="flex justify-center gap-1 mt-2 h-8 items-end">
                    <div 
                      v-for="i in 20" 
                      :key="i"
                      class="w-2 bg-postred-500 rounded-full transition-all duration-100"
                      :style="{ 
                        height: Math.max(4, Math.random() * audioLevel * 0.3) + 'px',
                        opacity: 0.5 + Math.random() * 0.5
                      }"
                    ></div>
                  </div>
                </div>
                
                <div v-if="!isRecording && !recordedVoice" class="text-kraft-600 font-serif-sc text-sm">
                  点击下方按钮开始录制，最长 {{ maxDuration }} 秒
                </div>
                
                <div v-if="recordedVoice" class="mt-4 p-4 bg-kraft-100 rounded-sm border-2 border-kraft-300">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="text-3xl">✅</div>
                    <div class="text-left">
                      <div class="font-serif-sc font-bold text-navy-800">录制完成</div>
                      <div class="text-xs text-kraft-600">时长：{{ formatTime(recordedVoice.duration) }}</div>
                    </div>
                    <button
                      class="ml-auto w-10 h-10 rounded-full bg-navy-800 text-kraft-50 flex items-center justify-center hover:bg-navy-700 transition-colors"
                      @click="playPreview(recordedVoice.url)"
                      title="试听"
                    >
                      ▶
                    </button>
                  </div>
                  <button
                    class="w-full py-2 text-sm text-postred-600 font-serif-sc hover:bg-kraft-200 rounded-sm transition-colors"
                    @click="recordedVoice = null"
                  >
                    🔄 重新录制
                  </button>
                </div>
              </div>
              
              <div class="flex gap-3 justify-center">
                <button
                  v-if="!isRecording && !recordedVoice"
                  class="px-8 py-3 bg-postred-600 text-kraft-50 rounded-sm font-serif-sc font-bold hover:bg-postred-500 transition-colors shadow-md"
                  @click="handleStartRecording"
                >
                  🎤 开始录制
                </button>
                
                <button
                  v-if="isRecording"
                  class="px-6 py-3 bg-postred-600 text-kraft-50 rounded-sm font-serif-sc font-bold hover:bg-postred-500 transition-colors shadow-md"
                  @click="handleStopRecording"
                >
                  ⏹️ 停止
                </button>
                <button
                  v-if="isRecording"
                  class="px-6 py-3 bg-navy-600 text-kraft-50 rounded-sm font-serif-sc font-bold hover:bg-navy-500 transition-colors shadow-md"
                  @click="handleCancelRecording"
                >
                  ❌ 取消
                </button>
              </div>
            </div>
          </div>
          
          <div class="bg-kraft-100 px-6 py-3 border-t-2 border-kraft-300 flex justify-between">
            <button
              class="btn-secondary !text-sm !py-2 !px-5"
              @click="closeDialog"
            >
              取消
            </button>
            <button
              v-if="activeTab === 'music'"
              class="btn-primary !text-sm !py-2 !px-5"
              :class="{ 'opacity-50 cursor-not-allowed': !selectedMusicId }"
              :disabled="!selectedMusicId"
              @click="confirmMusic"
            >
              ✓ 确认添加
            </button>
            <button
              v-if="activeTab === 'voice'"
              class="btn-primary !text-sm !py-2 !px-5"
              :class="{ 'opacity-50 cursor-not-allowed': !recordedVoice }"
              :disabled="!recordedVoice"
              @click="confirmVoice"
            >
              ✓ 确认添加
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
