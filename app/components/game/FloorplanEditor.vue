<script setup lang="ts">
import type { MapAsset } from '#shared/game/types';
import { computed, reactive, ref } from 'vue';

const props = defineProps<{ open: boolean; initialAssets: MapAsset[] }>()
const emit = defineEmits<{ close: []; deploy: [layout: MapAsset[]]; tab: [value: 'map' | 'quiz'] }>()
const assets = reactive(props.initialAssets.map(asset => ({ ...asset })))
const selectedId = ref(assets[0]?.id || '')
const draggingId = ref('')
const selected = computed(() => assets.find(asset => asset.id === selectedId.value))

const palette = [
  { type: 'box_laptop', label: 'Laptop box', detail: 'Pickup source', color: '#facc15' },
  { type: 'box_server', label: 'Server box', detail: 'Pickup source', color: '#facc15' },
  { type: 'config_desk', label: 'Config station', detail: 'Configure device', color: '#2563eb' },
  { type: 'server_rack', label: 'Server rack', detail: 'Configure server', color: '#64748b' },
  { type: 'riddle', label: 'Security terminal', detail: 'Open quiz', color: '#7e22ce' },
  { type: 'delivery', label: 'Dispatch hatch', detail: 'Score delivery', color: '#d40511' },
  { type: 'trash', label: 'Recycle bin', detail: 'Discard item', color: '#4b5563' },
  { type: 'door', label: 'Secure door', detail: 'Requires key', color: '#3b82f6' },
  { type: 'key', label: 'ID badge', detail: 'Pickup key', color: '#0ea5e9' },
  { type: 'wall', label: 'Partition wall', detail: 'Static boundary', color: '#94a3b8' },
] as const

const actionTypes = [
  { value: 'none', label: 'None (Storage / Surface)' },
  { value: 'config', label: 'Configure / Process Device' },
  { value: 'quiz', label: 'Open Security Quiz' },
  { value: 'deliver', label: 'IT Dispatch Hatch (Score)' },
  { value: 'trash', label: 'Trash Bin (Discard)' },
] as const

const useActions = [
  { value: 'none', label: 'None' },
  { value: 'open_door', label: 'Slide Open Door (Requires Key)' },
  { value: 'quiz', label: 'Trigger Quiz (Requires Badge)' },
] as const

function mapPosition(asset: MapAsset) {
  return {
    left: `${50 + asset.x * 4.7}%`,
    top: `${50 + asset.z * 5.8}%`,
    width: `${Math.max(2.8, asset.w * 4.7)}%`,
    height: `${Math.max(2.8, asset.d * 5.8)}%`,
    transform: `translate(-50%, -50%) rotate(${asset.rotation || 0}deg)`,
    backgroundColor: colorHex(asset.color),
  }
}

