<script setup lang="ts">
import type { EventStats, LeaderboardEntry } from '#shared/game/types'
import { CPH_DEPARTMENTS, CPH_SHIFTS } from '#shared/game/questions-data'
import { useLeaderboardAudio } from '~/utils/game/leaderboard-audio'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const entries = ref<LeaderboardEntry[]>([])
const stats = ref<EventStats>({
  totalRegistered: 0,
  totalCompleted: 0,
  fastestTimeSeconds: null,
  topDepartment: null,
  averageScore: 0,
})

const selectedDepartment = ref('')
const selectedShift = ref('')
const isLoading = ref(false)
const autoRefreshSeconds = ref(300) // 5 minutes
let refreshTimer: ReturnType<typeof setInterval> | undefined

// Big Screen Broadcast Audio & Presentation State
const audio = useLeaderboardAudio()
const isAudioActive = ref(false)
const isFullscreen = ref(false)

const liveBroadcastAlert = ref<{ type: 'escape' | 'leader'; message: string; sub: string } | null>(null)
let alertTimeout: ReturnType<typeof setTimeout> | null = null
let previousTotalCompleted: number | null = null
let previousTopAgentCode: string | null = null

function triggerBroadcastAlert(type: 'escape' | 'leader', message: string, sub: string) {
  liveBroadcastAlert.value = { type, message, sub }
  if (alertTimeout) clearTimeout(alertTimeout)
  alertTimeout = setTimeout(() => {
    liveBroadcastAlert.value = null
  }, 7000)
}

async function toggleSound() {
  audio.unlock()
  if (audio.isSoundEnabled && audio.isPlaying) {
    audio.stop(0.3)
    isAudioActive.value = false
  } else {
    await audio.start()
    isAudioActive.value = audio.isPlaying
  }
}

function toggleFullscreen() {
  if (typeof document === 'undefined') return
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen?.().catch(() => {})
  }
}

function onFullscreenChange() {
  if (typeof document !== 'undefined') {
    isFullscreen.value = !!document.fullscreenElement
  }
}

function onUserInteraction() {
  audio.unlock()
  if (audio.isSoundEnabled && !audio.isPlaying) {
    void audio.start().then(() => {
      isAudioActive.value = audio.isPlaying
    })
  }
}

useSeoMeta({
  title: 'DHL CPH Hub | Live Event Leaderboard',
  description: 'Live broadcast leaderboard for DHL I Love IT Day 2026 at CPH Hub.',
})

