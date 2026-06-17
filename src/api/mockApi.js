import { papers, stamps, postmarks, fonts, defaultTemplates } from '@/data/assets.js'

const WORKS_KEY = 'vintage_postcard_works'
const DRAFT_KEY = 'vintage_postcard_draft'

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

function readStorage(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function writeStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const mockApi = {
  async getPapers() {
    await delay(150)
    return { code: 200, data: papers, message: 'success' }
  },

  async getStamps() {
    await delay(150)
    return { code: 200, data: stamps, message: 'success' }
  },

  async getPostmarks() {
    await delay(150)
    return { code: 200, data: postmarks, message: 'success' }
  },

  async getFonts() {
    await delay(100)
    return { code: 200, data: fonts, message: 'success' }
  },

  async getTemplates() {
    await delay(200)
    return { code: 200, data: defaultTemplates, message: 'success' }
  },

  async getTemplate(id) {
    await delay(100)
    const tpl = defaultTemplates.find(t => t.id === id)
    return tpl
      ? { code: 200, data: tpl, message: 'success' }
      : { code: 404, data: null, message: '模板不存在' }
  },

  async saveWork(work) {
    await delay(400)
    const works = readStorage(WORKS_KEY) || []
    const item = {
      ...work,
      id: work.id || 'w_' + Date.now(),
      createdAt: work.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const idx = works.findIndex(w => w.id === item.id)
    if (idx >= 0) works[idx] = item
    else works.unshift(item)
    const ok = writeStorage(WORKS_KEY, works)
    return ok
      ? { code: 200, data: item, message: '保存成功' }
      : { code: 500, data: null, message: '保存失败' }
  },

  async getWorks() {
    await delay(200)
    const works = readStorage(WORKS_KEY) || []
    return { code: 200, data: works, message: 'success' }
  },

  async deleteWork(id) {
    await delay(300)
    const works = readStorage(WORKS_KEY) || []
    const filtered = works.filter(w => w.id !== id)
    writeStorage(WORKS_KEY, filtered)
    return { code: 200, data: true, message: '删除成功' }
  },

  async saveDraft(draft) {
    await delay(250)
    const data = {
      ...draft,
      updatedAt: new Date().toISOString()
    }
    const ok = writeStorage(DRAFT_KEY, data)
    return ok
      ? { code: 200, data, message: '草稿已保存' }
      : { code: 500, data: null, message: '草稿保存失败' }
  },

  async getDraft() {
    await delay(150)
    const draft = readStorage(DRAFT_KEY)
    return { code: 200, data: draft, message: 'success' }
  },

  async clearDraft() {
    await delay(100)
    localStorage.removeItem(DRAFT_KEY)
    return { code: 200, data: true, message: '草稿已清除' }
  }
}
