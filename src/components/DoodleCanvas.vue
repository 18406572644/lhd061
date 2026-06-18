<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  readOnly: { type: Boolean, default: false },
  width: { type: Number, default: 540 },
  height: { type: Number, default: 720 },
  brushType: { type: String, default: 'hard' },
  brushColor: { type: String, default: '#0f1e3d' },
  brushSize: { type: Number, default: 5 },
  brushOpacity: { type: Number, default: 1 },
  isEraser: { type: Boolean, default: false },
  eraserSize: { type: Number, default: 20 }
});

const emit = defineEmits(['update:modelValue', 'stroke-complete', 'stroke-start']);

const canvasRef = ref(null);
const ctx = ref(null);
const isDrawing = ref(false);
const currentStroke = ref(null);
const lastPoint = ref(null);

const canvasStyle = computed(() => ({
  width: props.width + 'px',
  height: props.height + 'px'
}));

onMounted(() => {
  initCanvas();
  redrawAll();
});

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = props.width;
  canvas.height = props.height;
  ctx.value = canvas.getContext('2d');
  ctx.value.lineCap = 'round';
  ctx.value.lineJoin = 'round';
}

function getPointerPos(e) {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  let clientX, clientY, pressure = 0.5;
  
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
    pressure = e.touches[0].force || 0.5;
  } else if (e.pointerType) {
    clientX = e.clientX;
    clientY = e.clientY;
    pressure = e.pressure || 0.5;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
    pressure
  };
}

function startDrawing(e) {
  if (props.readOnly) return;
  e.preventDefault();
  
  const pos = getPointerPos(e);
  isDrawing.value = true;
  lastPoint.value = pos;
  
  const tool = props.isEraser ? 'eraser' : props.brushType;
  const size = props.isEraser ? props.eraserSize : props.brushSize;
  
  currentStroke.value = {
    id: 'ds_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    tool,
    color: props.brushColor,
    size,
    opacity: props.isEraser ? 1 : props.brushOpacity,
    points: [{ x: pos.x, y: pos.y, pressure: pos.pressure }]
  };
  
  emit('stroke-start', currentStroke.value);
  drawDot(pos.x, pos.y, size * pos.pressure, tool, props.brushColor, props.brushOpacity);
}

function draw(e) {
  if (!isDrawing.value || props.readOnly) return;
  e.preventDefault();
  
  const pos = getPointerPos(e);
  const last = lastPoint.value;
  
  const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
  if (dist < 1) return;
  
  currentStroke.value.points.push({ x: pos.x, y: pos.y, pressure: pos.pressure });
  
  drawStrokeSegment(last, pos);
  lastPoint.value = pos;
}

function stopDrawing(e) {
  if (!isDrawing.value || props.readOnly) return;
  e?.preventDefault?.();
  
  isDrawing.value = false;
  
  if (currentStroke.value && currentStroke.value.points.length >= 2) {
    const newStrokes = [...props.modelValue, currentStroke.value];
    emit('update:modelValue', newStrokes);
    emit('stroke-complete', currentStroke.value);
  }
  
  currentStroke.value = null;
  lastPoint.value = null;
}

function drawStrokeSegment(from, to) {
  const tool = props.isEraser ? 'eraser' : props.brushType;
  const size = props.isEraser ? props.eraserSize : props.brushSize;
  const color = props.brushColor;
  const opacity = props.isEraser ? 1 : props.brushOpacity;
  
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.floor(dist / 2));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const pressure = from.pressure + (to.pressure - from.pressure) * t;
    const pointSize = size * (0.5 + pressure * 0.5);
    
    drawDot(x, y, pointSize, tool, color, opacity);
  }
}

function drawDot(x, y, size, tool, color, opacity) {
  const context = ctx.value;
  if (!context) return;
  
  context.save();
  
  if (tool === 'eraser') {
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(x, y, size / 2, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0, 0, 0, 1)';
    context.fill();
  } else if (tool === 'hard') {
    context.globalAlpha = opacity;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, size / 2, 0, Math.PI * 2);
    context.fill();
  } else if (tool === 'soft') {
    context.globalAlpha = opacity;
    const gradient = context.createRadialGradient(x, y, 0, x, y, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, color + 'CC');
    gradient.addColorStop(1, color + '00');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, size / 2, 0, Math.PI * 2);
    context.fill();
  } else if (tool === 'marker') {
    context.globalAlpha = opacity * 0.6;
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(x, y, size / 2, size / 3, 0, 0, Math.PI * 2);
    context.fill();
  } else if (tool === 'chalk') {
    context.globalAlpha = opacity * 0.7;
    context.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * size / 3;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const dotSize = Math.random() * size / 4 + size / 6;
      context.beginPath();
      context.arc(px, py, dotSize, 0, Math.PI * 2);
      context.fill();
    }
  } else if (tool === 'watercolor') {
    context.globalAlpha = opacity * 0.4;
    const gradient = context.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.4, color + 'AA');
    gradient.addColorStop(0.7, color + '44');
    gradient.addColorStop(1, color + '00');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
  
  context.restore();
}

function drawStroke(stroke) {
  const { tool, color, size, opacity, points } = stroke;
  if (!points || points.length < 1) return;
  
  if (points.length === 1) {
    const p = points[0];
    drawDot(p.x, p.y, size * (0.5 + p.pressure * 0.5), tool, color, opacity);
    return;
  }
  
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.floor(dist / 2));
    
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const pressure = from.pressure + (to.pressure - from.pressure) * t;
      const pointSize = size * (0.5 + pressure * 0.5);
      drawDot(x, y, pointSize, tool, color, opacity);
    }
  }
}

function redrawAll() {
  const context = ctx.value;
  if (!context) return;
  
  context.clearRect(0, 0, props.width, props.height);
  
  const strokes = props.modelValue || [];
  for (const stroke of strokes) {
    drawStroke(stroke);
  }
}

function clearCanvas() {
  const context = ctx.value;
  if (!context) return;
  context.clearRect(0, 0, props.width, props.height);
}

watch(() => props.modelValue, () => {
  nextTick(() => {
    redrawAll();
  });
}, { deep: true });

defineExpose({
  canvasRef,
  clearCanvas,
  redrawAll,
  getCanvas: () => canvasRef.value
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="doodle-canvas absolute top-0 left-0 w-full h-full touch-none"
    :style="canvasStyle"
    :class="{ 'cursor-crosshair': !readOnly && !isEraser, 'cursor-cell': !readOnly && isEraser }"
    @mousedown="startDrawing"
    @mousemove="draw"
    @mouseup="stopDrawing"
    @mouseleave="stopDrawing"
    @touchstart="startDrawing"
    @touchmove="draw"
    @touchend="stopDrawing"
    @pointerdown="startDrawing"
    @pointermove="draw"
    @pointerup="stopDrawing"
    @pointerleave="stopDrawing"
  />
</template>

<style scoped>
.doodle-canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>
