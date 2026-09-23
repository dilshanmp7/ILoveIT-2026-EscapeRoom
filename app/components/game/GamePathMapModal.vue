<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { PathNodeState } from '#shared/game/types'

const props = defineProps<{
  open: boolean
  level: 1 | 2 | 3
  nodes: PathNodeState[]
  playerPos: { x: number; z: number }
}>()

const emit = defineEmits<{
  close: []
}>()

// Keyboard escape to close
function handleKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M' || e.code === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})

// Bounding box for mapping 3D coordinates to 2D SVG
const sectorBounds = computed(() => {
  if (props.level === 1) return { minX: -16.5, maxX: -4.0, minZ: -6.5, maxZ: 6.5 }
  if (props.level === 2) return { minX: -5.5, maxX: 5.5, minZ: -6.5, maxZ: 6.5 }
  return { minX: 4.5, maxX: 16.5, minZ: -6.5, maxZ: 6.5 }
})

function toSvgX(x: number) {
  const b = sectorBounds.value
  const clamped = Math.max(b.minX, Math.min(b.maxX, x))
  return 40 + ((clamped - b.minX) / (b.maxX - b.minX)) * 520
}

function toSvgY(z: number) {
  const b = sectorBounds.value
  const clamped = Math.max(b.minZ, Math.min(b.maxZ, z))
  return 40 + ((clamped - b.minZ) / (b.maxZ - b.minZ)) * 400
}

const activeNode = computed(() => props.nodes.find((n) => n.isCurrent) || null)

const SECTOR_OBSTACLES: Record<1 | 2 | 3, { id: string; label: string; x: number; z: number }[]> = {
  1: [
    { id: 'obs_l1_1', label: 'Pylon 01', x: -12.5, z: 0.0 },
    { id: 'obs_l1_2', label: 'Capacitor', x: -9.0, z: -2.2 },
    { id: 'obs_l1_3', label: 'Substation', x: -10.2, z: 2.5 },
  ],
  2: [
    { id: 'obs_l2_1', label: 'Relay 01', x: -2.2, z: 1.5 },
    { id: 'obs_l2_2', label: 'Barrier Post', x: -1.8, z: -2.2 },
    { id: 'obs_l2_3', label: 'Buffer Pod', x: 1.8, z: -1.5 },
  ],
  3: [
    { id: 'obs_l3_1', label: 'Sentinel', x: 7.5, z: 0.0 },
    { id: 'obs_l3_2', label: 'Monolith', x: 9.8, z: 2.2 },
    { id: 'obs_l3_3', label: 'Quarantine', x: 11.5, z: -2.0 },
  ],
}

const currentObstacles = computed(() => SECTOR_OBSTACLES[props.level] || [])
</script>

