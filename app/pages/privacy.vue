<script setup lang="ts">
useSeoMeta({
  title: 'DHL CPH Hub | Privacy Policy',
  description: 'Privacy Policy for DHL CPH Hub I Love IT Day 2026 Training Escape Room.',
})
</script>

<template>
  <main class="info-page">
    <div class="info-grid" aria-hidden="true" />

    <div class="info-card">
      <!-- Header / Brand -->
      <header class="card-header">
        <div class="brand-lockup">
          <span class="brand-mark">DHL</span>
          <span class="brand-rule" />
          <span class="brand-label">CPH HUB / I LOVE IT DAY 2026</span>
        </div>
        <h1>PRIVACY POLICY</h1>
        <p class="subtitle">INTERNAL OPERATIONAL TRAINING PROTOCOL</p>
      </header>

      <!-- Main Policy Content -->
      <section class="policy-body">
        <div class="highlight-callout">
          <p class="primary-statement">
            This is an official DHL internal training game for organizing in DHL CPH hub I love IT day. We do not collect personal or financial information. Only your name and department are used for leaderboard purposes. No data is shared outside DHL.
          </p>
        </div>

        <div class="details-grid">
          <div class="detail-box">
            <span class="box-icon">📋</span>
            <h3>Data Collected</h3>
            <p>
              Only operational identifiers: First Name, Last Name, Department, and Shift. No passwords, banking details, personal phone numbers, or private emails are collected.
            </p>
          </div>

          <div class="detail-box">
            <span class="box-icon">🎯</span>
            <h3>Purpose of Data</h3>
            <p>
              Your name, department, shift, and completion score are solely utilized to generate the live event leaderboard, track operational training completion, and recognize participants.
            </p>
          </div>

          <div class="detail-box">
            <span class="box-icon">🔒</span>
            <h3>Internal Storage & Security</h3>
            <p>
              All session progress is strictly kept within DHL internal training infrastructure. No data is sold, monetized, or shared outside DHL.
            </p>
          </div>

          <div class="detail-box">
            <span class="box-icon">✉️</span>
            <h3>Questions & Support</h3>
            <p>
              If you have any questions or concerns, please contact the DHL IT team at
              <a href="mailto:cphit@dhl.com" class="link-contact">cphit@dhl.com</a>.
            </p>
          </div>
        </div>
      </section>

      <!-- Navigation Footer -->
      <footer class="card-footer">
        <NuxtLink to="/" class="btn-primary">
          ➔ Return to Game Start
        </NuxtLink>
        <NuxtLink to="/leaderboard" class="btn-secondary">
          🏆 View Live Leaderboard
        </NuxtLink>
        <NuxtLink to="/contact" class="btn-text">
          Contact IT Support ➔
        </NuxtLink>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.info-page {
  min-height: 100vh;
  background: #090d16;
  color: #f8fafc;
  font-family: 'Courier New', monospace;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1.5rem;
  position: relative;
  overflow: hidden;
}

.info-grid {
  position: absolute;
  inset: 0;
  opacity: .1;
  background-image: linear-gradient(90deg, transparent 49%, #ffcc00 50%, transparent 51%), linear-gradient(#ffcc00 1px, transparent 1px);
  background-size: 5rem 5rem;
  pointer-events: none;
}

.info-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 48rem;
  background: rgba(15, 23, 42, .95);
  border: 1.5px solid #334155;
  border-radius: 1rem;
  padding: clamp(1.8rem, 4vw, 3rem);
  box-shadow: 0 20px 50px rgba(0, 0, 0, .6), 0 0 30px rgba(255, 204, 0, .05);
}

.card-header {
  border-bottom: 2px solid #ffcc00;
  padding-bottom: 1.2rem;
  margin-bottom: 1.8rem;
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
  margin-bottom: .8rem;
}

.brand-mark {
  padding: .2rem .5rem;
  background: #ffcc00;
  color: #d40511;
  border-radius: .25rem;
  font-size: 1.1rem;
}

.brand-rule {
  width: 2px;
  height: 1rem;
  background: #475569;
}

.brand-label {
  color: #94a3b8;
}

h1 {
  margin: 0;
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: .04em;
}

.subtitle {
  margin: .3rem 0 0;
  color: #94a3b8;
  font-size: .75rem;
  letter-spacing: .08em;
}

.highlight-callout {
  padding: 1.25rem 1.5rem;
  background: rgba(255, 204, 0, .1);
  border-left: 4px solid #ffcc00;
  border-radius: .5rem;
  margin-bottom: 2rem;
}

.primary-statement {
  margin: 0;
  font-size: clamp(.88rem, 1.8vw, 1.05rem);
  line-height: 1.6;
  color: #f8fafc;
  font-weight: 700;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.detail-box {
  background: rgba(30, 41, 59, .6);
  border: 1px solid #334155;
  border-radius: .65rem;
  padding: 1.25rem;
}

.box-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: .5rem;
}

.detail-box h3 {
  margin: 0 0 .4rem;
  font-size: .92rem;
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: .04em;
}

.detail-box p {
  margin: 0;
  font-size: .78rem;
  color: #cbd5e1;
  line-height: 1.5;
}

.link-contact {
  color: #38bdf8;
  text-decoration: underline;
  font-weight: 700;
}

.link-contact:hover {
  color: #7dd3fc;
}

.card-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #1e293b;
}

.btn-primary {
  padding: .75rem 1.4rem;
  background: #ffcc00;
  color: #0f172a;
  text-decoration: none;
  font-weight: 900;
  font-size: .82rem;
  border-radius: .4rem;
  transition: all .2s;
}

.btn-primary:hover {
  background: #fde047;
  transform: translateY(-1px);
}

.btn-secondary {
  padding: .75rem 1.2rem;
  background: rgba(30, 41, 59, .8);
  border: 1px solid #475569;
  color: #f8fafc;
  text-decoration: none;
  font-weight: 800;
  font-size: .8rem;
  border-radius: .4rem;
  transition: all .2s;
}

.btn-secondary:hover {
  background: #334155;
  border-color: #ffcc00;
}

.btn-text {
  color: #94a3b8;
  text-decoration: none;
  font-size: .78rem;
  font-weight: 800;
  margin-left: auto;
}

.btn-text:hover {
  color: #ffcc00;
}

@media (max-width: 640px) {
  .card-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-text {
    margin-left: 0;
    text-align: center;
  }
}
</style>
