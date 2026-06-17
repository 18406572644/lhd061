<script setup>import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import PostcardCanvas from '@/components/PostcardCanvas.vue';
import PropertyPanel from '@/components/PropertyPanel.vue';
import TemplatePanel from '@/components/TemplatePanel.vue';
import { mockApi } from '@/api/mockApi.js';
import { defaultTemplates, stamps, postmarks } from '@/data/assets.js';
import html2canvas from 'html2canvas';
const canvasComp = ref(null);
const templatePanelRef = ref(null);
function createEmpty() {
 return {
 id: '',
 name: '',
 paperId: 'p1',
 texts: [],
 photos: [],
 stamps: [],
 postmarks: []
 };
}
function deepClone(tpl) {
 return JSON.parse(JSON.stringify(tpl));
}
const postcard = reactive(createEmpty());
const selectedItem = ref(null);
const toast = ref({ show: false, type: 'info', msg: '' });
const saving = ref(false);
const exporting = ref(false);
const nameInput = ref('');
const draftAutoSaveTimer = ref(null);
const hasDraft = ref(false);
function showToast(msg, type = 'info') {
 toast.value = { show: true, type, msg };
 setTimeout(() => { toast.value.show = false; }, 2800);
}
function applyTemplate(tpl) {
 const cloned = deepClone(tpl);
 Object.assign(postcard, createEmpty());
 nextTick(() => {
 Object.assign(postcard, {
 id: '',
 name: cloned.name || '',
 paperId: cloned.paperId || 'p1',
 texts: cloned.texts || [],
 photos: cloned.photos || [],
 stamps: cloned.stamps || [],
 postmarks: cloned.postmarks || []
 });
 nameInput.value = postcard.name;
 selectedItem.value = null;
 showToast(`已应用模板「${tpl.name}」`, 'success');
 });
}
function loadWork(work) {
 const cloned = deepClone(work);
 Object.assign(postcard, createEmpty());
 nextTick(() => {
 Object.assign(postcard, cloned);
 nameInput.value = postcard.name || '';
 selectedItem.value = null;
 showToast(`已加载作品「${work.name || '未命名'}」`, 'success');
 });
}
function updatePostcard(val) {
 Object.keys(val).forEach(k => { postcard[k] = val[k]; });
}
function selectItemHandler(item) {
 selectedItem.value = item?.type && item?.id ? item : null;
}
function uid() {
 return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function addText() {
 const t = {
 id: 'tx_' + uid(),
 content: '在这里输入文字\n双击可进入编辑',
 x: 80, y: 200 + postcard.texts.length * 40,
 width: 380,
 fontSize: 22,
 fontId: 'f1',
 color: '#0f1e3d',
 align: 'left'
 };
 postcard.texts.push(t);
 selectedItem.value = { type: 'texts', id: t.id };
 showToast('已添加文字块，点击编辑属性', 'info');
}
function addPhoto() {
 const ph = {
 id: 'ph_' + uid(),
 src: '',
 x: 170, y: 260 + postcard.photos.length * 30,
 width: 200, height: 150,
 border: true
 };
 postcard.photos.push(ph);
 selectedItem.value = { type: 'photos', id: ph.id };
 showToast('已添加照片占位，在右侧面板上传图片', 'info');
}
function addStamp() {
 const pool = stamps.filter(s => !postcard.stamps.some(ps => ps.stampId === s.id));
 const chosen = pool.length ? pool[0] : stamps[0];
 const s = {
 id: 'st_' + uid(),
 stampId: chosen.id,
 x: 430 - postcard.stamps.length * 10,
 y: 30 + postcard.stamps.length * 115,
 scale: 1
 };
 postcard.stamps.push(s);
 selectedItem.value = { type: 'stamps', id: s.id };
 showToast('已添加邮票「' + chosen.name + '」', 'info');
}
function addPostmark() {
 const pool = postmarks.filter(p => !postcard.postmarks.some(pp => pp.postmarkId === p.id));
 const chosen = pool.length ? pool[0] : postmarks[0];
 const p = {
 id: 'pm_' + uid(),
 postmarkId: chosen.id,
 x: 390 - postcard.postmarks.length * 15,
 y: 110 + postcard.postmarks.length * 30,
 scale: 1
 };
 postcard.postmarks.push(p);
 selectedItem.value = { type: 'postmarks', id: p.id };
 showToast('已添加邮戳「' + chosen.name + '」', 'info');
}
function resetCanvas() {
 if (!confirm('确定要清空画布并重新开始吗？'))
 return;
 Object.assign(postcard, createEmpty());
 nameInput.value = '';
 selectedItem.value = null;
 showToast('画布已重置', 'info');
}
async function saveWork() {
 if (saving.value)
 return;
 saving.value = true;
 try {
 const work = {
 ...deepClone(postcard),
 name: nameInput.value || '未命名作品'
 };
 const res = await mockApi.saveWork(work);
 if (res.code === 200) {
 postcard.id = res.data.id;
 postcard.name = res.data.name;
 nameInput.value = res.data.name;
 templatePanelRef.value?.loadWorks();
 showToast('💾 作品已保存', 'success');
 }
 else {
 showToast(res.message || '保存失败', 'error');
 }
 }
 catch (e) {
 showToast('保存出错', 'error');
 }
 finally {
 saving.value = false;
 }
}
function autoSaveDraft() {
 if (draftAutoSaveTimer.value)
 clearTimeout(draftAutoSaveTimer.value);
 draftAutoSaveTimer.value = setTimeout(async () => {
 const snapshot = { ...deepClone(postcard), name: nameInput.value || '未命名草稿' };
 const res = await mockApi.saveDraft(snapshot);
 if (res.code === 200)
 hasDraft.value = true;
 }, 1500);
}
async function loadDraft() {
 const res = await mockApi.getDraft();
 if (res.code === 200 && res.data) {
 applyTemplate({ ...res.data, name: res.data.name + ' (草稿)' });
 hasDraft.value = !!res.data;
 showToast('已恢复上次草稿', 'success');
 }
 else {
 showToast('暂无可用草稿', 'info');
 }
}
async function clearDraft() {
 if (!confirm('确定要清除本地草稿吗？'))
 return;
 const res = await mockApi.clearDraft();
 if (res.code === 200) {
 hasDraft.value = false;
 showToast('草稿已清除', 'info');
 }
}
async function exportImage() {
 if (exporting.value || !canvasComp.value?.canvasRef)
 return;
 exporting.value = true;
 try {
 showToast('正在生成高清图片，请稍候...', 'info');
 const prevSel = selectedItem.value;
 selectedItem.value = null;
 await nextTick();
 await new Promise(r => setTimeout(r, 200));
 const canvas = await html2canvas(canvasComp.value.canvasRef, {
 scale: 3,
 useCORS: true,
 allowTaint: true,
 backgroundColor: null,
 logging: false,
 imageTimeout: 15000
 });
 const dataUrl = canvas.toDataURL('image/png', 0.95);
 const link = document.createElement('a');
 link.download = `postcard_${nameInput.value || 'vintage'}_${Date.now()}.png`;
 link.href = dataUrl;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 selectedItem.value = prevSel;
 showToast('🎉 图片导出成功！已下载到本地', 'success');
 }
 catch (e) {
 console.error(e);
 showToast('导出失败：' + e.message, 'error');
 }
 finally {
 exporting.value = false;
 }
}
function handleKeydown(e) {
 if (e.key === 'Delete' || e.key === 'Backspace') {
 if (!selectedItem.value)
 return;
 const tag = (e.target.tagName || '').toLowerCase();
 if (tag === 'input' || tag === 'textarea' || tag === 'select')
 return;
 const { type, id } = selectedItem.value;
 const arr = postcard[type];
 const idx = arr.findIndex(i => i.id === id);
 if (idx >= 0) {
 arr.splice(idx, 1);
 selectedItem.value = null;
 showToast('已删除选中元素', 'info');
 }
 }
 if ((e.ctrlKey || e.metaKey) && e.key === 's') {
 e.preventDefault();
 saveWork();
 }
}
watch([() => postcard.paperId, () => postcard.texts, () => postcard.photos, () => postcard.stamps, () => postcard.postmarks, nameInput], () => {
 autoSaveDraft();
}, { deep: true });
onMounted(async () => {
 document.addEventListener('keydown', handleKeydown);
 const draftRes = await mockApi.getDraft();
 hasDraft.value = !!(draftRes.code === 200 && draftRes.data);
 applyTemplate(defaultTemplates[0]);
});
onUnmounted(() => {
 document.removeEventListener('keydown', handleKeydown);
 if (draftAutoSaveTimer.value)
 clearTimeout(draftAutoSaveTimer.value);
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-navy-800 text-kraft-50 border-b-4 border-postred-600 shadow-lg sticky top-0 z-40">
      <div class="max-w-[1800px] mx-auto px-4 py-3 flex items-center gap-4">
        <div class="flex items-center gap-3 pr-4 border-r border-navy-600">
          <div class="text-3xl">💌</div>
          <div>
            <h1 class="font-playfair text-2xl font-bold tracking-wider">Vintage Postcard</h1>
            <p class="text-[11px] text-kraft-300 font-handwriting tracking-wide leading-tight">复古邮政风明信片生成器</p>
          </div>
        </div>

        <div class="flex-1 flex items-center gap-3">
          <span class="text-kraft-200 font-serif-sc text-sm whitespace-nowrap">作品名：</span>
          <input
            v-model="nameInput"
            class="!bg-navy-900 !border-navy-600 !text-kraft-50 !placeholder-kraft-400 focus:!border-postred-500 focus:!ring-postred-500/30 input-field max-w-xs !py-1.5"
            placeholder="给这张明信片起个名字..."
          />
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button class="btn-secondary !text-xs !py-1.5 !px-3 whitespace-nowrap" @click="resetCanvas">
            🆕 新建
          </button>
          <button
            class="btn-secondary !text-xs !py-1.5 !px-3 whitespace-nowrap"
            :class="{ 'opacity-50 cursor-not-allowed': !hasDraft }"
            :disabled="!hasDraft"
            @click="loadDraft"
            title="恢复上次自动保存的草稿"
          >
            📝 草稿
            <span v-if="hasDraft" class="inline-block w-2 h-2 rounded-full bg-postred-500 ml-1 animate-pulse"></span>
          </button>
          <button
            class="btn-secondary !text-xs !py-1.5 !px-3 whitespace-nowrap"
            :class="{ 'opacity-50 cursor-not-allowed': !hasDraft }"
            :disabled="!hasDraft"
            @click="clearDraft"
          >
            🧹 清草稿
          </button>
          <button class="btn-primary !text-xs !py-1.5 !px-4 whitespace-nowrap" :disabled="saving" @click="saveWork">
            <span v-if="saving">💾 保存中...</span>
            <span v-else>💾 保存作品</span>
          </button>
          <button
            class="!bg-postred-600 !text-kraft-50 !border-postred-800 shadow-[3px_3px_0_rgba(127,29,29,0.5)] hover:!bg-postred-500 btn-primary !text-xs !py-1.5 !px-4 whitespace-nowrap"
            :disabled="exporting"
            @click="exportImage"
          >
            <span v-if="exporting">⏳ 导出中...</span>
            <span v-else>📥 导出高清图</span>
          </button>
        </div>
      </div>
    </header>

    <div class="flex-1 max-w-[1800px] w-full mx-auto px-4 py-4 grid grid-cols-[280px_1fr_320px] gap-4 items-start">
      <aside class="sticky top-[88px] space-y-4 max-h-[calc(100vh-108px)] overflow-y-auto pr-1">
        <TemplatePanel
          ref="templatePanelRef"
          :current-id="postcard.id"
          @apply-template="applyTemplate"
          @load-work="loadWork"
        />
        <div class="panel text-xs font-serif-sc text-navy-700 space-y-2">
          <div class="section-title !text-base !mb-2">⌨️ 快捷键</div>
          <div class="flex justify-between"><span>删除元素</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Del</kbd></div>
          <div class="flex justify-between"><span>保存作品</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Ctrl+S</kbd></div>
          <div class="flex justify-between"><span>等比缩放照片</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Shift+拖</kbd></div>
          <p class="text-[11px] text-kraft-600 pt-2 border-t border-dashed border-kraft-300">
            💡 提示：编辑过程中每 1.5 秒会自动保存草稿到本地
          </p>
        </div>
      </aside>

      <main class="min-w-0">
        <div class="panel !p-2 bg-kraft-200/60 backdrop-blur-sm">
          <PostcardCanvas
            ref="canvasComp"
            :model-value="postcard"
            @update:model-value="updatePostcard"
            @select-item="selectItemHandler"
          />
        </div>
        <div class="text-center text-xs text-kraft-600 font-serif-sc mt-2">
          明信片尺寸：540 × 720 px · 导出时自动放大 3 倍（1620 × 2160 高清）
        </div>
      </main>

      <aside class="sticky top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto pr-1">
        <PropertyPanel
          :postcard="postcard"
          :selected="selectedItem"
          @update:postcard="updatePostcard"
          @add-text="addText"
          @add-photo="addPhoto"
          @add-stamp="addStamp"
          @add-postmark="addPostmark"
        />
      </aside>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-[-20px]"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-[-20px]"
      >
        <div
          v-if="toast.show"
          class="fixed top-20 left-1/2 -translate-x-1/2 z-50 shadow-vintage rounded-sm border-2 font-serif-sc px-5 py-3 flex items-center gap-2"
          :class="{
            'bg-navy-800 text-kraft-50 border-navy-950': toast.type === 'info',
            'bg-postred-50 text-postred-800 border-postred-500': toast.type === 'error',
            'bg-kraft-50 text-navy-900 border-navy-700': toast.type === 'success'
          }"
        >
          <span class="text-xl">
            {{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️' }}
          </span>
          <span>{{ toast.msg }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
