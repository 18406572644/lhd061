<script setup>import { computed, ref } from 'vue';
import { papers, stamps, postmarks, fonts } from '@/data/assets.js';
import AudioIcon from '@/components/AudioIcon.vue';
const props = defineProps({
 modelValue: { type: Object, required: true },
 selected: { type: Object, default: null },
 readOnly: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue', 'select-item', 'interaction-start', 'interaction-end']);
const canvasRef = ref(null);
const dragState = ref(null);
const resizing = ref(null);
const rotating = ref(null);
const paperObj = computed(() => papers.find(p => p.id === props.modelValue.paperId) || papers[0]);
function getFont(fontId) {
 return fonts.find(f => f.id === fontId) || fonts[0];
}
function getStamp(stampId) {
 return stamps.find(s => s.id === stampId);
}
function getPostmark(pmId) {
 return postmarks.find(p => p.id === pmId);
}
function isSelected(type, id) {
 return props.selected && props.selected.type === type && props.selected.id === id;
}
function getItemSize(type, item) {
 switch (type) {
 case 'texts':
 return { w: item.width, h: 100 };
 case 'photos':
 return { w: item.width, h: item.height };
 case 'stamps':
 return { w: 90 * (item.scale || 1), h: 110 * (item.scale || 1) };
 case 'postmarks':
 return { w: 140 * (item.scale || 1), h: 140 * (item.scale || 1) };
 case 'audios':
 return { w: item.width, h: item.height };
 case 'qrcodes':
 return { w: item.width, h: item.height };
 default:
 return { w: 100, h: 100 };
 }
}
function updateField(key, value) {
 emit('update:modelValue', { ...props.modelValue, [key]: value });
}
function updateItem(type, itemId, patch) {
 const arr = props.modelValue[type];
 const idx = arr.findIndex(i => i.id === itemId);
 if (idx < 0)
 return;
 const newArr = [...arr];
 newArr[idx] = { ...newArr[idx], ...patch };
 updateField(type, newArr);
}
function selectItem(type, itemId) {
 if (props.readOnly)
 return;
 emit('select-item', { type, id: itemId });
}
function startDrag(e, type, itemId) {
 if (props.readOnly)
 return;
 e.stopPropagation();
 const canvasRect = canvasRef.value.getBoundingClientRect();
 const arr = props.modelValue[type];
 const item = arr.find(i => i.id === itemId);
 if (!item)
 return;
 dragState.value = {
  type,
  itemId,
  offsetX: e.clientX - canvasRect.left - item.x,
  offsetY: e.clientY - canvasRect.top - item.y,
  canvasRect
 };
 emit('interaction-start');
 selectItem(type, itemId);
 document.addEventListener('mousemove', onDrag);
 document.addEventListener('mouseup', stopDrag);
}
function onDrag(e) {
 if (!dragState.value)
 return;
 const { type, itemId, offsetX, offsetY, canvasRect } = dragState.value;
 let nx = e.clientX - canvasRect.left - offsetX;
 let ny = e.clientY - canvasRect.top - offsetY;
 nx = Math.max(-20, Math.min(canvasRect.width - 20, nx));
 ny = Math.max(-20, Math.min(canvasRect.height - 20, ny));
 updateItem(type, itemId, { x: Math.round(nx), y: Math.round(ny) });
}
function stopDrag() {
 dragState.value = null;
 document.removeEventListener('mousemove', onDrag);
 document.removeEventListener('mouseup', stopDrag);
 emit('interaction-end');
}
function startResize(e, type, itemId) {
 if (props.readOnly)
 return;
 e.stopPropagation();
 e.preventDefault();
 const canvasRect = canvasRef.value.getBoundingClientRect();
 const arr = props.modelValue[type];
 const item = arr.find(i => i.id === itemId);
 if (!item)
 return;
 const startX = e.clientX;
 const startY = e.clientY;
 const startW = item.width;
 const startH = item.height || 100;
 resizing.value = { type, itemId, startX, startY, startW, startH, canvasRect };
 selectItem(type, itemId);
 emit('interaction-start');
 document.addEventListener('mousemove', onResize);
 document.addEventListener('mouseup', stopResize);
}
function onResize(e) {
 if (!resizing.value)
 return;
 const { type, itemId, startX, startY, startW, startH } = resizing.value;
 const dx = e.clientX - startX;
 const dy = e.clientY - startY;
 const ratio = startH / startW;
 let nw = Math.max(60, startW + dx);
 let nh = type === 'texts' ? null : Math.max(40, startH + dy);
 if (type === 'photos' && e.shiftKey) {
 nh = Math.round(nw * ratio);
 }
 const patch = { width: Math.round(nw) };
 if (nh !== null)
 patch.height = Math.round(nh);
 updateItem(type, itemId, patch);
}
function stopResize() {
 resizing.value = null;
 document.removeEventListener('mousemove', onResize);
 document.removeEventListener('mouseup', stopResize);
 emit('interaction-end');
}
function startRotate(e, type, itemId) {
 if (props.readOnly)
 return;
 e.stopPropagation();
 e.preventDefault();
 const canvasRect = canvasRef.value.getBoundingClientRect();
 const arr = props.modelValue[type];
 const item = arr.find(i => i.id === itemId);
 if (!item)
 return;
 const size = getItemSize(type, item);
 const centerX = canvasRect.left + item.x + size.w / 2;
 const centerY = canvasRect.top + item.y + size.h / 2;
 const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
 const startRotation = item.rotation || 0;
 rotating.value = { type, itemId, centerX, centerY, startAngle, startRotation };
 selectItem(type, itemId);
 emit('interaction-start');
 document.addEventListener('mousemove', onRotate);
 document.addEventListener('mouseup', stopRotate);
}
function onRotate(e) {
 if (!rotating.value)
 return;
 const { type, itemId, centerX, centerY, startAngle, startRotation } = rotating.value;
 let currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
 let delta = currentAngle - startAngle;
 let newRotation = startRotation + delta;
 if (e.shiftKey) {
 newRotation = Math.round(newRotation / 15) * 15;
 }
 newRotation = ((newRotation % 360) + 360) % 360;
 if (newRotation > 180)
 newRotation -= 360;
 updateItem(type, itemId, { rotation: Math.round(newRotation * 100) / 100 });
}
function stopRotate() {
 rotating.value = null;
 document.removeEventListener('mousemove', onRotate);
 document.removeEventListener('mouseup', stopRotate);
 emit('interaction-end');
}
function stampBox(scale = 1) {
 return { w: 90 * scale, h: 110 * scale };
}
function pmBox(scale = 1) {
 return { w: 140 * scale, h: 140 * scale };
}
defineExpose({ canvasRef });
</script>

<template>
  <div class="flex justify-center items-start p-6">
    <div
      ref="canvasRef"
      class="relative shadow-vintage select-none"
      :style="{
        width: '540px',
        height: '720px',
        ...paperObj.style
      }"
      @click="selectItem(null, null)"
    >
      <div
        v-for="txt in modelValue.texts"
        :key="txt.id"
        class="absolute cursor-move group"
        :class="{ 'ring-2 ring-navy-500 ring-offset-2 ring-offset-kraft-100': !readOnly && isSelected('texts', txt.id) }"
        :style="{
          left: txt.x + 'px',
          top: txt.y + 'px',
          width: txt.width + 'px',
          minHeight: '40px',
          transform: `rotate(${txt.rotation || 0}deg)`,
          transformOrigin: 'center center'
        }"
        @mousedown="startDrag($event, 'texts', txt.id)"
        @click.stop="selectItem('texts', txt.id)"
      >
        <div
          :style="{
            fontFamily: getFont(txt.fontId).family,
            fontSize: txt.fontSize + 'px',
            color: txt.color,
            textAlign: txt.align || 'left',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }"
          class="w-full"
        >{{ txt.content || '（空文字）' }}</div>
        <div
          v-if="!readOnly && isSelected('texts', txt.id)"
          class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <div class="w-px h-6 bg-navy-500"></div>
          <div
            class="w-5 h-5 bg-kraft-50 border-2 border-navy-500 rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform z-20"
            title="拖拽旋转（按住 Shift 以 15° 步进）"
            @mousedown="startRotate($event, 'texts', txt.id)"
          ></div>
        </div>
        <div
          v-if="!readOnly && isSelected('texts', txt.id)"
          class="absolute -bottom-2 -right-2 w-5 h-5 bg-navy-800 border-2 border-kraft-50 cursor-se-resize rounded-sm z-10"
          @mousedown="startResize($event, 'texts', txt.id)"
        ></div>
      </div>

      <div
        v-for="ph in modelValue.photos"
        :key="ph.id"
        class="absolute cursor-move group"
        :class="{ 'ring-2 ring-navy-500 ring-offset-2 ring-offset-kraft-100': !readOnly && isSelected('photos', ph.id) }"
        :style="{
          left: ph.x + 'px',
          top: ph.y + 'px',
          width: ph.width + 'px',
          height: ph.height + 'px',
          transform: `rotate(${ph.rotation || 0}deg)`,
          transformOrigin: 'center center'
        }"
        @mousedown="startDrag($event, 'photos', ph.id)"
        @click.stop="selectItem('photos', ph.id)"
      >
        <div
          class="w-full h-full overflow-hidden"
          :class="[ph.border ? 'border-[6px] border-kraft-50 shadow-stamp' : '']"
          :style="{ backgroundColor: ph.src ? 'transparent' : '#dcb573' }"
        >
          <img
            v-if="ph.src"
            :src="ph.src"
            class="w-full h-full object-cover"
            alt="photo"
            draggable="false"
          />
          <div v-else class="w-full h-full flex flex-col items-center justify-center text-kraft-700 gap-1">
            <span class="text-4xl">🖼️</span>
            <span class="text-xs font-serif-sc">点击插入照片</span>
          </div>
        </div>
        <div
          v-if="!readOnly && isSelected('photos', ph.id)"
          class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <div class="w-px h-6 bg-navy-500"></div>
          <div
            class="w-5 h-5 bg-kraft-50 border-2 border-navy-500 rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform z-20"
            title="拖拽旋转（按住 Shift 以 15° 步进）"
            @mousedown="startRotate($event, 'photos', ph.id)"
          ></div>
        </div>
        <div
          v-if="!readOnly && isSelected('photos', ph.id)"
          class="absolute -bottom-2 -right-2 w-5 h-5 bg-navy-800 border-2 border-kraft-50 cursor-se-resize rounded-sm z-10"
          @mousedown="startResize($event, 'photos', ph.id)"
        ></div>
      </div>

      <div
        v-for="ins in modelValue.stamps"
        :key="ins.id"
        class="absolute cursor-move group"
        :class="{ 'ring-2 ring-navy-500 ring-offset-2 ring-offset-kraft-100': !readOnly && isSelected('stamps', ins.id) }"
        :style="{
          left: ins.x + 'px',
          top: ins.y + 'px',
          width: stampBox(ins.scale).w + 'px',
          height: stampBox(ins.scale).h + 'px',
          transform: `rotate(${ins.rotation || 0}deg)`,
          transformOrigin: 'center center'
        }"
        @mousedown="startDrag($event, 'stamps', ins.id)"
        @click.stop="selectItem('stamps', ins.id)"
      >
        <template v-if="getStamp(ins.stampId)">
          <div
            class="stamp-perforation w-full h-full shadow-stamp flex flex-col items-center justify-center p-2"
            :style="{ backgroundColor: getStamp(ins.stampId).bg }"
          >
            <div class="text-4xl mb-1">{{ getStamp(ins.stampId).emoji }}</div>
            <div
              class="text-[10px] font-serif-sc font-bold uppercase tracking-wider leading-tight text-center"
              :style="{ color: getStamp(ins.stampId).color }"
            >
              {{ getStamp(ins.stampId).name }}
            </div>
            <div
              class="mt-1 px-1.5 py-0.5 border text-[10px] font-serif-sc font-bold"
              :style="{ borderColor: getStamp(ins.stampId).color, color: getStamp(ins.stampId).color }"
            >
              ¥{{ getStamp(ins.stampId).value }}
            </div>
          </div>
        </template>
        <div
          v-if="!readOnly && isSelected('stamps', ins.id)"
          class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <div class="w-px h-6 bg-navy-500"></div>
          <div
            class="w-5 h-5 bg-kraft-50 border-2 border-navy-500 rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform z-20"
            title="拖拽旋转（按住 Shift 以 15° 步进）"
            @mousedown="startRotate($event, 'stamps', ins.id)"
          ></div>
        </div>
      </div>

      <div
        v-for="ins in modelValue.postmarks"
        :key="ins.id"
        class="absolute cursor-move pointer-events-auto group"
        :class="{ 'ring-2 ring-navy-500 ring-offset-2 ring-offset-kraft-100': !readOnly && isSelected('postmarks', ins.id) }"
        :style="{
          left: ins.x + 'px',
          top: ins.y + 'px',
          width: pmBox(ins.scale).w + 'px',
          height: pmBox(ins.scale).h + 'px',
          transform: `rotate(${ins.rotation || 0}deg)`,
          transformOrigin: 'center center'
        }"
        @mousedown="startDrag($event, 'postmarks', ins.id)"
        @click.stop="selectItem('postmarks', ins.id)"
      >
        <template v-if="getPostmark(ins.postmarkId)">
          <svg
            viewBox="0 0 140 140"
            class="w-full h-full"
            :style="{ transform: `rotate(${getPostmark(ins.postmarkId).rotation}deg)` }"
          >
            <circle cx="70" cy="70" r="64" fill="none" :stroke="getPostmark(ins.postmarkId).color" stroke-width="2" stroke-dasharray="4 3" opacity="0.85"/>
            <circle cx="70" cy="70" r="52" fill="none" :stroke="getPostmark(ins.postmarkId).color" stroke-width="1" opacity="0.6"/>
            <circle cx="70" cy="70" r="36" fill="none" :stroke="getPostmark(ins.postmarkId).color" stroke-width="1" opacity="0.6"/>
            <text
              x="70" y="40"
              text-anchor="middle"
              :fill="getPostmark(ins.postmarkId).color"
              font-family="'Playfair Display', serif"
              font-size="11"
              font-weight="700"
              letter-spacing="2"
              opacity="0.9"
            >{{ getPostmark(ins.postmarkId).location }}</text>
            <line x1="24" y1="55" x2="116" y2="55" :stroke="getPostmark(ins.postmarkId).color" stroke-width="1" opacity="0.5"/>
            <line x1="24" y1="85" x2="116" y2="85" :stroke="getPostmark(ins.postmarkId).color" stroke-width="1" opacity="0.5"/>
            <text
              x="70" y="74"
              text-anchor="middle"
              :fill="getPostmark(ins.postmarkId).color"
              font-family="'Playfair Display', serif"
              font-size="10"
              font-weight="600"
              letter-spacing="1.5"
              opacity="0.9"
            >{{ getPostmark(ins.postmarkId).date }}</text>
            <text
              x="70" y="108"
              text-anchor="middle"
              :fill="getPostmark(ins.postmarkId).color"
              font-family="'Caveat', cursive"
              font-size="13"
              font-weight="600"
              opacity="0.85"
            >PAR AVION</text>
            <line x1="42" y1="118" x2="98" y2="118" :stroke="getPostmark(ins.postmarkId).color" stroke-width="0.8" opacity="0.4"/>
          </svg>
        </template>
        <div
          v-if="!readOnly && isSelected('postmarks', ins.id)"
          class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <div class="w-px h-6 bg-navy-500"></div>
          <div
            class="w-5 h-5 bg-kraft-50 border-2 border-navy-500 rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform z-20"
            title="拖拽旋转（按住 Shift 以 15° 步进）"
            @mousedown="startRotate($event, 'postmarks', ins.id)"
          ></div>
        </div>
      </div>

      <div
        v-for="au in modelValue.audios"
        :key="au.id"
        class="absolute cursor-move group"
        :class="{ 'ring-2 ring-navy-500 ring-offset-2 ring-offset-kraft-100': !readOnly && isSelected('audios', au.id) }"
        :style="{
          left: au.x + 'px',
          top: au.y + 'px',
          width: au.width + 'px',
          height: au.height + 'px',
          transform: `rotate(${au.rotation || 0}deg)`,
          transformOrigin: 'center center'
        }"
        @mousedown="startDrag($event, 'audios', au.id)"
        @click.stop="selectItem('audios', au.id)"
      >
        <AudioIcon
          :audio-data="au"
          :is-selected="isSelected('audios', au.id)"
          :read-only="readOnly"
          @select="selectItem('audios', au.id)"
        />
        <div
          v-if="!readOnly && isSelected('audios', au.id)"
          class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <div class="w-px h-6 bg-navy-500"></div>
          <div
            class="w-5 h-5 bg-kraft-50 border-2 border-navy-500 rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform z-20"
            title="拖拽旋转（按住 Shift 以 15° 步进）"
            @mousedown="startRotate($event, 'audios', au.id)"
          ></div>
        </div>
        <div
          v-if="!readOnly && isSelected('audios', au.id)"
          class="absolute -bottom-2 -right-2 w-5 h-5 bg-navy-800 border-2 border-kraft-50 cursor-se-resize rounded-sm z-10"
          @mousedown="startResize($event, 'audios', au.id)"
        ></div>
      </div>

      <div
        v-for="qr in modelValue.qrcodes"
        :key="qr.id"
        class="absolute cursor-move group"
        :class="{ 'ring-2 ring-navy-500 ring-offset-2 ring-offset-kraft-100': !readOnly && isSelected('qrcodes', qr.id) }"
        :style="{
          left: qr.x + 'px',
          top: qr.y + 'px',
          width: qr.width + 'px',
          height: qr.height + 'px',
          transform: `rotate(${qr.rotation || 0}deg)`,
          transformOrigin: 'center center'
        }"
        @mousedown="startDrag($event, 'qrcodes', qr.id)"
        @click.stop="selectItem('qrcodes', qr.id)"
      >
        <div class="w-full h-full bg-white p-1 shadow-md">
          <img
            v-if="qr.dataUrl"
            :src="qr.dataUrl"
            class="w-full h-full object-contain"
            alt="QR Code"
            draggable="false"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-navy-800 text-2xl">
            📱
          </div>
        </div>
        <div
          v-if="qr.title"
          class="absolute -bottom-5 left-0 right-0 text-center text-[10px] font-serif-sc text-navy-800 truncate"
        >
          {{ qr.title }}
        </div>
        <div
          v-if="!readOnly && isSelected('qrcodes', qr.id)"
          class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <div class="w-px h-6 bg-navy-500"></div>
          <div
            class="w-5 h-5 bg-kraft-50 border-2 border-navy-500 rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform z-20"
            title="拖拽旋转（按住 Shift 以 15° 步进）"
            @mousedown="startRotate($event, 'qrcodes', qr.id)"
          ></div>
        </div>
        <div
          v-if="!readOnly && isSelected('qrcodes', qr.id)"
          class="absolute -bottom-2 -right-2 w-5 h-5 bg-navy-800 border-2 border-kraft-50 cursor-se-resize rounded-sm z-10"
          @mousedown="startResize($event, 'qrcodes', qr.id)"
        ></div>
      </div>

      <div v-if="readOnly" class="absolute inset-0 pointer-events-none"></div>
    </div>
  </div>
</template>
