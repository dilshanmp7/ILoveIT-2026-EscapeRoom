<script setup lang="ts">
import type { QuizQuestion } from '#shared/game/types';

defineProps<{ quiz: QuizQuestion | null; open: boolean }>()
const emit = defineEmits<{ answer: [index: number]; close: [] }>()
</script>

<template>
  <div v-if="open && quiz" class="modal-backdrop" @click.self="emit('close')">
    <section class="quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <div class="modal-heading"><div><span class="eyebrow">Security clearance</span><h2 id="quiz-title">IT security check</h2></div><button type="button" class="close-button" aria-label="Close quiz" @click="emit('close')">×</button></div>
      <p class="question">{{ quiz.q }}</p>
      <div class="options"><button v-for="(option, index) in quiz.options" :key="option" type="button" @click="emit('answer', index)">{{ option }} <span>→</span></button></div>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; padding: 1rem; background: rgba(2,6,23,.82); backdrop-filter: blur(8px); }.quiz-modal { width: min(100%, 32rem); padding: 1.5rem; border: 1px solid rgba(96,165,250,.6); background: #0f172a; box-shadow: 0 24px 70px rgba(0,0,0,.4); }.modal-heading { display: flex; justify-content: space-between; align-items: start; }.eyebrow { color: #60a5fa; font-family: 'Courier New', monospace; font-size: .65rem; letter-spacing: .12em; text-transform: uppercase; }h2 { margin: .4rem 0 0; color: #dbeafe; font-family: Georgia, serif; font-size: 1.7rem; font-weight: 400; }.close-button { border: 0; background: transparent; color: #94a3b8; cursor: pointer; font-size: 1.6rem; }.question { margin: 2rem 0 1rem; color: #e2e8f0; line-height: 1.6; }.options { display: grid; gap: .5rem; }.options button { display: flex; justify-content: space-between; border: 1px solid #334155; padding: .8rem; background: #1e293b; color: #e2e8f0; cursor: pointer; text-align: left; }.options button:hover { border-color: #60a5fa; background: #1e40af; }.options span { color: #ffcc00; }
</style>
