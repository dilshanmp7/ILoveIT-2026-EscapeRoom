<script setup lang="ts">
import type { QuizQuestion } from '#shared/game/types';
import { reactive, ref, watch } from 'vue';

const props = defineProps<{ open: boolean; initialQuizzes: QuizQuestion[] }>()
const emit = defineEmits<{ close: []; deploy: [quizzes: QuizQuestion[]]; tab: [value: 'map' | 'quiz'] }>()
const quizzes = reactive<QuizQuestion[]>([])
const selectedIndex = ref(-1)
const draft = reactive({ q: '', options: createOptions(), correct: 1 })

function createOptions() {
  return [1, 2, 3, 4].map(id => ({ id, text: '' }))
}

watch(() => props.initialQuizzes, (value) => {
  quizzes.splice(0, quizzes.length, ...value.map(quiz => ({ q: quiz.q, options: quiz.options.map(option => ({ ...option })), correct: quiz.correct })))
  resetForm()
}, { immediate: true })

function resetForm() {
  selectedIndex.value = -1
  draft.q = ''
  draft.options = createOptions()
  draft.correct = 1
}

function editQuiz(index: number) {
  const quiz = quizzes[index]
  if (!quiz) return
  selectedIndex.value = index
  draft.q = quiz.q
  draft.options = quiz.options.map(option => ({ ...option }))
  draft.correct = quiz.correct
}

function saveQuiz() {
  if (!draft.q.trim() || draft.options.some(option => !option.text.trim())) return
  const quiz = { q: draft.q.trim(), options: draft.options.map(option => ({ ...option, text: option.text.trim() })), correct: draft.correct }
  if (selectedIndex.value < 0) quizzes.push(quiz)
  else quizzes[selectedIndex.value] = quiz
  resetForm()
}

function deleteQuiz(index: number) {
  quizzes.splice(index, 1)
  if (selectedIndex.value === index) resetForm()
}
</script>

<template>
  <div v-if="open" class="editor-backdrop" @click.self="emit('close')">
    <section class="quiz-editor" role="dialog" aria-modal="true" aria-labelledby="quiz-editor-title">
      <header class="editor-header">
        <div><span class="eyebrow">Security studio</span>
          <h2 id="quiz-editor-title">Security Check Editor</h2>
        </div><button type="button" class="close-button" aria-label="Close editor" @click="emit('close')">×</button>
      </header>
      <div class="quiz-body">
        <section class="quiz-list-panel">
          <div class="panel-heading"><span class="section-label">Security Check Pool</span><button type="button"
              class="new-button" @click="resetForm">＋ New Security Check</button></div>
          <div class="quiz-list">
            <article v-for="(quiz, index) in quizzes" :key="`${index}-${quiz.q}`" class="quiz-card"
              :class="{ selected: selectedIndex === index }" @click="editQuiz(index)">
              <div><strong>{{ index + 1 }}. {{ quiz.q }}</strong><small>{{ quiz.options.length }} answer options ·
                  Correct: {{quiz.options.find(option => option.id === quiz.correct)?.text}}</small></div>
              <button type="button" aria-label="Delete security check" @click.stop="deleteQuiz(index)">×</button>
            </article>
            <p v-if="!quizzes.length" class="empty-state">No security checks yet.</p>
          </div>
        </section>
        <section class="quiz-form-panel">
          <span class="section-label">Security Check Properties</span>
          <form class="quiz-form" @submit.prevent="saveQuiz">
            <label>Security Question / Riddle Text<textarea v-model="draft.q" required rows="3"
                placeholder="e.g. What protocol secures web traffic?" /></label>
            <fieldset>
              <legend>Answer Options <small>Select the correct choice</small></legend><label
                v-for="(option, index) in draft.options" :key="option.id" class="option-row"><input
                  v-model="draft.correct" type="radio" name="correct-option" :value="option.id"><input
                  v-model="option.text" required :placeholder="`Option ${index + 1}`"></label>
            </fieldset>
            <div class="form-actions"><button type="submit" class="save-button">{{ selectedIndex < 0
              ? 'Save Security Check' : 'Update Security Check' }}</button><button type="button"
                    class="reset-button" @click="resetForm">Reset</button></div>
          </form>
        </section>
      </div>
      <footer class="editor-footer"><button type="button" class="deploy-button" @click="emit('deploy', quizzes)">Deploy
          Security Checks ↗</button></footer>
    </section>
  </div>
</template>

