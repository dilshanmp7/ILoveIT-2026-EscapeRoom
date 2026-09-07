<script setup lang="ts">
defineProps<{ canGrab: boolean; canUse: boolean }>()
const emit = defineEmits<{ grab: []; action: []; dash: []; quiz: []; move: [x: number, y: number] }>()
let pointerId: number | null = null

function move(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
  const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
  const length = Math.hypot(x, y)
  const scale = length > 1 ? 1 / length : 1
  emit('move', x * scale, y * scale)
}

function stop() {
  pointerId = null
  emit('move', 0, 0)
}
</script>

<template>
  <div class="controls">
    <div class="direction-pad" aria-label="Movement controls" @pointerdown="(event) => { pointerId = event.pointerId; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); move(event) }" @pointermove="(event) => { if (pointerId === event.pointerId) move(event) }" @pointerup="stop" @pointercancel="stop">
      <span class="pad-center">+</span>
      <span class="pad-arrow pad-up">▲</span>
      <span class="pad-arrow pad-left">◀</span>
      <span class="pad-arrow pad-right">▶</span>
      <span class="pad-arrow pad-down">▼</span>
    </div>
    <div class="action-group">
      <button type="button" class="small-button" @click="emit('dash')">Sprint</button>
      <button type="button" class="small-button blue" @click="emit('quiz')">Security</button>
      <button type="button" class="action-button" :disabled="!canUse" @click="emit('action')">Use</button>
      <button type="button" class="action-button yellow" :disabled="!canGrab" @click="emit('grab')">Grab</button>
    </div>
  </div>
</template>

<style scoped>
.controls { position: absolute; inset: auto 1.5rem 1.5rem; z-index: 3; display: flex; justify-content: space-between; align-items: end; pointer-events: none; }.direction-pad { position: relative; width: 7rem; height: 7rem; border: 1px solid rgba(255,204,0,.5); border-radius: 50%; background: rgba(15,23,42,.78); pointer-events: auto; }.pad-center, .pad-arrow { position: absolute; color: #ffcc00; font-family: 'Courier New', monospace; font-size: .7rem; }.pad-center { inset: 50% auto auto 50%; transform: translate(-50%, -50%); color: #94a3b8; }.pad-arrow { transform: translate(-50%, -50%); }.pad-up { top: 22%; left: 50%; }.pad-down { top: 78%; left: 50%; }.pad-left { top: 50%; left: 22%; }.pad-right { top: 50%; left: 78%; }.action-group { display: grid; grid-template-columns: repeat(2, 4.5rem); gap: .5rem; pointer-events: auto; }.action-group button { min-height: 3.4rem; border: 1px solid #ffcc00; background: rgba(127,29,29,.88); color: white; cursor: pointer; font-family: 'Courier New', monospace; font-size: .62rem; font-weight: 700; text-transform: uppercase; }.action-group .small-button { min-height: 2.7rem; background: rgba(30,41,59,.9); color: #ffcc00; }.action-group .blue { border-color: #60a5fa; background: rgba(30,64,175,.9); color: #dbeafe; }.action-group .yellow { background: #ffcc00; color: #0f172a; }
.action-group button:disabled { cursor: not-allowed; opacity: .45; }
@media (min-width: 801px) { .controls { opacity: .5; }.controls:hover { opacity: 1; } }
</style>
