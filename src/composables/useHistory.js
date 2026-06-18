import { ref, computed } from 'vue'

const MAX_DEPTH = 50
const history = ref([])
const pointer = ref(-1)

export function useHistory() {
  const canUndo = computed(() => pointer.value > 0)
  const canRedo = computed(() => pointer.value < history.value.length - 1)

  function pushSnapshot(state) {
    const snapshot = JSON.parse(JSON.stringify(state))
    if (pointer.value >= 0) {
      const current = history.value[pointer.value]
      if (JSON.stringify(snapshot) === JSON.stringify(current)) return
    }
    history.value = history.value.slice(0, pointer.value + 1)
    history.value.push(snapshot)
    if (history.value.length > MAX_DEPTH) {
      history.value.shift()
    }
    pointer.value = history.value.length - 1
  }

  function undo() {
    if (!canUndo.value) return null
    pointer.value--
    return JSON.parse(JSON.stringify(history.value[pointer.value]))
  }

  function redo() {
    if (!canRedo.value) return null
    pointer.value++
    return JSON.parse(JSON.stringify(history.value[pointer.value]))
  }

  function init(state) {
    history.value = [JSON.parse(JSON.stringify(state))]
    pointer.value = 0
  }

  function clear() {
    history.value = []
    pointer.value = -1
  }

  return { canUndo, canRedo, pushSnapshot, undo, redo, init, clear }
}
