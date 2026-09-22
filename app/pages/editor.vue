<script setup lang="ts">
import FloorplanEditor from '~/components/game/FloorplanEditor.vue'
import QuizEditor from '~/components/game/QuizEditor.vue'

useSeoMeta({ title: 'DHL IT Courier | Floorplan Editor', robots: 'noindex' })

const {
  floorplan,
  playerSpawn,
  quizzes,
  loading,
  authenticated,
  password,
  authenticating,
  errorMessage,
  saving,
  activeEditor,
  floorplanEditorKey,
  clearingSessions,
  resetSuccessMessage,
  checkAccess,
  enterEditor,
  saveFloorplan,
  saveQuizzes,
  resetFloorplan,
  resetAllGameSessions,
} = useGameEditor()

function clearLocalBrowserSession() {
  if (import.meta.client) {
    localStorage.removeItem('cph_agent_code')
    localStorage.removeItem('cph_first_name')
    localStorage.removeItem('cph_last_name')
    localStorage.removeItem('cph_dept')
    localStorage.removeItem('cph_shift')
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('cph_snapshot_')) {
        localStorage.removeItem(key)
      }
    })
    resetSuccessMessage.value = '✅ Your local browser test session was cleared! You can test fresh registration.'
    setTimeout(() => {
      resetSuccessMessage.value = ''
    }, 5000)
  }
}

onMounted(checkAccess)
</script>

<template>
  <main class="editor-page">
    <section v-if="!authenticated && !loading" class="editor-login" aria-labelledby="editor-access-title">
      <p class="eyebrow">Restricted tools</p>
      <h1 id="editor-access-title">Floorplan editor</h1>
      <p>Enter the editor password to configure the dispatch floor.</p>
      <form @submit.prevent="enterEditor">
        <label for="editor-password">Editor password</label>
        <input id="editor-password" v-model="password" type="password" autocomplete="off" autofocus>
        <button type="submit" :disabled="authenticating || !password.trim()">{{ authenticating ? 'Checking...' :
          'Unlock editor' }}</button>
      </form>
      <p v-if="errorMessage" class="editor-error" role="alert">{{ errorMessage }}</p>
      <NuxtLink class="back-link" to="/">Back to access</NuxtLink>
    </section>
    <div v-else-if="loading" class="editor-status">LOADING FLOORPLAN FROM SQLITE...</div>
    <div v-else-if="errorMessage" class="editor-status error" role="alert">{{ errorMessage }}</div>
    <div v-else class="editor-workspace">
      <div v-if="resetSuccessMessage" class="reset-success-banner" role="status">
        {{ resetSuccessMessage }}
      </div>
      <FloorplanEditor v-if="activeEditor === 'map'" :key="floorplanEditorKey" :open="true" :initial-assets="floorplan"
        :initial-player-spawn="playerSpawn" @close="navigateTo('/game')" @deploy="saveFloorplan" @reset="resetFloorplan"
        @tab="activeEditor = $event" />
      <QuizEditor v-else :open="true" :initial-quizzes="quizzes" @close="navigateTo('/game')" @deploy="saveQuizzes"
        @tab="activeEditor = $event" />
      <nav class="editor-tabs" aria-label="Editor mode">
        <button type="button" :class="{ active: activeEditor === 'map' }" @click="activeEditor = 'map'">
          2D Floorplan Editor
        </button>
        <button type="button" :class="{ active: activeEditor === 'quiz' }" @click="activeEditor = 'quiz'">
          Security Check Editor
        </button>
        <button
          type="button"
          class="btn-clear-browser-session"
          title="Clear locally cached player code and save state on this browser"
          @click="clearLocalBrowserSession"
        >
          🔄 Clear My Browser Session
        </button>
        <button
          type="button"
          class="btn-reset-sessions"
          :disabled="clearingSessions"
          @click="resetAllGameSessions"
        >
          {{ clearingSessions ? 'Clearing Sessions...' : '🗑️ Reset All Game Sessions & Leaderboard' }}
        </button>
      </nav>
    </div>
    <div v-if="saving" class="saving-status">DEPLOYING...</div>
  </main>
</template>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: #020617;
  color: #f8fafc;
  font-family: 'Courier New', monospace;
}

.editor-status {
  display: grid;
  min-height: 100vh;
  place-items: center;
  color: #ffcc00;
  font-size: .75rem;
  letter-spacing: .12em;
}

.editor-status.error {
  color: #fca5a5;
}

.editor-login {
  width: min(28rem, calc(100% - 2rem));
  margin: 0 auto;
  padding-top: 18vh;
}

.eyebrow {
  color: #60a5fa;
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.editor-login h1 {
  margin: .5rem 0 1rem;
  font-family: Georgia, serif;
  font-weight: 400;
}

.editor-login p {
  color: #94a3b8;
  line-height: 1.5;
}

.editor-login form {
  display: grid;
  gap: .7rem;
  margin-top: 2rem;
}

.editor-login label {
  color: #bfdbfe;
  font-size: .7rem;
  text-transform: uppercase;
}

.editor-login input {
  border: 1px solid #475569;
  padding: .8rem;
  background: #0f172a;
  color: #f8fafc;
  font: inherit;
}

.editor-login button {
  border: 0;
  padding: .8rem;
  background: #ffcc00;
  color: #0f172a;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.editor-login button:disabled {
  cursor: wait;
  opacity: .5;
}

.editor-error {
  color: #fca5a5 !important;
}

.back-link {
  display: inline-block;
  margin-top: 2rem;
  color: #ffcc00;
}

.saving-status {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 20;
  padding: .7rem 1rem;
  background: #ffcc00;
  color: #0f172a;
  font-size: .7rem;
  font-weight: 700;
}

.btn-clear-browser-session {
  margin-left: auto;
  background: #1e293b !important;
  color: #94a3b8 !important;
  border: 1px solid #334155 !important;
  border-radius: 0.35rem;
  padding: 0.4rem 0.8rem;
  font-weight: 700 !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-browser-session:hover {
  background: #334155 !important;
  color: #f8fafc !important;
}

.btn-reset-sessions {
  margin-left: 0.5rem;
  background: #7f1d1d !important;
  color: #fecaca !important;
  border: 1px solid #ef4444 !important;
  border-radius: 0.35rem;
  padding: 0.4rem 0.8rem;
  font-weight: 700 !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-sessions:hover:not(:disabled) {
  background: #991b1b !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

.btn-reset-sessions:disabled {
  opacity: 0.5;
  cursor: wait;
}

.reset-success-banner {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 0.75rem 1.5rem;
  background: #065f46;
  color: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 0.5rem;
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
}
</style>
