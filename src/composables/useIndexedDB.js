import { ref } from 'vue'

const DB_NAME = 'PostcardAudioDB'
const DB_VERSION = 1
const STORE_NAME = 'voiceMessages'

let dbInstance = null

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('IndexedDB 打开失败:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

export function useIndexedDB() {
  const isReady = ref(false)

  async function init() {
    try {
      await openDB()
      isReady.value = true
      return true
    } catch (e) {
      console.error('IndexedDB 初始化失败:', e)
      return false
    }
  }

  async function saveAudio(id, audioBlob, duration) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const data = {
        id,
        audioBlob,
        duration,
        createdAt: Date.now()
      }
      
      const request = store.put(data)
      
      request.onsuccess = () => resolve(data)
      request.onerror = () => reject(request.error)
    })
  }

  async function getAudio(id) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async function deleteAudio(id) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  async function getAllAudios() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async function getAudioUrl(id) {
    const data = await getAudio(id)
    if (!data) return null
    return URL.createObjectURL(data.audioBlob)
  }

  return {
    isReady,
    init,
    saveAudio,
    getAudio,
    deleteAudio,
    getAllAudios,
    getAudioUrl
  }
}
