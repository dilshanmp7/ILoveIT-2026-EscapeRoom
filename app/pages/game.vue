<script setup lang="ts">
import type { Floorplan, GameSession, LevelProgress } from '#shared/game/types'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const engine = useGameEngine()
const route = useRoute()
definePageMeta({ middleware: ['game-gate'] })

const session = ref<GameSession | null>(null)
const floorplan = ref<Floorplan | null>(null)
const sessionError = ref('')
const isBlockedFromReplay = ref(false)
const resumedToast = ref('')
const accessToken = ref('')

async function submitScore(completed = false) {
  if (!session.value) return
  const snapshot = engine.getSessionSnapshot(completed)
  const payload = {
    ...snapshot,
    userCode: session.value.userCode,
    firstName: session.value.firstName,
    lastName: session.value.lastName,
    department: session.value.department,
    shift: session.value.shift,
  }
  if (import.meta.client) {
    try {
      localStorage.setItem(`cph_snapshot_${session.value.id}`, JSON.stringify(payload))
    } catch {
      // Ignore storage errors
    }
  }
  try {
    const res = await $fetch<{ session: GameSession; accessToken?: string }>(`/api/game/session/${session.value.id}`, {
      method: 'POST',
      body: payload,
      headers: accessToken.value ? { 'x-access-token': accessToken.value } : undefined,
    })
    if (res?.accessToken) {
      accessToken.value = res.accessToken
      if (import.meta.client) {
        try {
          localStorage.setItem('cph_access_token', res.accessToken)
        } catch {
          // Ignore storage errors
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync session score:', err)
  }
}

function handleBeforeUnload() {
  if (!session.value || engine.state.finished) return
  const snapshot = engine.getSessionSnapshot(false)
  const payload = {
    ...snapshot,
    userCode: session.value.userCode,
    firstName: session.value.firstName,
    lastName: session.value.lastName,
    department: session.value.department,
    shift: session.value.shift,
  }
  if (import.meta.client) {
    try {
      localStorage.setItem(`cph_snapshot_${session.value.id}`, JSON.stringify(payload))
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(`/api/game/session/${session.value.id}`, blob)
    } catch {
      // Ignore beacon failures
    }
  }
}

onMounted(async () => {
  if (import.meta.client) {
    window.addEventListener('beforeunload', handleBeforeUnload)
    accessToken.value = localStorage.getItem('cph_access_token') || ''
  }

  try {
    let sessionKey = typeof route.query.session === 'string' ? route.query.session.trim() : ''
    let firstName = typeof route.query.first === 'string' ? route.query.first.trim() : ''
    let lastName = typeof route.query.last === 'string' ? route.query.last.trim() : ''
    let department = typeof route.query.dept === 'string' ? route.query.dept.trim() : ''
    let shift = typeof route.query.shift === 'string' ? route.query.shift.trim() : ''

    // Local storage fallback if URL query parameters were cleared on refresh
    if (!sessionKey && import.meta.client) {
      sessionKey = localStorage.getItem('cph_agent_code') || ''
      firstName = firstName || localStorage.getItem('cph_first_name') || ''
      lastName = lastName || localStorage.getItem('cph_last_name') || ''
      department = department || localStorage.getItem('cph_dept') || ''
      shift = shift || localStorage.getItem('cph_shift') || ''
    }

    const response = await $fetch<{
      session: GameSession
      floorplan: Floorplan
      levelProgress: LevelProgress
      isResumed: boolean
      accessToken?: string
    }>('/api/game/session', {
      method: 'POST',
      headers: accessToken.value ? { 'x-access-token': accessToken.value } : undefined,
      body: {
        sessionKey,
        firstName,
        lastName,
        department,
        shift,
        userCode: sessionKey,
      },
    })

    if (response.accessToken) {
      accessToken.value = response.accessToken
      if (import.meta.client) {
        try {
          localStorage.setItem('cph_access_token', response.accessToken)
        } catch {
          // Ignore storage errors
        }
      }
    }

    // If local cache has a fresher snapshot, merge it to prevent refresh race conditions
    if (import.meta.client) {
      const cached = localStorage.getItem(`cph_snapshot_${response.session.id}`)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (
            parsed &&
            ((parsed.levelProgress?.solvedQuestionIds?.length || 0) > (response.levelProgress?.solvedQuestionIds?.length || 0) ||
              (parsed.score || 0) > (response.session.score || 0))
          ) {
            if (parsed.score !== undefined) response.session.score = parsed.score
            if (parsed.currentLevel) response.session.currentLevel = parsed.currentLevel
            if (parsed.timeSpentSeconds) response.session.timeSpentSeconds = parsed.timeSpentSeconds
            if (parsed.levelProgress) response.levelProgress = parsed.levelProgress
          }
        } catch {
          // Ignore cache parse failure
        }
      }
    }

    session.value = response.session
    floorplan.value = response.floorplan
    engine.initSessionProgress(response.session, response.levelProgress)

    if (response.isResumed) {
      resumedToast.value = `Welcome back Agent ${response.session.firstName || ''}! Resumed at Sector ${response.session.currentLevel}.`
      setTimeout(() => {
        resumedToast.value = ''
      }, 5000)
    }

    // Connect auto-save
    engine.onSaveState(async (snapshot) => {
      if (!session.value) return
      const payload = {
        ...snapshot,
        userCode: session.value.userCode,
        firstName: session.value.firstName,
        lastName: session.value.lastName,
        department: session.value.department,
        shift: session.value.shift,
      }
      if (import.meta.client) {
        try {
          localStorage.setItem(`cph_snapshot_${session.value.id}`, JSON.stringify(payload))
        } catch {
          // Ignore storage errors
        }
      }
      try {
        const res = await $fetch<{ session: GameSession; accessToken?: string }>(`/api/game/session/${session.value.id}`, {
          method: 'POST',
          body: payload,
          headers: accessToken.value ? { 'x-access-token': accessToken.value } : undefined,
        })
        if (res?.accessToken) {
          accessToken.value = res.accessToken
          if (import.meta.client) {
            try {
              localStorage.setItem('cph_access_token', res.accessToken)
            } catch {
              // Ignore storage errors
            }
          }
        }
      } catch (err) {
        console.error('Auto-save error:', err)
      }
    })
  } catch (err: any) {
    if (err?.statusCode === 403 || err?.response?.status === 403) {
      isBlockedFromReplay.value = true
      sessionError.value = err?.data?.statusMessage || err?.statusMessage || err?.data?.message || 'Mission Complete: You have already played your mission. Each agent is permitted only one operational run.'
    } else {
      sessionError.value = 'Unable to connect to dispatch hub session.'
    }
  }
})

watch(() => engine.state.finished, (finished) => {
  if (finished) void submitScore(true)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
  if (session.value && !engine.state.finished) void submitScore(false)
})

useSeoMeta({
  title: 'DHL CPH Hub | Escape Room Dispatch Floor',
  robots: 'noindex',
})
</script>

<template>
  <main class="game-page">
    <div v-if="sessionError" class="game-error" role="alert">
      <p>{{ sessionError }}</p>
      <div style="display: flex; gap: 0.8rem; margin-top: 1rem; justify-content: center; flex-wrap: wrap;">
        <NuxtLink v-if="isBlockedFromReplay" to="/leaderboard" class="btn-retry" style="background: #ffcc00; color: #0f172a;">
          🏆 View Live Leaderboard
        </NuxtLink>
        <NuxtLink to="/" class="btn-retry">Return to Login</NuxtLink>
      </div>
    </div>

    <div v-else-if="!session || !floorplan" class="game-loading">
      <span class="pulse-icon">⚡</span>
      <p>CONNECTING TO CPH HUB DISPATCH CORE...</p>
    </div>

    <section v-else class="game-shell" aria-label="DHL CPH Hub Escape Room">
      <GameScene :engine="engine" :floorplan="floorplan" />
      <GameHud
        :state="engine.state"
        @open-briefing="engine.openMissionBriefing"
        @open-map="engine.openMapModal"
        @grab="engine.pickUp"
        @action="engine.useNearby"
      />

      <!-- Tactical 2D Level Escape Path Map Modal -->
      <GamePathMapModal
        :open="engine.state.mapModalOpen"
        :level="engine.state.currentLevel"
        :nodes="engine.state.pathNodes"
        :player-pos="engine.state.playerPosition"
        @close="engine.closeMapModal" />

      <!-- Cross-Device Controls -->
      <GameMobileControls
        :can-grab="engine.state.canGrab"
        :can-use="engine.state.canUse"
        @grab="engine.pickUp"
        @action="engine.useNearby"
        @dash="engine.dash"
        @quiz="engine.openQuiz"
        @move="engine.setJoystick" />

      <!-- Mission Briefing & Story Incident Modal -->
      <GameMissionBriefingModal
        :open="engine.state.missionBriefingOpen"
        :level="engine.state.currentLevel"
        :solved-count="engine.state.solvedCountInLevel"
        :total-in-level="engine.state.totalInLevel"
        @close="engine.closeMissionBriefing" />

      <!-- Interactive Challenge Terminal Modal -->
      <GameQuizModal
        :quiz="engine.state.quiz"
        :open="engine.state.quizOpen"
        :hint-revealed="engine.state.quizHintRevealed"
        :feedback="engine.state.quizFeedback"
        @answer="engine.answerQuiz"
        @request-hint="engine.requestHint"
        @advance="engine.closeFeedbackAndAdvance"
        @retry="engine.retryQuiz"
        @close="engine.answerQuiz(-1)" />

      <!-- Object Selection & Action Modals -->
      <GameObjectSelectionModal
        :open="engine.state.objectSelectionOpen"
        :options="engine.state.objectSelectionOptions"
        @select="engine.selectObject"
        @close="engine.closeObjectSelection" />

      <GameObjectSelectionModal
        :open="engine.state.actionSelectionOpen"
        :options="engine.state.actionSelectionOptions"
        title="SELECT ACTION"
        description="Choose an action for this console."
        @select="engine.executeAction"
        @close="engine.closeActionSelection" />

      <GameMessageModal :message="engine.state.message" @close="engine.closeMessage" />

      <!-- Sector Cleared Announcement Modal -->
      <div v-if="engine.state.levelClearedModal" class="level-cleared-backdrop" @click="engine.closeLevelClearedModal">
        <div class="level-cleared-card">
          <h2>{{ engine.state.levelClearedModal.title }}</h2>
          <p>{{ engine.state.levelClearedModal.message }}</p>
          <button type="button" class="btn-proceed" @click="engine.closeLevelClearedModal">
            Proceed to Next Sector ➔
          </button>
        </div>
      </div>

      <!-- Resumed Session Notification Toast -->
      <div v-if="resumedToast" class="resume-toast" role="status">
        <span>🔄 {{ resumedToast }}</span>
      </div>

      <!-- Escape Room Victory Celebration Modal -->
      <GameEscapeVictoryModal
        :open="engine.state.finished"
        :is-timed-out="engine.state.isTimedOut"
        :score="engine.state.score"
        :running-time="engine.state.runningTime"
        :hints-used="engine.state.hintsUsed"
        :total-solved="engine.state.totalSolved"
        :user-code="engine.state.userCode"
        :player-name="engine.state.playerName"
        :player-department="engine.state.playerDepartment"
        :player-shift="engine.state.playerShift"
        @leaderboard="navigateTo('/leaderboard')"
        @home="navigateTo('/')" />
    </section>
  </main>
</template>

<style scoped>
.game-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  margin: 0;
  background: #090d16;
  color: #f8fafc;
  font-family: 'Courier New', monospace;
}

