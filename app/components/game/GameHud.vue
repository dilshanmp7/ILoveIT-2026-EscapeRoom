<script setup lang="ts">
interface HudState {
  score: number
  secondsRemaining: number
  nearbyLabel: string
  holding: string
  holdingConfigured: boolean
}

defineProps<{ state: HudState }>()
const emit = defineEmits<{ editor: [] }>()

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
</script>

<template>
  <header class="hud">
    <div class="orders">
      <span class="eyebrow">Active IT dispatch ticket</span>
      <div class="order-card"><span class="order-icon">+</span><span><strong>New hire setup</strong><small>Configured laptop required</small></span><b>+150 pts</b></div>
    </div>
    <div class="metrics">
      <div class="metric"><span>SLA time</span><strong>{{ formatTime(state.secondsRemaining) }}</strong></div>
      <div class="metric"><span>Rating</span><strong class="score">{{ state.score }}</strong></div>
      <button class="editor-button" type="button" @click="emit('editor')">Floorplan editor <span>↗</span></button>
    </div>
    <div v-if="state.nearbyLabel" class="interaction-hint">[ SPACE ] {{ state.nearbyLabel }}</div>
    <div v-if="state.holding" class="holding-pill">Holding: {{ state.holding }}{{ state.holdingConfigured ? ' / configured' : '' }}</div>
  </header>
</template>

<style scoped>
.hud { position: absolute; inset: 0 0 auto; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.25rem; pointer-events: none; font-family: 'Courier New', monospace; }
.orders, .metrics { pointer-events: auto; }.eyebrow { display: block; margin-bottom: .55rem; color: #ffcc00; font-size: .62rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }.order-card { display: flex; align-items: center; gap: .7rem; padding: .65rem .8rem; border: 1px solid rgba(255,204,0,.55); background: rgba(15,23,42,.9); color: #f8fafc; font-size: .75rem; }.order-card small, .order-card strong { display: block; }.order-card small { margin-top: .2rem; color: #94a3b8; font-size: .6rem; }.order-card b { margin-left: .8rem; color: #4ade80; font-size: .65rem; white-space: nowrap; }.order-icon { display: grid; place-items: center; width: 2rem; height: 2rem; color: #0f172a; background: #ffcc00; font-size: 1.4rem; }.metrics { display: flex; align-items: stretch; gap: .7rem; }.metric { min-width: 5rem; padding: .55rem .8rem; border-left: 1px solid #475569; background: rgba(15,23,42,.88); }.metric span { display: block; color: #94a3b8; font-size: .58rem; text-transform: uppercase; }.metric strong { display: block; margin-top: .2rem; color: #ffcc00; font-size: 1.2rem; }.metric .score { color: #4ade80; }.editor-button { border: 1px solid rgba(96,165,250,.65); padding: .65rem .8rem; background: rgba(30,64,175,.9); color: #dbeafe; cursor: pointer; font-family: inherit; font-size: .63rem; }.editor-button span { margin-left: .5rem; color: #ffcc00; }.interaction-hint, .holding-pill { position: fixed; left: 50%; transform: translateX(-50%); bottom: 7rem; padding: .65rem 1rem; background: #ffcc00; color: #0f172a; font-size: .7rem; font-weight: 700; letter-spacing: .05em; }.holding-pill { top: 7rem; bottom: auto; background: rgba(15,23,42,.9); color: #ffcc00; }
@media (max-width: 760px) { .hud { padding: .7rem; }.metrics { gap: .3rem; }.orders { max-width: 58%; }.order-card b, .editor-button { display: none; }.metric { min-width: 4rem; padding: .4rem; }.metric strong { font-size: .9rem; }.interaction-hint { bottom: 8.2rem; } }
</style>