async function fetchLeaderboard() {
  try {
    isLoading.value = true
    const params: Record<string, string> = {}
    if (selectedDepartment.value) params.department = selectedDepartment.value
    if (selectedShift.value) params.shift = selectedShift.value

    const data = await $fetch<{ leaderboard: LeaderboardEntry[]; stats: EventStats }>('/api/game/leaderboard', {
      params,
    })
    entries.value = data.leaderboard || []
    stats.value = data.stats || {
      totalRegistered: 0,
      totalCompleted: 0,
      fastestTimeSeconds: null,
      topDepartment: null,
      averageScore: 0,
    }

    const currentCompleted = data.stats?.totalCompleted ?? 0
    const currentEntries = data.leaderboard || []
    const currentTopAgent = currentEntries[0]?.userCode || null

    // Real-time Event Fanfare: Detect new successful facility escape
    if (previousTotalCompleted !== null && currentCompleted > previousTotalCompleted) {
      const newlyEscaped = currentEntries.find((e) => e.completed)
      const name = newlyEscaped ? `${newlyEscaped.firstName} ${newlyEscaped.lastName}` : 'Rapid-Response Agent'
      const dept = newlyEscaped?.department ? `(${newlyEscaped.department})` : ''
      const timeStr = newlyEscaped ? formatTime(newlyEscaped.timeSpentSeconds) : ''
      audio.playCelebrationFanfare()
      triggerBroadcastAlert(
        'escape',
        `🎉 FACILITY ESCAPE CONFIRMED: ${name} ${dept}!`,
        `Emergency clearance achieved in ${timeStr} • Total Escapes: ${currentCompleted}`,
      )
    }

    // Real-time Event Fanfare: Detect change of #1 Leader
    if (
      previousTopAgentCode !== null &&
      currentTopAgent &&
      currentTopAgent !== previousTopAgentCode &&
      currentEntries.length > 0
    ) {
      const top = currentEntries[0]!
      audio.playLeadChangeChime()
      triggerBroadcastAlert(
        'leader',
        `👑 NEW #1 CHAMPION: ${top.firstName} ${top.lastName} (${top.department})!`,
        `Score: ${top.score} PTS • Escaped in ${formatTime(top.timeSpentSeconds)}`,
      )
    }

    previousTotalCompleted = currentCompleted
    previousTopAgentCode = currentTopAgent

    // Client-side fallback: ensure the player's own finished game is never missing on their device
    if (import.meta.client) {
      let localData: any = null
      const localCompletedRaw = localStorage.getItem('cph_completed_session')
      if (localCompletedRaw) {
        try {
          localData = JSON.parse(localCompletedRaw)
        } catch {}
      }

      if (!localData) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('cph_snapshot_')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(k) || '')
              if (parsed && (parsed.score > 0 || parsed.completed)) {
                localData = {
                  ...parsed,
                  id: k.replace('cph_snapshot_', ''),
                  userCode: localStorage.getItem('cph_agent_code') || parsed.userCode,
                  firstName: localStorage.getItem('cph_first_name') || parsed.firstName,
                  lastName: localStorage.getItem('cph_last_name') || parsed.lastName,
                  department: localStorage.getItem('cph_dept') || parsed.department,
                  shift: localStorage.getItem('cph_shift') || parsed.shift,
                }
                break
              }
            } catch {}
          }
        }
      }

      if (localData && (localData.score > 0 || localData.completed)) {
        const exists = entries.value.some(
          (e) => (localData.id && e.id === localData.id) || (localData.userCode && e.userCode === localData.userCode),
        )

        if (!exists) {
          // If the session was removed from the server (e.g. admin reset or Redis deletion),
          // purge local device cache so stale scores do not linger or resurrect
          try {
            localStorage.removeItem('cph_completed_session')
            if (localData.id) localStorage.removeItem(`cph_snapshot_${localData.id}`)
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Failed to load leaderboard:', err)
  } finally {
    isLoading.value = false
  }
}

function formatTime(seconds: number) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

onMounted(() => {
  if (import.meta.client) {
    isAudioActive.value = audio.isPlaying
    window.addEventListener('pointerdown', onUserInteraction, { capture: true })
    window.addEventListener('keydown', onUserInteraction, { capture: true })
    document.addEventListener('fullscreenchange', onFullscreenChange)
  }
  fetchLeaderboard()
  refreshTimer = setInterval(() => {
    fetchLeaderboard()
  }, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (alertTimeout) clearTimeout(alertTimeout)
  if (import.meta.client) {
    window.removeEventListener('pointerdown', onUserInteraction, { capture: true })
    window.removeEventListener('keydown', onUserInteraction, { capture: true })
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    audio.stop(0.2)
  }
})
</script>

<template>
  <main class="leaderboard-page">
    <!-- Top Broadcast Banner -->
    <header class="broadcast-header">
      <div class="header-content">
        <div class="brand-cluster">
          <span class="dhl-badge">DHL</span>
          <div>
            <h1>CPH HUB / I LOVE IT DAY 2026</h1>
            <p class="subtitle">LIVE ESCAPE ROOM LEADERBOARD</p>
          </div>
        </div>

        <!-- Live Broadcast Control Cluster -->
        <div class="broadcast-controls">
          <!-- Arena Audio Button -->
          <button
            type="button"
            class="btn-broadcast-sound"
            :class="{ active: isAudioActive }"
            @click="toggleSound"
            title="Toggle Big Screen Broadcast Audio (BGM & Chimes)"
          >
            <span v-if="isAudioActive" class="sound-wave" aria-hidden="true">
              <span class="bar bar-1" />
              <span class="bar bar-2" />
              <span class="bar bar-3" />
              <span class="bar bar-4" />
            </span>
            <span v-else class="sound-icon" aria-hidden="true">🔇</span>
            <span>{{ isAudioActive ? 'ARENA SOUND: ON' : 'START ARENA SOUND 🔊' }}</span>
          </button>

          <!-- Fullscreen Presentation Toggle -->
          <button
            type="button"
            class="btn-fullscreen"
            @click="toggleFullscreen"
            title="Toggle Big Screen Fullscreen Presentation Mode"
          >
            {{ isFullscreen ? '🗗 EXIT' : '⛶ FULLSCREEN' }}
          </button>

          <!-- Live Refresh Status -->
          <button
            type="button"
            class="live-indicator"
            @click="fetchLeaderboard"
            title="Auto-refreshes every 5 minutes. Click to refresh now."
          >
            <span class="pulsing-dot" />
            <span>LIVE (5 MIN)</span>
            <span v-if="isLoading" class="refreshing-spin">⟳</span>
          </button>

          <NuxtLink to="/" class="btn-play">Play Game ➔</NuxtLink>
        </div>
      </div>

      <!-- Live Event Alert Banner (Facility Escapes & Leader Changes) -->
      <transition name="alert-slide">
        <div v-if="liveBroadcastAlert" class="broadcast-alert-banner" :class="liveBroadcastAlert.type">
          <div class="alert-icon">
            {{ liveBroadcastAlert.type === 'escape' ? '🚀' : '👑' }}
          </div>
          <div class="alert-body">
            <strong class="alert-headline">{{ liveBroadcastAlert.message }}</strong>
            <span class="alert-detail">{{ liveBroadcastAlert.sub }}</span>
          </div>
          <button class="alert-dismiss" @click="liveBroadcastAlert = null" aria-label="Dismiss alert">✕</button>
        </div>
      </transition>

      <!-- Real-Time Event Statistics Ribbon -->
      <div class="stats-ribbon">
        <div class="stat-box">
          <small>REGISTERED AGENTS</small>
          <strong>{{ stats.totalRegistered }}</strong>
          <span>PARTICIPANTS</span>
        </div>
        <div class="stat-box">
          <small>SUCCESSFUL ESCAPES</small>
          <strong class="text-green">{{ stats.totalCompleted }}</strong>
          <span>FACILITY ESCAPES</span>
        </div>
        <div class="stat-box">
          <small>FASTEST ESCAPE</small>
          <strong class="text-yellow">{{ stats.fastestTimeSeconds ? formatTime(stats.fastestTimeSeconds) : '--:--' }}</strong>
          <span>SLA RECORD</span>
        </div>
        <div class="stat-box">
          <small>LEADING DEPARTMENT</small>
          <strong class="text-blue">{{ stats.topDepartment || 'Operations' }}</strong>
          <span>HIGHEST AVG SCORE</span>
        </div>
        <div class="stat-box">
          <small>AVERAGE SCORE</small>
          <strong>{{ stats.averageScore }}</strong>
          <span>POINTS</span>
        </div>
      </div>
    </header>

    <!-- Filter Bar -->
    <section class="filter-strip">
      <div class="filter-group">
        <label for="dept-filter">DEPARTMENT:</label>
        <select id="dept-filter" v-model="selectedDepartment" @change="fetchLeaderboard">
          <option value="">ALL CPH DEPARTMENTS</option>
          <option v-for="dept in CPH_DEPARTMENTS" :key="dept" :value="dept">{{ dept }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="shift-filter">SHIFT:</label>
        <select id="shift-filter" v-model="selectedShift" @change="fetchLeaderboard">
          <option value="">ALL SHIFTS</option>
          <option v-for="shift in CPH_SHIFTS" :key="shift" :value="shift">{{ shift }}</option>
        </select>
      </div>
    </section>

    <!-- Top 3 Champions Podium -->
    <section v-if="entries.length >= 3 && !selectedDepartment && !selectedShift" class="podium-section" aria-label="Top 3 Champions">
      <!-- 2nd Place (Silver) -->
      <div class="podium-card silver">
        <div class="podium-medal">🥈 2ND</div>
        <strong class="podium-name">{{ entries[1]!.firstName }} {{ entries[1]!.lastName }}</strong>
        <span class="podium-code">{{ entries[1]!.userCode }}</span>
        <span class="podium-dept">{{ entries[1]!.department }}</span>
        <div class="podium-score">{{ entries[1]!.score }} PTS</div>
        <small class="podium-time">Time: {{ formatTime(entries[1]!.timeSpentSeconds) }}</small>
      </div>

      <!-- 1st Place (Gold) -->
      <div class="podium-card gold">
        <div class="podium-crown">👑</div>
        <div class="podium-medal">🥇 1ST PLACE</div>
        <strong class="podium-name">{{ entries[0]!.firstName }} {{ entries[0]!.lastName }}</strong>
        <span class="podium-code">{{ entries[0]!.userCode }}</span>
        <span class="podium-dept">{{ entries[0]!.department }}</span>
        <div class="podium-score">{{ entries[0]!.score }} PTS</div>
        <small class="podium-time">Time: {{ formatTime(entries[0]!.timeSpentSeconds) }}</small>
      </div>

      <!-- 3rd Place (Bronze) -->
      <div class="podium-card bronze">
        <div class="podium-medal">🥉 3RD</div>
        <strong class="podium-name">{{ entries[2]!.firstName }} {{ entries[2]!.lastName }}</strong>
        <span class="podium-code">{{ entries[2]!.userCode }}</span>
        <span class="podium-dept">{{ entries[2]!.department }}</span>
        <div class="podium-score">{{ entries[2]!.score }} PTS</div>
        <small class="podium-time">Time: {{ formatTime(entries[2]!.timeSpentSeconds) }}</small>
      </div>
    </section>

    <!-- Leaderboard Table -->
    <section class="table-container">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="col-rank">RANK</th>
            <th class="col-agent">AGENT</th>
            <th class="col-dept">DEPARTMENT</th>
            <th class="col-shift">SHIFT</th>
            <th class="col-level">SECTOR</th>
            <th class="col-time">TIME</th>
            <th class="col-hints">HINTS</th>
            <th class="col-score">SCORE</th>
            <th class="col-status">STATUS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!entries.length">
            <td colspan="9" class="empty-state">No escape sessions recorded yet. Enter the dispatch floor to begin!</td>
          </tr>
          <tr v-for="entry in entries" :key="entry.id" :class="{ 'top-three': entry.rank <= 3, 'completed-row': entry.completed }">
            <td class="col-rank">
              <span class="rank-badge" :class="'rank-' + entry.rank">#{{ entry.rank }}</span>
            </td>
            <td class="col-agent">
              <strong class="agent-fullname">{{ entry.firstName }} {{ entry.lastName }}</strong>
              <span class="agent-subcode">{{ entry.userCode }}</span>
            </td>
            <td class="col-dept">{{ entry.department }}</td>
            <td class="col-shift">{{ entry.shift }}</td>
            <td class="col-level">
              <span class="sector-indicator" :class="'sec-' + entry.currentLevel">
                {{ entry.completed ? 'ESCAPED' : 'Sector ' + entry.currentLevel }}
              </span>
            </td>
            <td class="col-time">{{ formatTime(entry.timeSpentSeconds) }}</td>
            <td class="col-hints">{{ entry.hintsUsed }}</td>
            <td class="col-score"><strong>{{ entry.score }}</strong></td>
            <td class="col-status">
              <span v-if="entry.completed" class="status-escaped">ESCAPED 🚀</span>
              <span v-else class="status-active">IN SECTOR</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Bottom News Ticker -->
    <footer class="news-ticker-bar">
      <span class="ticker-label">BREAKING CPH DISPATCH:</span>
      <div class="ticker-content">
        <span>🚨 NIGHT-SORT CYBER INCIDENT IN PROGRESS • 200 RAPID-RESPONSE AGENTS COMPETING TO RESTORE LOGISTICS PROTOCOLS • SOLVE ALL 3 SECTORS TO UNLOCK EMERGENCY DISPATCH HATCH!</span>
      </div>
    </footer>

    <!-- Leaderboard Sub-Footer -->
    <div class="leaderboard-legal-footer">
      <span>DHL CPH Hub • I Love IT Day 2026</span>
      <span>•</span>
      <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
      <span>•</span>
      <NuxtLink to="/contact">Contact IT Team</NuxtLink>
      <span>•</span>
      <NuxtLink to="/">Return to Game Start ➔</NuxtLink>
    </div>
  </main>
</template>

<style scoped>
.leaderboard-page {
  min-height: 100vh;
  background: #090d16;
  color: #f8fafc;
  font-family: 'Courier New', monospace;
  padding: 1.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
}

.broadcast-header {
  border-bottom: 2px solid #ffcc00;
  padding-bottom: 1.2rem;
  margin-bottom: 1.2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.brand-cluster {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dhl-badge {
  padding: .4rem .9rem;
  background: #ffcc00;
  color: #d40511;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: -.05em;
  border-radius: .4rem;
}

h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: .04em;
}

.subtitle {
  margin: .2rem 0 0;
  color: #94a3b8;
  font-size: .75rem;
  letter-spacing: .08em;
}

.broadcast-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .65rem;
}

.btn-broadcast-sound {
  display: inline-flex;
  align-items: center;
  gap: .55rem;
  padding: .45rem .85rem;
  background: rgba(15, 23, 42, .9);
  border: 1.5px solid #ffcc00;
  color: #ffcc00;
  border-radius: .45rem;
  font-family: inherit;
  font-size: .75rem;
  font-weight: 900;
  letter-spacing: .04em;
  cursor: pointer;
  transition: all .2s ease;
  box-shadow: 0 0 12px rgba(255, 204, 0, .25);
  animation: pulse-border 2.5s infinite;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 204, 0, .25); }
  50% { box-shadow: 0 0 20px rgba(255, 204, 0, .5); }
}

.btn-broadcast-sound:hover {
  background: #ffcc00;
  color: #0f172a;
  box-shadow: 0 0 22px rgba(255, 204, 0, .6);
}

.btn-broadcast-sound.active {
  background: rgba(16, 185, 129, .15);
  border-color: #10b981;
  color: #34d399;
  box-shadow: 0 0 16px rgba(16, 185, 129, .35);
  animation: none;
}

.btn-broadcast-sound.active:hover {
  background: #10b981;
  color: #0f172a;
  box-shadow: 0 0 22px rgba(16, 185, 129, .6);
}

.sound-wave {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.sound-wave .bar {
  width: 3px;
  background: currentColor;
  border-radius: 1px;
  animation: sound-bar-bounce 0.8s ease-in-out infinite alternate;
}

.sound-wave .bar-1 { height: 40%; animation-delay: 0.1s; }
.sound-wave .bar-2 { height: 100%; animation-delay: 0.3s; }
.sound-wave .bar-3 { height: 60%; animation-delay: 0.45s; }
.sound-wave .bar-4 { height: 80%; animation-delay: 0.2s; }

@keyframes sound-bar-bounce {
  0% { transform: scaleY(0.25); }
  100% { transform: scaleY(1); }
}

.btn-fullscreen {
  padding: .45rem .75rem;
  background: rgba(30, 41, 59, .85);
  border: 1px solid #475569;
  color: #f8fafc;
  border-radius: .45rem;
  font-family: inherit;
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .04em;
  cursor: pointer;
  transition: all .2s;
}

.btn-fullscreen:hover {
  background: #334155;
  border-color: #94a3b8;
}

.broadcast-alert-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .85rem 1.25rem;
  border-radius: .65rem;
  margin-bottom: 1.2rem;
  animation: banner-enter .4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 2px solid;
}

@keyframes banner-enter {
  0% { opacity: 0; transform: translateY(-12px); }
  100% { opacity: 1; transform: translateY(0); }
}

.broadcast-alert-banner.escape {
  background: linear-gradient(90deg, rgba(16, 185, 129, .25), rgba(15, 23, 42, .95));
  border-color: #10b981;
  box-shadow: 0 0 25px rgba(16, 185, 129, .35);
}

.broadcast-alert-banner.leader {
  background: linear-gradient(90deg, rgba(255, 204, 0, .25), rgba(15, 23, 42, .95));
  border-color: #ffcc00;
  box-shadow: 0 0 25px rgba(255, 204, 0, .35);
}

.alert-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.alert-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: .15rem;
}

