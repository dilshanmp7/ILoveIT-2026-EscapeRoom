<script setup lang="ts">
import type { FetchError } from 'ofetch'
import { CPH_DEPARTMENTS, CPH_SHIFTS, generateUserCode } from '#shared/game/questions-data'
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'

const route = useRoute()
const activeTab = ref<'register' | 'resume'>('register')
const isSubmitting = ref(false)
const errorMessage = ref('')
const isBlockedFromReplay = ref(false)

// Template refs for auto-focus
const firstNameRef = useTemplateRef<HTMLInputElement | null>('first-name')
const resumeCodeRef = useTemplateRef<HTMLInputElement | null>('resume-code')

// Registration fields
const firstName = ref('')
const lastName = ref('')
const selectedDepartment = ref(CPH_DEPARTMENTS[0] as string)
const selectedShift = ref(CPH_SHIFTS[1] as string) // Default: Day Shift

// Resume field
const resumeCode = ref('')

// Deterministic code preview for new registrations
const generatedUserCode = computed(() => {
  if (!firstName.value.trim() && !lastName.value.trim()) return ''
  return generateUserCode(
    firstName.value.trim() || 'Agent',
    lastName.value.trim() || 'CPH',
    selectedDepartment.value,
    selectedShift.value,
  )
})

useSeoMeta({
  title: 'DHL CPH Hub | I Love IT Day 2026 Escape Room',
  description: 'Register for the DHL CPH Hub I Love IT Day 3D Escape Room Challenge.',
})

