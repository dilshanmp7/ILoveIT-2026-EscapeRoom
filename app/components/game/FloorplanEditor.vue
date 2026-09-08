<script setup lang="ts">
import type { MapAsset } from '#shared/game/types';
import { reactive } from 'vue';

const props = defineProps<{ open: boolean; initialAssets: MapAsset[] }>()
const emit = defineEmits<{ close: []; deploy: [layout: MapAsset[]]; tab: [value: 'map' | 'quiz'] }>()
const assets = reactive(props.initialAssets.map(asset => ({ ...asset })))
const selectedId = ref(assets[0]?.id || '')
const selected = computed(() => assets.find(asset => asset.id === selectedId.value))

function addAsset(type: 'box_laptop' | 'server_rack' | 'delivery' | 'key') {
  const asset = {
    id: `editor-${Date.now()}`,
    x: 0,
    z: 0,
    w: type === 'delivery' ? 2.5 : 1.5,
    d: type === 'delivery' ? 1.5 : 1.2,
    rotation: 0,
    color: type === 'delivery' ? 0xd40511 : 0x334155,
    type,
    label: type === 'box_laptop' ? 'Laptop box' : type === 'server_rack' ? 'Server rack' : type === 'delivery' ? 'Dispatch hatch' : 'ID badge',
    allowGrab: type === 'box_laptop' || type === 'key',
    actionType: 'none' as const,
  }
  assets.push(asset)
  selectedId.value = asset.id
}

function deleteSelected() {
  const index = assets.findIndex(asset => asset.id === selectedId.value)
  if (index >= 0) assets.splice(index, 1)
  selectedId.value = assets[0]?.id || ''
}
</script>

<template>
  <div v-if="props.open" class="editor-backdrop" @click.self="emit('close')">
    <section class="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header class="editor-header"><div><span class="eyebrow">Level studio</span><h2 id="editor-title">Office floorplan editor</h2></div><button type="button" class="close-button" aria-label="Close editor" @click="emit('close')">×</button></header>
      <div class="editor-body">
        <aside class="palette"><span class="section-label">Asset palette</span><button type="button" @click="addAsset('box_laptop')">+ Laptop box</button><button type="button" @click="addAsset('server_rack')">+ Server rack</button><button type="button" @click="addAsset('delivery')">+ Dispatch hatch</button><button type="button" @click="addAsset('key')">+ ID badge</button><button v-if="selected" type="button" class="delete-button" @click="deleteSelected">Delete selected</button></aside>
        <div class="map-panel"><div class="map-grid"><button v-for="asset in assets" :key="asset.id" type="button" class="map-asset" :class="{ selected: asset.id === selectedId }" :style="{ left: `${50 + asset.x * 4.2}%`, top: `${50 + asset.z * 5.5}%` }" @click="selectedId = asset.id">{{ asset.label.slice(0, 9) }}</button></div><p class="map-note">Select an asset to inspect it, then deploy the revised floorplan.</p></div>
        <aside v-if="selected" class="inspector"><span class="section-label">Object inspector</span><label>Label <input v-model="selected.label"></label><label>X <input v-model.number="selected.x" type="number" step=".5"></label><label>Z <input v-model.number="selected.z" type="number" step=".5"></label><label>Rotation <input v-model.number="selected.rotation" type="number" step="15"></label></aside>
      </div>
      <footer class="editor-footer"><button type="button" class="deploy-button" @click="emit('deploy', assets)">Deploy floorplan ↗</button></footer>
    </section>
  </div>
</template>

<style scoped>
.editor-backdrop { position: fixed; inset: 0; z-index: 9; display: grid; place-items: center; padding: 1rem; background: rgba(2,6,23,.84); backdrop-filter: blur(8px); }.editor-modal { width: min(100%, 76rem); max-height: 92vh; display: flex; flex-direction: column; border: 1px solid #3b82f6; background: #0f172a; color: #e2e8f0; }.editor-header, .editor-footer { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.2rem; border-bottom: 1px solid #1e293b; }.editor-footer { justify-content: flex-end; border-top: 1px solid #1e293b; border-bottom: 0; }.eyebrow, .section-label { display: block; color: #60a5fa; font-family: 'Courier New', monospace; font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; }h2 { margin: .3rem 0 0; color: #bfdbfe; font-family: Georgia, serif; font-weight: 400; }.close-button { border: 0; background: transparent; color: #94a3b8; cursor: pointer; font-size: 1.6rem; }.editor-body { display: grid; grid-template-columns: 13rem minmax(0, 1fr) 13rem; gap: 1rem; min-height: 30rem; padding: 1rem; overflow: auto; }.palette, .inspector { display: flex; flex-direction: column; gap: .6rem; padding: .8rem; border: 1px solid #1e293b; }.palette button, .deploy-button { border: 1px solid #475569; padding: .6rem; background: #1e293b; color: #e2e8f0; cursor: pointer; font-family: 'Courier New', monospace; font-size: .68rem; text-align: left; }.palette button:hover { border-color: #ffcc00; }.delete-button { margin-top: auto; border-color: #ef4444 !important; color: #fca5a5 !important; }.map-panel { display: flex; flex-direction: column; min-width: 0; }.map-grid { position: relative; flex: 1; min-height: 30rem; overflow: hidden; border: 1px solid #334155; background-color: #111827; background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); background-size: 8% 10%; }.map-asset { position: absolute; transform: translate(-50%, -50%); max-width: 7rem; border: 1px solid #ffcc00; padding: .35rem; background: #334155; color: #f8fafc; cursor: pointer; font-family: 'Courier New', monospace; font-size: .58rem; }.map-asset.selected { outline: 2px solid #fff; background: #d40511; }.map-note { margin: .6rem 0 0; color: #94a3b8; font-size: .7rem; }.inspector label { display: grid; gap: .3rem; color: #94a3b8; font-family: 'Courier New', monospace; font-size: .65rem; }.inspector input { width: 100%; border: 1px solid #334155; padding: .45rem; background: #1e293b; color: #f8fafc; }.deploy-button { border-color: #ffcc00; background: #ffcc00; color: #0f172a; }
@media (max-width: 800px) { .editor-body { grid-template-columns: 1fr; }.palette { display: grid; grid-template-columns: 1fr 1fr; }.palette .section-label { grid-column: 1 / -1; }.map-grid { min-height: 18rem; }.inspector { display: grid; grid-template-columns: 1fr 1fr; }.inspector .section-label { grid-column: 1 / -1; } }
</style>
