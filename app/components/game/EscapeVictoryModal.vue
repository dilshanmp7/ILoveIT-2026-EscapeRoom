<script setup lang="ts">
const props = defineProps<{
  open: boolean
  score: number
  runningTime: number
  hintsUsed: number
  totalSolved: number
  userCode: string
  playerName: string
  playerDepartment: string
  playerShift: string
  isTimedOut?: boolean
}>()

const emit = defineEmits<{
  leaderboard: []
  home: []
}>()

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

function getRatingBadge(score: number, seconds: number, isTimedOut?: boolean) {
  if (isTimedOut) return '⏱️ EMERGENCY OPERATION LOGGED (TIMEOUT)'
  if (score >= 2000 && seconds <= 240) return '🏆 CPH HUB CYBER ELITE (GRANDMASTER)'
  if (score >= 1500) return '⭐ MASTER DISPATCH ESCAPER'
  if (score >= 1000) return '⚡ RAPID-RESPONSE IT OPERATOR'
  return '🛡️ CPH HUB CERTIFIED ESCAPER'
}
</script>

<template>
  <div v-if="open" class="victory-backdrop">
    <div class="victory-modal" role="dialog" aria-modal="true" aria-labelledby="victory-title">
      <!-- Confetti Streamers Simulation -->
      <div v-if="!isTimedOut" class="confetti-layer" aria-hidden="true">
        <span v-for="i in 16" :key="i" class="confetti-piece" :style="{ '--i': i }" />
      </div>

      <div class="victory-header">
        <span class="dhl-tag" :class="{ 'tag-timeout': isTimedOut }">
          {{ isTimedOut ? 'MISSION TIMED OUT (5:00 EXPIRED)' : 'CPH HUB DISPATCH RESTORED' }}
        </span>
        <h1 id="victory-title" :class="{ 'title-timeout': isTimedOut }">
          {{ isTimedOut ? 'EMERGENCY LOCKDOWN' : 'FACILITY ESCAPED!' }}
        </h1>
        <p class="mission-sub">
          {{ isTimedOut
            ? 'The 5-minute operational limit has expired. Containment sealed, final points registered.'
            : 'Night-Flight Operations Unlocked. All 3 Sectors Successfully Cleared.'
          }}
        </p>
      </div>

      <div class="badge-banner" :class="{ 'badge-timeout': isTimedOut }">
        {{ getRatingBadge(score, runningTime, isTimedOut) }}
      </div>

      <div class="score-summary">
        <div class="score-card main-score">
          <small>FINAL SCORE</small>
          <strong>{{ score }}</strong>
          <span>POINTS</span>
        </div>

        <div class="score-card">
          <small>TOTAL TIME</small>
          <strong>{{ formatTime(runningTime) }}</strong>
          <span>{{ isTimedOut ? '5-MIN WINDOW EXPIRED' : 'MINUTES : SECONDS' }}</span>
        </div>

        <div class="score-card">
          <small>CHALLENGES SOLVED</small>
          <strong>{{ totalSolved }} / 15</strong>
          <span>5 PER SECTOR</span>
        </div>

        <div class="score-card">
          <small>HINTS USED</small>
          <strong :class="{ warn: hintsUsed > 0 }">{{ hintsUsed }}</strong>
          <span>TACTICAL TIPS</span>
        </div>
      </div>

      <div class="agent-profile-box">
        <div>
          <span class="lbl">AGENT IDENTITY:</span>
          <strong>{{ playerName }} ({{ userCode }})</strong>
        </div>
        <div>
          <span class="lbl">ASSIGNED UNIT:</span>
          <span>{{ playerDepartment }} • {{ playerShift }}</span>
        </div>
      </div>

      <div class="victory-actions">
        <button type="button" class="btn-leaderboard" @click="emit('leaderboard')">
          View Live Event Leaderboard ➔
        </button>
        <button type="button" class="btn-home" @click="emit('home')">
          Return to Hub Login
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.victory-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, .92);
  backdrop-filter: blur(12px);
  font-family: 'Courier New', monospace;
}

.victory-modal {
  position: relative;
  width: min(100%, 42rem);
  padding: 2.2rem;
  border: 3px solid #ffcc00;
  border-radius: 1.25rem;
  background: #0f172a;
  box-shadow: 0 0 80px rgba(255, 204, 0, .35), 0 30px 80px rgba(0, 0, 0, .8);
  color: #f8fafc;
  text-align: center;
  overflow: hidden;
}