async function handleRegisterAndEnter() {
  const fName = firstName.value.trim()
  const lName = lastName.value.trim()
  if (!fName || !lName || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''
  isBlockedFromReplay.value = false

  try {
    const code = generatedUserCode.value

    // Call server to establish or resume session and set access cookie
    await $fetch('/api/game/session', {
      method: 'POST',
      body: {
        firstName: fName,
        lastName: lName,
        department: selectedDepartment.value,
        shift: selectedShift.value,
        userCode: code,
      },
    })

    // Store locally for cross-session resumption on this device
    if (import.meta.client) {
      localStorage.setItem('cph_agent_code', code)
      localStorage.setItem('cph_first_name', fName)
      localStorage.setItem('cph_last_name', lName)
      localStorage.setItem('cph_dept', selectedDepartment.value)
      localStorage.setItem('cph_shift', selectedShift.value)
    }

    await navigateTo({
      path: '/game',
      query: {
        session: code,
        first: fName,
        last: lName,
        dept: selectedDepartment.value,
        shift: selectedShift.value,
      },
    })
  } catch (error) {
    const fetchErr = error as FetchError
    if (fetchErr.status === 403 || fetchErr.statusCode === 403) {
      isBlockedFromReplay.value = true
      errorMessage.value = fetchErr.data?.statusMessage || fetchErr.data?.message || 'Mission Complete: You have already completed your mission. Each agent is permitted only one operational run.'
    } else {
      isBlockedFromReplay.value = false
      errorMessage.value = fetchErr.data?.statusMessage || 'Failed to initialize escape room session. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

async function handleResumeWithCode() {
  const code = resumeCode.value.trim()
  if (!code || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''
  isBlockedFromReplay.value = false

  try {
    const response = await $fetch<{ session: any; isResumed: boolean }>('/api/game/session', {
      method: 'POST',
      body: {
        sessionKey: code,
      },
    })

    if (import.meta.client) {
      localStorage.setItem('cph_agent_code', code)
      if (response.session?.firstName) localStorage.setItem('cph_first_name', response.session.firstName)
      if (response.session?.lastName) localStorage.setItem('cph_last_name', response.session.lastName)
      if (response.session?.department) localStorage.setItem('cph_dept', response.session.department)
      if (response.session?.shift) localStorage.setItem('cph_shift', response.session.shift)
    }

    await navigateTo({
      path: '/game',
      query: {
        session: code,
        first: response.session?.firstName || '',
        last: response.session?.lastName || '',
        dept: response.session?.department || '',
        shift: response.session?.shift || '',
      },
    })
  } catch (error) {
    const fetchErr = error as FetchError
    if (fetchErr.status === 403 || fetchErr.statusCode === 403) {
      isBlockedFromReplay.value = true
      errorMessage.value = fetchErr.data?.statusMessage || fetchErr.data?.message || 'Mission Complete: You have already completed your mission. Each agent is permitted only one operational run.'
    } else {
      isBlockedFromReplay.value = false
      errorMessage.value = fetchErr.data?.statusMessage || `No active mission found for Agent Code "${code}". Please check your code or register as a new agent.`
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  // Check if session or code query is provided in URL
  const querySession = typeof route.query.session === 'string'
    ? route.query.session.trim()
    : typeof route.query.code === 'string'
      ? route.query.code.trim()
      : ''

  if (querySession) {
    activeTab.value = 'resume'
    resumeCode.value = querySession
    await nextTick()
    resumeCodeRef.value?.focus()
    return
  }

  // Restore saved registration or code from localStorage if available
  if (import.meta.client) {
    const savedCode = localStorage.getItem('cph_agent_code')
    const savedFirst = localStorage.getItem('cph_first_name')
    const savedLast = localStorage.getItem('cph_last_name')
    const savedDept = localStorage.getItem('cph_dept')
    const savedShift = localStorage.getItem('cph_shift')

    if (savedCode) {
      resumeCode.value = savedCode
    }
    if (savedFirst) firstName.value = savedFirst
    if (savedLast) lastName.value = savedLast
    if (savedDept && CPH_DEPARTMENTS.includes(savedDept as any)) selectedDepartment.value = savedDept
    if (savedShift && CPH_SHIFTS.includes(savedShift as any)) selectedShift.value = savedShift
  }

  await nextTick()
  if (activeTab.value === 'register') {
    firstNameRef.value?.focus()
  } else {
    resumeCodeRef.value?.focus()
  }
})
</script>

<template>
  <main class="access-page">
    <div class="access-grid" aria-hidden="true" />

    <section class="access-panel" aria-labelledby="access-title">
      <!-- Brand lockup -->
      <div class="brand-lockup">
        <span class="brand-mark">DHL</span>
        <span class="brand-rule" />
        <span class="brand-label">I LOVE IT / CPH HUB 2026</span>
      </div>

      <p class="eyebrow">🚨 RAPID-RESPONSE ESCAPE MISSION</p>
      <h1 id="access-title">The CPH Hub is in lockdown.</h1>
      <p class="lede">
        A rogue Generative AI prompt has locked down Sector 1 at CPH Hub.
        Sorting belts are frozen, and night-flight dispatch gates are sealed.
        Enter your agent details below to enter the 3D escape room and recalibrate the system!
      </p>

      <!-- Mode Switcher Tabs: Registration vs Resume -->
      <div class="mode-tabs" role="tablist" aria-label="Agent Entry Mode">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'register'"
          :class="['mode-tab', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'; errorMessage = ''; isBlockedFromReplay = false"
        >
          📋 New Agent Registration
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'resume'"
          :class="['mode-tab', { active: activeTab === 'resume' }]"
          @click="activeTab = 'resume'; errorMessage = ''; isBlockedFromReplay = false"
        >
          🔑 Resume with Agent Code
        </button>
      </div>

      <!-- Tab 1: Employee Registration Form -->
      <form v-if="activeTab === 'register'" class="registration-form" @submit.prevent="handleRegisterAndEnter">
        <div class="form-grid">
          <div class="field-group">
            <label for="first-name">FIRST NAME *</label>
            <input
              id="first-name"
              ref="first-name"
              v-model="firstName"
              type="text"
              autocomplete="given-name"
              placeholder="e.g. Thomas"
              required
              :disabled="isSubmitting"
              @input="errorMessage = ''; isBlockedFromReplay = false"
            >
          </div>

          <div class="field-group">
            <label for="last-name">LAST NAME *</label>
            <input
              id="last-name"
              v-model="lastName"
              type="text"
              autocomplete="family-name"
              placeholder="e.g. Jensen"
              required
              :disabled="isSubmitting"
              @input="errorMessage = ''; isBlockedFromReplay = false"
            >
          </div>

          <div class="field-group full-width">
            <label for="department">DEPARTMENT *</label>
            <select id="department" v-model="selectedDepartment" :disabled="isSubmitting" required>
              <option v-for="dept in CPH_DEPARTMENTS" :key="dept" :value="dept">{{ dept }}</option>
            </select>
          </div>

          <div class="field-group full-width">
            <label for="shift">WORK TIME / SHIFT *</label>
            <select id="shift" v-model="selectedShift" :disabled="isSubmitting" required>
              <option v-for="shift in CPH_SHIFTS" :key="shift" :value="shift">{{ shift }}</option>
            </select>
          </div>
        </div>

        <!-- Live Deterministic Agent Code Preview -->
        <div v-if="generatedUserCode" class="agent-code-preview">
          <span class="preview-lbl">ASSIGNED AGENT CODE:</span>
          <strong class="code-val">{{ generatedUserCode }}</strong>
          <small class="preview-hint">
            🛡️ Generated deterministically from your name and department. Save this code to resume your escape shift from your mobile phone or laptop anytime!
          </small>
        </div>

        <button
          type="submit"
          class="btn-enter"
          :disabled="!firstName.trim() || !lastName.trim() || isSubmitting"
        >
          {{ isSubmitting ? 'INITIALIZING AGENT...' : 'INITIALIZE AGENT & ENTER CPH HUB ➔' }}
        </button>

        <p class="privacy-notice-inline">
          🔒 Official DHL internal training game. Only name & department are used for leaderboard purposes. No data is shared outside DHL.
          <NuxtLink to="/privacy" class="inline-policy-link">Privacy Policy ➔</NuxtLink>
        </p>

        <div v-if="errorMessage" class="form-error-wrapper">
          <p class="form-error" role="alert">{{ errorMessage }}</p>
          <NuxtLink v-if="isBlockedFromReplay" to="/leaderboard" class="btn-error-leaderboard">
            🏆 View Event Leaderboard ➔
          </NuxtLink>
        </div>
      </form>

      <!-- Tab 2: Resume with Existing Agent Code -->
      <form v-else class="resume-form" @submit.prevent="handleResumeWithCode">
        <div class="resume-box">
          <label for="resume-code">YOUR AGENT CODE *</label>
          <div class="input-row">
            <input
              id="resume-code"
              ref="resume-code"
              v-model="resumeCode"
              type="text"
              autocomplete="off"
              placeholder="e.g. CPH-OPS-D-7A9B"
              required
              :disabled="isSubmitting"
              @input="errorMessage = ''; isBlockedFromReplay = false"
            >
            <button type="submit" :disabled="!resumeCode.trim() || isSubmitting">
              {{ isSubmitting ? 'CONNECTING...' : 'RESUME MISSION ➔' }}
            </button>
          </div>
        </div>

        <p class="resume-hint-block">
          💡 <strong>Switching between office laptop and mobile phone?</strong><br>
          Enter the Agent Code you received upon registration. Your current Sector checkpoint, accumulated points, and tactical hints will be restored immediately.
        </p>

        <div v-if="errorMessage" class="form-error-wrapper">
          <p class="form-error" role="alert">{{ errorMessage }}</p>
          <NuxtLink v-if="isBlockedFromReplay" to="/leaderboard" class="btn-error-leaderboard">
            🏆 View Event Leaderboard ➔
          </NuxtLink>
        </div>
      </form>

      <!-- Navigation & Policy Links -->
      <div class="bottom-links">
        <NuxtLink class="leaderboard-link" to="/leaderboard">
          📺 Live Big-Screen Leaderboard ➔
        </NuxtLink>
        <div class="footer-legal-links">
          <NuxtLink class="legal-link" to="/privacy">
            🛡️ Privacy Policy
          </NuxtLink>
          <span class="legal-sep">•</span>
          <NuxtLink class="legal-link" to="/contact">
            ✉️ Contact IT Support
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Aside: Facility Preview & Thriller Briefing -->
    <aside class="access-aside" aria-label="Facility mission briefing">
      <div class="aside-topline">
        <span>CPH HUB COPENHAGEN</span>
        <span class="live-dot">● NIGHT DISPATCH</span>
      </div>

      <div class="mission-infographic">
        <div class="sector-node sec-1">
          <span class="node-num">01</span>
          <div class="node-text">
            <strong>SECTOR 1: AURA AI CORE</strong>
            <small>Gen-AI Prompt Injection & Data Leak Override</small>
          </div>
        </div>

        <div class="connector-line" />

        <div class="sector-node sec-2">
          <span class="node-num">02</span>
          <div class="node-text">
            <strong>SECTOR 2: APPLICATIONS</strong>
            <small>GUS Blue, ServiceNow, Power Automate & UAT</small>
          </div>
        </div>

        <div class="connector-line" />

        <div class="sector-node sec-3">
          <span class="node-num">03</span>
          <div class="node-text">
            <strong>SECTOR 3: CYBER VAULT</strong>
            <small>Defense Protocols & Master Dispatch Hatch</small>
          </div>
        </div>
      </div>

      <div class="aside-footer">
        <p class="mission-quote">
          "3 progressive sectors. 30 IT challenges. Play on office laptop or mobile phone. Ready your rapid-response skills."
        </p>
        <NuxtLink to="/leaderboard" class="aside-board-btn">
          View Live Event Standings ➔
        </NuxtLink>
        <div class="aside-legal-links">
          <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
          <span class="aside-sep">•</span>
          <NuxtLink to="/contact">Contact IT</NuxtLink>
        </div>
      </div>
    </aside>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) {
  margin: 0;
  background: #090d16;
  color: #f8fafc;
  font-family: 'Courier New', monospace;
}

.access-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(340px, .75fr);
  position: relative;
  overflow: hidden;
  background: #090d16;
}

.access-grid {
  position: absolute;
  inset: 0;
  opacity: .12;
  background-image: linear-gradient(90deg, transparent 49%, #ffcc00 50%, transparent 51%), linear-gradient(#ffcc00 1px, transparent 1px);
  background-size: 6rem 6rem;
  mask-image: linear-gradient(90deg, #000, transparent 85%);
}

.access-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(2rem, 6vw, 6rem);
  max-width: 820px;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: .75rem;
  font-weight: 900;
  font-size: .78rem;
  color: #ffcc00;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.brand-mark {
  padding: .2rem .5rem;
  background: #ffcc00;
  color: #d40511;
  border-radius: .25rem;
  font-size: 1.1rem;
}

.brand-rule {
  width: 2rem;
  height: 2px;
  background: #d40511;
}

.brand-label { color: #94a3b8; }

.eyebrow {
  margin: 2.5rem 0 .5rem;
  font-size: .75rem;
  font-weight: 900;
  letter-spacing: .12em;
  color: #ef4444;
}

h1 {
  margin: 0 0 .8rem;
  font-size: clamp(2.2rem, 5.5vw, 4.2rem);
  line-height: .95;
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: -.02em;
}

.lede {
  margin: 0 0 2rem;
  color: #cbd5e1;
  font-size: 1.02rem;
  line-height: 1.55;
  max-width: 36rem;
}

/* Tab Switcher */
.mode-tabs {
  display: flex;
  gap: .5rem;
  margin-bottom: 1.5rem;
  max-width: 600px;
}

.mode-tab {
  flex: 1;
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: .5rem;
  padding: .75rem 1rem;
  font-size: .78rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: .04em;
  text-transform: uppercase;
  transition: all .15s ease;
}

.mode-tab:hover {
  background: #253349;
  color: #f8fafc;
}

.mode-tab.active {
  background: #ffcc00;
  color: #0f172a;
  border-color: #ffcc00;
  box-shadow: 0 0 15px rgba(255, 204, 0, .25);
}

/* Form Styles */
.registration-form,
.resume-form {
  max-width: 600px;
}

.resume-box {
  border-bottom: 2px solid #ffcc00;
  padding-bottom: .6rem;
}

.resume-box label {
  display: block;
  margin-bottom: .6rem;
  color: #ffcc00;
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .08em;
}

.input-row {
  display: flex;
  gap: .6rem;
}

input, select {
  border: 0;
  outline: 0;
  background: transparent;
  color: #f8fafc;
  font-family: inherit;
  font-size: 1rem;
}

input::placeholder { color: #475569; }

button {
  border: 0;
  padding: .85rem 1.4rem;
  background: #ffcc00;
  color: #0f172a;
  cursor: pointer;
  font-family: inherit;
  font-size: .78rem;
  font-weight: 900;
  text-transform: uppercase;
  border-radius: .4rem;
  letter-spacing: .05em;
  transition: all .15s ease;
}

button:hover:not(:disabled) {
  background: #fde047;
  transform: translateY(-1px);
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* Registration Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.2rem;
  margin-bottom: 1.4rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: .4rem;
}

.field-group.full-width {
  grid-column: span 2;
}

.field-group label {
  font-size: .68rem;
  font-weight: 800;
  color: #ffcc00;
  letter-spacing: .08em;
}

.field-group input,
.field-group select {
  width: 100%;
  padding: .75rem .9rem;
  border: 1px solid #334155;
  border-radius: .5rem;
  background: rgba(15, 23, 42, .85);
  font-size: .88rem;
}

.field-group input:focus,
.field-group select:focus {
  border-color: #ffcc00;
  background: #1e293b;
}

.agent-code-preview {
  padding: .9rem;
  border-radius: .6rem;
  background: rgba(255, 204, 0, .12);
  border: 1px solid #ffcc00;
  margin-bottom: 1.4rem;
}

.preview-lbl {
  display: block;
  font-size: .6rem;
  font-weight: 800;
  color: #94a3b8;
  margin-bottom: .2rem;
}

.code-val {
  font-size: 1.35rem;
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: .08em;
}

.preview-hint {
  display: block;
  font-size: .62rem;
  color: #cbd5e1;
  margin-top: .3rem;
  line-height: 1.4;
}

.resume-hint-block {
  margin-top: 1rem;
  font-size: .75rem;
  color: #94a3b8;
  line-height: 1.5;
  background: rgba(15, 23, 42, .6);
  padding: .85rem;
  border-radius: .5rem;
  border: 1px solid #1e293b;
}

.resume-hint-block strong {
  color: #cbd5e1;
}

.btn-enter {
  width: 100%;
  padding: 1.1rem;
  font-size: .95rem;
  letter-spacing: .06em;
}

.form-error {
  margin-top: .8rem;
  color: #f87171;
  font-size: .8rem;
  background: rgba(239, 68, 68, .12);
  border: 1px solid #ef4444;
  padding: .6rem .8rem;
  border-radius: .4rem;
}

.form-error-wrapper {
  margin-top: .8rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.form-error-wrapper .form-error {
  margin-top: 0;
}

.btn-error-leaderboard {
  align-self: flex-start;
  padding: .55rem 1rem;
  background: #ffcc00;
  color: #0f172a;
  border-radius: .4rem;
  font-weight: 800;
  font-size: .78rem;
  text-decoration: none;
  transition: transform .15s, background .15s;
}

.btn-error-leaderboard:hover {
  background: #fde047;
  transform: translateY(-1px);
}

.privacy-notice-inline {
  margin: .85rem 0 0;
  font-size: .68rem;
  color: #94a3b8;
  line-height: 1.45;
  background: rgba(15, 23, 42, .6);
  padding: .5rem .75rem;
  border-radius: .35rem;
  border-left: 2.5px solid #ffcc00;
}

.inline-policy-link {
  color: #ffcc00;
  text-decoration: underline;
  font-weight: 700;
  margin-left: .25rem;
}

.inline-policy-link:hover {
  color: #fde047;
}

.bottom-links {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid #1e293b;
}

.leaderboard-link {
  color: #ffcc00;
  text-decoration: none;
  font-size: .8rem;
  font-weight: 800;
}

.leaderboard-link:hover { text-decoration: underline; }

.footer-legal-links {
  display: flex;
  align-items: center;
  gap: .65rem;
  font-size: .72rem;
}

.legal-link {
  color: #94a3b8;
  text-decoration: none;
  font-weight: 700;
  transition: color .2s;
}

.legal-link:hover {
  color: #ffcc00;
  text-decoration: underline;
}

.legal-sep {
  color: #475569;
}

.aside-legal-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .65rem;
  font-size: .7rem;
  color: #64748b;
  margin-top: .4rem;
}

.aside-legal-links a {
  color: #94a3b8;
  text-decoration: none;
  font-weight: 700;
  transition: color .2s;
}

.aside-legal-links a:hover {
  color: #ffcc00;
  text-decoration: underline;
}

.aside-sep {
  color: #475569;
}

/* Aside Mission Graphic */
.access-aside {
  border-left: 1px solid #1e293b;
  background: #0f172a;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.aside-topline {
  display: flex;
  justify-content: space-between;
  font-size: .68rem;
  font-weight: 800;
  color: #64748b;
}

.live-dot { color: #10b981; }

.mission-infographic {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 3rem 0;
}

.sector-node {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem;
  border-radius: .85rem;
  border: 1px solid;
}

.sec-1 { border-color: #f59e0b; background: rgba(245, 158, 11, .08); }
.sec-2 { border-color: #06b6d4; background: rgba(6, 182, 212, .08); }
.sec-3 { border-color: #ef4444; background: rgba(239, 68, 68, .08); }

.node-num {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: .5rem;
  font-weight: 900;
  font-size: .95rem;
  background: rgba(255, 255, 255, .1);
}

.sec-1 .node-num { color: #fbbf24; }
.sec-2 .node-num { color: #38bdf8; }
.sec-3 .node-num { color: #f87171; }

.node-text strong {
  display: block;
  font-size: .82rem;
  color: #f8fafc;
}

.node-text small {
  font-size: .65rem;
  color: #94a3b8;
}

.connector-line {
  width: 2px;
  height: 1.5rem;
  background: #334155;
  margin-left: 2rem;
}

.aside-footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mission-quote {
  font-size: .8rem;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.aside-board-btn {
  display: inline-block;
  text-align: center;
  padding: .75rem;
  background: rgba(255, 204, 0, .15);
  border: 1px solid #ffcc00;
  color: #ffcc00;
  text-decoration: none;
  font-weight: 800;
  font-size: .75rem;
  border-radius: .4rem;
}

.aside-board-btn:hover {
  background: #ffcc00;
  color: #0f172a;
}

@media (max-width: 900px) {
  .access-page { grid-template-columns: 1fr; }
  .access-aside { display: none; }
  .form-grid { grid-template-columns: 1fr; }
  .field-group.full-width { grid-column: span 1; }
  .mode-tabs { flex-direction: column; }
}
</style>