.alert-headline {
  font-size: .95rem;
  font-weight: 900;
  letter-spacing: .04em;
}

.broadcast-alert-banner.escape .alert-headline { color: #34d399; }
.broadcast-alert-banner.leader .alert-headline { color: #ffcc00; }

.alert-detail {
  font-size: .75rem;
  color: #cbd5e1;
}

.alert-dismiss {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: .2rem .4rem;
}

.alert-dismiss:hover { color: #f8fafc; }

.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all .35s ease;
}

.alert-slide-enter-from {
  opacity: 0;
  transform: translateY(-16px);
}

.alert-slide-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .5rem 1rem;
  background: rgba(15, 23, 42, .9);
  border: 1px solid #334155;
  border-radius: .5rem;
  font-size: .72rem;
  font-weight: 800;
  font-family: inherit;
  color: #f8fafc;
  cursor: pointer;
  transition: all .2s ease;
}

.live-indicator:hover {
  border-color: #ffcc00;
  background: rgba(30, 41, 59, .95);
}

.refreshing-spin {
  display: inline-block;
  animation: spin 1s linear infinite;
  color: #ffcc00;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pulsing-dot {
  width: .75rem;
  height: .75rem;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(.9); opacity: .7; }
  100% { transform: scale(1.3); opacity: 1; }
}

