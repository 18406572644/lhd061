<script setup>
import { computed, ref } from 'vue'
import { papers, stamps, postmarks, fonts } from '@/data/assets.js'

const props = defineProps({
  postcard: { type: Object, required: true },
  selected: { type: Object, default: null }
})
const emit = defineEmits(['update:postcard', 'add-text', 'add-photo', 'add-stamp', 'add-postmark', 'delete-item', 'upload-photo'])

const photoInputRef = ref(null)
const currentPhotoId = ref(null)

function update(patch) {
  emit('update:postcard', { ...props.postcard, ...patch })
}

function updateItem(type, id, patch) {
  const arr = props.postcard[type]
  const idx = arr.findIndex(i => i.id === id)
  if (idx < 0) return
  const newArr = [...arr]
  newArr[idx] = { ...newArr[idx], ...patch }
  update({ [type]: newArr })
}

function deleteItem() {
  if (!props.selected) return
  const { type, id } = props.selected
  const arr = props.postcard[type].filter(i => i.id !== id)
  update({ [type]: arr })
}

function triggerPhotoUpload(photoId) {
  currentPhotoId.value = photoId
  photoInputRef.value?.click()
}

function onPhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file || !currentPhotoId.value) return
  const reader = new FileReader()
  reader.onload = ev => {
    updateItem('photos', currentPhotoId.value, { src: ev.target.result })
    emit('upload-photo', currentPhotoId.value, ev.target.result)
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const selectedItem = computed(() => {
  if (!props.selected) return null
  const { type, id } = props.selected
  return props.postcard[type]?.find(i => i.id === id) || null
})

const colorPresets = ['#1a2c52', '#0f1e3d', '#7f1d1d', '#b91c1c', '#5c3423', '#8a4d26', '#000000', '#ffffff', '#ffd700', '#fef2f2', '#faf5ed']
const aligns = [
  { v: 'left', icon: '⬅' },
  { v: 'center', icon: '⬌' },
  { v: 'right', icon: '➡' }
]
const rotationPresets = [0, 90, 180, 270]
</script>

<template>
  <div class="space-y-4">
    <div class="panel">
      <div class="section-title">📜 信纸风格</div>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="p in papers" :key="p.id"
          class="h-14 rounded-sm border-2 transition-all hover:scale-105 relative group"
          :class="postcard.paperId === p.id ? 'border-navy-800 ring-2 ring-navy-400' : 'border-kraft-400'"
          :style="p.style"
          @click="update({ paperId: p.id })"
          :title="p.name"
        >
          <span class="absolute bottom-0 left-0 right-0 bg-navy-900/70 text-kraft-50 text-[10px] font-serif-sc py-0.5 truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {{ p.name }}
          </span>
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">➕ 添加元素</div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn-secondary text-sm !py-2 !px-3" @click="$emit('add-text')">✍️ 文字</button>
        <button class="btn-secondary text-sm !py-2 !px-3" @click="$emit('add-photo')">🖼️ 照片</button>
        <button class="btn-secondary text-sm !py-2 !px-3" @click="$emit('add-stamp')">📮 邮票</button>
        <button class="btn-secondary text-sm !py-2 !px-3" @click="$emit('add-postmark')">🕐 邮戳</button>
      </div>
    </div>

    <div v-if="selected && selectedItem" class="panel">
      <div class="section-title flex justify-between items-center">
        <span>🔧 属性编辑</span>
        <button class="btn-danger !py-1 !px-2 text-xs" @click="deleteItem">🗑️ 删除</button>
      </div>

      <div class="space-y-3 text-sm">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">X 位置</label>
            <input type="number" class="input-field !py-1 !text-sm"
              :value="selectedItem.x"
              @input="updateItem(selected.type, selected.id, { x: +$event.target.value || 0 })" />
          </div>
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">Y 位置</label>
            <input type="number" class="input-field !py-1 !text-sm"
              :value="selectedItem.y"
              @input="updateItem(selected.type, selected.id, { y: +$event.target.value || 0 })" />
          </div>
        </div>

        <div>
          <label class="block text-navy-700 font-serif-sc mb-1 text-xs">旋转角度 ({{ selectedItem.rotation || 0 }}°)</label>
          <div class="flex gap-2 items-center">
            <input
              type="number"
              class="input-field !py-1 !text-sm flex-1"
              :value="selectedItem.rotation || 0"
              min="-180"
              max="180"
              step="1"
              @input="updateItem(selected.type, selected.id, { rotation: +$event.target.value || 0 })"
            />
            <span class="text-navy-600 font-serif-sc text-sm">°</span>
          </div>
          <div class="flex gap-1 mt-2">
            <button
              v-for="deg in rotationPresets" :key="deg"
              class="flex-1 py-1 rounded-sm border-2 transition-all text-xs font-serif-sc"
              :class="(selectedItem.rotation || 0) === deg ? 'bg-navy-800 text-kraft-50 border-navy-900' : 'bg-kraft-100 text-navy-800 border-kraft-400 hover:border-navy-500'"
              @click="updateItem(selected.type, selected.id, { rotation: deg })"
            >
              {{ deg }}°
            </button>
          </div>
        </div>

        <template v-if="selected.type === 'texts'">
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">文字内容</label>
            <textarea
              class="input-field !text-sm min-h-[100px] whitespace-pre-wrap"
              :value="selectedItem.content"
              @input="updateItem('texts', selected.id, { content: $event.target.value })"
              placeholder="在此输入文字内容..."
            ></textarea>
          </div>
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">字体</label>
            <select
              class="input-field !py-1 !text-sm"
              :value="selectedItem.fontId"
              @change="updateItem('texts', selected.id, { fontId: $event.target.value })"
            >
              <option v-for="f in fonts" :key="f.id" :value="f.id" :style="{ fontFamily: f.family }">
                {{ f.name }} — Aa 文字
              </option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-navy-700 font-serif-sc mb-1 text-xs">字号 ({{ selectedItem.fontSize }}px)</label>
              <input type="range" min="12" max="80" step="1"
                class="w-full accent-navy-700"
                :value="selectedItem.fontSize"
                @input="updateItem('texts', selected.id, { fontSize: +$event.target.value })" />
            </div>
            <div>
              <label class="block text-navy-700 font-serif-sc mb-1 text-xs">宽度 ({{ selectedItem.width }}px)</label>
              <input type="range" min="80" max="500" step="10"
                class="w-full accent-navy-700"
                :value="selectedItem.width"
                @input="updateItem('texts', selected.id, { width: +$event.target.value })" />
            </div>
          </div>
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">文字颜色</label>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="c in colorPresets" :key="c"
                class="w-7 h-7 rounded-sm border-2 transition-all hover:scale-110"
                :class="selectedItem.color === c ? 'border-navy-800 ring-2 ring-navy-400' : 'border-kraft-400'"
                :style="{ backgroundColor: c }"
                @click="updateItem('texts', selected.id, { color: c })"
              ></button>
              <input type="color" class="w-7 h-7 rounded-sm border-2 border-kraft-400 cursor-pointer"
                :value="selectedItem.color"
                @input="updateItem('texts', selected.id, { color: $event.target.value })" />
            </div>
          </div>
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">对齐方式</label>
            <div class="flex gap-1">
              <button
                v-for="a in aligns" :key="a.v"
                class="flex-1 py-1.5 rounded-sm border-2 transition-all font-serif-sc"
                :class="selectedItem.align === a.v ? 'bg-navy-800 text-kraft-50 border-navy-900' : 'bg-kraft-100 text-navy-800 border-kraft-400 hover:border-navy-500'"
                @click="updateItem('texts', selected.id, { align: a.v })"
              >
                {{ a.icon }}
              </button>
            </div>
          </div>
        </template>

        <template v-if="selected.type === 'photos'">
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">照片</label>
            <button class="btn-secondary w-full text-sm !py-2" @click="triggerPhotoUpload(selectedItem.id)">
              {{ selectedItem.src ? '📷 更换照片' : '⬆️ 上传照片' }}
            </button>
            <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="onPhotoChange" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-navy-700 font-serif-sc mb-1 text-xs">宽度 ({{ selectedItem.width }}px)</label>
              <input type="range" min="60" max="500" step="10"
                class="w-full accent-navy-700"
                :value="selectedItem.width"
                @input="updateItem('photos', selected.id, { width: +$event.target.value })" />
            </div>
            <div>
              <label class="block text-navy-700 font-serif-sc mb-1 text-xs">高度 ({{ selectedItem.height }}px)</label>
              <input type="range" min="40" max="600" step="10"
                class="w-full accent-navy-700"
                :value="selectedItem.height"
                @input="updateItem('photos', selected.id, { height: +$event.target.value })" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="ph-border" class="accent-navy-700 w-4 h-4"
              :checked="selectedItem.border"
              @change="updateItem('photos', selected.id, { border: $event.target.checked })" />
            <label for="ph-border" class="text-navy-800 font-serif-sc text-sm">添加白边相框效果</label>
          </div>
        </template>

        <template v-if="selected.type === 'stamps'">
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">选择邮票</label>
            <div class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              <button
                v-for="s in stamps" :key="s.id"
                class="aspect-[9/11] rounded-sm border-2 transition-all hover:scale-105 flex flex-col items-center justify-center stamp-perforation p-1 shadow-stamp"
                :class="selectedItem.stampId === s.id ? 'ring-2 ring-navy-700 ring-offset-1' : 'border-kraft-400'"
                :style="{ backgroundColor: s.bg }"
                @click="updateItem('stamps', selected.id, { stampId: s.id })"
                :title="s.name"
              >
                <span class="text-xl">{{ s.emoji }}</span>
                <span class="text-[8px] font-serif-sc font-bold truncate w-full text-center" :style="{ color: s.color }">{{ s.name }}</span>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">缩放 ({{ selectedItem.scale?.toFixed(2) || 1 }}x)</label>
            <input type="range" min="0.5" max="2" step="0.05"
              class="w-full accent-navy-700"
              :value="selectedItem.scale || 1"
              @input="updateItem('stamps', selected.id, { scale: +$event.target.value })" />
          </div>
        </template>

        <template v-if="selected.type === 'postmarks'">
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">选择邮戳</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="pm in postmarks" :key="pm.id"
                class="py-2 px-2 rounded-sm border-2 transition-all text-xs font-serif-sc text-center"
                :class="selectedItem.postmarkId === pm.id ? 'bg-navy-800 text-kraft-50 border-navy-900' : 'bg-kraft-100 text-navy-800 border-kraft-400 hover:border-navy-500'"
                @click="updateItem('postmarks', selected.id, { postmarkId: pm.id })"
              >
                📍 {{ pm.name }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-navy-700 font-serif-sc mb-1 text-xs">缩放 ({{ selectedItem.scale?.toFixed(2) || 1 }}x)</label>
            <input type="range" min="0.5" max="2" step="0.05"
              class="w-full accent-navy-700"
              :value="selectedItem.scale || 1"
              @input="updateItem('postmarks', selected.id, { scale: +$event.target.value })" />
          </div>
        </template>
      </div>
    </div>

    <div v-else class="panel">
      <div class="text-kraft-600 font-serif-sc text-sm text-center py-4">
        👆 点击画布上的元素<br/>查看并编辑属性
      </div>
    </div>
  </div>
</template>