.confetti-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -20px;
  left: calc(var(--i) * 6.25%);
  width: 10px;
  height: 20px;
  background: #ffcc00;
  opacity: .85;
  border-radius: 2px;
  animation: fall 3s infinite linear;
  animation-delay: calc(var(--i) * 0.18s);
}

.confetti-piece:nth-child(2n) { background: #d40511; width: 8px; height: 16px; }
.confetti-piece:nth-child(3n) { background: #38bdf8; width: 12px; height: 12px; border-radius: 50%; }
.confetti-piece:nth-child(4n) { background: #10b981; }

@keyframes fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
}

.dhl-tag {
  display: inline-block;
  padding: .25rem .75rem;
  background: #d40511;
  color: #ffcc00;
  font-weight: 900;
  font-size: .68rem;
  letter-spacing: .12em;
  border-radius: .3rem;
  margin-bottom: .6rem;
}

h1 {
  margin: 0 0 .4rem;
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 900;
  letter-spacing: -.02em;
  color: #ffcc00;
  text-shadow: 0 4px 12px rgba(255, 204, 0, .3);
}

.mission-sub {
  margin: 0 auto 1.5rem;
  max-width: 32rem;
  color: #94a3b8;
  font-size: .88rem;
  line-height: 1.5;
}

.badge-banner {
  margin: 0 auto 1.8rem;
  padding: .65rem 1.2rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(234, 179, 8, .2), rgba(220, 38, 38, .2));
  border: 1px solid #facc15;
  color: #ffcc00;
  font-weight: 900;
  font-size: .82rem;
  letter-spacing: .08em;
  display: inline-block;
}

.title-timeout {
  color: #ef4444 !important;
  text-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
}

.tag-timeout {
  background: #ef4444 !important;
  color: #ffffff !important;
}

.badge-timeout {
  border-color: #ef4444 !important;
  color: #ef4444 !important;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.2)) !important;
}

.score-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: .8rem;
  margin-bottom: 1.6rem;
}

.score-card {
  padding: 1rem;
  border-radius: .85rem;
  background: rgba(30, 41, 59, .8);
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-card small {
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .08em;
  color: #94a3b8;
  margin-bottom: .3rem;
}

.score-card strong {
  font-size: 1.8rem;
  font-weight: 900;
  color: #f8fafc;
  line-height: 1;
}

.score-card span {
  font-size: .55rem;
  color: #64748b;
  margin-top: .3rem;
}

.score-card.main-score {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, .12);
}

.score-card.main-score strong {
  color: #ffcc00;
}

.warn { color: #f97316 !important; }

.agent-profile-box {
  display: flex;
  justify-content: space-around;
  padding: .85rem;
  border-radius: .65rem;
  background: rgba(15, 23, 42, .9);
  border: 1px solid #334155;
  margin-bottom: 1.8rem;
  font-size: .78rem;
  text-align: left;
}

.lbl {
  display: block;
  font-size: .6rem;
  color: #94a3b8;
  margin-bottom: .2rem;
}

.agent-profile-box strong {
  color: #ffcc00;
}

.victory-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-leaderboard {
  padding: .95rem 1.8rem;
  background: #ffcc00;
  color: #0f172a;
  border: none;
  border-radius: .5rem;
  font-family: inherit;
  font-weight: 900;
  font-size: .88rem;
  cursor: pointer;
  letter-spacing: .04em;
  transition: transform .15s;
}

.btn-leaderboard:hover {
  background: #fde047;
  transform: translateY(-2px);
}

.btn-home {
  padding: .95rem 1.5rem;
  background: #334155;
  color: #f8fafc;
  border: none;
  border-radius: .5rem;
  font-family: inherit;
  font-weight: 800;
  font-size: .88rem;
  cursor: pointer;
}

.btn-home:hover {
  background: #475569;
}

@media (max-width: 620px) {
  .score-summary {
    grid-template-columns: 1fr;
  }
  .agent-profile-box {
    flex-direction: column;
    gap: .6rem;
  }
  .victory-actions {
    flex-direction: column;
  }
}
</style>