function colorHex(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`
}

function selectAsset(id: string) {
  selectedId.value = id
}

function updateAsset<K extends keyof MapAsset>(property: K, value: MapAsset[K]) {
  if (selected.value) selected.value[property] = value
}

function beginDrag(event: PointerEvent, asset: MapAsset) {
  selectedId.value = asset.id
  draggingId.value = asset.id
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function dragAsset(event: PointerEvent) {
  if (!draggingId.value) return
  const canvas = event.currentTarget as HTMLElement
  const rect = canvas.getBoundingClientRect()
  const asset = assets.find(item => item.id === draggingId.value)
  if (!asset) return
  asset.x = Math.round((((event.clientX - rect.left) / rect.width * 20) - 10) * 2) / 2
  asset.z = Math.round((((event.clientY - rect.top) / rect.height * 16) - 8) * 2) / 2
}

function endDrag() {
  draggingId.value = ''
}

function addAsset(type: MapAsset['type']) {
  const paletteItem = palette.find(item => item.type === type)
  const asset = {
    id: `editor-${Date.now()}`,
    x: 0,
    z: 0, w: type === 'wall' || type === 'door' ? 2.5 : type === 'delivery' ? 2.5 : 1.5,
    d: type === 'wall' || type === 'door' ? 0.4 : type === 'delivery' ? 1.5 : 1.2,
    rotation: 0,
    color: Number.parseInt((paletteItem?.color || '#334155').slice(1), 16),
    type,
    label: paletteItem?.label || type,
    allowGrab: type === 'box_laptop' || type === 'box_server' || type === 'key',
    actionType: type === 'key' ? 'key' as const : 'none' as const,
    acceptsDrop: '',
    useAction: type === 'door' ? 'open_door' as const : 'none' as const,
    requiredKeyIds: type === 'door' ? ['SLIDING_DOR_KEY'] : undefined,
    keyId: type === 'key' ? 'ADMIN_KEY' : undefined,
  }
  assets.push(asset as MapAsset)
  selectedId.value = asset.id
}

function deleteSelected() {
  const index = assets.findIndex(asset => asset.id === selectedId.value)
  if (index >= 0) assets.splice(index, 1)
  selectedId.value = assets[0]?.id || ''
}
</script>

<template>
  <div v-if="props.open" class="editor-backdrop" @click.self="emit('close')" @pointerup="endDrag">
    <section class="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header class="editor-header"><div><span class="eyebrow">CPH ILOVEIT 2026 / Level studio</span><h2 id="editor-title">Escape room floorplan editor</h2></div><button type="button" class="close-button" aria-label="Close editor" @click="emit('close')">×</button></header>
      <div class="editor-body">
        <aside class="palette"><div class="panel-heading"><span class="section-label">Components</span><span class="panel-count">{{ palette.length }}</span></div><p class="panel-help">Add a component to the floor, then configure its behavior.</p><div class="palette-list"><button v-for="item in palette" :key="item.type" type="button" class="palette-item" @click="addAsset(item.type)"><span class="asset-swatch" :style="{ backgroundColor: item.color }"></span><span><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span><span class="add-mark">+</span></button></div><button v-if="selected" type="button" class="delete-button" @click="deleteSelected">Delete selected</button></aside>
        <div class="map-panel"><div class="canvas-toolbar"><span class="section-label">2D map canvas</span><span>ROOM 20 × 16</span></div><div class="map-grid" @pointermove="dragAsset"><div class="room-boundary"></div><button v-for="asset in assets" :key="asset.id" type="button" class="map-asset" :class="{ selected: asset.id === selectedId, dragging: asset.id === draggingId }" :style="mapPosition(asset)" @click="selectAsset(asset.id)" @pointerdown.stop="beginDrag($event, asset)"><span>{{ asset.label.slice(0, 12) }}</span></button></div><p class="map-note">Click or drag a component to place it. Yellow boundary marks the playable room.</p></div>
        <aside class="inspector"><div class="panel-heading"><span class="section-label">Object inspector</span><span v-if="selected" class="selected-type">{{ selected.type }}</span></div><div v-if="selected" class="inspector-content"><div class="field"><label for="asset-label">Label</label><input id="asset-label" v-model="selected.label" type="text"></div><div class="field-grid"><div class="field"><label for="asset-x">X position</label><input id="asset-x" v-model.number="selected.x" type="number" step=".5"></div><div class="field"><label for="asset-z">Z position</label><input id="asset-z" v-model.number="selected.z" type="number" step=".5"></div></div><div class="field"><label for="asset-rotation">Rotation</label><input id="asset-rotation" v-model.number="selected.rotation" type="number" step="15"></div><div class="rule-group"><h3>Asset use &amp; action rules</h3><label class="check-field"><span>Allow grab (pickup)</span><input v-model="selected.allowGrab" type="checkbox"></label><div class="field"><label for="asset-action">Action type (surface)</label><select id="asset-action" v-model="selected.actionType"><option v-for="action in actionTypes" :key="action.value" :value="action.value">{{ action.label }}</option></select></div><div class="field"><label for="asset-use">Use action behavior</label><select id="asset-use" v-model="selected.useAction"><option v-for="action in useActions" :key="action.value" :value="action.value">{{ action.label }}</option></select></div><div class="field"><label for="asset-key">Required held key ID</label><input id="asset-key" :value="selected.requiredKeyIds?.join(', ') || selected.useRequiredKey || ''" placeholder="e.g. SLIDING_DOR_KEY" type="text" @change="updateAsset('requiredKeyIds', ($event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean))"></div><div class="field"><label for="asset-drop">Accepts drop item type</label><input id="asset-drop" v-model="selected.acceptsDrop" placeholder="laptop, server, configured, any" type="text"></div><div v-if="selected.type === 'key'" class="field"><label for="asset-key-id">Key ID</label><input id="asset-key-id" v-model="selected.keyId" type="text"></div></div></div><div v-else class="empty-inspector">Click a component on the 2D grid.</div></aside>
      </div>
      <footer class="editor-footer"><span class="asset-status">{{ assets.length }} components in floorplan</span><button type="button" class="deploy-button" @click="emit('deploy', assets)">Deploy floorplan ↗</button></footer>
    </section>
  </div>
</template>

<style scoped>
.editor-backdrop { position: fixed; inset: 0; z-index: 9; display: flex; background: rgba(2,6,23,.86); }.editor-modal { width: 100%; height: 100%; display: flex; flex-direction: column; background: #0f172a; color: #e2e8f0; }.editor-header, .editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1.2rem; border-bottom: 1px solid #1e293b; }.editor-footer { border-top: 1px solid #1e293b; border-bottom: 0; }.eyebrow, .section-label { display: block; color: #60a5fa; font-family: 'Courier New', monospace; font-size: .62rem; letter-spacing: .1em; text-transform: uppercase; }.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }.panel-count, .selected-type, .canvas-toolbar > span:last-child, .asset-status { color: #64748b; font: .6rem 'Courier New', monospace; letter-spacing: .08em; text-transform: uppercase; }h2 { margin: .25rem 0 0; color: #bfdbfe; font-family: Georgia, serif; font-weight: 400; }.close-button { border: 0; background: transparent; color: #94a3b8; cursor: pointer; font-size: 1.6rem; }.editor-body { display: grid; flex: 1; min-height: 0; grid-template-columns: 15rem minmax(0, 1fr) 17rem; gap: .8rem; padding: .8rem; overflow: hidden; }.palette, .inspector { display: flex; min-width: 0; min-height: 0; flex-direction: column; gap: .65rem; padding: .8rem; border: 1px solid #1e293b; border-radius: .7rem; background: rgba(2,6,23,.35); }.panel-help, .map-note { margin: 0; color: #64748b; font: .64rem/1.45 'Courier New', monospace; }.palette-list { display: grid; gap: .35rem; overflow-y: auto; }.palette-item { display: flex; align-items: center; gap: .55rem; border: 1px solid #1e293b; padding: .5rem; background: #111827; color: #e2e8f0; cursor: pointer; text-align: left; }.palette-item:hover { border-color: #ffcc00; }.palette-item strong, .palette-item small { display: block; }.palette-item strong { font-size: .66rem; }.palette-item small { margin-top: .15rem; color: #64748b; font: .56rem 'Courier New', monospace; }.asset-swatch { width: .6rem; height: .6rem; flex: 0 0 auto; border: 1px solid rgba(255,255,255,.35); }.add-mark { margin-left: auto; color: #ffcc00; font-size: 1rem; }.delete-button { margin-top: auto; border: 1px solid #7f1d1d !important; padding: .55rem; background: #450a0a !important; color: #fca5a5 !important; cursor: pointer; font: .64rem 'Courier New', monospace; text-align: center; }.map-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; gap: .6rem; }.canvas-toolbar { display: flex; justify-content: space-between; align-items: center; }.map-grid { position: relative; flex: 1; min-height: 0; overflow: hidden; border: 1px solid #334155; background-color: #0b1220; background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); background-size: 10% 10%; touch-action: none; }.room-boundary { position: absolute; inset: 8% 7.5%; border: 1px dashed #ffcc00; pointer-events: none; }.map-asset { position: absolute; display: grid; place-items: center; min-width: 2rem; min-height: 2rem; border: 1px solid rgba(255,255,255,.5); padding: .2rem; color: #fff; cursor: grab; font: .52rem 'Courier New', monospace; text-align: center; text-shadow: 0 1px 2px #000; transition: outline .12s, filter .12s; }.map-asset:active, .map-asset.dragging { cursor: grabbing; }.map-asset.selected { outline: 2px solid #fff; outline-offset: 2px; filter: brightness(1.25); z-index: 2; }.map-note { padding-top: .1rem; }.inspector-content { overflow-y: auto; }.empty-inspector { display: grid; min-height: 10rem; place-items: center; color: #64748b; font: .64rem/1.4 'Courier New', monospace; text-align: center; }.field, .field-grid { display: grid; gap: .3rem; }.field-grid { grid-template-columns: 1fr 1fr; margin-top: .6rem; }.field label, .check-field { color: #94a3b8; font: .6rem 'Courier New', monospace; }.field input, .field select { width: 100%; box-sizing: border-box; border: 1px solid #334155; border-radius: .2rem; padding: .4rem; background: #1e293b; color: #f8fafc; font: .65rem 'Courier New', monospace; }.rule-group { display: grid; gap: .65rem; margin-top: .8rem; padding-top: .7rem; border-top: 1px solid #1e293b; }.rule-group h3 { margin: 0; color: #facc15; font: .6rem 'Courier New', monospace; text-transform: uppercase; }.check-field { display: flex; align-items: center; justify-content: space-between; }.check-field input { accent-color: #facc15; }.deploy-button { border: 1px solid #ffcc00; padding: .6rem .8rem; background: #ffcc00; color: #0f172a; cursor: pointer; font: .68rem 'Courier New', monospace; font-weight: 700; }.deploy-button:hover { background: #fde047; }
@media (max-width: 900px) { .editor-body { grid-template-columns: 12rem minmax(0, 1fr); }.inspector { grid-column: 1 / -1; max-height: 18rem; }.map-grid { min-height: 25rem; } }
@media (max-width: 650px) { .editor-body { grid-template-columns: 1fr; }.palette-list { grid-template-columns: 1fr 1fr; }.map-grid { min-height: 20rem; }.inspector { max-height: none; }.asset-status { display: none; } }
</style>
