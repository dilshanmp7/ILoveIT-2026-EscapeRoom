<script setup lang="ts">
import FloorplanEditor from '~/components/game/FloorplanEditor.vue'
import QuizEditor from '~/components/game/QuizEditor.vue'

useSeoMeta({ title: 'DHL IT Courier | Floorplan Editor', robots: 'noindex' })

const { floorplan, playerSpawn, quizzes, loading, authenticated, password, authenticating, errorMessage, saving, activeEditor, floorplanEditorKey, checkAccess, enterEditor, saveFloorplan, saveQuizzes, resetFloorplan } = useGameEditor()

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
      <FloorplanEditor v-if="activeEditor === 'map'" :key="floorplanEditorKey" :open="true" :initial-assets="floorplan"
        :initial-player-spawn="playerSpawn" @close="navigateTo('/game')" @deploy="saveFloorplan" @reset="resetFloorplan"
        @tab="activeEditor = $event" />
      <QuizEditor v-else :open="true" :initial-quizzes="quizzes" @close="navigateTo('/game')" @deploy="saveQuizzes"
        @tab="activeEditor = $event" />
      <nav class="editor-tabs" aria-label="Editor mode"><button type="button"
          :class="{ active: activeEditor === 'map' }" @click="activeEditor = 'map'">2D Floorplan Editor</button><button
          type="button" :class="{ active: activeEditor === 'quiz' }" @click="activeEditor = 'quiz'">Security Check
          Editor</button></nav>
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
</style>
