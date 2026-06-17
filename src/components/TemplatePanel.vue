<script setup>
import { ref, onMounted } from 'vue'
import { mockApi } from '@/api/mockApi.js'

defineProps({
  currentId: { type: String, default: '' }
})
const emit = defineEmits(['apply-template', 'load-work', 'delete-work'])

const templates = ref([])
const works = ref([])
const tab = ref('templates')
const loadingWorks = ref(false)

async function loadTemplates() {
  const res = await mockApi.getTemplates()
  if (res.code === 200) templates.value = res.data
}

async function loadWorks() {
  loadingWorks.value = true
  const res = await mockApi.getWorks()
  if (res.code === 200) works.value = res.data
  loadingWorks.value = false
}

async function onDeleteWork(id, e) {
  e.stopPropagation()
  if (!confirm('确定要删除这件作品吗？')) return
  const res = await mockApi.deleteWork(id)
  if (res.code === 200) {
    works.value = works.value.filter(w => w.id !== id)
  }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadTemplates()
  loadWorks()
})

defineExpose({ loadWorks })
</script>

<template>
  <div class="space-y-4">
    <div class="panel">
      <div class="flex gap-1 mb-3 border-b-2 border-dashed border-kraft-400 pb-2">
        <button
          class="flex-1 py-1.5 px-2 text-sm font-serif-sc rounded-sm transition-all"
          :class="tab === 'templates' ? 'bg-navy-800 text-kraft-50' : 'text-navy-700 hover:bg-kraft-200'"
          @click="tab = 'templates'"
        >📋 模板库</button>
        <button
          class="flex-1 py-1.5 px-2 text-sm font-serif-sc rounded-sm transition-all"
          :class="tab === 'works' ? 'bg-navy-800 text-kraft-50' : 'text-navy-700 hover:bg-kraft-200'"
          @click="tab = 'works'; loadWorks()"
        >💼 我的作品</button>
      </div>

      <div v-if="tab === 'templates'" class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          class="group p-3 border-2 rounded-sm cursor-pointer transition-all hover:shadow-md"
          :class="currentId === tpl.id ? 'border-navy-700 bg-navy-50' : 'border-kraft-400 bg-kraft-50 hover:border-navy-500'"
          @click="$emit('apply-template', tpl)"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-16 h-20 rounded-sm shrink-0 border-2 border-kraft-300 shadow-sm"
              :style="{
                backgroundColor: tpl.paperId === 'p1' ? '#dcb573' :
                  tpl.paperId === 'p2' ? '#faf0dc' :
                  tpl.paperId === 'p3' ? '#ead3a8' :
                  tpl.paperId === 'p4' ? '#2e46a0' :
                  tpl.paperId === 'p5' ? '#f0dfb0' :
                  tpl.paperId === 'p6' ? '#b91c1c' :
                  tpl.paperId === 'p7' ? '#0f1e3d' : '#ffe4e1'
              }"
            ></div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-navy-800 font-serif-sc truncate">
                {{ tpl.name }}
              </div>
              <div class="text-xs text-kraft-600 font-serif-sc mt-1">
                文字 {{ tpl.texts?.length || 0 }} · 照片 {{ tpl.photos?.length || 0 }}
              </div>
              <div class="text-xs text-kraft-600 font-serif-sc">
                邮票 {{ tpl.stamps?.length || 0 }} · 邮戳 {{ tpl.postmarks?.length || 0 }}
              </div>
              <div class="mt-1 text-[11px] text-navy-600 font-serif-sc opacity-0 group-hover:opacity-100 transition-opacity">
                👉 点击应用此模板
              </div>
            </div>
          </div>
        </div>
        <div v-if="templates.length === 0" class="text-center text-kraft-500 font-serif-sc py-8 text-sm">
          加载中...
        </div>
      </div>

      <div v-if="tab === 'works'" class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        <div
          v-for="w in works"
          :key="w.id"
          class="group p-3 border-2 rounded-sm cursor-pointer transition-all hover:shadow-md relative"
          :class="currentId === w.id ? 'border-postred-600 bg-postred-50' : 'border-kraft-400 bg-kraft-50 hover:border-navy-500'"
          @click="$emit('load-work', w)"
        >
          <button
            class="absolute top-2 right-2 w-6 h-6 rounded-full bg-postred-600 text-kraft-50 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-postred-700 flex items-center justify-center"
            @click="onDeleteWork(w.id, $event)"
            title="删除"
          >✕</button>
          <div class="flex items-center gap-3 pr-8">
            <div
              class="w-14 h-18 rounded-sm shrink-0 border-2 border-kraft-300 shadow-sm"
              :style="{
                backgroundColor: w.paperId === 'p1' ? '#dcb573' :
                  w.paperId === 'p2' ? '#faf0dc' :
                  w.paperId === 'p3' ? '#ead3a8' :
                  w.paperId === 'p4' ? '#2e46a0' :
                  w.paperId === 'p5' ? '#f0dfb0' :
                  w.paperId === 'p6' ? '#b91c1c' :
                  w.paperId === 'p7' ? '#0f1e3d' : '#ffe4e1'
              }"
            ></div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-navy-800 font-serif-sc truncate">
                {{ w.name || '未命名作品' }}
              </div>
              <div class="text-xs text-kraft-600 font-serif-sc mt-1">
                📅 {{ formatDate(w.updatedAt || w.createdAt) }}
              </div>
              <div class="text-xs text-kraft-600 font-serif-sc">
                {{ w.texts?.length || 0 }}字 · {{ w.photos?.length || 0 }}图
              </div>
            </div>
          </div>
        </div>
        <div v-if="works.length === 0 && !loadingWorks" class="text-center text-kraft-500 font-serif-sc py-12 text-sm">
          暂无保存的作品<br/>编辑后点击「保存作品」
        </div>
        <div v-if="loadingWorks" class="text-center text-kraft-500 font-serif-sc py-8 text-sm">
          加载中...
        </div>
      </div>
    </div>
  </div>
</template>
