<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="open" class="network-backdrop" @click.self="emit('close')"><section class="network-modal" role="dialog" aria-modal="true"><span class="eyebrow">Logistics hub</span><h2>Signal status</h2><p>Solo shift connected. Multiplayer dispatch is not configured for this floor.</p><button type="button" @click="emit('close')">Close</button></section></div>
</template>

<style scoped>
.network-backdrop { position: fixed; inset: 0; z-index: 11; display: grid; place-items: center; background: rgba(2,6,23,.82); }.network-modal { width: min(100% - 2rem, 28rem); padding: 1.5rem; border: 1px solid #ffcc00; background: #0f172a; color: #e2e8f0; }.eyebrow { color: #ffcc00; font-family: 'Courier New', monospace; font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; }h2 { margin: .4rem 0 1rem; font-family: Georgia, serif; font-weight: 400; }.network-modal p { color: #94a3b8; line-height: 1.5; }.network-modal button { border: 0; padding: .7rem 1rem; background: #ffcc00; color: #0f172a; cursor: pointer; font-family: 'Courier New', monospace; text-transform: uppercase; }
</style>
