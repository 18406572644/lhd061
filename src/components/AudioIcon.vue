<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useIndexedDB } from '@/composables/useIndexedDB.js'
import { recordIcons } from '@/data/music.js'

const props = defineProps({
  audioData: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-play', 'select'])

const { getAudioUrl } = useIndexedDB()

const audioElement = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioUrl = ref(null)
const isLoading = ref(false)

const iconType = computed(() => props.audioData.iconType || 'record')
const iconObj = computed(() => recordIcons.find(i => i.id === iconType.value) || recordIcons[0])

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const formatTime = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function loadAudio() {
  if (!props.audioData) return
  
  isLoading.value = true
  
  try {
    if (props.audioData.type === 'voice' && props.audioData.voiceId) {
      const url = await getAudioUrl(props.audioData.voiceId)
      if (url) {
        audioUrl.value = url
      }
    } else if (props.audioData.url) {
      audioUrl.value = props.audioData.url
    }
  } catch (e) {
    console.error('加载音频失败:', e)
  } finally {
    isLoading.value = false
  }
}

function initAudio() {
  if (!audioElement.value) return
  
  audioElement.value.addEventListener('timeupdate', () => {
    currentTime.value = audioElement.value.currentTime
  })
  
  audioElement.value.addEventListener('loadedmetadata', () => {
    duration.value = audioElement.value.duration || props.audioData.duration
  })
  
  audioElement.value.addEventListener('ended', () => {
    isPlaying.value = false
    currentTime.value = 0
    emit('toggle-play', false)
  })
  
  audioElement.value.addEventListener('play', () => {
    isPlaying.value = true
    emit('toggle-play', true)
  })
  
  audioElement.value.addEventListener('pause', () => {
    isPlaying.value = false
    emit('toggle-play', false)
  })
}

function togglePlay(e) {
  if (e) e.stopPropagation()
  if (isLoading.value || !audioElement.value) return
  
  if (isPlaying.value) {
    audioElement.value.pause()
  } else {
    audioElement.value.play()
  }
}

function handleClick(e) {
  if (e) e.stopPropagation()
  emit('select')
}

watch(() => props.audioData, () => {
  if (audioElement.value) {
    audioElement.value.pause()
    isPlaying.value = false
    currentTime.value = 0
  }
  loadAudio()
}, { immediate: true })

onUnmounted(() => {
  if (audioElement.value) {
    audioElement.value.pause()
  }
})

defineExpose({
  pause: () => {
    if (audioElement.value) {
      audioElement.value.pause()
    }
  },
  play: () => {
    if (audioElement.value) {
      audioElement.value.play()
    }
  },
  getAudioElement: () => audioElement.value
})
</script>

<template>
  <div 
    class="relative select-none"
    @click="handleClick"
  >
    <audio 
      ref="audioElement"
      :src="audioUrl"
      preload="metadata"
      @loadedmetadata="initAudio"
    ></audio>
    
    <div 
      class="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden cursor-pointer group"
      :style="{ 
        backgroundColor: audioData.bgColor || '#dcb573',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }"
    >
      <div v-if="iconType === 'record'" class="relative w-full h-full">
        <div 
          class="absolute inset-0 rounded-full flex items-center justify-center"
          :style="{ backgroundColor: audioData.color || '#1a2c52' }"
        >
          <div class="absolute inset-2 rounded-full border-4 border-kraft-200/30"></div>
          <div class="absolute inset-6 rounded-full border-2 border-kraft-200/20"></div>
          <div class="absolute inset-10 rounded-full border border-kraft-200/10"></div>
          
          <div 
            class="absolute w-8 h-8 rounded-full"
            :style="{ backgroundColor: audioData.bgColor || '#dcb573' }"
          ></div>
          
          <div 
            class="absolute w-3 h-3 rounded-full bg-navy-900"
          ></div>
        </div>
        
        <div 
          v-if="isPlaying"
          class="absolute inset-0 rounded-full border-4 border-postred-500 animate-spin"
          style="animation-duration: 3s; border-style: dashed;"
        ></div>
      </div>
      
      <div v-else class="relative w-full h-full flex items-center justify-center p-2">
        <div 
          class="w-full h-[60%] rounded-sm flex items-center justify-center"
          :style="{ backgroundColor: audioData.color || '#1a2c52' }"
        >
          <div class="w-2/3 h-1/2 flex items-center gap-1">
            <div class="flex-1 h-full bg-kraft-900/40 rounded-sm flex items-center justify-center">
              <div 
                v-if="isPlaying" 
                class="flex gap-0.5 items-end h-1/2"
              >
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 40%; animation-delay: 0s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 70%; animation-delay: 0.1s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 50%; animation-delay: 0.2s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 80%; animation-delay: 0.3s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 60%; animation-delay: 0.4s;"></div>
              </div>
              <div v-else class="text-kraft-200/50 text-[8px] font-mono">▶▶</div>
            </div>
            <div class="flex-1 h-full bg-kraft-900/40 rounded-sm flex items-center justify-center">
              <div 
                v-if="isPlaying" 
                class="flex gap-0.5 items-end h-1/2"
              >
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 60%; animation-delay: 0.2s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 40%; animation-delay: 0.3s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 90%; animation-delay: 0.4s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 30%; animation-delay: 0.5s;"></div>
                <div class="w-1 bg-kraft-200 animate-pulse" style="height: 70%; animation-delay: 0.6s;"></div>
              </div>
              <div v-else class="text-kraft-200/50 text-[8px] font-mono">◀◀</div>
            </div>
          </div>
        </div>
        
        <div class="absolute top-2 left-2 w-3 h-3 rounded-full border-2" :style="{ borderColor: audioData.color || '#1a2c52' }"></div>
        <div class="absolute top-2 right-2 w-3 h-3 rounded-full border-2" :style="{ borderColor: audioData.color || '#1a2c52' }"></div>
        <div class="absolute bottom-2 left-2 w-3 h-3 rounded-full border-2" :style="{ borderColor: audioData.color || '#1a2c52' }"></div>
        <div class="absolute bottom-2 right-2 w-3 h-3 rounded-full border-2" :style="{ borderColor: audioData.color || '#1a2c52' }"></div>
      </div>
      
      <button
        class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full"
        @click="togglePlay"
        :disabled="isLoading"
      >
        <div 
          class="w-12 h-12 rounded-full flex items-center justify-center text-kraft-50 text-xl shadow-lg"
          :class="isPlaying ? 'bg-postred-500' : 'bg-navy-800'"
        >
          {{ isLoading ? '⏳' : (isPlaying ? '⏸' : '▶') }}
        </div>
      </button>
      
      <div 
        v-if="isSelected && !readOnly"
        class="absolute -bottom-1 left-0 right-0 h-1 bg-kraft-300 rounded-full overflow-hidden"
      >
        <div 
          class="h-full bg-postred-500 transition-all duration-100"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>
    
    <div 
      v-if="isSelected && !readOnly"
      class="absolute -bottom-6 left-0 right-0 text-center text-xs font-serif-sc text-navy-800 truncate"
    >
      {{ audioData.name }} · {{ formatTime(duration || audioData.duration) }}
    </div>
  </div>
</template>
