<script setup lang="ts">
import type { EscapeRoomQuestion } from '#shared/game/types'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  quiz: EscapeRoomQuestion | null
  open: boolean
  hintRevealed: boolean
  feedback: { isCorrect: boolean; explanation: string; scoreAwarded: number } | null
}>()

const emit = defineEmits<{
  answer: [optionId: number | number[]]
  requestHint: []
  close: []
  advance: []
  retry: []
}>()

const selectedIndex = ref(0)
const selectedOptionIds = ref<number[]>([])
const confirmHintPrompt = ref(false)
const modal = ref<HTMLElement | null>(null)

const isMultiSelect = computed(() => {
  if (!props.quiz) return false
  return Boolean(
    (props.quiz.correctAnswers && props.quiz.correctAnswers.length > 1) ||
    props.quiz.q.toLowerCase().includes('select all')
  )
})

watch(() => props.open, async (open) => {
  if (!open) {
    confirmHintPrompt.value = false
    selectedOptionIds.value = []
    return
  }
  selectedIndex.value = 0
  selectedOptionIds.value = []
  confirmHintPrompt.value = false
  await nextTick()
  modal.value?.focus()
})

watch(() => props.quiz?.id, () => {
  selectedIndex.value = 0
  selectedOptionIds.value = []
  confirmHintPrompt.value = false
})

function isOptionSelected(optionId: number): boolean {
  return selectedOptionIds.value.includes(optionId)
}

function toggleOption(optionId: number) {
  const index = selectedOptionIds.value.indexOf(optionId)
  if (index >= 0) {
    selectedOptionIds.value.splice(index, 1)
  } else {
    selectedOptionIds.value.push(optionId)
  }
}

function handleOptionClick(option: { id: number; text: string }, index: number) {
  selectedIndex.value = index
  if (isMultiSelect.value) {
    toggleOption(option.id)
  } else {
    submitSingleAnswer(option.id)
  }
}

function submitSingleAnswer(optionId: number) {
  emit('answer', optionId)
}

function submitMultiAnswer() {
  if (selectedOptionIds.value.length === 0) return
  emit('answer', [...selectedOptionIds.value])
}

function handleHintRequest() {
  if (props.hintRevealed) return
  if (!confirmHintPrompt.value) {
    confirmHintPrompt.value = true
    return
  }
  confirmHintPrompt.value = false
  emit('requestHint')
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.quiz || !props.open) return

  // Escape key closes modal, cancels hint prompt, or closes feedback
  if (event.key === 'Escape' || event.code === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (confirmHintPrompt.value) {
      confirmHintPrompt.value = false
    } else if (props.feedback) {
      if (props.feedback.isCorrect) {
        emit('advance')
      } else {
        emit('retry')
      }
    } else {
      emit('close')
    }
    return
  }

  // Feedback screen navigation
  if (props.feedback) {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.code === 'Space' ||
      event.code === 'Enter'
    ) {
      event.preventDefault()
      event.stopPropagation()
      if (props.feedback.isCorrect) {
        emit('advance')
      } else {
        emit('retry')
      }
    }
    return
  }

  // Hint confirmation dialog keys
  if (confirmHintPrompt.value) {
    if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      handleHintRequest()
    }
    return
  }

  const optionCount = props.quiz.options.length

  // Number key shortcuts: 1..9
  const numKey = parseInt(event.key, 10)
  if (!isNaN(numKey) && numKey >= 1 && numKey <= optionCount) {
    event.preventDefault()
    event.stopPropagation()
    const option = props.quiz.options[numKey - 1]
    if (option) {
      selectedIndex.value = numKey - 1
      if (isMultiSelect.value) {
        toggleOption(option.id)
      } else {
        submitSingleAnswer(option.id)
      }
    }
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % optionCount
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + optionCount) % optionCount
  } else if (event.key === ' ' || event.code === 'Space') {
    if (isMultiSelect.value) {
      event.preventDefault()
      event.stopPropagation()
      const option = props.quiz.options[selectedIndex.value]
      if (option) toggleOption(option.id)
    }
  } else if (event.key === 'Enter' || event.code === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    if (isMultiSelect.value) {
      if (selectedOptionIds.value.length > 0) {
        submitMultiAnswer()
      } else {
        const option = props.quiz.options[selectedIndex.value]
        if (option) toggleOption(option.id)
      }
    } else {
      const option = props.quiz.options[selectedIndex.value]
      if (option) submitSingleAnswer(option.id)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})
