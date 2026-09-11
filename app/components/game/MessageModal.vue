<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="message" class="message-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="message-title">
    <section class="message-modal">
      <span class="eyebrow">Dispatch update</span>
      <h2 id="message-title">{{ message }}</h2>
      <button type="button" @click="emit('close')">Continue</button>
    </section>
  </div>
</template>

<style scoped>
.message-backdrop { position: fixed; inset: 0; z-index: 35; display: grid; place-items: center; padding: 1rem; background: rgb(2 6 23 / .72); }
.message-modal { width: min(24rem, 100%); padding: 1.4rem; border: 1px solid #facc15; background: #0f172a; color: #f8fafc; box-shadow: 0 1.5rem 4rem rgb(0 0 0 / .4); text-align: center; }
.eyebrow { color: #60a5fa; font: .65rem 'Courier New', monospace; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: .7rem 0 1.2rem; color: #facc15; font: 400 1.5rem Georgia, serif; }
button { border: 1px solid #facc15; padding: .65rem 1rem; background: #facc15; color: #0f172a; cursor: pointer; font: 700 .7rem 'Courier New', monospace; text-transform: uppercase; }
</style>
