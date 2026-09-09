<script setup lang="ts">
import type { MapAsset } from '#shared/game/types';

const engine = useGameEngine()
definePageMeta({ middleware: ['game-gate'] })

const session = ref<{ id: string; score: number } | null>(null)
const floorplan = ref<MapAsset[] | null>(null)
const sessionError = ref('')

async function submitScore(completed = true) {
  if (!session.value) return
  await $fetch(`/api/game/session/${session.value.id}`, {
    method: 'POST',
    body: { score: engine.state.score, completed },
  })
}

onMounted(async () => {
  try {
    const floorplanResponse = await $fetch<{ layout: MapAsset[] }>('/api/game/floorplan')
    floorplan.value = floorplanResponse.layout
    const response = await $fetch<{ session: { id: string; score: number } }>('/api/game/session', { method: 'POST' })
    session.value = response.session
  } catch {
    sessionError.value = 'Unable to start a dispatch session.'
  }
})

watch(() => engine.state.finished, (finished) => {
  if (finished) void submitScore(true)
})

onBeforeUnmount(() => {
  if (session.value) void submitScore(false)
})

useSeoMeta({
  title: 'DHL IT Courier | Dispatch Floor',
  robots: 'noindex',
})
</script>

<template>
  <main class="game-page">
    <div v-if="sessionError" class="game-error" role="alert">{{ sessionError }}</div>
    <div v-else-if="!session || !floorplan" class="game-loading">CONNECTING TO DISPATCH HUB...</div>
    <section v-else class="game-shell" aria-label="DHL IT Courier game">
      <GameScene :engine="engine" :floorplan="floorplan" />
      <GameHud :state="engine.state"  />
      <GameMobileControls :can-grab="engine.state.canGrab" :can-use="engine.state.canUse" @grab="engine.pickUp" @action="engine.useNearby" @dash="engine.dash" @quiz="engine.openQuiz" @move="engine.setJoystick" />
      <GameQuizModal :quiz="engine.state.quiz" :open="engine.state.quizOpen" @answer="engine.answerQuiz" @close="engine.answerQuiz(-1)" />
    </section>
  </main>
</template>

<style scoped>
.game-page { min-height: 100vh; display: grid; place-items: center; margin: 0; background: #0f172a; color: #f8fafc; font-family: 'Courier New', monospace; }
.game-loading, .game-error { padding: 2rem; text-align: center; }
.game-loading { color: #ffcc00; letter-spacing: .14em; font-size: .75rem; }
.game-error { color: #fca5a5; }
.game-shell { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
</style>