</script>

<template>
  <div v-if="open && quiz" class="modal-backdrop" @click.self="emit('close')">
    <section ref="modal" class="quiz-modal" role="dialog" aria-modal="true"
      aria-labelledby="terminal-title" tabindex="-1" @keydown.stop="handleKeydown">

      <!-- Modal Header -->
      <div class="terminal-header">
        <div class="header-left">
          <span class="sector-badge" :class="'level-' + quiz.level">
            <template v-if="quiz.level === 1">SECTOR 1: AURA GEN-AI CORE (AMBER ALERT)</template>
            <template v-else-if="quiz.level === 2">SECTOR 2: CPH APPLICATIONS COMMAND</template>
            <template v-else>SECTOR 3: CYBER SECURITY VAULT</template>
          </span>
          <h2 id="terminal-title">
            <template v-if="quiz.level === 1">AURA Neural Diagnostic Console</template>
            <template v-else-if="quiz.level === 2">CPH Application Routing Terminal</template>
            <template v-else>Cyber Defense Vault Terminal</template>
          </h2>
        </div>
        <button type="button" class="close-button" aria-label="Close terminal" @click="emit('close')">×</button>
      </div>

      <!-- In-Universe System Ticker -->
      <div class="terminal-ticker">
        <span class="ticker-dot">●</span>
        <span v-if="quiz.level === 1">
          AURA AI PROTOCOL RECALIBRATION: Human-in-the-Loop validation required to override Gate 1
        </span>
        <span v-else-if="quiz.level === 2">
          APPLICATION STACK SYNC: Validating GUS, ServiceNow, Power Automate, CAFE & NetScan
        </span>
        <span v-else>
          SECURITY VAULT DIRECTIVE: Neutralize cyber threats to engage Master Dispatch Hatch
        </span>
      </div>

      <!-- Feedback Screen (After Submitting Answer) -->
      <div v-if="feedback" class="feedback-panel" :class="feedback.isCorrect ? 'success' : 'error'">
        <div class="feedback-status">
          <span class="status-icon">{{ feedback.isCorrect ? '✔' : '✖' }}</span>
          <div>
            <h3>
              <template v-if="feedback.isCorrect">
                {{ quiz.level === 1 ? 'PROTOCOL RECALIBRATED' : 'ACCESS GRANTED' }}
              </template>
              <template v-else>
                {{ quiz.level === 1 ? 'AI MISALIGNMENT DETECTED' : 'PROTOCOL DENIED' }}
              </template>
            </h3>
            <p v-if="feedback.isCorrect" class="score-gain">✔ +{{ feedback.scoreAwarded }} POINTS AWARDED</p>
            <p v-else class="score-penalty">⚠️ -30 POINTS PENALTY DEDUCTED FROM TOTAL SCORE</p>
          </div>
        </div>

        <div class="explanation-box">
          <strong>Operational Intel & Analysis:</strong>
          <p>{{ feedback.explanation }}</p>
        </div>

        <div class="feedback-actions">
          <button v-if="feedback.isCorrect" type="button" class="continue-button" @click="emit('advance')">
            Continue Escape Shift ➔
          </button>
          <button v-else type="button" class="retry-button" @click="emit('retry')">
            Try Again ↺
          </button>
        </div>
      </div>

      <!-- Question & Choices Form -->
      <div v-else class="question-body">
        <!-- Multi-select Notice Banner -->
        <div v-if="isMultiSelect" class="multi-select-banner">
          <span class="multi-icon">☑</span>
          <div class="multi-text">
            <strong>MULTIPLE SELECTION REQUIRED</strong>
            <p>Select all countermeasures that apply, then click <em>SUBMIT COUNTERMEASURES</em>.</p>
          </div>
        </div>

        <p class="question-text">{{ quiz.q }}</p>

        <!-- Hint Section -->
        <div class="hint-container">
          <div v-if="hintRevealed" class="hint-revealed">
            <span class="hint-icon">💡</span>
            <div>
              <strong>Tactical IT Hint (50% Score Penalty Applied):</strong>
              <p>{{ quiz.hint }}</p>
            </div>
          </div>
          <div v-else-if="confirmHintPrompt" class="hint-confirm">
            <p>⚠ Requesting a hint will reduce this question's reward to 50 pts. Proceed?</p>
            <div class="confirm-buttons">
              <button type="button" class="confirm-yes" @click="handleHintRequest">Reveal Hint (-50% Pts)</button>
              <button type="button" class="confirm-no" @click="confirmHintPrompt = false">Cancel</button>
            </div>
          </div>
          <div v-else class="hint-bar">
            <button type="button" class="hint-button" @click="handleHintRequest">
              💡 Request Tactical Hint (-50% Points)
            </button>
          </div>
        </div>

        <!-- Options -->
        <div class="options-grid">
          <button
            v-for="(option, index) in quiz.options"
            :key="option.id"
            type="button"
            class="option-card"
            :class="{
              selected: !isMultiSelect && selectedIndex === index,
              'multi-selected': isMultiSelect && isOptionSelected(option.id),
              focused: selectedIndex === index
            }"
            @click="handleOptionClick(option, index)"
          >
            <span class="key-indicator">{{ index + 1 }}</span>
            <span v-if="isMultiSelect" class="checkbox-indicator" :class="{ checked: isOptionSelected(option.id) }">
              <span v-if="isOptionSelected(option.id)">✓</span>
            </span>
            <span class="option-text">{{ option.text }}</span>
            <span v-if="!isMultiSelect" class="arrow-indicator">➔</span>
          </button>
        </div>

        <!-- Multi-select Bottom Action Bar -->
        <div v-if="isMultiSelect" class="multi-submit-bar">
          <div class="multi-count-info">
            <span>Selected: <strong>{{ selectedOptionIds.length }}</strong> of {{ quiz.options.length }}</span>
            <button
              v-if="selectedOptionIds.length > 0"
              type="button"
              class="btn-reset-selection"
              @click="selectedOptionIds = []"
            >
              Reset
            </button>
          </div>
          <button
            type="button"
            class="btn-submit-multi"
            :disabled="selectedOptionIds.length === 0"
            @click="submitMultiAnswer"
          >
            {{ selectedOptionIds.length > 0 ? `SUBMIT COUNTERMEASURES (${selectedOptionIds.length}) ➔` : 'SELECT AT LEAST 1 ANSWER' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, .88);
  backdrop-filter: blur(10px);
  font-family: 'Courier New', monospace;
}

