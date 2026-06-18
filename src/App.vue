<script setup>import { ref, reactive, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import PostcardCanvas from '@/components/PostcardCanvas.vue';
import PropertyPanel from '@/components/PropertyPanel.vue';
import TemplatePanel from '@/components/TemplatePanel.vue';
import Postcard3D from '@/components/Postcard3D.vue';
import BackEditor from '@/components/BackEditor.vue';
import MusicSelector from '@/components/MusicSelector.vue';
import { mockApi } from '@/api/mockApi.js';
import { defaultTemplates, stamps, postmarks } from '@/data/assets.js';
import { useQRCode } from '@/composables/useQRCode.js';
import { useIndexedDB } from '@/composables/useIndexedDB.js';
import html2canvas from 'html2canvas';
import { useHistory } from '@/composables/useHistory.js';
const { canUndo, canRedo, pushSnapshot, undo, redo, init: historyInit } = useHistory();
const { generateQRCodeDataUrl, generateQRCodeSVG } = useQRCode();
const { init: initDB, getAudioUrl } = useIndexedDB();
const canvasComp = ref(null);
const card3DRef = ref(null);
const templatePanelRef = ref(null);
const isInteracting = ref(false);
const isRestoring = ref(false);
let pushDebounceTimer = null;
const is3DMode = ref(false);
const rightPanelTab = ref('property');
const showExportDialog = ref(false);
const showMusicSelector = ref(false);
const showQRCodeDialog = ref(false);
const qrCodeDataUrl = ref('');
const qrCodeText = ref('');
function createEmpty() {
 return {
 id: '',
 name: '',
 paperId: 'p1',
 texts: [],
 photos: [],
 stamps: [],
 postmarks: [],
 audios: [],
 qrcodes: []
 };
}
function createEmptyBack() {
 return {
 recipient: '',
 address: '',
 city: '',
 message: '',
 sender: '',
 stampId: 's1',
 postmarkId: 'pm1'
 };
}
function deepClone(tpl) {
 return JSON.parse(JSON.stringify(tpl));
}
function historyPush(state) {
 clearTimeout(pushDebounceTimer);
 pushSnapshot(state);
}
const postcard = reactive(createEmpty());
const backContent = reactive(createEmptyBack());
const selectedItem = ref(null);
const toast = ref({ show: false, type: 'info', msg: '' });
const saving = ref(false);
const exporting = ref(false);
const exportingType = ref('');
const nameInput = ref('');
const draftAutoSaveTimer = ref(null);
const hasDraft = ref(false);
function showToast(msg, type = 'info') {
 toast.value = { show: true, type, msg };
 setTimeout(() => { toast.value.show = false; }, 2800);
}
function applyTemplate(tpl, initHistory) {
 const cloned = deepClone(tpl);
 Object.assign(postcard, createEmpty());
 Object.assign(backContent, createEmptyBack());
 nextTick(() => {
 Object.assign(postcard, {
 id: '',
 name: cloned.name || '',
 paperId: cloned.paperId || 'p1',
 texts: cloned.texts || [],
 photos: cloned.photos || [],
 stamps: cloned.stamps || [],
 postmarks: cloned.postmarks || [],
 audios: cloned.audios || [],
 qrcodes: cloned.qrcodes || []
 });
 if (cloned.backContent) {
 Object.assign(backContent, cloned.backContent);
 }
 else {
 Object.assign(backContent, {
 message: defaultBackMessage(tpl),
 sender: '匿名旅行者',
 stampId: cloned.stamps?.[0]?.stampId || 's1',
 postmarkId: cloned.postmarks?.[0]?.postmarkId || 'pm1'
 });
 }
 nameInput.value = postcard.name;
 selectedItem.value = null;
 if (initHistory) {
 historyInit(deepClone({ ...postcard, backContent: { ...backContent } }));
 }
 else {
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 }
 showToast(`已应用模板「${tpl.name}」`, 'success');
 });
}
function defaultBackMessage(tpl) {
 if (tpl.id === 'tpl1') {
 return '这一路走过的风景，\n愿与你共享。\n\n期待下次相遇，\n把酒言欢！';
 }
 if (tpl.id === 'tpl2') {
 return 'With love and longing,\nevery moment apart\nmakes my heart grow fonder.\n\n❤️';
 }
 if (tpl.id === 'tpl3') {
 return '岁岁常欢愉，\n万事皆胜意。\n\n愿新的一年，\n所求皆如愿！';
 }
 return '';
}
function loadWork(work) {
 const cloned = deepClone(work);
 Object.assign(postcard, createEmpty());
 Object.assign(backContent, createEmptyBack());
 nextTick(() => {
 Object.assign(postcard, {
 id: cloned.id || '',
 name: cloned.name || '',
 paperId: cloned.paperId || 'p1',
 texts: cloned.texts || [],
 photos: cloned.photos || [],
 stamps: cloned.stamps || [],
 postmarks: cloned.postmarks || [],
 audios: cloned.audios || [],
 qrcodes: cloned.qrcodes || []
 });
 if (cloned.backContent) {
 Object.assign(backContent, cloned.backContent);
 }
 nameInput.value = postcard.name || '';
 selectedItem.value = null;
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast(`已加载作品「${work.name || '未命名'}」`, 'success');
 });
}
function updatePostcard(val) {
 Object.keys(val).forEach(k => { postcard[k] = val[k]; });
 if (isInteracting.value || isRestoring.value) return;
 clearTimeout(pushDebounceTimer);
 pushDebounceTimer = setTimeout(() => {
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 }, 300);
}
function updateBackContent(val) {
 Object.assign(backContent, val);
 if (isInteracting.value || isRestoring.value) return;
 clearTimeout(pushDebounceTimer);
 pushDebounceTimer = setTimeout(() => {
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 }, 300);
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
 align: 'left',
 rotation: 0
 };
 postcard.texts.push(t);
 selectedItem.value = { type: 'texts', id: t.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('已添加文字块，点击编辑属性', 'info');
}
function addPhoto() {
 const ph = {
 id: 'ph_' + uid(),
 src: '',
 x: 170, y: 260 + postcard.photos.length * 30,
 width: 200, height: 150,
 border: true,
 rotation: 0
 };
 postcard.photos.push(ph);
 selectedItem.value = { type: 'photos', id: ph.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
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
 scale: 1,
 rotation: 0
 };
 postcard.stamps.push(s);
 selectedItem.value = { type: 'stamps', id: s.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
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
 scale: 1,
 rotation: 0
 };
 postcard.postmarks.push(p);
 selectedItem.value = { type: 'postmarks', id: p.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('已添加邮戳「' + chosen.name + '」', 'info');
}
function addMusic() {
 showMusicSelector.value = true;
}
function handleSelectMusic(musicData) {
 const audio = {
 id: 'au_' + uid(),
 ...musicData,
 x: 80,
 y: 500 + postcard.audios.length * 50,
 width: 100,
 height: 100,
 iconType: 'record',
 rotation: 0,
 scale: 1
 };
 postcard.audios.push(audio);
 selectedItem.value = { type: 'audios', id: audio.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('🎵 已添加背景音乐「' + musicData.name + '」', 'info');
}
function handleSelectVoice(voiceData) {
 const audio = {
 id: 'au_' + uid(),
 ...voiceData,
 x: 80,
 y: 500 + postcard.audios.length * 50,
 width: 100,
 height: 100,
 iconType: 'tape',
 rotation: 0,
 scale: 1,
 color: '#7f1d1d',
 bgColor: '#fee2e2'
 };
 postcard.audios.push(audio);
 selectedItem.value = { type: 'audios', id: audio.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('🎤 已添加语音留言', 'success');
}
function addQRCode() {
 showQRCodeDialog.value = true;
 qrCodeText.value = '';
 qrCodeDataUrl.value = '';
}
function generateQRCodeForVoice(audioItem) {
 if (!audioItem) {
 showToast('请先选择一个语音留言', 'error');
 return;
 }
 const text = `https://postcard-audio.example.com/listen/${audioItem.voiceId || audioItem.id}`;
 const dataUrl = generateQRCodeDataUrl(text, 120);
 const qr = {
 id: 'qr_' + uid(),
 text,
 dataUrl,
 x: 380,
 y: 550 + postcard.qrcodes.length * 40,
 width: 80,
 height: 80,
 rotation: 0,
 title: '扫码收听语音',
 audioId: audioItem.id
 };
 postcard.qrcodes.push(qr);
 selectedItem.value = { type: 'qrcodes', id: qr.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('📱 已添加二维码，扫码可收听语音', 'success');
}
function confirmQRCode() {
 if (!qrCodeText.value.trim()) {
 showToast('请输入二维码内容', 'error');
 return;
 }
 const dataUrl = generateQRCodeDataUrl(qrCodeText.value, 120);
 const qr = {
 id: 'qr_' + uid(),
 text: qrCodeText.value,
 dataUrl,
 x: 380,
 y: 550 + postcard.qrcodes.length * 40,
 width: 80,
 height: 80,
 rotation: 0,
 title: ''
 };
 postcard.qrcodes.push(qr);
 selectedItem.value = { type: 'qrcodes', id: qr.id };
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('📱 已添加二维码', 'success');
 showQRCodeDialog.value = false;
}
function resetCanvas() {
 if (!confirm('确定要清空画布并重新开始吗？'))
 return;
 Object.assign(postcard, createEmpty());
 Object.assign(backContent, createEmptyBack());
 nameInput.value = '';
 selectedItem.value = null;
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('画布已重置', 'info');
}
async function saveWork() {
 if (saving.value)
 return;
 saving.value = true;
 try {
 const work = {
 ...deepClone(postcard),
 backContent: { ...backContent },
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
 const snapshot = { ...deepClone(postcard), backContent: { ...backContent }, name: nameInput.value || '未命名草稿' };
 const res = await mockApi.saveDraft(snapshot);
 if (res.code === 200)
 hasDraft.value = true;
 if (!isRestoring.value) {
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 }
 }, 1500);
}
async function loadDraft() {
 const res = await mockApi.getDraft();
 if (res.code === 200 && res.data) {
 applyTemplate({ ...res.data, name: res.data.name + ' (草稿)' }, false);
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
 showExportDialog.value = true;
}
async function doExport(type) {
 if (exporting.value) return;
 if (type === '3d_gif') {
 showToast('🎬 正在录制翻页动画，请稍候...', 'info');
 showExportDialog.value = false;
 await exportFlipAnimation();
 return;
 }
 if (type === 'mp4') {
 showExportDialog.value = false;
 await exportMP4();
 return;
 }
 showExportDialog.value = false;
 exporting.value = true;
 exportingType.value = type;
 try {
 showToast('正在生成高清图片，请稍候...', 'info');
 const prevSel = selectedItem.value;
 selectedItem.value = null;
 await nextTick();
 await new Promise(r => setTimeout(r, 200));
 let targetEl = null;
 let suffix = 'front';
 if (type === 'front') {
 if (is3DMode.value) {
 targetEl = card3DRef.value?.frontCanvasRef;
 } else {
 targetEl = canvasComp.value?.canvasRef;
 }
 suffix = '正面';
 } else if (type === 'back') {
 if (is3DMode.value) {
 targetEl = card3DRef.value?.exportBackCanvasRef;
 } else {
 showToast('请先切换到 3D 预览模式导出背面', 'error');
 exporting.value = false;
 return;
 }
 suffix = '背面';
 }
 if (!targetEl) {
 showToast('导出元素未找到', 'error');
 return;
 }
 const canvas = await html2canvas(targetEl, {
 scale: 3,
 useCORS: true,
 allowTaint: true,
 backgroundColor: null,
 logging: false,
 imageTimeout: 15000
 });
 const dataUrl = canvas.toDataURL('image/png', 0.95);
 const link = document.createElement('a');
 link.download = `postcard_${nameInput.value || 'vintage'}_${suffix}_${Date.now()}.png`;
 link.href = dataUrl;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 selectedItem.value = prevSel;
 showToast(`🎉 ${suffix}图片导出成功！已下载到本地`, 'success');
 }
 catch (e) {
 console.error(e);
 showToast('导出失败：' + e.message, 'error');
 }
 finally {
 exporting.value = false;
 exportingType.value = '';
 }
}
async function exportFlipAnimation() {
 if (!is3DMode.value) {
 showToast('请先切换到 3D 预览模式录制翻页动画', 'error');
 return;
 }
 exporting.value = true;
 exportingType.value = '3d_gif';
 try {
 const frames = [];
 const sceneEl = card3DRef.value?.sceneRef;
 const rootEl = card3DRef.value?.rootRef;
 if (!sceneEl || !rootEl) {
 showToast('3D 场景未找到', 'error');
 return;
 }
 if (card3DRef.value?.getFlipProgress() > 0.5) {
 await card3DRef.value?.toggleFlip();
 await new Promise(r => setTimeout(r, 1300));
 }
 card3DRef.value?.resetView();
 await new Promise(r => setTimeout(r, 200));
 showToast('📸 开始截取帧... (1/2)', 'info');
 const frameCount = 24;
 for (let i = 0; i < frameCount; i++) {
 const progress = i / (frameCount - 1);
 if (card3DRef.value) {
 card3DRef.value.setFlipProgress(progress);
 }
 await new Promise(r => setTimeout(r, 50));
 try {
 const canvas = await html2canvas(rootEl, {
 scale: 1.5,
 useCORS: true,
 allowTaint: true,
 backgroundColor: '#0f1e3d',
 logging: false,
 imageTimeout: 5000
 });
 if (canvas.width > 0 && canvas.height > 0) {
 frames.push(canvas);
 }
 } catch (e) {
 console.warn('帧截取失败', i, e);
 }
 }
 showToast('📸 继续截取帧... (2/2)', 'info');
 for (let i = 0; i < frameCount; i++) {
 const progress = 1 - i / (frameCount - 1);
 if (card3DRef.value) {
 card3DRef.value.setFlipProgress(progress);
 }
 await new Promise(r => setTimeout(r, 50));
 try {
 const canvas = await html2canvas(rootEl, {
 scale: 1.5,
 useCORS: true,
 allowTaint: true,
 backgroundColor: '#0f1e3d',
 logging: false,
 imageTimeout: 5000
 });
 if (canvas.width > 0 && canvas.height > 0) {
 frames.push(canvas);
 }
 } catch (e) {
 console.warn('帧截取失败', i, e);
 }
 }
 if (card3DRef.value) {
 card3DRef.value.setFlipProgress(0);
 }
 if (frames.length === 0) {
 showToast('动画帧截取失败，请重试', 'error');
 return;
 }
 showToast('🎞️ 正在生成 GIF 动画...', 'info');
 const resultCanvas = document.createElement('canvas');
 const firstFrame = frames[0];
 resultCanvas.width = firstFrame.width;
 resultCanvas.height = firstFrame.height;
 const ctx = resultCanvas.getContext('2d');
 ctx.fillStyle = '#0f1e3d';
 ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
 const frameDuration = 80;
 const gifData = await generateSimpleGif(frames, resultCanvas.width, resultCanvas.height, frameDuration);
 const blob = new Blob([gifData], { type: 'image/gif' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.download = `postcard_${nameInput.value || 'vintage'}_3D翻页动画_${Date.now()}.gif`;
 link.href = url;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 setTimeout(() => URL.revokeObjectURL(url), 5000);
 showToast('🎉 3D 翻页动画导出成功！', 'success');
 }
 catch (e) {
 console.error(e);
 showToast('导出失败：' + e.message, 'error');
 }
 finally {
 exporting.value = false;
 exportingType.value = '';
 }
}
async function exportMP4() {
 if (postcard.audios.length === 0) {
 showToast('请先添加音乐或语音留言', 'error');
 return;
 }
 exporting.value = true;
 exportingType.value = 'mp4';
 try {
 showToast('🎵 正在生成带音乐的 MP4 视频，请稍候...', 'info');
 const prevSel = selectedItem.value;
 selectedItem.value = null;
 await nextTick();
 await new Promise(r => setTimeout(r, 200));
 let targetEl = canvasComp.value?.canvasRef;
 if (is3DMode.value) {
 targetEl = card3DRef.value?.frontCanvasRef;
 }
 if (!targetEl) {
 showToast('导出元素未找到', 'error');
 return;
 }
 const canvas = await html2canvas(targetEl, {
 scale: 2,
 useCORS: true,
 allowTaint: true,
 backgroundColor: null,
 logging: false,
 imageTimeout: 15000
 });
 const audioItem = postcard.audios[0];
 let audioUrl = audioItem.url;
 if (audioItem.type === 'voice' && audioItem.voiceId) {
 audioUrl = await getAudioUrl(audioItem.voiceId);
 }
 if (!audioUrl) {
 showToast('音频加载失败', 'error');
 return;
 }
 const audio = new Audio(audioUrl);
 await new Promise((resolve, reject) => {
 audio.onloadedmetadata = resolve;
 audio.onerror = reject;
 });
 const videoDuration = Math.min(audio.duration, 60);
 const videoCanvas = document.createElement('canvas');
 videoCanvas.width = canvas.width;
 videoCanvas.height = canvas.height;
 const vctx = videoCanvas.getContext('2d');
 const fps = 30;
 const totalFrames = Math.floor(videoDuration * fps);
 const stream = videoCanvas.captureStream(fps);
 const audioContext = new (window.AudioContext || window.webkitAudioContext)();
 const audioSource = audioContext.createMediaElementSource(audio);
 const audioDestination = audioContext.createMediaStreamDestination();
 audioSource.connect(audioDestination);
 audioSource.connect(audioContext.destination);
 const combinedStream = new MediaStream([
 ...stream.getVideoTracks(),
 ...audioDestination.stream.getAudioTracks()
 ]);
 const mimeTypes = [
 'video/webm;codecs=vp9,opus',
 'video/webm;codecs=vp8,opus',
 'video/webm'
 ];
 let mimeType = '';
 for (const type of mimeTypes) {
 if (MediaRecorder.isTypeSupported(type)) {
 mimeType = type;
 break;
 }
 }
 if (!mimeType) {
 throw new Error('当前浏览器不支持视频录制');
 }
 const mediaRecorder = new MediaRecorder(combinedStream, {
 mimeType,
 videoBitsPerSecond: 5000000
 });
 const chunks = [];
 mediaRecorder.ondataavailable = (e) => {
 if (e.data.size > 0) {
 chunks.push(e.data);
 }
 };
 await new Promise((resolve) => {
 mediaRecorder.onstop = resolve;
 mediaRecorder.start();
 audio.currentTime = 0;
 audio.play();
 let frameCount = 0;
 function drawFrame() {
 if (frameCount >= totalFrames || !exporting.value) {
 mediaRecorder.stop();
 audio.pause();
 audio.currentTime = 0;
 return;
 }
 vctx.drawImage(canvas, 0, 0);
 const time = (frameCount / fps).toFixed(2);
 vctx.font = 'bold 24px serif';
 vctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
 vctx.fillText('🎵 Vintage Postcard', 20, 40);
 frameCount++;
 requestAnimationFrame(drawFrame);
 }
 drawFrame();
 });
 const blob = new Blob(chunks, { type: mimeType });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
 link.download = `postcard_${nameInput.value || 'vintage'}_带音乐_${Date.now()}.${ext}`;
 link.href = url;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 setTimeout(() => URL.revokeObjectURL(url), 5000);
 selectedItem.value = prevSel;
 showToast(`🎉 带音乐的 ${ext.toUpperCase()} 视频导出成功！`, 'success');
 }
 catch (e) {
 console.error(e);
 showToast('导出失败：' + e.message, 'error');
 }
 finally {
 exporting.value = false;
 exportingType.value = '';
 }
}
async function generateSimpleGif(frames, width, height, delay) {
 const encoder = new SimpleGifEncoder(width, height);
 for (const frame of frames) {
 const tempCanvas = document.createElement('canvas');
 tempCanvas.width = width;
 tempCanvas.height = height;
 const tctx = tempCanvas.getContext('2d');
 tctx.fillStyle = '#0f1e3d';
 tctx.fillRect(0, 0, width, height);
 tctx.drawImage(frame, 0, 0, width, height);
 const imgData = tctx.getImageData(0, 0, width, height);
 encoder.addFrame(imgData, delay);
 }
 return encoder.finish();
}
class SimpleGifEncoder {
 constructor(w, h) {
 this.width = w;
 this.height = h;
 this.frames = [];
 this.palette = this._buildPalette();
 }
 _buildPalette() {
 const palette = [];
 const levels = [0, 51, 102, 153, 204, 255];
 for (let r = 0; r < 6; r++)
 for (let g = 0; g < 6; g++)
 for (let b = 0; b < 6; b++) {
 palette.push(levels[r], levels[g], levels[b]);
 }
 return palette;
 }
 _quantize(r, g, b) {
 const idx = Math.round(r / 51) * 36 + Math.round(g / 51) * 6 + Math.round(b / 51);
 return Math.min(idx, 215);
 }
 addFrame(imgData, delay) {
 const pixels = imgData.data;
 const indexed = new Uint8Array(this.width * this.height);
 for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
 indexed[j] = this._quantize(pixels[i], pixels[i + 1], pixels[i + 2]);
 }
 this.frames.push({ indexed, delay: Math.round(delay / 10) });
 }
 finish() {
 const parts = [];
 parts.push(new Uint8Array([71, 73, 70, 56, 57, 97]));
 const lsd = new Uint8Array(7);
 lsd[0] = this.width & 0xff;
 lsd[1] = (this.width >> 8) & 0xff;
 lsd[2] = this.height & 0xff;
 lsd[3] = (this.height >> 8) & 0xff;
 lsd[4] = 0xf7;
 lsd[5] = 0;
 lsd[6] = 0;
 parts.push(lsd);
 parts.push(new Uint8Array(this.palette));
 parts.push(new Uint8Array([33, 255, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0]));
 for (const frame of this.frames) {
 const gc = new Uint8Array(8);
 gc[0] = 0x21;
 gc[1] = 0xf9;
 gc[2] = 4;
 gc[3] = 0;
 gc[4] = frame.delay & 0xff;
 gc[5] = (frame.delay >> 8) & 0xff;
 gc[6] = 0;
 gc[7] = 0;
 parts.push(gc);
 const id = new Uint8Array(10);
 id[0] = 0x2c;
 id[1] = 0;
 id[2] = 0;
 id[3] = 0;
 id[4] = 0;
 id[5] = this.width & 0xff;
 id[6] = (this.width >> 8) & 0xff;
 id[7] = this.height & 0xff;
 id[8] = (this.height >> 8) & 0xff;
 id[9] = 0;
 parts.push(id);
 const lzw = this._lzwEncode(frame.indexed);
 parts.push(lzw);
 }
 parts.push(new Uint8Array([0x3b]));
 let totalLen = 0;
 for (const p of parts) totalLen += p.length;
 const result = new Uint8Array(totalLen);
 let offset = 0;
 for (const p of parts) {
 result.set(p, offset);
 offset += p.length;
 }
 return result.buffer;
 }
 _lzwEncode(indexed) {
 const minCodeSize = 8;
 const clearCode = 1 << minCodeSize;
 const eoiCode = clearCode + 1;
 const output = [];
 let bitBuffer = 0;
 let bitCount = 0;
 let codeSize = minCodeSize + 1;
 let dict = new Map();
 function resetDict() {
 dict.clear();
 for (let i = 0; i < clearCode; i++) {
 dict.set(String(i), i);
 }
 }
 function writeCode(code) {
 bitBuffer |= code << bitCount;
 bitCount += codeSize;
 while (bitCount >= 8) {
 output.push(bitBuffer & 0xff);
 bitBuffer >>= 8;
 bitCount -= 8;
 }
 }
 resetDict();
 writeCode(clearCode);
 let nextCode = eoiCode + 1;
 let w = String(indexed[0]);
 for (let i = 1; i < indexed.length; i++) {
 const c = String(indexed[i]);
 const wc = w + ',' + c;
 if (dict.has(wc)) {
 w = wc;
 } else {
 writeCode(dict.get(w));
 if (nextCode < 4096) {
 dict.set(wc, nextCode++);
 if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
 } else {
 writeCode(clearCode);
 resetDict();
 nextCode = eoiCode + 1;
 codeSize = minCodeSize + 1;
 }
 w = c;
 }
 }
 writeCode(dict.get(w));
 writeCode(eoiCode);
 if (bitCount > 0) output.push(bitBuffer & 0xff);
 const subBlocks = [];
 for (let i = 0; i < output.length; i += 255) {
 const chunk = output.slice(i, i + 255);
 subBlocks.push(chunk.length, ...chunk);
 }
 return new Uint8Array([minCodeSize, ...subBlocks, 0]);
 }
}
function handleKeydown(e) {
 const tag = (e.target.tagName || '').toLowerCase();
 const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';
 if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
 e.preventDefault();
 if (!inInput) handleUndo();
 return;
 }
 if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
 e.preventDefault();
 if (!inInput) handleRedo();
 return;
 }
 if (e.key === 'Delete' || e.key === 'Backspace') {
 if (!selectedItem.value)
 return;
 if (inInput)
 return;
 const { type, id } = selectedItem.value;
 const arr = postcard[type];
 const idx = arr.findIndex(i => i.id === id);
 if (idx >= 0) {
 arr.splice(idx, 1);
 selectedItem.value = null;
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
 showToast('已删除选中元素', 'info');
 }
 }
 if ((e.ctrlKey || e.metaKey) && e.key === 's') {
 e.preventDefault();
 saveWork();
 }
}
function onInteractionStart() {
 isInteracting.value = true;
 clearTimeout(pushDebounceTimer);
}
function onInteractionEnd() {
 isInteracting.value = false;
 historyPush(deepClone({ ...postcard, backContent: { ...backContent } }));
}
async function restoreSnapshot(snapshot) {
 isRestoring.value = true;
 Object.assign(postcard, createEmpty());
 Object.assign(backContent, createEmptyBack());
 await nextTick();
 Object.assign(postcard, {
 id: snapshot.id || '',
 name: snapshot.name || '',
 paperId: snapshot.paperId || 'p1',
 texts: snapshot.texts || [],
 photos: snapshot.photos || [],
 stamps: snapshot.stamps || [],
 postmarks: snapshot.postmarks || [],
 audios: snapshot.audios || [],
 qrcodes: snapshot.qrcodes || []
 });
 if (snapshot.backContent) {
 Object.assign(backContent, snapshot.backContent);
 }
 nameInput.value = postcard.name;
 selectedItem.value = null;
 await nextTick();
 isRestoring.value = false;
}
function handleUndo() {
 const snapshot = undo();
 if (snapshot) restoreSnapshot(snapshot);
}
function handleRedo() {
 const snapshot = redo();
 if (snapshot) restoreSnapshot(snapshot);
}
function toggle3DMode() {
 is3DMode.value = !is3DMode.value;
 showToast(is3DMode.value ? '🎬 已进入 3D 预览模式，拖拽可旋转查看' : '✏️ 已返回编辑模式', 'info');
}
watch([() => postcard.paperId, () => postcard.texts, () => postcard.photos, () => postcard.stamps, () => postcard.postmarks,
 () => postcard.audios, () => postcard.qrcodes, () => backContent, nameInput], () => {
 autoSaveDraft();
}, { deep: true });
onMounted(async () => {
 document.addEventListener('keydown', handleKeydown);
 await initDB();
 const draftRes = await mockApi.getDraft();
 hasDraft.value = !!(draftRes.code === 200 && draftRes.data);
 applyTemplate(defaultTemplates[0], true);
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
          <button
            class="!text-xs !py-1.5 !px-3 whitespace-nowrap transition-all shadow-md"
            :class="is3DMode
              ? '!bg-amber-500 !text-navy-900 !border-amber-600 hover:!bg-amber-400 btn-primary'
              : '!bg-navy-700 !text-kraft-100 !border-navy-600 hover:!bg-navy-600 btn-secondary'"
            @click="toggle3DMode"
            :title="is3DMode ? '返回2D编辑模式' : '进入3D立体预览模式'"
          >
            {{ is3DMode ? '🎬 3D 预览中' : '🎬 3D 预览' }}
          </button>
          <button
            class="btn-secondary !text-xs !py-1.5 !px-3 whitespace-nowrap"
            :class="{ 'opacity-30 cursor-not-allowed': !canUndo }"
            :disabled="!canUndo"
            @click="handleUndo"
            title="撤销 (Ctrl+Z)"
          >
            ↩️ 撤销
          </button>
          <button
            class="btn-secondary !text-xs !py-1.5 !px-3 whitespace-nowrap"
            :class="{ 'opacity-30 cursor-not-allowed': !canRedo }"
            :disabled="!canRedo"
            @click="handleRedo"
            title="重做 (Ctrl+Y)"
          >
            ↪️ 重做
          </button>
          <button class="btn-secondary !text-xs !py-1.5 !px-3 whitespace-nowrap" @click="addMusic">
            🎵 添加音乐
          </button>
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
            <span v-else>📥 导出</span>
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
          <div class="flex justify-between"><span>撤销</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Ctrl+Z</kbd></div>
          <div class="flex justify-between"><span>重做</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Ctrl+Y</kbd></div>
          <div class="flex justify-between"><span>删除元素</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Del</kbd></div>
          <div class="flex justify-between"><span>保存作品</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Ctrl+S</kbd></div>
          <div class="flex justify-between"><span>等比缩放照片</span><kbd class="bg-kraft-200 px-1.5 py-0.5 rounded border border-kraft-400">Shift+拖</kbd></div>
          <p class="text-[11px] text-kraft-600 pt-2 border-t border-dashed border-kraft-300">
            💡 提示：编辑过程中每 1.5 秒会自动保存草稿到本地
          </p>
        </div>
      </aside>

      <main class="min-w-0">
        <div v-if="!is3DMode" class="panel !p-2 bg-kraft-200/60 backdrop-blur-sm">
          <PostcardCanvas
            ref="canvasComp"
            :model-value="postcard"
            :selected="selectedItem"
            @update:model-value="updatePostcard"
            @select-item="selectItemHandler"
            @interaction-start="onInteractionStart"
            @interaction-end="onInteractionEnd"
          />
        </div>
        <div v-else class="panel !p-0 overflow-hidden" style="height: 800px;">
          <Postcard3D
            ref="card3DRef"
            :postcard="postcard"
            :back-content="backContent"
            @update:back-content="updateBackContent"
          />
        </div>
        <div class="text-center text-xs text-kraft-600 font-serif-sc mt-2">
          <span v-if="!is3DMode">明信片尺寸：540 × 720 px · 导出时自动放大 3 倍（1620 × 2160 高清）</span>
          <span v-else>🎬 3D 模式：拖拽明信片可旋转查看 · 点击「翻开背面」查看翻页动画</span>
        </div>
      </main>

      <aside class="sticky top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto pr-1">
        <div class="flex rounded-sm border-2 border-kraft-400 mb-4 overflow-hidden">
          <button
            class="flex-1 py-2 text-sm font-serif-sc transition-all"
            :class="rightPanelTab === 'property'
              ? 'bg-navy-800 text-kraft-50'
              : 'bg-kraft-100 text-navy-800 hover:bg-kraft-200'"
            @click="rightPanelTab = 'property'"
          >
            🎨 正面编辑
          </button>
          <button
            class="flex-1 py-2 text-sm font-serif-sc transition-all border-l-2 border-kraft-400"
            :class="rightPanelTab === 'back'
              ? 'bg-navy-800 text-kraft-50'
              : 'bg-kraft-100 text-navy-800 hover:bg-kraft-200'"
            @click="rightPanelTab = 'back'"
          >
            ✉️ 背面编辑
          </button>
        </div>

        <PropertyPanel
          v-show="rightPanelTab === 'property'"
          :postcard="postcard"
          :selected="selectedItem"
          @update:postcard="updatePostcard"
          @add-text="addText"
          @add-photo="addPhoto"
          @add-stamp="addStamp"
          @add-postmark="addPostmark"
          @add-music="addMusic"
          @add-qrcode="addQRCode"
          @generate-qr-for-voice="generateQRCodeForVoice"
        />
        <BackEditor
          v-show="rightPanelTab === 'back'"
          :model-value="backContent"
          @update:model-value="updateBackContent"
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
          v-if="showExportDialog"
          class="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          @click.self="showExportDialog = false"
        >
          <div class="bg-kraft-50 rounded-sm border-4 border-navy-800 shadow-vintage max-w-md w-full overflow-hidden">
            <div class="bg-navy-800 text-kraft-50 px-6 py-4 border-b-4 border-postred-600">
              <h2 class="font-playfair text-xl font-bold tracking-wider flex items-center gap-2">
                📥 导出选项
              </h2>
              <p class="text-kraft-300 text-xs font-serif-sc mt-1">选择要导出的内容</p>
            </div>
            <div class="p-6 space-y-3">
              <button
                class="w-full py-4 px-4 rounded-sm border-2 transition-all flex items-center gap-4 text-left group"
                :class="exporting ? 'opacity-50 cursor-not-allowed' : ''"
                :disabled="exporting"
                @click="doExport('front')"
              >
                <div class="w-16 h-12 rounded-sm border-2 border-navy-600 bg-gradient-to-br from-kraft-200 to-kraft-300 flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform">
                  🖼️
                </div>
                <div class="flex-1">
                  <div class="font-serif-sc text-navy-900 font-bold text-base">正面高清图</div>
                  <div class="text-kraft-600 text-xs">导出明信片正面（1620 × 2160 高清 PNG）</div>
                </div>
              </button>

              <button
                class="w-full py-4 px-4 rounded-sm border-2 transition-all flex items-center gap-4 text-left group"
                :class="!is3DMode || exporting ? 'opacity-50 cursor-not-allowed' : ''"
                :disabled="!is3DMode || exporting"
                @click="doExport('back')"
              >
                <div class="w-16 h-12 rounded-sm border-2 border-postred-600 bg-gradient-to-br from-kraft-100 to-kraft-200 flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform relative">
                  ✉️
                  <span class="absolute -bottom-1 -right-1 text-[10px] bg-postred-600 text-kraft-50 px-1 rounded-sm" v-if="!is3DMode">需3D</span>
                </div>
                <div class="flex-1">
                  <div class="font-serif-sc text-navy-900 font-bold text-base flex items-center gap-2">
                    背面高清图
                    <span v-if="!is3DMode" class="text-[10px] bg-kraft-200 text-kraft-600 px-2 py-0.5 rounded-sm">请先切换到3D模式</span>
                  </div>
                  <div class="text-kraft-600 text-xs">导出明信片背面含地址/邮票/祝福语（1620 × 2160 高清 PNG）</div>
                </div>
              </button>

              <div class="border-t-2 border-dashed border-kraft-300 my-4"></div>

              <button
                class="w-full py-4 px-4 rounded-sm border-2 transition-all flex items-center gap-4 text-left group relative overflow-hidden"
                :class="!is3DMode || exporting ? 'opacity-50 cursor-not-allowed border-kraft-400' : 'border-amber-500 bg-gradient-to-r from-amber-50 to-kraft-50 hover:from-amber-100 hover:to-amber-50'"
                :disabled="!is3DMode || exporting"
                @click="doExport('3d_gif')"
              >
                <div class="w-16 h-12 rounded-sm border-2 border-amber-600 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform relative">
                  🎬
                  <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  <span class="absolute -bottom-1 -right-1 text-[10px] bg-postred-600 text-kraft-50 px-1 rounded-sm" v-if="!is3DMode">需3D</span>
                </div>
                <div class="flex-1">
                  <div class="font-serif-sc text-navy-900 font-bold text-base flex items-center gap-2">
                    <span class="text-amber-700">★</span>
                    3D 翻页动画 GIF
                    <span v-if="!is3DMode" class="text-[10px] bg-kraft-200 text-kraft-600 px-2 py-0.5 rounded-sm">请先切换到3D模式</span>
                  </div>
                  <div class="text-kraft-600 text-xs">导出带立体翻页效果的动态 GIF 动画，约 48 帧循环播放</div>
                </div>
              </button>

              <div class="border-t-2 border-dashed border-kraft-300 my-4"></div>

              <button
                class="w-full py-4 px-4 rounded-sm border-2 transition-all flex items-center gap-4 text-left group relative overflow-hidden"
                :class="postcard.audios.length === 0 || exporting ? 'opacity-50 cursor-not-allowed border-kraft-400' : 'border-purple-500 bg-gradient-to-r from-purple-50 to-kraft-50 hover:from-purple-100 hover:to-purple-50'"
                :disabled="postcard.audios.length === 0 || exporting"
                @click="doExport('mp4')"
              >
                <div class="w-16 h-12 rounded-sm border-2 border-purple-600 bg-gradient-to-br from-purple-200 via-purple-300 to-purple-400 flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform relative">
                  🎵
                  <span class="absolute -bottom-1 -right-1 text-[10px] bg-purple-600 text-kraft-50 px-1 rounded-sm" v-if="postcard.audios.length === 0">需音频</span>
                </div>
                <div class="flex-1">
                  <div class="font-serif-sc text-navy-900 font-bold text-base flex items-center gap-2">
                    <span class="text-purple-700">★</span>
                    带音乐的 MP4 视频
                    <span v-if="postcard.audios.length === 0" class="text-[10px] bg-kraft-200 text-kraft-600 px-2 py-0.5 rounded-sm">请先添加音乐</span>
                  </div>
                  <div class="text-kraft-600 text-xs">导出包含背景音乐/语音留言的 MP4 视频，可在任意播放器播放</div>
                </div>
              </button>
            </div>
            <div class="bg-kraft-100 px-6 py-3 border-t-2 border-kraft-300 flex justify-end">
              <button
                class="btn-secondary !text-sm !py-2 !px-5"
                @click="showExportDialog = false"
                :disabled="exporting"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport v-if="exporting" to="body">
      <div class="fixed inset-0 z-[60] bg-navy-950/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
        <div class="bg-kraft-50 rounded-sm border-4 border-navy-800 shadow-vintage p-8 flex flex-col items-center gap-4 pointer-events-auto">
          <div class="w-16 h-16 border-4 border-navy-800 border-t-transparent rounded-full animate-spin"></div>
          <div class="text-center">
            <div class="font-playfair text-lg font-bold text-navy-900 tracking-wider">
              {{ exportingType === '3d_gif' ? '🎬 正在生成 3D 翻页动画...' : exportingType === 'mp4' ? '🎵 正在生成带音乐的 MP4 视频...' : '📸 正在生成高清图片...' }}
            </div>
            <div class="text-kraft-600 text-xs font-serif-sc mt-1">请稍候，这可能需要几秒钟</div>
          </div>
        </div>
      </div>
    </Teleport>

    <MusicSelector
      v-model="showMusicSelector"
      @select-music="handleSelectMusic"
      @select-voice="handleSelectVoice"
    />

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
          v-if="showQRCodeDialog"
          class="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          @click.self="showQRCodeDialog = false"
        >
          <div class="bg-kraft-50 rounded-sm border-4 border-navy-800 shadow-vintage max-w-md w-full overflow-hidden">
            <div class="bg-navy-800 text-kraft-50 px-6 py-4 border-b-4 border-postred-600">
              <h2 class="font-playfair text-xl font-bold tracking-wider flex items-center gap-2">
                📱 生成二维码
              </h2>
              <p class="text-kraft-300 text-xs font-serif-sc mt-1">输入二维码链接或文本</p>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-navy-700 font-serif-sc mb-1 text-sm">二维码内容</label>
                <input
                  v-model="qrCodeText"
                  type="text"
                  class="input-field w-full"
                  placeholder="输入链接或文本..."
                  @input="qrCodeDataUrl = qrCodeText.trim() ? generateQRCodeDataUrl(qrCodeText, 120) : ''"
                />
              </div>
              <div v-if="qrCodeDataUrl" class="flex justify-center">
                <div class="p-4 bg-white rounded-sm border-2 border-kraft-300">
                  <img :src="qrCodeDataUrl" alt="QR Code" class="w-32 h-32" />
                </div>
              </div>
            </div>
            <div class="bg-kraft-100 px-6 py-3 border-t-2 border-kraft-300 flex justify-end gap-2">
              <button
                class="btn-secondary !text-sm !py-2 !px-5"
                @click="showQRCodeDialog = false"
              >
                取消
              </button>
              <button
                class="btn-primary !text-sm !py-2 !px-5"
                :class="{ 'opacity-50 cursor-not-allowed': !qrCodeText.trim() }"
                :disabled="!qrCodeText.trim()"
                @click="confirmQRCode"
              >
                ✓ 确认添加
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
