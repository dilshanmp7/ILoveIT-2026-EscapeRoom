<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Option {
  id: string
  label: string
  type: string
}

const props = defineProps<{
  open: boolean
  options: readonly Option[]
  title?: string
  description?: string
}>()

const emit = defineEmits<{
  select: [id: string]
  close: []
}>()

function handleKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape' || e.code === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
    return
  }

  const numKey = parseInt(e.key, 10)
  if (!isNaN(numKey) && numKey >= 1 && numKey <= props.options.length) {
    e.preventDefault()
    e.stopPropagation()
    const opt = props.options[numKey - 1]
    if (opt) emit('select', opt.id)
    return
  }

  if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space' || e.code === 'Enter') {
    if (props.options.length === 1 && props.options[0]) {
      e.preventDefault()
      e.stopPropagation()
      emit('select', props.options[0].id)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey, true)
})
</script>

<template>
  <div
    v-if="props.open"
    class="selection-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="object-selection-title"
    @click.self="emit('close')"
  >
    <section class="selection-modal">
      <div class="selection-header">
        <h2 id="object-selection-title">{{ props.title || 'SELECT OBJECT' }}</h2>
        <span class="esc-hint">[ESC to close]</span>
      </div>
      <p>{{ props.description || 'More than one object is within reach.' }}</p>
      <div class="selection-list">
        <button
          v-for="(option, idx) in props.options"
          :key="option.id"
          type="button"
          @click="emit('select', option.id)"
        >
          <div class="option-row">
            <span class="num-badge">[{{ idx + 1 }}]</span>
            <div>
              <strong>{{ option.label }}</strong>
              <span>{{ option.type }}</span>
            </div>
          </div>
        </button>
      </div>
      <button class="selection-cancel" type="button" @click="emit('close')">
        Cancel <small class="esc-sub">[ESC]</small>
      </button>
    </section>
  </div>
</template>

<style scoped>
.selection-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(2 6 23 / 0.72);
  backdrop-filter: blur(4px);
}

.selection-modal {
  width: min(24rem, 100%);
  padding: 1.25rem;
  border: 1px solid rgb(250 204 21 / 0.55);
  border-radius: 0.75rem;
  background: #0f172a;
  color: #f8fafc;
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 0.4);
}

.selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selection-modal h2 {
  margin: 0;
  color: #facc15;
  font: 700 0.9rem/1.2 'Courier New', monospace;
  letter-spacing: 0.12em;
}

.esc-hint {
  font-size: 0.65rem;
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.selection-modal p {
  margin: 0.55rem 0 1rem;
  color: #94a3b8;
  font: 0.75rem/1.4 'Courier New', monospace;
}

.selection-list {
  display: grid;
  gap: 0.5rem;
}

.selection-list button,
.selection-cancel {
  width: 100%;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 0.7rem 0.8rem;
  color: #f8fafc;
  background: #1e293b;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.selection-list button:hover,
.selection-list button:focus-visible {
  border-color: #facc15;
  background: #334155;
  outline: none;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.num-badge {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: 800;
  color: #facc15;
}

.selection-list strong,
.selection-list span {
  display: block;
}

.selection-list strong {
  font-size: 0.8rem;
}

.selection-list span {
  margin-top: 0.2rem;
  color: #94a3b8;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.selection-cancel {
  margin-top: 1rem;
  color: #cbd5e1;
  background: transparent;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.selection-cancel:hover,
.selection-cancel:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  border-color: #94a3b8;
}

.esc-sub {
  color: #94a3b8;
  font-size: 0.65rem;
}
</style>