.quiz-modal {
  width: min(100%, 38rem);
  padding: 1.8rem;
  border: 2px solid #ffcc00;
  border-radius: 1rem;
  background: #0f172a;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .6);
  color: #f8fafc;
  outline: none;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #334155;
  padding-bottom: .9rem;
  margin-bottom: 1.2rem;
}

.sector-badge {
  display: inline-block;
  font-size: .65rem;
  font-weight: 900;
  letter-spacing: .1em;
  padding: .2rem .5rem;
  border-radius: .3rem;
  margin-bottom: .3rem;
}

.level-1 { background: rgba(245, 158, 11, .2); color: #fbbf24; border: 1px solid #f59e0b; }
.level-2 { background: rgba(6, 182, 212, .2); color: #38bdf8; border: 1px solid #06b6d4; }
.level-3 { background: rgba(239, 68, 68, .2); color: #f87171; border: 1px solid #ef4444; }

h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffcc00;
}

.close-button {
  border: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
}

.close-button:hover { color: #f8fafc; }

.terminal-ticker {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .45rem 1.4rem;
  background: rgba(15, 23, 42, .85);
  border-bottom: 1px solid #334155;
  font-size: .72rem;
  font-weight: 800;
  color: #ffcc00;
  letter-spacing: .04em;
}

.ticker-dot {
  color: #d40511;
  font-size: .85rem;
  animation: pulse 1s infinite alternate;
}

.score-gain {
  margin: .25rem 0 0;
  font-size: .82rem;
  font-weight: 900;
  color: #4ade80;
  letter-spacing: .03em;
}

.score-penalty {
  margin: .25rem 0 0;
  font-size: .82rem;
  font-weight: 900;
  color: #ef4444;
  letter-spacing: .03em;
}

.multi-select-banner {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .65rem .95rem;
  margin-bottom: 1rem;
  border-radius: .6rem;
  background: rgba(239, 68, 68, .15);
  border: 1px solid rgba(239, 68, 68, .45);
}

.multi-icon {
  font-size: 1.25rem;
  color: #ef4444;
  flex-shrink: 0;
}

.multi-text strong {
  display: block;
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .08em;
  color: #f87171;
  margin-bottom: .15rem;
}

.multi-text p {
  margin: 0;
  font-size: .74rem;
  color: #cbd5e1;
}

.multi-text em {
  font-style: normal;
  color: #ffcc00;
  font-weight: 800;
}

.question-text {
  font-size: 1.05rem;
  line-height: 1.55;
  color: #f1f5f9;
  margin-bottom: 1.2rem;
  font-weight: 600;
}

.hint-container {
  margin-bottom: 1.2rem;
}

.hint-bar {
  display: flex;
  justify-content: flex-end;
}

.hint-button {
  border: 1px dashed rgba(250, 204, 21, .6);
  border-radius: .5rem;
  background: rgba(234, 179, 8, .1);
  color: #facc15;
  padding: .45rem .8rem;
  font-size: .7rem;
  font-weight: 800;
  cursor: pointer;
  transition: all .2s;
}

.hint-button:hover {
  background: rgba(234, 179, 8, .2);
  border-color: #ffcc00;
}

.hint-confirm {
  padding: .8rem;
  border-radius: .6rem;
  background: rgba(239, 68, 68, .15);
  border: 1px solid #ef4444;
  font-size: .75rem;
}

.hint-confirm p {
  margin: 0 0 .5rem;
  color: #fca5a5;
}

.confirm-buttons {
  display: flex;
  gap: .6rem;
}

.confirm-yes {
  padding: .4rem .8rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: .4rem;
  cursor: pointer;
  font-weight: 800;
  font-size: .7rem;
}

.confirm-no {
  padding: .4rem .8rem;
  background: #334155;
  color: #cbd5e1;
  border: none;
  border-radius: .4rem;
  cursor: pointer;
  font-size: .7rem;
}

.hint-revealed {
  display: flex;
  gap: .65rem;
  padding: .8rem;
  border-radius: .6rem;
  background: rgba(245, 158, 11, .15);
  border: 1px solid #f59e0b;
  font-size: .78rem;
}

.hint-revealed strong {
  color: #fbbf24;
  display: block;
  margin-bottom: .2rem;
}

.hint-revealed p {
  margin: 0;
  color: #fef08a;
}

.options-grid {
  display: grid;
  gap: .65rem;
}

.option-card {
  display: flex;
  align-items: center;
  gap: .8rem;
  padding: .9rem 1rem;
  border: 2px solid #334155;
  border-radius: .75rem;
  background: #1e293b;
  color: #f8fafc;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: .88rem;
  transition: all .15s ease;
}

.option-card:hover,
.option-card.selected {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, .12);
  transform: translateX(4px);
}

.option-card.multi-selected {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, .16);
  box-shadow: 0 0 15px rgba(255, 204, 0, .15);
}

.option-card.focused:not(.multi-selected) {
  border-color: #94a3b8;
  background: rgba(148, 163, 184, .1);
}

.checkbox-indicator {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid #64748b;
  border-radius: .35rem;
  background: rgba(15, 23, 42, .6);
  color: #0f172a;
  font-weight: 900;
  font-size: .9rem;
  flex-shrink: 0;
  transition: all .15s ease;
}

.checkbox-indicator.checked {
  border-color: #ffcc00;
  background: #ffcc00;
  color: #0f172a;
}

.multi-submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.2rem;
  padding-top: 1.1rem;
  border-top: 1px solid #334155;
}

