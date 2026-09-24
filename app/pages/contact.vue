<script setup lang="ts">
useSeoMeta({
  title: 'DHL CPH Hub | Contact Us',
  description: 'Contact DHL CPH Hub IT Team for I Love IT Day 2026 support.',
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
        <h1>CONTACT IT SUPPORT</h1>
        <p class="subtitle">RAPID-RESPONSE ASSISTANCE & EVENT INQUIRIES</p>
      </header>

      <!-- Main Contact Content -->
      <section class="contact-body">
        <div class="highlight-callout">
          <p class="primary-statement">
            If you have any questions or concerns, please contact the DHL IT team at
            <a href="mailto:cphit@dhl.com" class="link-highlight">cphit@dhl.com</a>.
          </p>
        </div>

        <div class="support-channels">
          <div class="channel-card primary-channel">
            <div class="channel-icon">✉️</div>
            <div class="channel-info">
              <h3>DIRECT IT SUPPORT EMAIL</h3>
              <p>For technical inquiries, session issues, or score corrections during I Love IT Day.</p>
              <a href="mailto:cphit@dhl.com" class="btn-email">
                Send Email to cphit@dhl.com ➔
              </a>
            </div>
          </div>

          <div class="channel-card">
            <div class="channel-icon">🏢</div>
            <div class="channel-info">
              <h3>CPH HUB IT OPERATIONS</h3>
              <p>CPH Copenhagen Hub IT Team • Organizing Team for DHL I Love IT Day 2026.</p>
              <small class="text-muted">On-site support available throughout shift operational windows.</small>
            </div>
          </div>
        </div>

        <!-- FAQ Quick-Help -->
        <div class="faq-section">
          <h3>FREQUENTLY ASKED QUESTIONS</h3>
          <div class="faq-item">
            <strong>Q: Can I resume my escape room on a different device?</strong>
            <p>Yes! Simply copy your generated <strong>Agent Code</strong> (e.g. CPH-OPS-1234) and enter it on the "Resume Mission" tab on your mobile phone or laptop.</p>
          </div>
          <div class="faq-item">
            <strong>Q: How is my leaderboard score calculated?</strong>
            <p>Scores are based on objective and situational questions answered across all 3 Sectors, minus penalty deductions for incorrect attempts, tactical hints, and elapsed escape time.</p>
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
        <NuxtLink to="/privacy" class="btn-text">
          Privacy Policy ➔
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
  background: rgba(56, 189, 248, .1);
  border-left: 4px solid #38bdf8;
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

.link-highlight {
  color: #ffcc00;
  text-decoration: underline;
  font-weight: 900;
}

.link-highlight:hover {
  color: #fde047;
}

.support-channels {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.channel-card {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  padding: 1.25rem;
  background: rgba(30, 41, 59, .6);
  border: 1px solid #334155;
  border-radius: .65rem;
}

.primary-channel {
  border-color: #ffcc00;
  background: rgba(255, 204, 0, .05);
}

.channel-icon {
  font-size: 2rem;
  line-height: 1;
}

.channel-info h3 {
  margin: 0 0 .35rem;
  font-size: .92rem;
  font-weight: 900;
  color: #ffcc00;
  letter-spacing: .04em;
}

.channel-info p {
  margin: 0 0 .75rem;
  font-size: .8rem;
  color: #cbd5e1;
  line-height: 1.45;
}

.text-muted {
  font-size: .72rem;
  color: #94a3b8;
}

.btn-email {
  display: inline-block;
  padding: .55rem 1rem;
  background: #ffcc00;
  color: #0f172a;
  text-decoration: none;
  font-weight: 900;
  font-size: .78rem;
  border-radius: .35rem;
  transition: all .2s;
}

.btn-email:hover {
  background: #fde047;
  transform: translateY(-1px);
}

.faq-section {
  background: rgba(15, 23, 42, .6);
  border: 1px solid #1e293b;
  border-radius: .65rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.faq-section h3 {
  margin: 0 0 1rem;
  font-size: .82rem;
  font-weight: 900;
  color: #94a3b8;
  letter-spacing: .08em;
}

.faq-item {
  margin-bottom: 1rem;
}

.faq-item:last-child {
  margin-bottom: 0;
}

.faq-item strong {
  display: block;
  font-size: .78rem;
  color: #ffcc00;
  margin-bottom: .25rem;
}

.faq-item p {
  margin: 0;
  font-size: .74rem;
  color: #cbd5e1;
  line-height: 1.45;
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
