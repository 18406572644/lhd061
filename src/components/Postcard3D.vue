<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { papers, stamps, postmarks, fonts } from '@/data/assets.js';
import DoodleCanvas from '@/components/DoodleCanvas.vue';

const props = defineProps({
  postcard: { type: Object, required: true },
  backContent: {
    type: Object,
    default: () => ({
      recipient: '',
      address: '',
      city: '',
      message: '',
      sender: '',
      stampId: 's1',
      postmarkId: 'pm1'
    })
  }
});

const emit = defineEmits(['update:backContent', 'flip-complete']);

const rootRef = ref(null);
const sceneRef = ref(null);
const cardRef = ref(null);
const frontCanvasRef = ref(null);
const backCanvasRef = ref(null);
const exportBackCanvasRef = ref(null);

const rotateX = ref(-10);
const rotateY = ref(-20);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const lastRotate = ref({ x: -10, y: -20 });

const flipProgress = ref(0);
const isFlipping = ref(false);
const flipAnimFrame = ref(null);
const autoRotateTimer = ref(null);

const CARD_W = 540;
const CARD_H = 720;
const THICKNESS = 16;

const paperObj = computed(() => papers.find(p => p.id === props.postcard.paperId) || papers[0]);

const cardStyle = computed(() => {
  const fp = flipProgress.value;
  const flipAngle = fp * 180;
  return {
    transform: `rotateX(${rotateX.value}deg) rotateY(${rotateY.value + flipAngle}deg)`,
    transformStyle: 'preserve-3d',
    transition: isDragging.value ? 'none' : 'transform 0.15s ease-out'
  };
});

const frontStyle = computed(() => ({
  transform: `translateZ(${THICKNESS / 2}px)`,
  backfaceVisibility: 'hidden'
}));

const backStyle = computed(() => ({
  transform: `rotateY(180deg) translateZ(${THICKNESS / 2}px)`,
  backfaceVisibility: 'hidden'
}));

function edgeStyle(dir) {
  const halfW = CARD_W / 2;
  const halfH = CARD_H / 2;
  const halfT = THICKNESS / 2;
  switch (dir) {
    case 'right':
      return {
        transform: `rotateY(90deg) translateZ(${halfW}px)`,
        width: THICKNESS + 'px',
        height: CARD_H + 'px',
        left: halfW - halfT + 'px',
        top: 0
      };
    case 'left':
      return {
        transform: `rotateY(-90deg) translateZ(${halfW}px)`,
        width: THICKNESS + 'px',
        height: CARD_H + 'px',
        left: halfW - halfT + 'px',
        top: 0
      };
    case 'top':
      return {
        transform: `rotateX(90deg) translateZ(${halfH}px)`,
        width: CARD_W + 'px',
        height: THICKNESS + 'px',
        left: 0,
        top: halfH - halfT + 'px'
      };
    case 'bottom':
      return {
        transform: `rotateX(-90deg) translateZ(${halfH}px)`,
        width: CARD_W + 'px',
        height: THICKNESS + 'px',
        left: 0,
        top: halfH - halfT + 'px'
      };
    default:
      return {};
  }
}

const edgeColor = computed(() => {
  const paper = paperObj.value;
  return paper.style.backgroundColor || '#dcb573';
});

const backCanvasStyle = computed(() => ({
  backgroundColor: '#faf5ed',
  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(185,123,51,0.12) 31px, rgba(185,123,51,0.12) 32px),url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.85 0 0 0 0 0.7 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
}));