.game-loading,
.game-error {
  padding: 2.5rem;
  text-align: center;
  border-radius: 1rem;
  background: rgba(15, 23, 42, .9);
  border: 2px solid #ffcc00;
}

.game-loading {
  color: #ffcc00;
  letter-spacing: .14em;
  font-size: .85rem;
  font-weight: 800;
}

.pulse-icon {
  display: block;
  font-size: 2.5rem;
  margin-bottom: .8rem;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(.9); opacity: .6; }
  100% { transform: scale(1.2); opacity: 1; }
}

.game-error {
  color: #fca5a5;
}

.btn-retry {
  display: inline-block;
  margin-top: 1rem;
  padding: .6rem 1.2rem;
  background: #ffcc00;
  color: #0f172a;
  text-decoration: none;
  font-weight: 900;
  border-radius: .4rem;
}

.game-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.resume-toast {
  position: fixed;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  padding: .75rem 1.4rem;
  background: #10b981;
  color: #0f172a;
  border-radius: 999px;
  font-weight: 900;
  font-size: .82rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, .5);
  animation: slide-down .3s ease;
}

@keyframes slide-down {
  0% { transform: translate(-50%, -20px); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}

/* Level Cleared Banner Modal */
.level-cleared-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, .85);
  backdrop-filter: blur(8px);
}

.level-cleared-card {
  width: min(100%, 34rem);
  padding: 2rem;
  border-radius: 1rem;
  background: #0f172a;
  border: 3px solid #ffcc00;
  box-shadow: 0 0 50px rgba(255, 204, 0, .4);
  text-align: center;
}

.level-cleared-card h2 {
  margin: 0 0 .8rem;
  font-size: 1.3rem;
  color: #ffcc00;
}

.level-cleared-card p {
  margin: 0 0 1.5rem;
  color: #cbd5e1;
  line-height: 1.5;
  font-size: .95rem;
}

.btn-proceed {
  padding: .85rem 1.6rem;
  background: #ffcc00;
  color: #0f172a;
  border: none;
  border-radius: .4rem;
  font-family: inherit;
  font-weight: 900;
  font-size: .88rem;
  cursor: pointer;
  letter-spacing: .05em;
}

.btn-proceed:hover {
  background: #fde047;
}
</style>
