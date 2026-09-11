<script setup lang="ts">
interface Option {
  id: string
  label: string
  type: string
}

const props = defineProps<{ open: boolean; options: readonly Option[]; title?: string; description?: string }>()
const emit = defineEmits<{ select: [id: string]; close: [] }>()
</script>

<template>
  <div v-if="props.open" class="selection-backdrop" role="dialog" aria-modal="true" aria-labelledby="object-selection-title">
    <section class="selection-modal">
      <h2 id="object-selection-title">{{ props.title || 'SELECT OBJECT' }}</h2>
      <p>{{ props.description || 'More than one object is within reach.' }}</p>
      <div class="selection-list">
        <button v-for="option in props.options" :key="option.id" type="button" @click="emit('select', option.id)">
          <strong>{{ option.label }}</strong>
          <span>{{ option.type }}</span>
        </button>
      </div>
      <button class="selection-cancel" type="button" @click="emit('close')">Cancel</button>
    </section>
  </div>
</template>

<style scoped>
.selection-backdrop { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 1rem; background: rgb(2 6 23 / .72); }
.selection-modal { width: min(24rem, 100%); padding: 1.25rem; border: 1px solid rgb(250 204 21 / .55); border-radius: .75rem; background: #0f172a; color: #f8fafc; box-shadow: 0 1.5rem 4rem rgb(0 0 0 / .4); }
.selection-modal h2 { margin: 0; color: #facc15; font: 700 .9rem/1.2 'Courier New', monospace; letter-spacing: .12em; }
.selection-modal p { margin: .55rem 0 1rem; color: #94a3b8; font: .75rem/1.4 'Courier New', monospace; }
.selection-list { display: grid; gap: .5rem; }
.selection-list button, .selection-cancel { width: 100%; border: 1px solid #334155; border-radius: .5rem; padding: .7rem .8rem; color: #f8fafc; background: #1e293b; text-align: left; cursor: pointer; }
.selection-list button:hover, .selection-list button:focus-visible { border-color: #facc15; background: #334155; }
.selection-list strong, .selection-list span { display: block; }
.selection-list strong { font-size: .8rem; }
.selection-list span { margin-top: .2rem; color: #94a3b8; font-size: .7rem; text-transform: uppercase; }
.selection-cancel { margin-top: 1rem; color: #cbd5e1; background: transparent; text-align: center; }
</style>
