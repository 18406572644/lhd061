import { ref, reactive } from 'vue';
export function useDoodle() {
 const isDrawing = ref(false);
 const currentBrush = reactive({
 type: 'hard',
 color: '#0f1e3d',
 size: 5,
 opacity: 1
 });
 const isEraser = ref(false);
 const eraserSize = ref(20);
 const doodleHistory = ref([]);
 const historyIndex = ref(-1);
 const currentStroke = ref(null);
 function setBrushType(type) {
 currentBrush.type = type;
 isEraser.value = false;
 }
 function setBrushColor(color) {
 currentBrush.color = color;
 }
 function setBrushSize(size) {
 currentBrush.size = size;
 }
 function setBrushOpacity(opacity) {
 currentBrush.opacity = opacity;
 }
 function setEraserMode(eraser) {
 isEraser.value = eraser;
 }
 function setEraserSize(size) {
 eraserSize.value = size;
 }
 function startStroke(x, y, pressure = 0.5) {
 isDrawing.value = true;
 const tool = isEraser.value ? 'eraser' : currentBrush.type;
 const size = isEraser.value ? eraserSize.value : currentBrush.size;
 currentStroke.value = {
 id: 'ds_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
 tool,
 color: currentBrush.color,
 size,
 opacity: isEraser.value ? 1 : currentBrush.opacity,
 points: [{ x, y, pressure }]
 };
 }
 function addPoint(x, y, pressure = 0.5) {
 if (!isDrawing.value || !currentStroke.value)
 return;
 const lastPoint = currentStroke.value.points[currentStroke.value.points.length - 1];
 const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
 if (dist > 0.5) {
 currentStroke.value.points.push({ x, y, pressure });
 }
 }
 function endStroke() {
 if (!isDrawing.value || !currentStroke.value)
 return null;
 isDrawing.value = false;
 const stroke = { ...currentStroke.value };
 if (stroke.points.length < 2) {
 currentStroke.value = null;
 return null;
 }
 doodleHistory.value = doodleHistory.value.slice(0, historyIndex.value + 1);
 doodleHistory.value.push(stroke);
 historyIndex.value = doodleHistory.value.length - 1;
 currentStroke.value = null;
 return stroke;
 }
 function canUndoDoodle() {
 return historyIndex.value >= 0;
 }
 function canRedoDoodle() {
 return historyIndex.value < doodleHistory.value.length - 1;
 }
 function undoDoodle() {
 if (!canUndoDoodle())
 return null;
 historyIndex.value--;
 return doodleHistory.value[historyIndex.value + 1];
 }
 function redoDoodle() {
 if (!canRedoDoodle())
 return null;
 historyIndex.value++;
 return doodleHistory.value[historyIndex.value];
 }
 function clearDoodles() {
 doodleHistory.value = [];
 historyIndex.value = -1;
 currentStroke.value = null;
 isDrawing.value = false;
 }
 function setDoodles(doodles) {
 doodleHistory.value = doodles ? [...doodles] : [];
 historyIndex.value = doodleHistory.value.length - 1;
 }
 function getVisibleStrokes() {
 return doodleHistory.value.slice(0, historyIndex.value + 1);
 }
 function getAllStrokes() {
 return [...doodleHistory.value];
 }
 return {
 isDrawing,
 currentBrush,
 isEraser,
 eraserSize,
 doodleHistory,
 historyIndex,
 currentStroke,
 setBrushType,
 setBrushColor,
 setBrushSize,
 setBrushOpacity,
 setEraserMode,
 setEraserSize,
 startStroke,
 addPoint,
 endStroke,
 canUndoDoodle,
 canRedoDoodle,
 undoDoodle,
 redoDoodle,
 clearDoodles,
 setDoodles,
 getVisibleStrokes,
 getAllStrokes
 };
}