function adjustBrightness(hex, amount) {
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const r = Math.max(0, Math.min(255, parseInt(color.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(color.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(color.slice(4, 6), 16) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function onMouseDown(e) {
  if (isFlipping.value) return;
  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
  lastRotate.value = { x: rotateX.value, y: rotateY.value };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
  if (!isDragging.value || isFlipping.value) return;
  const dx = e.clientX - dragStart.value.x;
  const dy = e.clientY - dragStart.value.y;
  rotateY.value = lastRotate.value.y + dx * 0.5;
  rotateX.value = Math.max(-80, Math.min(80, lastRotate.value.x - dy * 0.5));
}

function onMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function onTouchStart(e) {
  if (isFlipping.value || !e.touches[0]) return;
  isDragging.value = true;
  dragStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  lastRotate.value = { x: rotateX.value, y: rotateY.value };
}

function onTouchMove(e) {
  if (!isDragging.value || isFlipping.value || !e.touches[0]) return;
  const dx = e.touches[0].clientX - dragStart.value.x;
  const dy = e.touches[0].clientY - dragStart.value.y;
  rotateY.value = lastRotate.value.y + dx * 0.5;
  rotateX.value = Math.max(-80, Math.min(80, lastRotate.value.x - dy * 0.5));
}

function onTouchEnd() {
  isDragging.value = false;
}

function toggleFlip() {
  if (isFlipping.value) return;
  const startVal = flipProgress.value;
  const endVal = startVal > 0.5 ? 0 : 1;
  const duration = 1200;
  const startTime = performance.now();
  isFlipping.value = true;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    flipProgress.value = startVal + (endVal - startVal) * easeOut;
    if (progress < 1) {
      flipAnimFrame.value = requestAnimationFrame(animate);
    } else {
      isFlipping.value = false;
      flipProgress.value = endVal;
      emit('flip-complete', endVal === 1);
    }
  }
  flipAnimFrame.value = requestAnimationFrame(animate);
}

function resetView() {
  rotateX.value = -10;
  rotateY.value = -20;
}

function setFlipProgress(val) {
  if (isFlipping.value) {
    if (flipAnimFrame.value) cancelAnimationFrame(flipAnimFrame.value);
    isFlipping.value = false;
  }
  flipProgress.value = Math.max(0, Math.min(1, val));
}

function getFlipProgress() {
  return flipProgress.value;
}

function startAutoRotate() {
  if (autoRotateTimer.value) return;
  let angle = rotateY.value;
  autoRotateTimer.value = setInterval(() => {
    if (!isDragging.value && !isFlipping.value) {
      angle += 0.3;
      rotateY.value = angle;
    }
  }, 16);
}

function stopAutoRotate() {
  if (autoRotateTimer.value) {
    clearInterval(autoRotateTimer.value);
    autoRotateTimer.value = null;
  }
}

function getFont(fontId) {
  return fonts.find(f => f.id === fontId) || fonts[0];
}
function getStamp(stampId) {
  return stamps.find(s => s.id === stampId);
}
function getPostmark(pmId) {
  return postmarks.find(p => p.id === pmId);
}
function stampBox(scale = 1) {
  return { w: 90 * scale, h: 110 * scale };
}
function pmBox(scale = 1) {
  return { w: 140 * scale, h: 140 * scale };
}

defineExpose({
  rootRef,
  sceneRef,
  frontCanvasRef,
  backCanvasRef,
  exportBackCanvasRef,
  toggleFlip,
  resetView,
  setFlipProgress,
  getFlipProgress,
  isFlipping
});

onUnmounted(() => {
  if (flipAnimFrame.value) cancelAnimationFrame(flipAnimFrame.value);
  stopAutoRotate();
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <div
    ref="rootRef"
    class="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden relative"
  >
    <div
      ref="sceneRef"
      class="relative"
      :style="{ perspective: '1500px', width: CARD_W + 'px', height: CARD_H + 'px' }"
      @mousedown="onMouseDown"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        class="absolute inset-0 pointer-events-none"
        style="
          background: radial-gradient(ellipse at 30% 20%, rgba(255,215,120,0.15) 0%, transparent 50%),
                      radial-gradient(ellipse at 70% 80%, rgba(100,140,200,0.1) 0%, transparent 50%);
          filter: blur(40px);
          transform: translateZ(-200px);
        "
      ></div>

      <div
        ref="cardRef"
        class="absolute cursor-grab active:cursor-grabbing"
        :style="{ width: CARD_W + 'px', height: CARD_H + 'px', ...cardStyle }"
      >
        <div
          class="absolute w-full h-full rounded-sm overflow-hidden"
          :style="frontStyle"
        >
          <div
            ref="frontCanvasRef"
            class="relative w-full h-full shadow-vintage"
            :style="paperObj.style"
          >
            <div
              v-for="txt in postcard.texts"
              :key="txt.id"
              class="absolute"
              :style="{
                left: txt.x + 'px',
                top: txt.y + 'px',
                width: txt.width + 'px',
                minHeight: '40px',
                transform: `rotate(${txt.rotation || 0}deg)`,
                transformOrigin: 'center center'
              }"
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
            </div>

            <div
              v-for="ph in postcard.photos"
              :key="ph.id"
              class="absolute"
              :style="{
                left: ph.x + 'px',
                top: ph.y + 'px',
                width: ph.width + 'px',
                height: ph.height + 'px',
                transform: `rotate(${ph.rotation || 0}deg)`,
                transformOrigin: 'center center'
              }"
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
            </div>

            <div
              v-for="ins in postcard.stamps"
              :key="ins.id"
              class="absolute"
              :style="{
                left: ins.x + 'px',
                top: ins.y + 'px',
                width: stampBox(ins.scale).w + 'px',
                height: stampBox(ins.scale).h + 'px',
                transform: `rotate(${ins.rotation || 0}deg)`,
                transformOrigin: 'center center'
              }"
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
            </div>

            <div
              v-for="ins in postcard.postmarks"
              :key="ins.id"
              class="absolute"
              :style="{
                left: ins.x + 'px',
                top: ins.y + 'px',
                width: pmBox(ins.scale).w + 'px',
                height: pmBox(ins.scale).h + 'px',
                transform: `rotate(${ins.rotation || 0}deg)`,
                transformOrigin: 'center center'
              }"
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
                  <text x="70" y="40" text-anchor="middle" :fill="getPostmark(ins.postmarkId).color" font-family="'Playfair Display', serif" font-size="11" font-weight="700" letter-spacing="2" opacity="0.9">{{ getPostmark(ins.postmarkId).location }}</text>
                  <line x1="24" y1="55" x2="116" y2="55" :stroke="getPostmark(ins.postmarkId).color" stroke-width="1" opacity="0.5"/>
                  <line x1="24" y1="85" x2="116" y2="85" :stroke="getPostmark(ins.postmarkId).color" stroke-width="1" opacity="0.5"/>
                  <text x="70" y="74" text-anchor="middle" :fill="getPostmark(ins.postmarkId).color" font-family="'Playfair Display', serif" font-size="10" font-weight="600" letter-spacing="1.5" opacity="0.9">{{ getPostmark(ins.postmarkId).date }}</text>
                  <text x="70" y="108" text-anchor="middle" :fill="getPostmark(ins.postmarkId).color" font-family="'Caveat', cursive" font-size="13" font-weight="600" opacity="0.85">PAR AVION</text>
                  <line x1="42" y1="118" x2="98" y2="118" :stroke="getPostmark(ins.postmarkId).color" stroke-width="0.8" opacity="0.4"/>
                </svg>
              </template>
            </div>

            <DoodleCanvas
              :model-value="postcard.doodles || []"
              :read-only="true"
              :width="540"
              :height="720"
              class="absolute inset-0 pointer-events-none z-10"
            />

            <div
              class="absolute inset-0 pointer-events-none"
              style="
                background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%),
                            linear-gradient(315deg, rgba(0,0,0,0.15) 0%, transparent 40%);
                mix-blend-mode: overlay;
              "
            ></div>
          </div>
        </div>

        <div
          class="absolute w-full h-full rounded-sm overflow-hidden"
          :style="backStyle"
        >
          <div
            ref="backCanvasRef"
            class="relative w-full h-full shadow-vintage"
            :style="backCanvasStyle"
          >
            <div class="absolute left-0 top-0 w-1/2 h-full border-r-2 border-dashed border-navy-400/40 px-8 py-10 flex flex-col">
              <div class="mb-6">
                <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-2">祝福语 / Message</div>
                <div class="min-h-[180px] font-handwriting text-navy-800 text-lg leading-relaxed whitespace-pre-wrap">
                  {{ backContent.message || '（在此写下你的祝福...）' }}
                </div>
              </div>
              <div class="mt-auto">
                <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">寄信人 / From</div>
                <div class="font-handwriting text-navy-700 text-lg">
                  {{ backContent.sender || '（署名）' }}
                </div>
              </div>
            </div>

            <div class="absolute right-0 top-0 w-1/2 h-full px-6 py-8 flex flex-col">
              <div class="self-end mb-4">
                <div
                  v-if="getStamp(backContent.stampId)"
                  class="stamp-perforation w-[90px] h-[110px] shadow-stamp flex flex-col items-center justify-center p-2"
                  :style="{ backgroundColor: getStamp(backContent.stampId).bg }"
                >
                  <div class="text-3xl mb-1">{{ getStamp(backContent.stampId).emoji }}</div>
                  <div
                    class="text-[9px] font-serif-sc font-bold uppercase tracking-wider leading-tight text-center"
                    :style="{ color: getStamp(backContent.stampId).color }"
                  >
                    {{ getStamp(backContent.stampId).name }}
                  </div>
                  <div
                    class="mt-0.5 px-1 py-0.5 border text-[9px] font-serif-sc font-bold"
                    :style="{ borderColor: getStamp(backContent.stampId).color, color: getStamp(backContent.stampId).color }"
                  >
                    ¥{{ getStamp(backContent.stampId).value }}
                  </div>
                </div>
              </div>

              <div
                v-if="getPostmark(backContent.postmarkId)"
                class="absolute right-10 top-24 w-[120px] h-[120px] opacity-80"
              >
                <svg
                  viewBox="0 0 140 140"
                  class="w-full h-full"
                  :style="{ transform: `rotate(${getPostmark(backContent.postmarkId).rotation}deg)` }"
                >
                  <circle cx="70" cy="70" r="64" fill="none" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="2" stroke-dasharray="4 3" opacity="0.85"/>
                  <circle cx="70" cy="70" r="52" fill="none" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.6"/>
                  <circle cx="70" cy="70" r="36" fill="none" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.6"/>
                  <text x="70" y="40" text-anchor="middle" :fill="getPostmark(backContent.postmarkId).color" font-family="'Playfair Display', serif" font-size="10" font-weight="700" letter-spacing="2" opacity="0.9">{{ getPostmark(backContent.postmarkId).location }}</text>
                  <line x1="24" y1="55" x2="116" y2="55" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.5"/>
                  <line x1="24" y1="85" x2="116" y2="85" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.5"/>
                  <text x="70" y="74" text-anchor="middle" :fill="getPostmark(backContent.postmarkId).color" font-family="'Playfair Display', serif" font-size="9" font-weight="600" letter-spacing="1.5" opacity="0.9">{{ getPostmark(backContent.postmarkId).date }}</text>
                  <text x="70" y="108" text-anchor="middle" :fill="getPostmark(backContent.postmarkId).color" font-family="'Caveat', cursive" font-size="12" font-weight="600" opacity="0.85">PAR AVION</text>
                </svg>
              </div>

              <div class="mt-auto space-y-3">
                <div>
                  <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">收件人 / To</div>
                  <div class="font-serif-sc text-navy-900 text-2xl font-bold border-b-2 border-navy-500/40 pb-1">
                    {{ backContent.recipient || '___________' }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">地址 / Address</div>
                  <div class="font-handwriting text-navy-800 text-xl leading-relaxed min-h-[60px]">
                    {{ backContent.address || '_________________' }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">城市 / City</div>
                  <div class="font-handwriting text-navy-800 text-xl">
                    {{ backContent.city || '_________________' }}
                  </div>
                </div>
              </div>
            </div>

            <div
              class="absolute inset-0 pointer-events-none"
              style="
                background: linear-gradient(225deg, rgba(255,255,255,0.08) 0%, transparent 40%),
                            linear-gradient(45deg, rgba(0,0,0,0.15) 0%, transparent 40%);
                mix-blend-mode: overlay;
              "
            ></div>
          </div>
        </div>

        <div
          class="absolute rounded-sm"
          :style="{
            ...edgeStyle('right'),
            background: `linear-gradient(to bottom, ${edgeColor}, ${adjustBrightness(edgeColor, -20)})`,
            boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.2)'
          }"
        ></div>
        <div
          class="absolute rounded-sm"
          :style="{
            ...edgeStyle('left'),
            background: `linear-gradient(to bottom, ${adjustBrightness(edgeColor, 10)}, ${adjustBrightness(edgeColor, -15)})`,
            boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.15)'
          }"
        ></div>
        <div
          class="absolute rounded-sm"
          :style="{
            ...edgeStyle('top'),
            background: `linear-gradient(to right, ${adjustBrightness(edgeColor, 15)}, ${adjustBrightness(edgeColor, 5)}, ${adjustBrightness(edgeColor, 15)})`,
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.1)'
          }"
        ></div>
        <div
          class="absolute rounded-sm"
          :style="{
            ...edgeStyle('bottom'),
            background: `linear-gradient(to right, ${adjustBrightness(edgeColor, -25)}, ${adjustBrightness(edgeColor, -35)}, ${adjustBrightness(edgeColor, -25)})`,
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)'
          }"
        ></div>
      </div>

      <div
        class="absolute pointer-events-none"
        style="
          bottom: -60px;
          left: 50%;
          width: 80%;
          height: 40px;
          transform: translateX(-50%) rotateX(90deg);
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%);
          filter: blur(15px);
        "
      ></div>
    </div>

    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
      <button
        class="px-4 py-2 rounded-sm bg-navy-700/80 backdrop-blur-sm text-kraft-100 text-sm font-serif-sc border border-navy-500/50 hover:bg-navy-600/80 transition-colors shadow-lg"
        @click.stop="resetView"
      >
        🔄 重置视角
      </button>
      <button
        class="px-5 py-2 rounded-sm bg-postred-600/90 backdrop-blur-sm text-kraft-50 text-sm font-serif-sc border border-postred-700/50 hover:bg-postred-500/90 transition-colors shadow-lg flex items-center gap-2"
        @click.stop="toggleFlip"
        :disabled="isFlipping"
      >
        <span>{{ flipProgress > 0.5 ? '📖 翻回正面' : '📖 翻开背面' }}</span>
        <span v-if="isFlipping" class="text-xs animate-pulse">...</span>
      </button>
      <button
        class="px-4 py-2 rounded-sm bg-navy-700/80 backdrop-blur-sm text-kraft-100 text-sm font-serif-sc border border-navy-500/50 hover:bg-navy-600/80 transition-colors shadow-lg"
        @mouseenter.stop="startAutoRotate"
        @mouseleave.stop="stopAutoRotate"
      >
        🎬 自动旋转
      </button>
    </div>

    <div class="absolute top-4 left-4 text-kraft-200/70 text-xs font-serif-sc z-10">
      💡 拖拽旋转查看 · 点击按钮翻页
    </div>
  </div>

  <div
    ref="exportBackCanvasRef"
    class="shadow-vintage absolute top-0 left-0 z-[-1]"
    :style="{
      width: CARD_W + 'px',
      height: CARD_H + 'px',
      opacity: 0,
      pointerEvents: 'none',
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      ...backCanvasStyle
    }"
  >
    <div class="absolute left-0 top-0 w-1/2 h-full border-r-2 border-dashed border-navy-400/40 px-8 py-10 flex flex-col">
      <div class="mb-6">
        <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-2">祝福语 / Message</div>
        <div class="min-h-[180px] font-handwriting text-navy-800 text-lg leading-relaxed whitespace-pre-wrap">
          {{ backContent.message || '（在此写下你的祝福...）' }}
        </div>
      </div>
      <div class="mt-auto">
        <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">寄信人 / From</div>
        <div class="font-handwriting text-navy-700 text-lg">
          {{ backContent.sender || '（署名）' }}
        </div>
      </div>
    </div>
    <div class="absolute right-0 top-0 w-1/2 h-full px-6 py-8 flex flex-col">
      <div class="self-end mb-4">
        <div
          v-if="getStamp(backContent.stampId)"
          class="stamp-perforation w-[90px] h-[110px] shadow-stamp flex flex-col items-center justify-center p-2"
          :style="{ backgroundColor: getStamp(backContent.stampId).bg }"
        >
          <div class="text-3xl mb-1">{{ getStamp(backContent.stampId).emoji }}</div>
          <div
            class="text-[9px] font-serif-sc font-bold uppercase tracking-wider leading-tight text-center"
            :style="{ color: getStamp(backContent.stampId).color }"
          >
            {{ getStamp(backContent.stampId).name }}
          </div>
          <div
            class="mt-0.5 px-1 py-0.5 border text-[9px] font-serif-sc font-bold"
            :style="{ borderColor: getStamp(backContent.stampId).color, color: getStamp(backContent.stampId).color }"
          >
            ¥{{ getStamp(backContent.stampId).value }}
          </div>
        </div>
      </div>
      <div
        v-if="getPostmark(backContent.postmarkId)"
        class="absolute right-10 top-24 w-[120px] h-[120px] opacity-80"
      >
        <svg
          viewBox="0 0 140 140"
          class="w-full h-full"
          :style="{ transform: `rotate(${getPostmark(backContent.postmarkId).rotation}deg)` }"
        >
          <circle cx="70" cy="70" r="64" fill="none" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="2" stroke-dasharray="4 3" opacity="0.85"/>
          <circle cx="70" cy="70" r="52" fill="none" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.6"/>
          <circle cx="70" cy="70" r="36" fill="none" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.6"/>
          <text x="70" y="40" text-anchor="middle" :fill="getPostmark(backContent.postmarkId).color" font-family="'Playfair Display', serif" font-size="10" font-weight="700" letter-spacing="2" opacity="0.9">{{ getPostmark(backContent.postmarkId).location }}</text>
          <line x1="24" y1="55" x2="116" y2="55" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.5"/>
          <line x1="24" y1="85" x2="116" y2="85" :stroke="getPostmark(backContent.postmarkId).color" stroke-width="1" opacity="0.5"/>
          <text x="70" y="74" text-anchor="middle" :fill="getPostmark(backContent.postmarkId).color" font-family="'Playfair Display', serif" font-size="9" font-weight="600" letter-spacing="1.5" opacity="0.9">{{ getPostmark(backContent.postmarkId).date }}</text>
          <text x="70" y="108" text-anchor="middle" :fill="getPostmark(backContent.postmarkId).color" font-family="'Caveat', cursive" font-size="12" font-weight="600" opacity="0.85">PAR AVION</text>
        </svg>
      </div>
      <div class="mt-auto space-y-3">
        <div>
          <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">收件人 / To</div>
          <div class="font-serif-sc text-navy-900 text-2xl font-bold border-b-2 border-navy-500/40 pb-1">
            {{ backContent.recipient || '___________' }}
          </div>
        </div>
        <div>
          <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">地址 / Address</div>
          <div class="font-handwriting text-navy-800 text-xl leading-relaxed min-h-[60px]">
            {{ backContent.address || '_________________' }}
          </div>
        </div>
        <div>
          <div class="text-[11px] font-serif-sc uppercase tracking-widest text-navy-600/70 mb-1">城市 / City</div>
          <div class="font-handwriting text-navy-800 text-xl">
            {{ backContent.city || '_________________' }}
          </div>
        </div>
      </div>
    </div>
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: linear-gradient(225deg, rgba(255,255,255,0.08) 0%, transparent 40%),
                    linear-gradient(45deg, rgba(0,0,0,0.15) 0%, transparent 40%);
        mix-blend-mode: overlay;
      "
    ></div>
  </div>
</template>
