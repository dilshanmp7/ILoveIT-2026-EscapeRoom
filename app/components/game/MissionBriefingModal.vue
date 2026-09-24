<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  open: boolean
  level: 1 | 2 | 3
  solvedCount: number
  totalInLevel: number
}>()

const emit = defineEmits<{
  close: []
}>()

function handleKey(e: KeyboardEvent) {
  if (!props.open) return
  if (
    e.key === 'Enter' ||
    e.key === ' ' ||
    e.key === 'Escape' ||
    e.code === 'Space' ||
    e.code === 'Enter' ||
    e.code === 'Escape'
  ) {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey, true)
})
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <section class="briefing-card" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
      <!-- Header -->
      <div class="briefing-header" :class="'level-' + level">
        <div class="header-left">
          <div class="top-row">
            <span class="incident-badge">🚨 PRIORITY INCIDENT DISPATCH</span>
            <span class="hub-tag">CPH HUB / I LOVE IT DAY 2026</span>
          </div>
          <h2 id="briefing-title" class="title">
            <template v-if="level === 1">SECTOR 1: ROGUE AURA GEN-AI LOCKDOWN</template>
            <template v-else-if="level === 2">SECTOR 2: CPH APPLICATIONS COMMAND DESYNC</template>
            <template v-else>SECTOR 3: CYBER SECURITY VAULT CONTAINMENT</template>
          </h2>
        </div>
        <button type="button" class="btn-close" aria-label="Close briefing" @click="emit('close')">×</button>
      </div>

      <!-- Body Content -->
      <div class="briefing-body">
        <!-- Status Ribbon -->
        <div class="status-ribbon" :class="'level-' + level">
          <div class="ribbon-item">
            <span class="ribbon-lbl">SECTOR STATUS:</span>
            <strong class="ribbon-val alert-blink">
              <template v-if="level === 1">AMBER ALERT // BULKHEAD GATE 1 LOCKED</template>
              <template v-else-if="level === 2">CYAN ALERT // FIREWALL GATE 2 SEALED</template>
              <template v-else>RED ALERT // MASTER DISPATCH HATCH ENGAGED</template>
            </strong>
          </div>
          <div class="ribbon-item">
            <span class="ribbon-lbl">RECALIBRATION PROGRESS:</span>
            <strong class="ribbon-val">{{ solvedCount }} / {{ totalInLevel }} PROTOCOLS VERIFIED</strong>
          </div>
        </div>

        <!-- Tactical Operating Instructions (Top of Section for Immediate Visibility) -->
        <div class="intel-block guidance-block">
          <h3>🕹️ TACTICAL OPERATING INSTRUCTIONS</h3>
          <div class="controls-grid">
            <div class="control-item">
              <span class="key">WASD / ARROWS</span>
              <small>Navigate using keyboard or mobile joystick</small>
            </div>
            <div class="control-item">
              <span class="key">SPACE / E</span>
              <small>Access glowing AI terminals</small>
            </div>
            <div class="control-item">
              <span class="key">SHIFT</span>
              <small>Dash for rapid repositioning</small>
            </div>
            <div class="control-item">
              <span class="key">💡 HINTS</span>
              <small>Available with a 50% score penalty</small>
            </div>
            <div class="control-item">
              <span class="key">⏱️ SPEED BONUS</span>
              <small>+1 PT per second remaining on clock</small>
            </div>
          </div>
        </div>

        <!-- Narrative Section: Sector 1 Specific -->
        <div v-if="level === 1" class="plot-section">
          <div class="intel-block">
            <h3>⚠️ SITUATION REPORT (PROJECT A.U.R.A. COLLAPSE)</h3>
            <p>
              At 02:40 AM during the night sort shift, an unverified prompt was submitted to
              <strong>A.U.R.A.</strong> (Automated Unified Routing & Analytics), Copenhagen Hub's experimental
              Generative AI dispatch assistant.
            </p>
            <p>
              AURA detected external data privacy risks, hallucinated critical flight schedules, and engaged
              emergency facility containment—<strong>slamming the Sector 1 Security Gate shut</strong> and freezing all sorting belts.
            </p>
          </div>

          <div class="intel-block highlight-block">
            <h3>🎯 ESCAPE ROOM DIRECTIVE</h3>
            <p>
              Outbound night cargo flights to Leipzig and Brussels are on a strict <strong>15-minute SLA emergency countdown</strong>.
              AURA's safety firewall will only disengage the gate if you prove <strong>Human-in-the-Loop mastery</strong> across 5 diagnostic nodes:
            </p>
            <ul class="intel-list">
              <li>
                <strong>Audit Rogue AI Prompts:</strong> Understand prompt structures, context, roles, and constraints.
              </li>
              <li>
                <strong>Enforce Data Leakage Protection:</strong> Prevent confidential DHL shipment details and customer phone numbers from leaking into public AI tools.
              </li>
              <li>
                <strong>Catch Hallucinations:</strong> Intercept unverified model outputs and verify facts with IT Department standards.
              </li>
              <li>
                <strong>Restore Human Accountability:</strong> Validate AI recommendations before final dispatch actions.
              </li>
            </ul>
          </div>
        </div>

        <!-- Narrative Section: Sector 2 Specific -->
        <div v-else-if="level === 2" class="plot-section">
          <div class="intel-block">
            <h3>📦 SECTOR 2 INTEL: CPH APPLICATIONS COMMAND</h3>
            <p>
              With AURA stabilized, you have breached Sector 2. However, the hub's operational software network
              has desynchronized! Critical applications—<strong>GUS Butterfly Blue, ServiceNow, Power Automate, My Talent World, CAFE Customs, and NetScan</strong>—require verification.
            </p>
            <p>
              Solve 5 application routing protocols to synchronize the facility and unlock Sector 2 Firewall Gate! Check your HUD roadmap or press M for the path map.
            </p>
          </div>
        </div>

        <!-- Narrative Section: Sector 3 Specific -->
        <div v-else class="plot-section">
          <div class="intel-block">
            <h3>🛡️ SECTOR 3 INTEL: CYBER SECURITY VAULT</h3>
            <p>
              You have entered the inner security sanctum. Neutralize phishing threats across 5 defensive checkpoints, enforce Multi-Factor Authentication (MFA),
              uphold Clean Desk policies, and unlock the final <strong>Master Dispatch Hatch</strong> to escape!
            </p>
          </div>
        </div>
      </div>

      <!-- Footer CTA -->
      <div class="briefing-footer">
        <button type="button" class="btn-proceed" @click="emit('close')">
          COMMENCE ESCAPE SHIFT ➔ <span class="btn-hint">[SPACE / ENTER / ESC]</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.88);
  backdrop-filter: blur(10px);
  animation: fadeIn 0.25s ease;
  font-family: 'Courier New', monospace;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.briefing-card {
  width: min(100%, 42rem);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #090e17;
  border-radius: 1rem;
  border: 2px solid #ffcc00;
  box-shadow: 0 0 60px rgba(255, 204, 0, 0.25), 0 25px 50px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.briefing-header {
  padding: 1.2rem 1.6rem;
  background: #0f172a;
  border-bottom: 2px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.briefing-header.level-1 { border-color: #f59e0b; }
.briefing-header.level-2 { border-color: #06b6d4; }
.briefing-header.level-3 { border-color: #ef4444; }

.top-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.35rem;
}

.incident-badge {
  padding: 0.2rem 0.55rem;
  background: #d40511;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  border-radius: 0.3rem;
}

.hub-tag {
  color: #ffcc00;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
  color: #f8fafc;
  letter-spacing: 0.04em;
}

.btn-close {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  width: 2rem;
  height: 2rem;
  border-radius: 0.4rem;
  font-size: 1.3rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  border-color: #ffcc00;
  color: #ffcc00;
}

.briefing-body {
  padding: 1.4rem 1.6rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  color: #cbd5e1;
  line-height: 1.55;
  font-size: 0.88rem;
}

.status-ribbon {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border-radius: 0.5rem;
  border-left: 4px solid #ffcc00;
}

.status-ribbon.level-1 { border-left-color: #f59e0b; }
.status-ribbon.level-2 { border-left-color: #06b6d4; }
.status-ribbon.level-3 { border-left-color: #ef4444; }

.ribbon-item {
  display: flex;
  flex-direction: column;
}

.ribbon-lbl {
  font-size: 0.65rem;
  color: #94a3b8;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.ribbon-val {
  font-size: 0.82rem;
  color: #ffcc00;
  font-weight: 900;
}

.alert-blink {
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.plot-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.intel-block h3 {
  margin: 0 0 0.4rem;
  font-size: 0.88rem;
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: 0.05em;
}

.intel-block p {
  margin: 0 0 0.6rem;
}

.highlight-block {
  padding: 1rem;
  background: rgba(255, 204, 0, 0.06);
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 204, 0, 0.2);
}

.intel-list {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.intel-list li strong {
  color: #f8fafc;
}

.guidance-block {
  padding: 0.8rem 1rem;
  background: #0f172a;
  border-radius: 0.6rem;
  border: 1px solid #1e293b;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.control-item {
  display: flex;
  flex-direction: column;
  background: #1e293b;
  padding: 0.45rem 0.6rem;
  border-radius: 0.4rem;
}

.control-item .key {
  font-weight: 900;
  color: #ffcc00;
  font-size: 0.75rem;
}

.control-item small {
  color: #94a3b8;
  font-size: 0.68rem;
  line-height: 1.3;
}

.briefing-footer {
  padding: 1rem 1.6rem;
  background: #0f172a;
  border-top: 1px solid #1e293b;
  display: flex;
  justify-content: flex-end;
}

.btn-proceed {
  padding: 0.75rem 1.6rem;
  background: #ffcc00;
  color: #0f172a;
  border: none;
  border-radius: 0.4rem;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(255, 204, 0, 0.35);
  transition: all 0.2s ease;
}

.btn-proceed:hover {
  background: #fde047;
  transform: translateY(-1px);
}
</style>

