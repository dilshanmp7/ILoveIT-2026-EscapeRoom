<script setup lang="ts">
interface HudState {
  score: number
  runningTime: number
  nearbyLabel: string
  holding: string
  holdingConfigured: boolean
  canGrab: boolean
  canUse: boolean
}

defineProps<{ state: HudState }>()
const emit = defineEmits<{ editor: [] }>()

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
</script>

<template>
  <header class="hud">
    <div class="orders">
      <!-- 
        <span class="eyebrow"><span class="clipboard-icon">▣</span> Active IT Dispatch Tickets</span>
      <div class="order-card">
        <span class="order-icon">▣</span>
        <span><strong>New Hire Setup</strong><small>Configured Laptop required</small></span>
        <b>+150 pts</b>
      </div>-->
    </div>
    <div class="status-stack">
      <div class="metrics">
        <div class="metric timer"><span class="metric-icon">◷</span><span><small>SLA Time</small><strong>{{
          formatTime(state.runningTime) }}</strong></span></div>
        <div class="metric score-metric"><span class="metric-icon">★</span><span><small>Performance
              Rating</small><strong>{{ state.score }}</strong></span></div>

      </div>

    </div>
    <div v-if="state.nearbyLabel" class="interaction-hint">[ E / SPACE ] {{ state.nearbyLabel }}</div>
    <div v-if="state.holding" class="holding-pill">Holding: {{ state.holding }}</div>
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
  padding: 1.25rem;
  pointer-events: none;
  font-family: 'Courier New', monospace;
}

.orders,
.metrics {
  pointer-events: auto;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: .4rem;
  margin-bottom: .55rem;
  color: #facc15;
  font-size: .62rem;
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
  text-shadow: 0 2px 4px #020617;
}

.clipboard-icon {
  font-size: .9rem;
}

.order-card {
  display: flex;
  align-items: center;
  gap: .7rem;
  padding: .65rem .75rem;
  border: 1px solid rgba(234, 179, 8, .5);
  border-radius: .85rem;
  background: rgba(15, 23, 42, .9);
  box-shadow: 0 12px 28px rgba(2, 6, 23, .25);
  color: #f8fafc;
  font-size: .75rem;
}

.order-card small,
.order-card strong {
  display: block;
}

.order-card strong {
  font-size: .7rem;
  color: #facc15;
}

.order-card small {
  margin-top: .2rem;
  color: #94a3b8;
  font-size: .58rem;
  font-weight: 700;
}

.order-card b {
  margin-left: auto;
  border-radius: 999px;
  padding: .15rem .45rem;
  background: rgba(16, 185, 129, .2);
  color: #4ade80;
  font-size: .62rem;
  white-space: nowrap;
}

.order-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(250, 204, 21, .3);
  border-radius: .65rem;
  color: #facc15;
  background: rgba(250, 204, 21, .12);
}

.status-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: .5rem;
}

.metrics {
  display: flex;
  align-items: stretch;
  gap: .55rem;
  padding: .7rem;
  border: 2px solid rgba(234, 179, 8, .45);
  border-radius: 1rem;
  background: rgba(15, 23, 42, .9);
  box-shadow: 0 16px 32px rgba(2, 6, 23, .35);
  backdrop-filter: blur(12px);
}

.metric {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: 0 .7rem;
  border-right: 1px solid #334155;
}

.metric-icon {
  font-size: 1.5rem;
  color: #facc15;
}

.score-metric .metric-icon {
  color: #ef4444;
}

.metric small,
.metric strong {
  display: block;
  text-align: right;
}

.metric small {
  color: #94a3b8;
  font-size: .56rem;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}

.metric strong {
  margin-top: .1rem;
  color: #facc15;
  font-size: 1.35rem;
  line-height: 1;
}

.score-metric strong {
  color: #4ade80;
}

.network-button,
.editor-button {
  display: flex;
  align-items: center;
  gap: .5rem;
  border: 1px solid #475569;
  border-radius: .65rem;
  padding: .5rem .65rem;
  background: rgba(30, 41, 59, .9);
  color: #dbeafe;
  cursor: pointer;
  font: inherit;
  font-size: .62rem;
}

.network-button strong,
.network-button small {
  display: block;
  text-align: left;
}

.network-button small {
  margin-top: .15rem;
  color: #94a3b8;
  font-size: .52rem;
}

.network-dot {
  width: .7rem;
  height: .7rem;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 .2rem rgba(16, 185, 129, .12);
}

.editor-button {
  border-color: rgba(96, 165, 250, .55);
  background: rgba(30, 64, 175, .8);
  color: #dbeafe;
  font-weight: 800;
  white-space: nowrap;
}

.editor-icon {
  color: #facc15;
  font-size: 1rem;
}

.players-pill {
  display: flex;
  align-items: center;
  gap: .45rem;
  border: 1px solid #334155;
  border-radius: 999px;
  padding: .25rem .75rem;
  background: rgba(15, 23, 42, .8);
  color: #cbd5e1;
  font-size: .62rem;
  font-weight: 800;
}

.players-pill span {
  color: #ef4444;
}

.interaction-hint,
.holding-pill {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 7rem;
  padding: .65rem 1rem;
  border: 2px solid #dc2626;
  border-radius: 999px;
  background: #facc15;
  color: #0f172a;
  font-size: .7rem;
  font-weight: 900;
  letter-spacing: .05em;
  box-shadow: 0 12px 24px rgba(2, 6, 23, .35);
}

.holding-pill {
  top: 7rem;
  bottom: auto;
  border: 1px solid #475569;
  border-radius: 999px;
  background: rgba(15, 23, 42, .9);
  color: #facc15;
}

@media (max-width: 900px) {
  .hud {
    padding: .7rem;
  }

  .metrics {
    gap: .3rem;
  }

  .orders {
    max-width: 58%;
  }

  .order-card b,
  .editor-button {
    display: none;
  }

  .metric {
    min-width: 4rem;
    padding: .4rem;
  }

  .metric strong {
    font-size: .9rem;
  }

  .interaction-hint {
    bottom: 8.2rem;
  }
}

@media (max-width: 620px) {
  .hud {
    padding: .65rem;
  }

  .orders {
    max-width: 56%;
  }

  .order-card {
    padding: .45rem;
  }

  .order-card b,
  .order-card small {
    display: none;
  }

  .eyebrow {
    font-size: .5rem;
  }

  .status-stack {
    max-width: 44%;
  }

  .metrics {
    border-width: 1px;
  }

  .metric-icon {
    font-size: 1rem;
  }

  .metric small {
    display: none;
  }

  .metric strong {
    font-size: .85rem;
  }

  .players-pill {
    font-size: .5rem;
  }
}
</style>