<template>
  <div v-if="open" class="map-backdrop" @click.self="emit('close')">
    <section class="map-dialog" role="dialog" aria-modal="true" aria-labelledby="map-title">
      <!-- Header -->
      <header class="map-header" :class="'level-' + level">
        <div class="header-titles">
          <div class="header-badge">
            <span class="dhl-tag">DHL</span>
            <span class="badge-title">🗺️ TACTICAL ESCAPE PATH BLUEPRINT</span>
          </div>
          <h2 id="map-title" class="map-headline">
            SECTOR {{ level }}: ESCAPE SEQUENCE BLUEPRINT
          </h2>
          <p class="map-subtitle">
            Follow the sequential path: <strong>Station 01 ➔ ... ➔ 05 ➔ Clearance Key ➔ Exit Gate</strong>
          </p>
        </div>
        <button type="button" class="btn-close" aria-label="Close Map" @click="emit('close')">×</button>
      </header>

      <!-- Main Layout -->
      <div class="map-content">
        <!-- Left: 2D Schematic SVG Blueprint -->
        <div class="blueprint-panel">
          <div class="blueprint-meta">
            <span class="live-tag">● LIVE RADAR</span>
            <span class="sector-tag">SECTOR {{ level }} DISPATCH FLOOR</span>
          </div>

          <svg class="blueprint-svg" viewBox="0 0 600 480" preserveAspectRatio="xMidYMid meet">
            <defs>
              <!-- Glowing Filters -->
              <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <!-- Grid Pattern -->
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.4)" stroke-width="1" />
              </pattern>
            </defs>

            <!-- Background Floor Grid -->
            <rect x="20" y="20" width="560" height="440" fill="#080e1a" stroke="#334155" stroke-width="2" rx="12" />
            <rect x="20" y="20" width="560" height="440" fill="url(#grid)" />

            <!-- Connecting Sequence Runway Lines -->
            <g class="path-connections">
              <template v-for="(node, i) in nodes.slice(0, -1)" :key="'line-' + node.id">
                <line
                  :x1="toSvgX(node.x)"
                  :y1="toSvgY(node.z)"
                  :x2="toSvgX(nodes[i + 1]!.x)"
                  :y2="toSvgY(nodes[i + 1]!.z)"
                  :stroke="node.solved ? '#10b981' : (node.isCurrent ? '#ffcc00' : '#334155')"
                  :stroke-width="node.isCurrent ? 4 : (node.solved ? 3 : 2)"
                  :stroke-dasharray="node.isCurrent ? '8 4' : (node.solved ? 'none' : '4 4')"
                  :class="{ 'animated-active-line': node.isCurrent }" />
              </template>
            </g>

            <!-- Station Nodes -->
            <g v-for="node in nodes" :key="'node-' + node.id" class="node-marker" :class="{ 'node-active': node.isCurrent, 'node-solved': node.solved }">
              <!-- Concentric pulse for current objective -->
              <circle
                v-if="node.isCurrent"
                :cx="toSvgX(node.x)"
                :cy="toSvgY(node.z)"
                r="26"
                fill="none"
                stroke="#ffcc00"
                stroke-width="2"
                class="radar-ring" />

              <!-- Node Body Circle -->
              <circle
                :cx="toSvgX(node.x)"
                :cy="toSvgY(node.z)"
                :r="node.isGate ? 20 : (node.isKey ? 17 : 18)"
                :fill="node.solved ? '#065f46' : (node.isCurrent ? '#92400e' : '#1e293b')"
                :stroke="node.solved ? '#10b981' : (node.isCurrent ? '#ffcc00' : '#64748b')"
                :stroke-width="node.isCurrent ? 3 : 2"
                :filter="node.isCurrent ? 'url(#glow-gold)' : (node.solved ? 'url(#glow-green)' : undefined)" />

              <!-- Node Icon / Step Number -->
              <text
                :x="toSvgX(node.x)"
                :y="toSvgY(node.z) + 5"
                text-anchor="middle"
                :fill="node.solved ? '#34d399' : (node.isCurrent ? '#ffcc00' : '#94a3b8')"
                font-family="monospace"
                font-weight="900"
                font-size="12">
                {{ node.isGate ? '🚪' : (node.isKey ? '🔑' : (node.solved ? '✔' : (node.step < 10 ? '0' + node.step : node.step))) }}
              </text>

              <!-- Node Label Below Circle -->
              <text
                :x="toSvgX(node.x)"
                :y="toSvgY(node.z) + 32"
                text-anchor="middle"
                :fill="node.isCurrent ? '#ffcc00' : (node.solved ? '#e2e8f0' : '#94a3b8')"
                font-family="monospace"
                font-weight="800"
                font-size="10">
                {{ node.shortLabel }}
              </text>
            </g>

            <!-- Tactical Obstacles (Physical Navigation Barriers) -->
            <g v-for="obs in currentObstacles" :key="'obs-' + obs.id" class="obstacle-marker">
              <rect
                :x="toSvgX(obs.x) - 10"
                :y="toSvgY(obs.z) - 10"
                width="20"
                height="20"
                rx="4"
                fill="#1e1b4b"
                :stroke="level === 1 ? '#f59e0b' : (level === 2 ? '#06b6d4' : '#ef4444')"
                stroke-width="1.8"
                stroke-dasharray="3 2" />
              <text
                :x="toSvgX(obs.x)"
                :y="toSvgY(obs.z) + 4"
                text-anchor="middle"
                :fill="level === 1 ? '#f59e0b' : (level === 2 ? '#06b6d4' : '#ef4444')"
                font-family="monospace"
                font-weight="900"
                font-size="10">
                ⚠️
              </text>
              <text
                :x="toSvgX(obs.x)"
                :y="toSvgY(obs.z) + 20"
                text-anchor="middle"
                fill="#cbd5e1"
                font-family="monospace"
                font-weight="700"
                font-size="8">
                {{ obs.label }}
              </text>
            </g>

            <!-- Player Marker -->
            <g class="player-marker">
              <circle
                :cx="toSvgX(playerPos.x)"
                :cy="toSvgY(playerPos.z)"
                r="10"
                fill="#0284c7"
                stroke="#38bdf8"
                stroke-width="2" />
              <circle
                :cx="toSvgX(playerPos.x)"
                :cy="toSvgY(playerPos.z)"
                r="16"
                fill="none"
                stroke="#38bdf8"
                stroke-width="1.5"
                class="radar-ring-player" />
              <text
                :x="toSvgX(playerPos.x)"
                :y="toSvgY(playerPos.z) - 14"
                text-anchor="middle"
                fill="#38bdf8"
                font-family="monospace"
                font-weight="900"
                font-size="10">
                👤 YOU
              </text>
            </g>
          </svg>
        </div>

        <!-- Right: Sequential Checklist & Status -->
        <div class="checklist-panel">
          <div class="checklist-card">
            <h3 class="checklist-title">🎯 ESCAPE PATH OBJECTIVES</h3>
            <p class="checklist-desc">
              Solve each diagnostic workstation in order to stabilize Sector {{ level }} and unlock the bulkhead exit.
            </p>

            <ul class="step-list">
              <li
                v-for="node in nodes"
                :key="'list-' + node.id"
                class="step-item"
                :class="{
                  'step-item-solved': node.solved,
                  'step-item-active': node.isCurrent,
                  'step-item-locked': !node.solved && !node.isCurrent,
                }">
                <div class="step-num-badge">
                  {{ node.isGate ? '🚪' : (node.solved ? '✔' : (node.step < 10 ? '0' + node.step : node.step)) }}
                </div>
                <div class="step-details">
                  <div class="step-header-row">
                    <strong class="step-title">{{ node.label }}</strong>
                    <span class="step-status-pill">
                      <template v-if="node.solved">SOLVED</template>
                      <template v-else-if="node.isCurrent">ACTIVE ➔</template>
                      <template v-else>LOCKED</template>
                    </span>
                  </div>
                  <small class="step-sub">
                    <template v-if="node.solved">Verified & Calibrated</template>
                    <template v-else-if="node.isCurrent">Follow radar or floating holographic badge</template>
                    <template v-else>Unlocks in sequence</template>
                  </small>
                </div>
              </li>
            </ul>

            <div class="tactical-tips">
              <span class="tip-icon">💡</span>
              <div class="tip-text">
                <strong>TACTICAL HINT:</strong>
                <p>
                  Look for the pulsing yellow ground circle and the hovering holographic badge over your active objective.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="map-footer">
        <span class="hotkey-tip">Press <kbd>M</kbd> or <kbd>ESC</kbd> to close map • ⚠️ Slalom around physical hazard barriers</span>
        <button type="button" class="btn-resume" @click="emit('close')">
          RESUME ESCAPE RUN ➔
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.map-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  background: rgba(3, 7, 18, 0.88);
  backdrop-filter: blur(12px);
  animation: fadeIn 0.2s ease;
  font-family: 'Courier New', monospace;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.map-dialog {
  width: min(100%, 58rem);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: #090e17;
  border: 2px solid #ffcc00;
  border-radius: 1rem;
  box-shadow: 0 0 50px rgba(255, 204, 0, 0.2), 0 25px 50px rgba(0, 0, 0, 0.95);
  overflow: hidden;
}

