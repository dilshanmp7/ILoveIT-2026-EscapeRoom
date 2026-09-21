<script setup lang="ts">
import type { EventStats, LeaderboardEntry } from '#shared/game/types'
import { CPH_DEPARTMENTS, CPH_SHIFTS } from '#shared/game/questions-data'
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
const autoRefreshSeconds = ref(5)
let refreshTimer: ReturnType<typeof setInterval> | undefined

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
    entries.value = data.leaderboard
    stats.value = data.stats
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
  fetchLeaderboard()
  refreshTimer = setInterval(() => {
    fetchLeaderboard()
  }, 5000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
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
            <p class="subtitle">LIVE ESCAPE ROOM OPERATIONS LEADERBOARD • 200 AGENT CHALLENGE</p>
          </div>
        </div>

        <!-- Live Refresh Status -->
        <div class="live-indicator">
          <span class="pulsing-dot" />
          <span>LIVE BROADCAST (5S AUTO-REFRESH)</span>
          <NuxtLink to="/" class="btn-play">Play Game ➔</NuxtLink>
        </div>
      </div>

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

