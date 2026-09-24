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
    <div class="direction-pad" aria-label="Movement controls"
      @pointerdown="(event) => { pointerId = event.pointerId; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); move(event) }"
      @pointermove="(event) => { if (pointerId === event.pointerId) move(event) }"
      @pointerup="stop"
      @pointercancel="stop">
      <span class="pad-knob" />
    </div>
    <div class="action-group">
      <div class="quick-actions">
        <button type="button" class="small-button" aria-label="Sprint" @click="emit('dash')">
          <span class="btn-icon">⚡</span>
          <b>Sprint</b>
        </button>
      </div>
      <div class="main-actions">
        <button
          v-if="canGrab"
          type="button"
          class="action-button yellow pulse"
          aria-label="Grab Key"
          @click="emit('grab')"
        >
          <span class="btn-icon">🔑</span>
          <b>Grab Key [E]</b>
        </button>
        <button
          v-else
          type="button"
          class="action-button yellow"
          :class="{ pulse: canUse }"
          :disabled="!canUse"
          aria-label="Interact"
          @click="emit('action')"
        >
          <span class="btn-icon">💻</span>
          <b>Interact [E]</b>
        </button>
        <button
          type="button"
          class="action-button"
          :disabled="!canGrab"
          aria-label="Grab"
          @click="emit('grab')"
        >
          <span class="btn-icon">✋</span>
          <b>Grab [Z]</b>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls {
  position: absolute;
  inset: auto max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: end;
  padding: 0;
  pointer-events: none;
  font-family: 'Courier New', monospace;
}

.direction-pad {
  position: relative;
  width: 8.5rem;
  height: 8.5rem;
  border: 2px solid rgba(234, 179, 8, .5);
  border-radius: 50%;
  background: rgba(15, 23, 42, .85);
  box-shadow: 0 16px 28px rgba(2, 6, 23, .4);
  pointer-events: auto;
  touch-action: none;
}

.pad-knob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3.2rem;
  height: 3.2rem;
  transform: translate(-50%, -50%);
  border: 2px solid #d40511;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffcc00, #facc15);
  box-shadow: 0 6px 12px rgba(0, 0, 0, .4);
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: .65rem;
  pointer-events: auto;
}

.quick-actions,
.main-actions {
  display: flex;
  justify-content: flex-end;
  gap: .65rem;
}

.action-group button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .2rem;
  border-radius: .85rem;
  cursor: pointer;
  font-family: inherit;
  font-weight: 900;
  text-transform: uppercase;
  box-shadow: 0 8px 18px rgba(2, 6, 23, .4);
  transition: transform .15s ease, filter .15s ease;
}

.action-group button:active:not(:disabled) {
  transform: scale(.94);
}

.btn-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.small-button {
  width: 3.8rem;
  height: 3.8rem;
  border: 2px solid rgba(250, 204, 21, .6);
  background: rgba(30, 41, 59, .9);
  color: #ffcc00;
}

.small-button b {
  font-size: .52rem;
}

.action-button {
  width: 4.8rem;
  height: 4.8rem;
  border: 2px solid #ef4444;
  background: rgba(153, 27, 27, .9);
  color: white;
}

.action-button b {
  font-size: .55rem;
}

.action-button.yellow {
  border-color: #d40511;
  background: #ffcc00;
  color: #0f172a;
}

.action-button.yellow.pulse {
  animation: pulse-glow 1.2s infinite alternate;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 8px #ffcc00;
    transform: scale(1);
  }
  100% {
    box-shadow: 0 0 20px #ffcc00, 0 0 30px #d40511;
    transform: scale(1.05);
  }
}

.action-group button:disabled {
  cursor: not-allowed;
  opacity: .4;
  filter: saturate(.5);
}

@media (min-width: 1025px) {
  /* On desktop laptops, keep controls discreet */
  .direction-pad {
    opacity: 0.7;
  }
}

@media (max-width: 640px) {
  .controls {
    inset: auto max(0.5rem, env(safe-area-inset-right)) max(0.5rem, env(safe-area-inset-bottom)) max(0.5rem, env(safe-area-inset-left));
  }
  .direction-pad {
    width: 7.2rem;
    height: 7.2rem;
  }
  .pad-knob {
    width: 2.6rem;
    height: 2.6rem;
  }
  .small-button {
    width: 3.2rem;
    height: 3.2rem;
  }
  .action-button {
    width: 4.1rem;
    height: 4.1rem;
  }
}

@media (max-height: 520px) {
  /* Mobile Landscape */
  .controls {
    inset: auto max(0.6rem, env(safe-area-inset-right)) max(0.4rem, env(safe-area-inset-bottom)) max(0.6rem, env(safe-area-inset-left));
  }
  .direction-pad {
    width: 5.8rem;
    height: 5.8rem;
  }
  .pad-knob {
    width: 2.2rem;
    height: 2.2rem;
  }
  .action-group {
    gap: 0.35rem;
  }
  .quick-actions,
  .main-actions {
    gap: 0.35rem;
  }
  .small-button {
    width: 2.7rem;
    height: 2.7rem;
  }
  .small-button b {
    font-size: 0.44rem;
  }
  .action-button {
    width: 3.4rem;
    height: 3.4rem;
  }
  .action-button b {
    font-size: 0.46rem;
  }
  .btn-icon {
    font-size: 1rem;
  }
}
</style>