.map-header {
  padding: 1rem 1.4rem;
  background: #0f172a;
  border-bottom: 2px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.map-header.level-1 { border-color: #f59e0b; }
.map-header.level-2 { border-color: #06b6d4; }
.map-header.level-3 { border-color: #ef4444; }

.header-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
  font-size: 0.7rem;
  font-weight: 800;
}

.dhl-tag {
  padding: 0.15rem 0.45rem;
  background: #ffcc00;
  color: #d40511;
  font-weight: 900;
  border-radius: 0.25rem;
}

.badge-title {
  color: #ffcc00;
  letter-spacing: 0.06em;
}

.map-headline {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
  color: #f8fafc;
}

.map-subtitle {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  color: #cbd5e1;
}

.map-subtitle strong {
  color: #38bdf8;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.2rem;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #ffcc00;
}

.map-content {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1rem;
  padding: 1.2rem;
  overflow-y: auto;
}

@media (max-width: 860px) {
  .map-content {
    grid-template-columns: 1fr;
  }
}

.blueprint-panel {
  display: flex;
  flex-direction: column;
  background: #020617;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  padding: 0.8rem;
}

.blueprint-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
  font-size: 0.65rem;
  font-weight: 800;
}

.live-tag {
  color: #10b981;
  letter-spacing: 0.05em;
  animation: pulse 1.5s infinite alternate;
}

.sector-tag {
  color: #94a3b8;
}

.blueprint-svg {
  width: 100%;
  height: auto;
  aspect-ratio: 600 / 480;
  display: block;
}

.radar-ring {
  animation: radarPulse 1.8s infinite ease-out;
  transform-origin: center;
}

.radar-ring-player {
  animation: radarPulse 1.4s infinite ease-out;
}

@keyframes radarPulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.animated-active-line {
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to { stroke-dashoffset: -12; }
}

.checklist-panel {
  display: flex;
  flex-direction: column;
}

.checklist-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a1120;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  padding: 1rem;
}

.checklist-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: 0.06em;
}