.multi-count-info {
  display: flex;
  align-items: center;
  gap: .8rem;
  font-size: .8rem;
  color: #94a3b8;
}

.multi-count-info strong {
  color: #ffcc00;
  font-size: .95rem;
}

.btn-reset-selection {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  padding: .25rem .65rem;
  border-radius: .35rem;
  font-size: .72rem;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s ease;
}

.btn-reset-selection:hover {
  color: #f8fafc;
  border-color: #cbd5e1;
}

.btn-submit-multi {
  padding: .75rem 1.4rem;
  background: #ffcc00;
  color: #0f172a;
  border: none;
  border-radius: .5rem;
  font-family: inherit;
  font-weight: 900;
  font-size: .85rem;
  letter-spacing: .04em;
  cursor: pointer;
  transition: all .15s ease;
}

.btn-submit-multi:hover:not(:disabled) {
  background: #facc15;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(255, 204, 0, .4);
}

.btn-submit-multi:disabled {
  opacity: .45;
  cursor: not-allowed;
  background: #475569;
  color: #94a3b8;
  transform: none;
  box-shadow: none;
}

.key-indicator {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: .35rem;
  background: rgba(255, 255, 255, .1);
  color: #ffcc00;
  font-weight: 900;
  font-size: .75rem;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
}