.btn-play {
  padding: .35rem .75rem;
  background: #ffcc00;
  color: #0f172a;
  text-decoration: none;
  border-radius: .3rem;
  font-weight: 900;
  font-size: .72rem;
}

.btn-play:hover { background: #fde047; }

.stats-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: .8rem;
}

.stat-box {
  padding: .85rem;
  border-radius: .7rem;
  background: rgba(15, 23, 42, .85);
  border: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
}

.stat-box small {
  font-size: .58rem;
  font-weight: 800;
  letter-spacing: .08em;
  color: #94a3b8;
}

.stat-box strong {
  font-size: 1.5rem;
  font-weight: 900;
  color: #f8fafc;
  line-height: 1.2;
}

.stat-box span {
  font-size: .55rem;
  color: #64748b;
}

.text-green { color: #10b981 !important; }
.text-yellow { color: #ffcc00 !important; }
.text-blue { color: #38bdf8 !important; }

.filter-strip {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: .6rem;
  font-size: .75rem;
  font-weight: 800;
}

.filter-group label {
  color: #ffcc00;
}

.filter-group select {
  padding: .5rem .8rem;
  background: #1e293b;
  border: 1px solid #475569;
  color: #f8fafc;
  border-radius: .4rem;
  font-family: inherit;
  font-size: .75rem;
  outline: none;
}

.filter-group select:focus {
  border-color: #ffcc00;
}

/* Top 3 Podium */
.podium-section {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 1rem;
  align-items: end;
  margin-bottom: 2rem;
  max-width: 55rem;
  align-self: center;
  width: 100%;
}

.podium-card {
  padding: 1.2rem;
  border-radius: 1rem;
  text-align: center;
  background: rgba(15, 23, 42, .95);
  border: 2px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.podium-card.gold {
  border-color: #ffcc00;
  background: linear-gradient(180deg, rgba(255, 204, 0, .15), rgba(15, 23, 42, .95));
  transform: translateY(-12px);
  box-shadow: 0 0 35px rgba(255, 204, 0, .3);
}

.podium-card.silver {
  border-color: #94a3b8;
  background: linear-gradient(180deg, rgba(148, 163, 184, .15), rgba(15, 23, 42, .95));
}

.podium-card.bronze {
  border-color: #d97706;
  background: linear-gradient(180deg, rgba(217, 119, 6, .15), rgba(15, 23, 42, .95));
}

.podium-crown {
  font-size: 2rem;
  line-height: 1;
  margin-bottom: .2rem;
}

.podium-medal {
  font-size: .75rem;
  font-weight: 900;
  letter-spacing: .08em;
  margin-bottom: .4rem;
}

.gold .podium-medal { color: #ffcc00; }
.silver .podium-medal { color: #e2e8f0; }
.bronze .podium-medal { color: #f59e0b; }

.podium-name {
  font-size: 1.1rem;
  color: #f8fafc;
}

.podium-code {
  font-size: .65rem;
  color: #ffcc00;
  margin-bottom: .2rem;
}

.podium-dept {
  font-size: .62rem;
  color: #94a3b8;
  margin-bottom: .6rem;
}

.podium-score {
  font-size: 1.6rem;
  font-weight: 900;
  color: #4ade80;
  line-height: 1;
}

.podium-time {
  font-size: .65rem;
  color: #94a3b8;
  margin-top: .3rem;
}

/* Table */
.table-container {
  overflow-x: auto;
  border: 1px solid #334155;
  border-radius: .85rem;
  background: rgba(15, 23, 42, .9);
  margin-bottom: 2rem;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: .82rem;
}

.leaderboard-table th {
  padding: .9rem 1rem;
  background: #1e293b;
  color: #ffcc00;
  font-size: .68rem;
  letter-spacing: .08em;
  border-bottom: 2px solid #334155;
}

.leaderboard-table td {
  padding: .85rem 1rem;
  border-bottom: 1px solid #1e293b;
}

.leaderboard-table tr:hover {
  background: rgba(255, 204, 0, .05);
}

.rank-badge {
  display: inline-block;
  padding: .2rem .5rem;
  border-radius: .3rem;
  font-weight: 900;
  font-size: .75rem;
  background: #334155;
  color: #f8fafc;
}

.rank-1 { background: #ffcc00; color: #0f172a; }
.rank-2 { background: #94a3b8; color: #0f172a; }
.rank-3 { background: #d97706; color: #ffffff; }

.agent-fullname {
  display: block;
  color: #f8fafc;
  font-weight: 800;
}

.agent-subcode {
  font-size: .65rem;
  color: #94a3b8;
}

.sector-indicator {
  padding: .15rem .45rem;
  border-radius: .25rem;
  font-size: .68rem;
  font-weight: 800;
}

.sec-1 { background: rgba(245, 158, 11, .2); color: #fbbf24; }
.sec-2 { background: rgba(6, 182, 212, .2); color: #38bdf8; }
.sec-3 { background: rgba(239, 68, 68, .2); color: #f87171; }

.status-escaped {
  padding: .2rem .6rem;
  background: rgba(16, 185, 129, .2);
  border: 1px solid #10b981;
  color: #34d399;
  border-radius: 999px;
  font-weight: 900;
  font-size: .68rem;
}

.status-active {
  color: #94a3b8;
  font-size: .7rem;
}

.empty-state {
  text-align: center;
  padding: 3rem !important;
  color: #94a3b8;
}

/* Ticker Bar */
.news-ticker-bar {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .75rem 1rem;
  background: #d40511;
  color: white;
  border-radius: .5rem;
  font-size: .72rem;
  font-weight: 900;
  overflow: hidden;
}

.ticker-label {
  background: #ffcc00;
  color: #0f172a;
  padding: .2rem .5rem;
  border-radius: .25rem;
  white-space: nowrap;
}

.ticker-content {
  white-space: nowrap;
  animation: ticker-slide 25s linear infinite;
}

@keyframes ticker-slide {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.leaderboard-legal-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: .75rem;
  font-size: .7rem;
  color: #64748b;
}

.leaderboard-legal-footer a {
  color: #94a3b8;
  text-decoration: none;
  font-weight: 700;
  transition: color .2s;
}

.leaderboard-legal-footer a:hover {
  color: #ffcc00;
  text-decoration: underline;
}

@media (max-width: 900px) {
  .podium-section {
    grid-template-columns: 1fr;
    max-width: 22rem;
  }
  .podium-card.gold {
    order: -1;
    transform: none;
  }
}
</style>

