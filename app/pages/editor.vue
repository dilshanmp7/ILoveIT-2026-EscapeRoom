<script setup lang="ts">
import type { MapAsset } from '#shared/game/types'
import type { FetchError } from 'ofetch'
import FloorplanEditor from '~/components/game/FloorplanEditor.vue'

useSeoMeta({ title: 'DHL IT Courier | Floorplan Editor', robots: 'noindex' })

const floorplan = ref<MapAsset[]>([])
const loading = ref(true)
const authenticated = ref(false)
const password = ref('')
const authenticating = ref(false)
const errorMessage = ref('')
const saving = ref(false)

async function loadFloorplan() {
  loading.value = true
  try {
    const response = await $fetch<{ layout: MapAsset[] }>('/api/game/floorplan')
    floorplan.value = response.layout
  } catch {
    errorMessage.value = 'Unable to load the dispatch floorplan.'
  } finally {
    loading.value = false
  }
}

async function checkEditorAccess() {
  const response = await $fetch<{ authenticated: boolean }>('/api/editor/status')
  authenticated.value = response.authenticated
  if (authenticated.value) await loadFloorplan()
  else loading.value = false
}

async function enterEditor() {
  if (!password.value.trim() || authenticating.value) return
  authenticating.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/editor/verify', {
      method: 'POST',
      body: { password: password.value },
    })
    authenticated.value = true
    password.value = ''
    await loadFloorplan()
  } catch (error) {
    const fetchError = error as FetchError
    errorMessage.value = fetchError.data?.statusMessage || 'That password did not unlock the editor.'
  } finally {
    authenticating.value = false
  }
}

async function saveFloorplan(layout: MapAsset[]) {
  saving.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ floorplan: { layout: MapAsset[] } }>('/api/game/floorplan', {
      method: 'PUT',
      body: { layout },
    })
    floorplan.value = response.floorplan.layout
    await navigateTo('/game')
  } catch {
    errorMessage.value = 'The floorplan could not be deployed.'
  } finally {
    saving.value = false
  }
}

onMounted(checkEditorAccess)
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
        <button type="submit" :disabled="authenticating || !password.trim()">{{ authenticating ? 'Checking...' : 'Unlock editor' }}</button>
      </form>
      <p v-if="errorMessage" class="editor-error" role="alert">{{ errorMessage }}</p>
      <NuxtLink class="back-link" to="/">Back to access</NuxtLink>
    </section>
    <div v-else-if="loading" class="editor-status">LOADING FLOORPLAN FROM SQLITE...</div>
    <div v-else-if="errorMessage" class="editor-status error" role="alert">{{ errorMessage }}</div>
    <FloorplanEditor v-else :open="true" :initial-assets="floorplan" @close="navigateTo('/game')" @deploy="saveFloorplan" />
    <div v-if="saving" class="saving-status">DEPLOYING...</div>
  </main>
</template>

<style scoped>
.editor-page { min-height: 100vh; background: #020617; color: #f8fafc; font-family: 'Courier New', monospace; }.editor-status { display: grid; min-height: 100vh; place-items: center; color: #ffcc00; font-size: .75rem; letter-spacing: .12em; }.editor-status.error { color: #fca5a5; }.editor-login { width: min(28rem, calc(100% - 2rem)); margin: 0 auto; padding-top: 18vh; }.eyebrow { color: #60a5fa; font-size: .7rem; letter-spacing: .12em; text-transform: uppercase; }.editor-login h1 { margin: .5rem 0 1rem; font-family: Georgia, serif; font-weight: 400; }.editor-login p { color: #94a3b8; line-height: 1.5; }.editor-login form { display: grid; gap: .7rem; margin-top: 2rem; }.editor-login label { color: #bfdbfe; font-size: .7rem; text-transform: uppercase; }.editor-login input { border: 1px solid #475569; padding: .8rem; background: #0f172a; color: #f8fafc; font: inherit; }.editor-login button { border: 0; padding: .8rem; background: #ffcc00; color: #0f172a; cursor: pointer; font: inherit; font-weight: 700; }.editor-login button:disabled { cursor: wait; opacity: .5; }.editor-error { color: #fca5a5 !important; }.back-link { display: inline-block; margin-top: 2rem; color: #ffcc00; }.saving-status { position: fixed; right: 1rem; bottom: 1rem; z-index: 20; padding: .7rem 1rem; background: #ffcc00; color: #0f172a; font-size: .7rem; font-weight: 700; }
</style>