.arrow-indicator {
  color: #ffcc00;
  opacity: .5;
  font-size: .9rem;
}

.option-card:hover .arrow-indicator {
  opacity: 1;
}

/* Feedback Panel */
.feedback-panel {
  padding: 1.4rem;
  border-radius: .85rem;
  border: 2px solid;
}

.feedback-panel.success {
  border-color: #10b981;
  background: rgba(16, 185, 129, .1);
}

.feedback-panel.error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, .1);
}

.feedback-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.status-icon {
  font-size: 2.2rem;
}

.feedback-panel.success .status-icon { color: #10b981; }
.feedback-panel.error .status-icon { color: #ef4444; }

.feedback-status h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 900;
}

.score-gain {
  margin: .2rem 0 0;
  font-size: .85rem;
  font-weight: 800;
  color: #34d399;
}

.explanation-box {
  background: rgba(15, 23, 42, .8);
  border-radius: .65rem;
  padding: 1rem;
  margin-bottom: 1.4rem;
  font-size: .85rem;
  line-height: 1.5;
}

.explanation-box strong {
  display: block;
  margin-bottom: .3rem;
  color: #ffcc00;
}

.explanation-box p {
  margin: 0;
  color: #cbd5e1;
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

.continue-button {
  padding: .85rem 1.6rem;
  background: #10b981;
  color: #0f172a;
  border: none;
  border-radius: .5rem;
  font-family: inherit;
  font-weight: 900;
  font-size: .88rem;
  cursor: pointer;
  letter-spacing: .05em;
}

.continue-button:hover {
  background: #34d399;
}

.retry-button {
  padding: .85rem 1.6rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: .5rem;
  font-family: inherit;
  font-weight: 900;
  font-size: .88rem;
  cursor: pointer;
}

.retry-button:hover {
  background: #dc2626;
}
</style>
