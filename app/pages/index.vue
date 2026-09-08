<script setup lang="ts">
import type { FetchError } from 'ofetch'

const accessCode = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

useSeoMeta({
  title: 'DHL IT Courier | Access the Shift',
  description: 'Enter the shared dispatch code to access the DHL IT Courier escape room.',
})

async function enterShift() {
  if (!accessCode.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/access/verify', {
      method: 'POST',
      body: { code: accessCode.value },
    })
    await navigateTo('/game')
  } catch (error) {
    const fetchError = error as FetchError
    errorMessage.value = fetchError.data?.statusMessage || 'That code did not unlock the dispatch floor.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="access-page">
    <div class="access-grid" aria-hidden="true" />
    <section class="access-panel" aria-labelledby="access-title">
      <div class="brand-lockup">
        <span class="brand-mark">DHL</span>
        <span class="brand-rule" />
        <span class="brand-label">I LOVE IT / 2026</span>
      </div>

      <p class="eyebrow">Operations briefing 2026</p>
      <h1 id="access-title">The office is waiting on you.</h1>
      <p class="lede">
        Laptop. Server. Security terminal. One dispatch window. Enter the shared shift code to step onto the floor.
      </p>

      <form class="access-form" @submit.prevent="enterShift">
        <label for="access-code">Shared dispatch code</label>
        <div class="input-row">
          <input
            id="access-code"
            v-model="accessCode"
            name="access-code"
            type="password"
            autocomplete="off"
            placeholder="ENTER CODE"
            :disabled="isSubmitting"
            @input="errorMessage = ''"
          >
          <button type="submit" :disabled="isSubmitting || !accessCode.trim()">
            {{ isSubmitting ? 'Checking' : 'Enter floor' }}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      </form>

      <NuxtLink class="editor-link" to="/editor">Open floorplan editor <span aria-hidden="true">↗</span></NuxtLink>

      <div class="briefing-strip">
        <span><strong>03:00</strong> SLA window</span>
        <span><strong>01</strong> active courier</span>
        <span><strong>150</strong> delivery points</span>
      </div>
    </section>

    <aside class="access-aside" aria-label="Dispatch floor preview">
      <div class="aside-topline"><span>HUB / MILAN</span><span>LIVE</span></div>
      <div class="floor-graphic">
        <div class="floor-line line-one" />
        <div class="floor-line line-two" />
        <div class="floor-node node-one">01</div>
        <div class="floor-node node-two">02</div>
        <div class="floor-node node-three">03</div>
        <div class="floor-route" />
        <div class="floor-caption">DISPATCH<br>FLOORPLAN</div>
      </div>
      <p class="aside-note">A small floor. A fast handoff. Leave nothing unconfigured.</p>
    </aside>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #15191b; color: #f5f0df; font-family: Georgia, 'Times New Roman', serif; }
:global(button), :global(input) { font: inherit; }
.access-page { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(320px, .82fr); position: relative; overflow: hidden; background: #15191b; }
.access-grid { position: absolute; inset: 0; opacity: .18; background-image: linear-gradient(90deg, transparent 49%, #f5f0df 50%, transparent 51%), linear-gradient(#f5f0df 1px, transparent 1px); background-size: 8rem 8rem; mask-image: linear-gradient(90deg, #000, transparent 78%); }
.access-panel { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: center; padding: clamp(2rem, 8vw, 8rem); max-width: 900px; }
.brand-lockup, .aside-topline, .briefing-strip { font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: .12em; }
.brand-lockup { display: flex; align-items: center; gap: .75rem; font-weight: 700; font-size: .72rem; color: #ffcc00; }
.brand-mark { font-size: 1.3rem; letter-spacing: -.08em; color: #ffcc00; }
.brand-rule { width: 2.5rem; height: 1px; background: #d40511; }
.brand-label { color: #aaa89c; }
.eyebrow { margin: 7rem 0 1rem; font-family: 'Courier New', monospace; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: #d40511; }
h1 { max-width: 700px; margin: 0; font-size: clamp(3.8rem, 8vw, 7.5rem); line-height: .88; font-weight: 400; letter-spacing: -.05em; }
.lede { max-width: 500px; margin: 2rem 0 2.5rem; color: #aaa89c; font-size: 1.12rem; line-height: 1.55; }
.access-form { max-width: 650px; }
.access-form label { display: block; margin-bottom: .7rem; color: #ffcc00; font-family: 'Courier New', monospace; font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.input-row { display: flex; gap: .7rem; border-bottom: 1px solid #5b5c54; padding-bottom: .7rem; }
input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: #f5f0df; font-family: 'Courier New', monospace; font-size: 1.1rem; letter-spacing: .1em; }
input::placeholder { color: #5b5c54; }
button { border: 0; padding: .85rem 1rem; background: #ffcc00; color: #15191b; cursor: pointer; font-family: 'Courier New', monospace; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
button:hover:not(:disabled) { background: #f5f0df; }
button:disabled { cursor: wait; opacity: .45; }
.form-error { margin: .8rem 0 0; color: #ff837b; font-family: 'Courier New', monospace; font-size: .75rem; }
.editor-link { display: inline-block; margin-top: 1.5rem; color: #aaa89c; font-family: 'Courier New', monospace; font-size: .7rem; letter-spacing: .08em; text-decoration: none; text-transform: uppercase; }.editor-link:hover { color: #ffcc00; }
.briefing-strip { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 5rem; color: #77786f; font-size: .63rem; }
.briefing-strip strong { display: block; margin-bottom: .25rem; color: #f5f0df; font-size: 1.1rem; letter-spacing: 0; }
.access-aside { position: relative; display: flex; flex-direction: column; justify-content: space-between; min-height: 100vh; padding: 2.5rem; border-left: 1px solid #353938; background: #202526; }
.aside-topline { display: flex; justify-content: space-between; color: #77786f; font-size: .65rem; }
.aside-topline span:last-child { color: #ffcc00; }
.floor-graphic { position: relative; min-height: 440px; margin: auto 0; border: 1px solid #4c504d; background: linear-gradient(135deg, transparent 49.8%, #4c504d 50%, transparent 50.2%), linear-gradient(45deg, transparent 49.8%, #4c504d 50%, transparent 50.2%); background-size: 8rem 8rem; }
.floor-line { position: absolute; background: #d40511; opacity: .8; }
.line-one { top: 18%; left: 12%; width: 62%; height: 2px; transform: rotate(18deg); }
.line-two { bottom: 23%; right: 10%; width: 58%; height: 2px; transform: rotate(-25deg); }
.floor-route { position: absolute; inset: 22% 23%; border: 1px dashed #ffcc00; transform: rotate(-12deg); }
.floor-node { position: absolute; display: grid; place-items: center; width: 3rem; height: 3rem; border: 1px solid #ffcc00; border-radius: 50%; color: #ffcc00; font-family: 'Courier New', monospace; font-size: .7rem; background: #202526; }
.node-one { top: 12%; left: 18%; }.node-two { top: 43%; right: 14%; }.node-three { bottom: 13%; left: 31%; }
.floor-caption { position: absolute; right: 1.5rem; bottom: 1.5rem; color: #f5f0df; font-family: 'Courier New', monospace; font-size: .68rem; line-height: 1.35; letter-spacing: .16em; }
.aside-note { max-width: 230px; margin: 0; color: #aaa89c; font-size: .95rem; line-height: 1.4; }
@media (max-width: 800px) { .access-page { display: block; }.access-panel { min-height: 100vh; padding: 2rem 1.5rem 6rem; }.eyebrow { margin-top: 6rem; } h1 { font-size: clamp(3.7rem, 17vw, 6rem); }.input-row { display: block; border-bottom: 0; }.input-row input { display: block; width: 100%; padding: .9rem 0; border-bottom: 1px solid #5b5c54; }.input-row button { width: 100%; margin-top: .8rem; }.access-aside { display: none; }.briefing-strip { margin-top: 4rem; } }
</style>
