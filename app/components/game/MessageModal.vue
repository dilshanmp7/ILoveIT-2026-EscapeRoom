<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'

const props = defineProps<{ message: string }>()
const emit = defineEmits<{ close: [] }>()

const continueBtn = ref<HTMLButtonElement | null>(null)

function handleKey(e: KeyboardEvent) {
  if (!props.message) return
  if (
    e.key === 'Enter' ||
    e.key === ' ' ||
    e.key === 'Escape' ||
    e.code === 'Space' ||
    e.code === 'Enter' ||
    e.code === 'Escape' ||
    e.code === 'KeyE' ||
    e.key === 'e' ||
    e.key === 'E'
  ) {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
  }
}

watch(
  () => props.message,
  (val) => {
    if (val) {
      nextTick(() => {
        continueBtn.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleKey, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey, true)
})
</script>

<template>
  <div
    v-if="message"
    class="message-backdrop"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="message-title"
    @click.self="emit('close')"
  >
    <section class="message-modal">
      <span class="eyebrow">Dispatch Update</span>
      <h2 id="message-title">{{ message }}</h2>
      <button
        ref="continueBtn"
        type="button"
        class="btn-continue"
        @click="emit('close')"
      >
        <span>Continue</span>
        <small class="key-hint">[SPACE / ENTER / ESC]</small>
      </button>
    </section>
  </div>
</template>

<style scoped>
.message-backdrop {
  position: fixed;
  inset: 0;
  z-index: 35;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(2 6 23 / 0.78);
  backdrop-filter: blur(6px);
}

.message-modal {
  width: min(26rem, 100%);
  padding: 1.6rem;
  border: 1.5px solid #ffcc00;
  border-radius: 0.75rem;
  background: #0f172a;
  color: #f8fafc;
  box-shadow: 0 0 40px rgba(255, 204, 0, 0.25), 0 1.5rem 4rem rgb(0 0 0 / 0.7);
  text-align: center;
  animation: popIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.eyebrow {
  color: #60a5fa;
  font: 0.7rem 'Courier New', monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.4rem;
}

h2 {
  margin: 0.5rem 0 1.4rem;
  color: #ffcc00;
  font-family: 'Courier New', monospace;
  font-size: 1.05rem;
  line-height: 1.45;
  font-weight: 700;
}

.btn-continue {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  border: 1.5px solid #ffcc00;
  border-radius: 0.5rem;
  padding: 0.65rem 1.4rem;
  background: #ffcc00;
  color: #0f172a;
  cursor: pointer;
  font: 800 0.8rem 'Courier New', monospace;
  text-transform: uppercase;
  transition: all 0.15s ease;
  box-shadow: 0 0 15px rgba(255, 204, 0, 0.35);
}

.btn-continue:hover,
.btn-continue:focus-visible {
  background: #ffffff;
  border-color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  outline: none;
}

.key-hint {
  font-size: 0.62rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.75);
  letter-spacing: 0.05em;
}
</style>
