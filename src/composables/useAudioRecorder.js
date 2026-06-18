import { ref, onUnmounted } from 'vue'

export function useAudioRecorder() {
  const isRecording = ref(false)
  const recordingTime = ref(0)
  const maxDuration = 60
  const audioLevel = ref(0)
  
  let mediaRecorder = null
  let audioChunks = []
  let stream = null
  let timerInterval = null
  let audioContext = null
  let analyser = null
  let dataArray = null
  let animationFrame = null

  async function startRecording() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      })
      
      audioChunks = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      mediaRecorder.start(100)
      isRecording.value = true
      recordingTime.value = 0
      
      timerInterval = setInterval(() => {
        recordingTime.value++
        if (recordingTime.value >= maxDuration) {
          stopRecording()
        }
      }, 1000)
      
      updateAudioLevel()
      
      return true
    } catch (e) {
      console.error('录音失败:', e)
      cleanup()
      return false
    }
  }

  function updateAudioLevel() {
    if (!analyser || !isRecording.value) return
    
    analyser.getByteFrequencyData(dataArray)
    const sum = dataArray.reduce((a, b) => a + b, 0)
    const average = sum / dataArray.length
    audioLevel.value = Math.min(100, Math.round((average / 255) * 100))
    
    animationFrame = requestAnimationFrame(updateAudioLevel)
  }

  async function stopRecording() {
    return new Promise((resolve) => {
      if (!mediaRecorder) {
        resolve(null)
        return
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const duration = recordingTime.value
        
        cleanup()
        
        resolve({
          blob: audioBlob,
          duration,
          url: URL.createObjectURL(audioBlob)
        })
      }
      
      mediaRecorder.stop()
    })
  }

  function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    cleanup()
  }

  function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    
    mediaRecorder = null
    audioChunks = []
    isRecording.value = false
    recordingTime.value = 0
    audioLevel.value = 0
    analyser = null
    dataArray = null
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    isRecording,
    recordingTime,
    maxDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording
  }
}