.checklist-desc {
  margin: 0.35rem 0 0.8rem;
  font-size: 0.68rem;
  color: #94a3b8;
  line-height: 1.4;
}

.step-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #1e293b;
  background: #020617;
  transition: all 0.2s ease;
}

.step-item-solved {
  border-color: #065f46;
  background: rgba(6, 78, 59, 0.2);
}

.step-item-active {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
}

.step-item-locked {
  opacity: 0.65;
}

.step-num-badge {
  width: 1.8rem;
  height: 1.8rem;
  display: grid;
  place-items: center;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  font-weight: 900;
  background: #1e293b;
  color: #cbd5e1;
}

.step-item-solved .step-num-badge {
  background: #10b981;
  color: #022c22;
}

.step-item-active .step-num-badge {
  background: #ffcc00;
  color: #451a03;
  animation: pulse 1s infinite alternate;
}

.step-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.step-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}

.step-title {
  font-size: 0.68rem;
  font-weight: 800;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-item-solved .step-title {
  color: #a7f3d0;
}

.step-item-active .step-title {
  color: #fde047;
}

.step-status-pill {
  font-size: 0.55rem;
  font-weight: 900;
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  letter-spacing: 0.05em;
  background: #1e293b;
  color: #94a3b8;
}

.step-item-solved .step-status-pill {
  background: #065f46;
  color: #6ee7b7;
}

.step-item-active .step-status-pill {
  background: #f59e0b;
  color: #451a03;
}

.step-sub {
  font-size: 0.58rem;
  color: #64748b;
  margin-top: 0.1rem;
}

.step-item-active .step-sub {
  color: #cbd5e1;
}

.tactical-tips {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.8rem;
  padding: 0.55rem 0.75rem;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #334155;
  border-radius: 0.5rem;
}

.tip-icon {
  font-size: 1rem;
}

.tip-text {
  font-size: 0.62rem;
  color: #cbd5e1;
  line-height: 1.4;
}

.tip-text strong {
  color: #ffcc00;
  display: block;
  margin-bottom: 0.15rem;
}

.tip-text p {
  margin: 0;
}

.map-footer {
  padding: 0.8rem 1.4rem;
  background: #0b1329;
  border-top: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.hotkey-tip {
  font-size: 0.65rem;
  color: #94a3b8;
}

.hotkey-tip kbd {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  color: #ffcc00;
  font-weight: 800;
}

.btn-resume {
  padding: 0.55rem 1.2rem;
  background: #ffcc00;
  color: #0f172a;
  border: none;
  border-radius: 0.45rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-resume:hover {
  background: #f59e0b;
  transform: translateY(-1px);
}
</style>