<style scoped>
.editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, .84);
  backdrop-filter: blur(8px);
}

.quiz-editor {
  width: min(100%, 72rem);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border: 2px solid rgba(239, 68, 68, .45);
  border-radius: 1.5rem;
  background: #0f172a;
  color: #e2e8f0;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .4);
}

.editor-header,
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #1e293b;
}

.editor-footer {
  justify-content: flex-end;
  border-top: 1px solid #1e293b;
  border-bottom: 0;
}

.eyebrow,
.section-label {
  display: block;
  color: #facc15;
  font-size: .65rem;
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
}

h2 {
  margin: .3rem 0 0;
  color: #fde68a;
  font-family: Georgia, serif;
  font-weight: 400;
}

.close-button {
  border: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.6rem;
}

.quiz-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  min-height: 30rem;
  padding: 1rem;
  overflow: auto;
}

.quiz-list-panel,
.quiz-form-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: .85rem;
  border: 1px solid #1e293b;
  border-radius: 1rem;
  background: rgba(2, 6, 23, .45);
}

.quiz-form-panel {
  background: #0f172a;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding-bottom: .7rem;
  border-bottom: 1px solid #1e293b;
}

.new-button,
.save-button,
.reset-button,
.deploy-button {
  border: 1px solid rgba(250, 204, 21, .45);
  border-radius: .7rem;
  padding: .55rem .7rem;
  background: #991b1b;
  color: #fde68a;
  cursor: pointer;
  font: inherit;
  font-size: .65rem;
  font-weight: 800;
}

.quiz-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: .55rem;
  padding-top: .7rem;
  overflow: auto;
}

.quiz-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: .6rem;
  border: 1px solid #1e293b;
  border-radius: .9rem;
  padding: .7rem;
  background: #0f172a;
  cursor: pointer;
}

.quiz-card.selected,
.quiz-card:hover {
  border-color: #3b82f6;
}

.quiz-card strong,
.quiz-card small {
  display: block;
}

.quiz-card strong {
  color: #e2e8f0;
  font-size: .7rem;
  line-height: 1.35;
}

.quiz-card small {
  margin-top: .35rem;
  color: #94a3b8;
  font-size: .58rem;
}

.quiz-card button {
  border: 0;
  background: transparent;
  color: #fca5a5;
  cursor: pointer;
  font-size: 1rem;
}

.empty-state {
  color: #64748b;
  font-size: .7rem;
  text-align: center;
}

.quiz-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: .8rem;
}

.quiz-form label,
fieldset {
  display: flex;
  flex-direction: column;
  gap: .4rem;
  border: 0;
  padding: 0;
  color: #cbd5e1;
  font-size: .68rem;
  font-weight: 800;
}

.quiz-form textarea,
.option-row input[type='text'],
.option-row input:not([type]) {
  width: 100%;
  border: 1px solid #334155;
  border-radius: .65rem;
  padding: .65rem .75rem;
  background: #1e293b;
  color: #f8fafc;
  font: inherit;
  font-size: .7rem;
  resize: vertical;
}

.quiz-form textarea:focus,
.option-row input:focus {
  border-color: #facc15;
  outline: 0;
}

.option-row {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: .55rem !important;
  border: 1px solid #334155;
  border-radius: .65rem;
  padding: .55rem;
  background: rgba(30, 41, 59, .7);
}

.option-row input[type='radio'] {
  accent-color: #facc15;
}

.option-row input[type='text'],
.option-row input:not([type]) {
  flex: 1;
  min-width: 0;
  padding: .45rem .55rem;
  background: #0f172a;
}

.quiz-form legend {
  margin-bottom: .4rem;
  color: #cbd5e1;
  font-size: .68rem;
  font-weight: 800;
}

.quiz-form legend small {
  color: #94a3b8;
  font-weight: 400;
}

.form-actions {
  display: flex;
  gap: .55rem;
}

.save-button {
  flex: 1;
  background: #b91c1c;
}

.reset-button {
  border-color: #334155;
  background: #1e293b;
  color: #cbd5e1;
}

.deploy-button {
  background: linear-gradient(90deg, #eab308, #fde047);
  color: #0f172a;
}

.editor-footer .deploy-button {
  border-color: #dc2626;
}

@media (max-width: 760px) {
  .quiz-body {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .quiz-list-panel {
    max-height: 17rem;
  }

  .quiz-form-panel {
    min-height: 28rem;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .new-button {
    width: 100%;
  }
}
</style>