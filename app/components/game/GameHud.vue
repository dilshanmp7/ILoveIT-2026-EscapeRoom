<script setup lang="ts">
import type { PathNodeState } from '#shared/game/types'

interface HudState {
  score: number
  runningTime: number
  timeRemaining?: number
  isTimedOut?: boolean
  currentLevel: 1 | 2 | 3
  levelTitle: string
  solvedCountInLevel: number
  totalInLevel: number
  totalSolved: number
  hintsUsed: number
  nearbyLabel: string
  holding: string
  holdingConfigured: boolean
  canGrab: boolean
  canUse: boolean
  userCode: string
  playerName: string
  playerDepartment: string
  playerShift: string
  currentObjectiveLabel?: string
  currentObjectiveDistance?: number
  currentObjectiveId?: string
  pathNodes?: PathNodeState[]
  mapModalOpen?: boolean
}

defineProps<{ state: HudState }>()
defineEmits<{
  openBriefing: []
  openMap: []
  grab: []
  action: []
}>()

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}
</script>

<template>
  <header class="hud">
    <!-- Top Left: Mission & Sector Status -->
    <div class="mission-brief">
      <div class="brand-badge">
        <span class="dhl-logo">DHL</span>
        <span class="hub-label">CPH HUB / I LOVE IT 2026</span>
      </div>

      <div class="level-card" :class="'level-' + state.currentLevel">
        <div class="level-header">
          <span class="level-pill">SECTOR {{ state.currentLevel }} / 3</span>
          <span class="progress-ratio">{{ state.solvedCountInLevel }} / {{ state.totalInLevel }} SOLVED</span>
        </div>
        <div class="level-title">{{ state.levelTitle }}</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${(state.solvedCountInLevel / state.totalInLevel) * 100}%` }" />
        </div>

        <!-- Escape Path Roadmap Sequence Stepper -->
        <div v-if="state.pathNodes && state.pathNodes.length > 0" class="escape-roadmap" aria-label="Sector Escape Route">
          <div class="roadmap-header">
            <span class="roadmap-title">ROUTE SEQUENCE</span>
            <button type="button" class="btn-quick-map" @click="$emit('openMap')" title="Toggle 2D Sector Blueprint (M)">
              🗺️ MAP <kbd>M</kbd>
            </button>
          </div>
          <div class="roadmap-track">
            <div
              v-for="(node, idx) in state.pathNodes"
              :key="node.id"
              class="roadmap-step"
              :class="{
                'is-solved': node.solved,
                'is-current': node.isCurrent,
                'is-key': node.isKey,
                'is-gate': node.isGate,
                'is-upcoming': !node.solved && !node.isCurrent
              }"
              :title="`${node.isGate ? 'Exit Gate: ' : (node.isKey ? 'Security Key: ' : 'Station ' + (node.step < 10 ? '0' + node.step : node.step) + ': ')}${node.label}`"
            >
              <div class="step-badge">
                <span v-if="node.solved" class="badge-icon">✔</span>
                <span v-else-if="node.isCurrent" class="badge-icon">🎯</span>
                <span v-else-if="node.isKey" class="badge-icon">🔑</span>
                <span v-else-if="node.isGate" class="badge-icon">🚪</span>
                <span v-else class="badge-icon">{{ node.step }}</span>
              </div>
              <span class="step-label">{{ node.shortLabel }}</span>
              <span v-if="idx < state.pathNodes.length - 1" class="step-arrow" :class="{ 'arrow-passed': node.solved }">➔</span>
            </div>
          </div>
        </div>

        <!-- Active Escape Objective Guidance Tracker -->
        <div v-if="state.currentObjectiveLabel" class="objective-tracker" :class="{ 'objective-unlocked': state.solvedCountInLevel >= state.totalInLevel }">
          <span class="tracker-icon">{{ state.solvedCountInLevel >= state.totalInLevel ? (state.holding ? '🚪' : '🔑') : '📍' }}</span>
          <div class="tracker-info">
            <span class="tracker-tag">
              {{ state.solvedCountInLevel >= state.totalInLevel ? (state.holding ? 'SWIPE KEY AT GATE' : 'PICK UP ACTIVATED KEY') : `NEXT OBJECTIVE (${state.solvedCountInLevel + 1}/${state.totalInLevel})` }}
            </span>
            <div class="tracker-name">
              <span>{{ state.currentObjectiveLabel }}</span>
              <strong v-if="state.currentObjectiveDistance !== undefined" class="tracker-dist">[{{ state.currentObjectiveDistance.toFixed(1) }}m ➔]</strong>
            </div>
          </div>
        </div>

        <div class="level-directive">
          <span class="directive-icon">⚡</span>
          <span class="directive-text">
            <template v-if="state.currentLevel === 1">DIRECTIVE: Recalibrate 5 AURA AI Nodes to unlock Gate 1</template>
            <template v-else-if="state.currentLevel === 2">DIRECTIVE: Synchronize 5 CPH App Nodes (GUS, ServiceNow, Power Automate) to breach Gate 2</template>
            <template v-else>DIRECTIVE: Enforce 5 Multi-Factor Cyber Protocols to unlock Master Dispatch Hatch</template>
          </span>
        </div>

        <div class="card-btn-row">
          <button type="button" class="btn-briefing" @click="$emit('openBriefing')">
            📜 INTEL BRIEFING
          </button>
          <button type="button" class="btn-map" @click="$emit('openMap')">
            🗺️ ESCAPE PATH (M)
          </button>
        </div>
      </div>

      <div class="agent-tag" v-if="state.playerName">
        <span class="agent-code">{{ state.userCode || 'AGENT' }}</span>
        <span class="agent-name">{{ state.playerName }}</span>
        <span class="agent-meta">{{ state.playerDepartment }} • {{ state.playerShift }}</span>
      </div>
    </div>

    <!-- Top Right: SLA Clock, Score & Hints -->
    <div class="metrics-stack">
      <div class="metrics-panel">
        <div class="metric timer-metric" :class="{ 'time-critical': (state.timeRemaining ?? Math.max(0, 300 - state.runningTime)) <= 60 }">
          <span class="metric-icon">⏱</span>
          <div class="metric-text">
            <small>REMAINING</small>
            <strong class="timer-countdown">{{ formatTime(state.timeRemaining ?? Math.max(0, 300 - state.runningTime)) }}</strong>
          </div>
        </div>

        <div class="metric score-metric">
          <span class="metric-icon">★</span>
          <div class="metric-text">
            <small>POINTS</small>
            <strong>{{ state.score }}</strong>
          </div>
        </div>

        <div class="metric hints-metric">
          <span class="metric-icon">💡</span>
          <div class="metric-text">
            <small>HINTS USED</small>
            <strong :class="{ 'hints-warn': state.hintsUsed > 0 }">{{ state.hintsUsed }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Center Prompt: Interactive Terminal Prompt -->
    <div
      v-if="state.nearbyLabel"
      class="interaction-hint interactive-banner"
      role="button"
      tabindex="0"
      @click="$emit(state.canGrab ? 'grab' : 'action')"
      @keydown.enter.prevent="$emit(state.canGrab ? 'grab' : 'action')"
      @keydown.space.prevent="$emit(state.canGrab ? 'grab' : 'action')"
    >
      <span class="key-badge">
        {{ state.canGrab ? 'CLICK / SPACE / E (PICK UP)' : 'CLICK / SPACE / E (ACCESS)' }}
      </span>
      <span>{{ state.nearbyLabel }}</span>
    </div>

    <div v-if="state.holding" class="holding-pill">
      🪪 Holding: {{ state.holding }}
      <small style="opacity: 0.75; font-size: 0.75rem; margin-left: 0.4rem;">[SPACE / E to Drop or Swipe]</small>
    </div>
  </header>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.2rem;
  pointer-events: none;
  font-family: 'Courier New', monospace;
}

.mission-brief,
.metrics-stack {
  pointer-events: auto;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .4rem;
  font-weight: 900;
  font-size: .68rem;
  letter-spacing: .08em;
}

.dhl-logo {
  padding: .15rem .45rem;
  background: #ffcc00;
  color: #d40511;
  font-weight: 900;
  border-radius: .25rem;
}

.hub-label {
  color: #cbd5e1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, .8);
}

.level-card {
  width: min(100%, 22rem);
  padding: .75rem;
  border-radius: .85rem;
  background: rgba(15, 23, 42, .92);
  box-shadow: 0 16px 32px rgba(2, 6, 23, .45);
  backdrop-filter: blur(10px);
  border: 2px solid;
}

.level-1 { border-color: #f59e0b; }
.level-2 { border-color: #06b6d4; }
.level-3 { border-color: #ef4444; }

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .3rem;
}

.level-pill {
  font-size: .62rem;
  font-weight: 900;
  letter-spacing: .08em;
  padding: .15rem .4rem;
  border-radius: .3rem;
  background: rgba(255, 255, 255, .1);
}

.level-1 .level-pill { color: #fbbf24; }
.level-2 .level-pill { color: #38bdf8; }
.level-3 .level-pill { color: #f87171; }

.progress-ratio {
  font-size: .65rem;
  font-weight: 800;
  color: #f8fafc;
}

.level-title {
  font-size: .78rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: .5rem;
}

.progress-bar-bg {
  width: 100%;
  height: .4rem;
  background: rgba(255, 255, 255, .15);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width .3s ease;
}

.level-1 .progress-bar-fill { background: linear-gradient(90deg, #f59e0b, #ffcc00); }
.level-2 .progress-bar-fill { background: linear-gradient(90deg, #0284c7, #38bdf8); }
.level-3 .progress-bar-fill { background: linear-gradient(90deg, #b91c1c, #ef4444); }

.objective-tracker {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-top: .5rem;
  padding: .4rem .55rem;
  background: rgba(15, 23, 42, .85);
  border: 1px solid #ffcc00;
  border-radius: .45rem;
  box-shadow: 0 0 12px rgba(255, 204, 0, .2);
}

.objective-unlocked {
  border-color: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, .3);
}

.tracker-icon {
  font-size: .95rem;
  animation: pulse 1s infinite alternate;
}

.tracker-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tracker-tag {
  font-size: .56rem;
  font-weight: 800;
  color: #ffcc00;
  letter-spacing: .05em;
}

.objective-unlocked .tracker-tag {
  color: #10b981;
}

.tracker-name {
  font-size: .65rem;
  font-weight: 800;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: .3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tracker-dist {
  color: #38bdf8;
  font-weight: 900;
}

.level-directive {
  display: flex;
  align-items: center;
  gap: .4rem;
  margin-top: .5rem;
  padding: .35rem .5rem;
  background: rgba(0, 0, 0, .4);
  border-radius: .4rem;
  font-size: .62rem;
  font-weight: 800;
  color: #ffcc00;
}

.directive-icon {
  animation: pulse 1s infinite alternate;
}

.escape-roadmap {
  margin-top: .5rem;
  padding: .4rem .5rem;
  background: rgba(2, 6, 23, .85);
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: .5rem;
}

.roadmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .35rem;
}

.roadmap-title {
  font-size: .55rem;
  font-weight: 900;
  letter-spacing: .08em;
  color: #94a3b8;
}

.btn-quick-map {
  padding: .15rem .4rem;
  background: rgba(56, 189, 248, .15);
  border: 1px solid rgba(56, 189, 248, .4);
  border-radius: .25rem;
  color: #38bdf8;
  font-family: inherit;
  font-size: .55rem;
  font-weight: 800;
  cursor: pointer;
  transition: all .2s ease;
  display: inline-flex;
  align-items: center;
  gap: .2rem;
}

.btn-quick-map:hover {
  background: #38bdf8;
  color: #0f172a;
}

.btn-quick-map kbd {
  background: rgba(15, 23, 42, .8);
  padding: 0 .25rem;
  border-radius: .2rem;
  font-size: .52rem;
  border: 1px solid rgba(56, 189, 248, .4);
}

.roadmap-track {
  display: flex;
  align-items: center;
  gap: .3rem;
  overflow-x: auto;
  padding: .15rem 0 .35rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 204, 0, 0.4) rgba(15, 23, 42, 0.6);
}

.roadmap-track::-webkit-scrollbar {
  height: 4px;
}

.roadmap-track::-webkit-scrollbar-thumb {
  background: rgba(255, 204, 0, 0.4);
  border-radius: 4px;
}

.roadmap-step {
  display: flex;
  align-items: center;
  gap: .2rem;
  flex-shrink: 0;
}

.step-badge {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .6rem;
  font-weight: 900;
  flex-shrink: 0;
  transition: all .3s ease;
}

.is-solved .step-badge {
  background: #065f46;
  color: #34d399;
  border: 1.5px solid #10b981;
}

.is-current .step-badge {
  background: #ffcc00;
  color: #0f172a;
  border: 2px solid #ffffff;
  box-shadow: 0 0 10px rgba(255, 204, 0, .8);
  animation: pulse-step-badge 1.2s infinite alternate;
}

.is-upcoming .step-badge {
  background: #1e293b;
  color: #64748b;
  border: 1px solid #334155;
}

.is-key .step-badge {
  background: #78350f;
  color: #fbbf24;
  border: 1px solid #f59e0b;
}

.is-key.is-current .step-badge {
  background: #ffcc00;
  color: #0f172a;
  border: 2px solid #ffffff;
  box-shadow: 0 0 12px rgba(255, 204, 0, .9);
}

.is-key.is-solved .step-badge {
  background: #065f46;
  color: #34d399;
  border: 1.5px solid #10b981;
}

.is-gate .step-badge {
  background: #312e81;
  color: #a5b4fc;
  border: 1px solid #6366f1;
}

.is-gate.is-current .step-badge,
.is-gate.is-solved .step-badge {
  background: #10b981;
  color: #ffffff;
  border: 2px solid #34d399;
  box-shadow: 0 0 12px rgba(16, 185, 129, .9);
}

.step-label {
  font-size: .5rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 2.5rem;
}

.is-solved .step-label { color: #10b981; }
.is-current .step-label { color: #ffcc00; font-weight: 900; }
.is-upcoming .step-label { color: #64748b; }
.is-gate .step-label { color: #a5b4fc; }

.step-arrow {
  font-size: .52rem;
  color: #475569;
  margin-left: .1rem;
  flex-shrink: 0;
}

.arrow-passed {
  color: #10b981;
}

@keyframes pulse-step-badge {
  0% { transform: scale(1); box-shadow: 0 0 4px rgba(255, 204, 0, .5); }
  100% { transform: scale(1.15); box-shadow: 0 0 14px rgba(255, 204, 0, 1); }
}

.card-btn-row {
  display: flex;
  gap: .4rem;
  margin-top: .5rem;
}

.btn-briefing {
  flex: 1;
  padding: .35rem .45rem;
  background: rgba(255, 204, 0, .12);
  border: 1px solid rgba(255, 204, 0, .4);
  border-radius: .35rem;
  color: #ffcc00;
  font-family: inherit;
  font-size: .6rem;
  font-weight: 900;
  letter-spacing: .04em;
  cursor: pointer;
  transition: all .2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-briefing:hover {
  background: #ffcc00;
  color: #0f172a;
}

.btn-map {
  flex: 1;
  padding: .35rem .45rem;
  background: rgba(56, 189, 248, .15);
  border: 1px solid rgba(56, 189, 248, .5);
  border-radius: .35rem;
  color: #38bdf8;
  font-family: inherit;
  font-size: .6rem;
  font-weight: 900;
  letter-spacing: .04em;
  cursor: pointer;
  transition: all .2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-map:hover {
  background: #38bdf8;
  color: #0f172a;
}

.agent-tag {
  display: flex;
  flex-direction: column;
  gap: .15rem;
  margin-top: .4rem;
  padding: .35rem .6rem;
  background: rgba(15, 23, 42, .8);
  border-radius: .5rem;
  border-left: 3px solid #ffcc00;
  font-size: .62rem;
  color: #cbd5e1;
}

.agent-code {
  color: #ffcc00;
  font-weight: 900;
  letter-spacing: .06em;
}

.agent-name {
  color: #f8fafc;
  font-weight: 800;
}

.agent-meta {
  color: #94a3b8;
  font-size: .55rem;
}

.metrics-panel {
  display: flex;
  gap: .5rem;
  padding: .6rem .8rem;
  border: 2px solid rgba(250, 204, 21, .5);
  border-radius: 1rem;
  background: rgba(15, 23, 42, .92);
  box-shadow: 0 16px 32px rgba(2, 6, 23, .45);
  backdrop-filter: blur(12px);
}

.metric {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: 0 .6rem;
}

.metric:not(:last-child) {
  border-right: 1px solid #334155;
}

.metric-icon {
  font-size: 1.3rem;
  color: #ffcc00;
}

.score-metric .metric-icon { color: #4ade80; }
.hints-metric .metric-icon { color: #f59e0b; }

.metric-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.metric-text small {
  color: #94a3b8;
  font-size: .54rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.metric-text strong {
  color: #f8fafc;
  font-size: 1.25rem;
  line-height: 1;
}

.score-metric strong { color: #4ade80; }
.hints-warn { color: #f97316 !important; }

.timer-metric.time-critical .metric-icon {
  color: #ef4444;
  animation: pulse-critical 0.8s infinite alternate;
}

.timer-metric.time-critical strong {
  color: #ef4444 !important;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
  animation: pulse-critical 0.8s infinite alternate;
}

@keyframes pulse-critical {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0.75; transform: scale(1.06); }
}

.interaction-hint {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 7.5rem;
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .75rem 1.4rem;
  border: 2px solid #d40511;
  border-radius: 999px;
  background: #ffcc00;
  color: #0f172a;
  font-size: .75rem;
  font-weight: 900;
  letter-spacing: .05em;
  box-shadow: 0 12px 28px rgba(0, 0, 0, .5);
  animation: float-hint 1.5s infinite ease-in-out;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.interaction-hint:hover {
  background: #fde047;
  box-shadow: 0 14px 32px rgba(234, 179, 8, 0.4);
}

.interaction-hint:active {
  transform: translate(-50%, 2px) scale(0.97);
}

.key-badge {
  padding: .15rem .45rem;
  background: #0f172a;
  color: #ffcc00;
  border-radius: .3rem;
  font-size: .68rem;
}

.holding-pill {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 6.5rem;
  padding: .4rem .9rem;
  border: 1px solid #475569;
  border-radius: 999px;
  background: rgba(15, 23, 42, .9);
  color: #ffcc00;
  font-size: .68rem;
}

@keyframes float-hint {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -6px); }
}

@media (max-width: 800px) {
  .hud {
    padding: .65rem;
  }
  .level-card {
    width: 14rem;
    padding: .5rem;
  }
  .level-title {
    font-size: .68rem;
    margin-bottom: .3rem;
  }
  .agent-tag {
    display: none;
  }
  .metrics-panel {
    padding: .4rem .5rem;
  }
  .metric {
    padding: 0 .35rem;
    gap: .3rem;
  }
  .metric-icon {
    font-size: 1rem;
  }
  .metric-text strong {
    font-size: .95rem;
  }
  .metric-text small {
    display: none;
  }
}
</style>
