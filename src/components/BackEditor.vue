<script setup>
import { computed } from 'vue';
import { stamps, postmarks } from '@/data/assets.js';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

function update(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

const stampList = computed(() => stamps);
const postmarkList = computed(() => postmarks);

const messagePresets = [
  '愿你每天都充满阳光与欢笑！',
  '思念是一种美丽的孤独，只为你。',
  '山水万程，皆有好运。',
  '愿这张明信片，带去我最真的祝福。',
  '纸短情长，不尽欲言。',
  '愿你被这世界温柔以待。',
  'All the best from a faraway place!',
  'Keep smiling, keep shining!'
];
</script>

<template>
  <div class="space-y-4">
    <div class="panel">
      <div class="section-title">📬 地址栏信息</div>

      <div class="space-y-3 text-sm">
        <div>
          <label class="block text-navy-700 font-serif-sc mb-1 text-xs">收件人姓名</label>
          <input
            type="text"
            class="input-field !py-2 !text-sm"
            :value="modelValue.recipient"
            @input="update('recipient', $event.target.value)"
            placeholder="例如：张三 / Mr. Smith"
          />
        </div>

        <div>
          <label class="block text-navy-700 font-serif-sc mb-1 text-xs">收件地址</label>
          <textarea
            class="input-field !text-sm min-h-[70px] whitespace-pre-wrap"
            :value="modelValue.address"
            @input="update('address', $event.target.value)"
            placeholder="街道、门牌号等详细地址"
          ></textarea>
        </div>

        <div>
          <label class="block text-navy-700 font-serif-sc mb-1 text-xs">城市 / 邮编 / 国家</label>
          <input
            type="text"
            class="input-field !py-2 !text-sm"
            :value="modelValue.city"
            @input="update('city', $event.target.value)"
            placeholder="例如：北京市 100000 / 中国"
          />
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">✍️ 祝福语</div>
      <textarea
        class="input-field !text-sm min-h-[140px] whitespace-pre-wrap font-handwriting text-lg"
        :value="modelValue.message"
        @input="update('message', $event.target.value)"
        placeholder="写下你想说的话..."
      ></textarea>
      <div class="mt-2">
        <div class="text-[11px] text-kraft-600 font-serif-sc mb-1.5">💡 快速插入祝福语：</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="(msg, idx) in messagePresets"
            :key="idx"
            class="text-[11px] px-2 py-1 rounded-sm bg-kraft-100 text-navy-700 border border-kraft-300 hover:bg-kraft-200 hover:border-navy-400 transition-colors font-handwriting"
            @click="update('message', msg)"
          >
            {{ msg }}
          </button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">💌 寄信人</div>
      <input
        type="text"
        class="input-field !py-2 !text-sm font-handwriting text-lg"
        :value="modelValue.sender"
        @input="update('sender', $event.target.value)"
        placeholder="你的名字 / 署名"
      />
    </div>

    <div class="panel">
      <div class="section-title">📮 邮票选择</div>
      <div class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
        <button
          v-for="s in stampList"
          :key="s.id"
          class="aspect-[9/11] rounded-sm border-2 transition-all hover:scale-105 flex flex-col items-center justify-center stamp-perforation p-1 shadow-stamp"
          :class="modelValue.stampId === s.id ? 'ring-2 ring-navy-700 ring-offset-1' : 'border-kraft-400'"
          :style="{ backgroundColor: s.bg }"
          @click="update('stampId', s.id)"
          :title="s.name"
        >
          <span class="text-xl">{{ s.emoji }}</span>
          <span class="text-[8px] font-serif-sc font-bold truncate w-full text-center" :style="{ color: s.color }">{{ s.name }}</span>
          <span class="text-[7px] font-serif-sc font-bold mt-0.5" :style="{ color: s.color }">¥{{ s.value }}</span>
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">🕐 邮戳选择</div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="pm in postmarkList"
          :key="pm.id"
          class="py-2 px-2 rounded-sm border-2 transition-all text-xs font-serif-sc text-center"
          :class="modelValue.postmarkId === pm.id ? 'bg-navy-800 text-kraft-50 border-navy-900' : 'bg-kraft-100 text-navy-800 border-kraft-400 hover:border-navy-500'"
          @click="update('postmarkId', pm.id)"
        >
          📍 {{ pm.name }}
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="text-kraft-600 font-serif-sc text-xs text-center">
        👆 在「🎬 3D 预览模式中<br/>查看明信片背面效果
      </div>
    </div>
  </div>
</template>
