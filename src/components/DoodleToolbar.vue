<script setup>
import { ref, computed, watch } from 'vue';
import { brushTypes, doodleColorPalettes } from '@/data/assets.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  brushType: { type: String, default: 'hard' },
  brushColor: { type: String, default: '#0f1e3d' },
  brushSize: { type: Number, default: 5 },
  brushOpacity: { type: Number, default: 1 },
  isEraser: { type: Boolean, default: false },
  eraserSize: { type: Number, default: 20 },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false }
});

const emit = defineEmits([
  'update:modelValue',
  'update:brushType',
  'update:brushColor',
  'update:brushSize',
  'update:brushOpacity',
  'update:isEraser',
  'update:eraserSize',
  'undo',
  'redo',
  'clear'
]);

const activePalette = ref('vintage');
const showColorPicker = ref(false);

const currentPalette = computed(() => {
  return doodleColorPalettes.find(p => p.id === activePalette.value) || doodleColorPalettes[0];
});

function selectBrush(type) {
  emit('update:isEraser', false);
  emit('update:brushType', type);
}

function selectEraser() {
  emit('update:isEraser', true);
}

function selectColor(color) {
  emit('update:brushColor', color);
  emit('update:isEraser', false);
}

function toggleDoodle() {
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <div class="doodle-toolbar">
    <div class="panel">
      <div class="section-title flex justify-between items-center">
        <span>🖌️ 画笔工具</span>
        <button
          class="text-xs px-2 py-0.5 rounded-sm border transition-all"
          :class="modelValue
            ? 'bg-postred-600 text-kraft-50 border-postred-700'
            : 'bg-kraft-100 text-navy-700 border-kraft-400 hover:bg-kraft-200'"
          @click="toggleDoodle"
        >
          {{ modelValue ? '关闭' : '开启' }}
        </button>
      </div>

      <div v-show="modelValue" class="space-y-4 mt-3">
        <div>
          <label class="block text-navy-700 font-serif-sc mb-2 text-xs">画笔类型</label>
          <div class="grid grid-cols-5 gap-1">
            <button
              v-for="brush in brushTypes"
              :key="brush.id"
              class="flex flex-col items-center justify-center p-2 rounded-sm border-2 transition-all hover:scale-105"
              :class="[
                !isEraser && brushType === brush.id
                  ? 'bg-navy-800 text-kraft-50 border-navy-900'
                  : 'bg-kraft-50 text-navy-700 border-kraft-300 hover:border-navy-500'
              ]"
              :title="brush.description"
              @click="selectBrush(brush.id)"
            >
              <span class="text-lg">{{ brush.icon }}</span>
              <span class="text-[10px] font-serif-sc mt-1">{{ brush.name }}</span>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-navy-700 font-serif-sc mb-2 text-xs">
            橡皮工具
          </label>
          <button
            class="w-full py-2 px-3 rounded-sm border-2 transition-all flex items-center justify-center gap-2"
            :class="[
              isEraser
                ? 'bg-kraft-200 text-navy-800 border-navy-600'
                : 'bg-kraft-50 text-navy-600 border-kraft-300 hover:border-navy-400'
            ]"
            @click="selectEraser"
          >
            <span class="text-lg">🧽</span>
            <span class="text-sm font-serif-sc">橡皮擦</span>
          </button>
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-navy-700 font-serif-sc text-xs">
              {{ isEraser ? '橡皮粗细' : '画笔粗细' }}
            </label>
            <span class="text-kraft-600 text-xs font-serif-sc">
              {{ isEraser ? eraserSize : brushSize }}px
            </span>
          </div>
          <input
            type="range"
            :min="isEraser ? 5 : 1"
            :max="isEraser ? 80 : 50"
            step="1"
            class="w-full accent-navy-700"
            :value="isEraser ? eraserSize : brushSize"
            @input="isEraser
              ? $emit('update:eraserSize', +$event.target.value)
              : $emit('update:brushSize', +$event.target.value)"
          />
          <div class="flex justify-between text-[10px] text-kraft-500 font-serif-sc mt-0.5">
            <span>细</span>
            <span>粗</span>
          </div>
        </div>

        <div v-if="!isEraser">
          <div class="flex justify-between items-center mb-1">
            <label class="text-navy-700 font-serif-sc text-xs">透明度</label>
            <span class="text-kraft-600 text-xs font-serif-sc">
              {{ Math.round(brushOpacity * 100) }}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            class="w-full accent-navy-700"
            :value="brushOpacity"
            @input="$emit('update:brushOpacity', +$event.target.value)"
          />
        </div>

        <div v-if="!isEraser">
          <label class="block text-navy-700 font-serif-sc mb-2 text-xs">配色方案</label>
          <div class="flex flex-wrap gap-1 mb-2">
            <button
              v-for="palette in doodleColorPalettes"
              :key="palette.id"
              class="px-2 py-1 text-[10px] rounded-sm border transition-all font-serif-sc"
              :class="[
                activePalette === palette.id
                  ? 'bg-navy-800 text-kraft-50 border-navy-900'
                  : 'bg-kraft-50 text-navy-600 border-kraft-300 hover:border-navy-400'
              ]"
              @click="activePalette = palette.id"
            >
              {{ palette.name }}
            </button>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="color in currentPalette.colors"
              :key="color"
              class="w-7 h-7 rounded-sm border-2 transition-all hover:scale-110"
              :class="brushColor === color ? 'border-navy-800 ring-2 ring-navy-400' : 'border-kraft-400'"
              :style="{ backgroundColor: color }"
              :title="color"
              @click="selectColor(color)"
            ></button>
            <div class="relative">
              <input
                type="color"
                class="w-7 h-7 rounded-sm border-2 border-kraft-400 cursor-pointer"
                :value="brushColor"
                @input="selectColor($event.target.value)"
                title="自定义颜色"
              />
            </div>
          </div>
        </div>

        <div class="border-t-2 border-dashed border-kraft-300 pt-3">
          <label class="block text-navy-700 font-serif-sc mb-2 text-xs">操作</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              class="py-2 px-2 rounded-sm border-2 transition-all text-sm flex flex-col items-center gap-1"
              :class="canUndo
                ? 'bg-kraft-50 text-navy-700 border-kraft-300 hover:border-navy-500 hover:bg-kraft-100'
                : 'bg-kraft-100 text-kraft-400 border-kraft-200 cursor-not-allowed'"
              :disabled="!canUndo"
              title="撤销一笔 (Ctrl+Z)"
              @click="$emit('undo')"
            >
              <span>↩️</span>
              <span class="text-[10px] font-serif-sc">撤销</span>
            </button>
            <button
              class="py-2 px-2 rounded-sm border-2 transition-all text-sm flex flex-col items-center gap-1"
              :class="canRedo
                ? 'bg-kraft-50 text-navy-700 border-kraft-300 hover:border-navy-500 hover:bg-kraft-100'
                : 'bg-kraft-100 text-kraft-400 border-kraft-200 cursor-not-allowed'"
              :disabled="!canRedo"
              title="重做一笔 (Ctrl+Y)"
              @click="$emit('redo')"
            >
              <span>↪️</span>
              <span class="text-[10px] font-serif-sc">重做</span>
            </button>
            <button
              class="py-2 px-2 rounded-sm border-2 transition-all text-sm flex flex-col items-center gap-1"
              :class="'bg-postred-50 text-postred-700 border-postred-300 hover:border-postred-500 hover:bg-postred-100'"
              title="清空所有涂鸦"
              @click="$emit('clear')"
            >
              <span>🗑️</span>
              <span class="text-[10px] font-serif-sc">清空</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doodle-toolbar {
  user-select: none;
}
</style>
