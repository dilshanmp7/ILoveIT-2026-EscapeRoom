<script setup lang="ts">
defineProps<{ canGrab: boolean; canUse: boolean }>()
const emit = defineEmits<{ grab: []; action: []; dash: []; quiz: []; move: [x: number, y: number] }>()
let pointerId: number | null = null

function move(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  let x = event.clientX - (rect.left + rect.width / 2)
  let y = event.clientY - (rect.top + rect.height / 2)
  const distance = Math.hypot(x, y)
  const maximum = rect.width / 2 - 20
  if (distance > maximum) { x = x / distance * maximum; y = y / distance * maximum }
  const knob = target.querySelector<HTMLElement>('.pad-knob')
  if (knob) knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
  emit('move', x / maximum, y / maximum)
}

function stop(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  pointerId = null
  const knob = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.pad-knob')
  if (knob) knob.style.transform = 'translate(-50%, -50%)'
  emit('move', 0, 0)
}
</script>

<template>
  <div class="controls">
    <div class="direction-pad" aria-label="Movement controls" @pointerdown="(event) => { pointerId = event.pointerId; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); move(event) }" @pointermove="(event) => { if (pointerId === event.pointerId) move(event) }" @pointerup="stop" @pointercancel="stop">
      <span class="pad-knob" />
    </div>
    <div class="action-group">
      <div class="quick-actions">
        <button type="button" class="small-button" aria-label="Sprint" @click="emit('dash')"><i class="fa-solid fa-person-running" aria-hidden="true" /><b>Sprint</b></button>
        <button type="button" class="small-button blue" aria-label="Security" @click="emit('quiz')"><i class="fa-solid fa-shield-halved" aria-hidden="true" /><b>Security</b></button>
      </div>
      <div class="main-actions">
        <button type="button" class="action-button" :disabled="!canUse" aria-label="Use" @click="emit('action')"><i class="fa-solid fa-laptop-code" aria-hidden="true" /><b>Use</b></button>
        <button type="button" class="action-button yellow" :disabled="!canGrab" aria-label="Grab" @click="emit('grab')"><i class="fa-solid fa-hand" aria-hidden="true" /><b>Grab</b></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls { position: absolute; inset: auto 1.5rem 1.5rem; z-index: 3; display: flex; justify-content: space-between; align-items: end; padding: 0; pointer-events: none; font-family: 'Nunito', 'Trebuchet MS', sans-serif; }.direction-pad { position: relative; width: 9rem; height: 9rem; border: 2px solid rgba(234,179,8,.4); border-radius: 50%; background: rgba(15,23,42,.8); box-shadow: 0 16px 28px rgba(2,6,23,.4); pointer-events: auto; touch-action: none; }.pad-knob { position: absolute; top: 50%; left: 50%; width: 3.5rem; height: 3.5rem; transform: translate(-50%, -50%); border: 2px solid #dc2626; border-radius: 50%; background: linear-gradient(45deg, #facc15, #fde047); box-shadow: 0 8px 16px rgba(2,6,23,.35); }.action-group { display: flex; flex-direction: column; gap: .75rem; pointer-events: auto; }.quick-actions, .main-actions { display: flex; justify-content: flex-end; gap: .75rem; }.action-group button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .2rem; border-radius: .9rem; cursor: pointer; font-family: inherit; font-weight: 900; text-transform: uppercase; box-shadow: 0 12px 22px rgba(2,6,23,.35); transition: transform .15s ease, filter .15s ease; }.action-group button:active:not(:disabled) { transform: scale(.95); }.small-button { width: 4rem; height: 4rem; border: 2px solid rgba(234,179,8,.5); background: rgba(30,41,59,.88); color: #facc15; }.small-button span { font-size: 1.25rem; }.small-button b { font-size: .5rem; }.small-button.blue { border-color: #60a5fa; background: rgba(30,64,175,.88); color: #dbeafe; }.main-actions button { width: 5rem; height: 5rem; border: 2px solid #facc15; background: linear-gradient(45deg, #991b1b, #ef4444); color: white; }.main-actions button span { font-size: 1.5rem; }.main-actions button b { font-size: .58rem; }.main-actions .yellow { border-color: #dc2626; background: linear-gradient(45deg, #eab308, #fde047); color: #0f172a; }.action-group button:disabled { cursor: not-allowed; opacity: .45; filter: saturate(.5); }.action-group button:disabled:hover { transform: none; }
@media (max-width: 620px) { .controls { inset: auto .8rem .8rem; }.direction-pad { width: 8rem; height: 8rem; }.action-group { gap: .55rem; }.quick-actions, .main-actions { gap: .5rem; }.small-button { width: 3.6rem; height: 3.6rem; }.main-actions button { width: 4.5rem; height: 4.5rem; } }
</style>
