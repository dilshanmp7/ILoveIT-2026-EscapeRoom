# DHL CPH Hub | I Love IT Day 2026 — 3D Escape Room

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-000000?logo=three.js)](https://threejs.org/)
[![Web Audio API](https://img.shields.io/badge/Audio-Procedural%20Web%20Audio-orange)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)

An interactive 3D cybersecurity and IT operations escape room built for the **DHL CPH Hub "I Love IT Day 2026"**. Participants navigate a simulated night-dispatch facility, solve 30 progressive challenges across 3 operational sectors, restore compromised systems, and compete on a live championship leaderboard.

---

## 🚀 Key Features

### 1. 3D Game Engine (Three.js & WebGL)
- **Sector Dispatch Floor**: Interactive 3D warehouse environment featuring security laser fences, holographic terminal stations, pulsing floor markers, and directional lighting.
- **Dynamic Camera Scaling**: Responsive projection scaling tailored for both desktop PC monitors and smartphone screens (portrait and landscape).
- **Dual Control Architecture**:
  - **Desktop PC**: Keyboard movement (`WASD` / Arrow keys), interaction (`E` / `Space`), tactical mini-map (`M`), and full keyboard navigation for modals and quiz selections (1–4 keys).
  - **Mobile & Tablet**: Touch-screen virtual joystick, dedicated action buttons, and responsive modal dialogues.

### 2. Procedural Web Audio Engine (Zero Asset Downloads)
- **Escape Room Soundtrack (`cyber-music.ts`)**: 130 BPM driving cyber bassline, ticking SLA countdown clock, heartbeat sub-bass, and tension escalation when timer drops below 60 seconds.
- **Leaderboard Arena Audio (`leaderboard-audio.ts`)**: 122 BPM heroic championship theme (lush detuned pads, rolling bass, four-on-the-floor stadium kick, and arpeggiator plucks) engineered with a master dynamics compressor for auditorium and big-screen speakers.
- **Live Event Fanfares**:
  - `playCelebrationFanfare()`: Triumphant Major-key chime fanfare when an agent escapes the facility.
  - `playLeadChangeChime()`: Stadium victory chords when an agent claims the #1 rank.
- **Cross-Platform Compatibility**: Synchronous WebKit/iOS Safari audio unlock mechanism and smartphone-optimized EQ (160 Hz ➔ 52 Hz kick punch).

### 3. Operational Sectors & Challenges
- **Sector 1 — AURA AI Core**: Gen-AI prompt injection defenses, data leak overrides, and AI ethics.
- **Sector 2 — Applications**: GUS Blue, ServiceNow incident workflows, Power Automate pipelines, and UAT validations.
- **Sector 3 — Cyber Vault**: Defense protocols, phishing triage, network containment, and the Emergency Dispatch Hatch.
- **Tactical Hints**: Objective questions offer hints that deduct 50% of the question's score value upon use.

### 4. Live Big-Screen Broadcast Leaderboard (`/leaderboard`)
- **Real-Time Event Statistics**: Tracks Registered Agents, Completed Escapes, Fastest SLA Record, Leading Department, and Average Score.
- **Top 3 Champions Podium**: Visual Gold, Silver, and Bronze podium alongside a sortable complete roster.
- **Big-Screen Presentation Controls**:
  - `[ ⛶ FULLSCREEN ]` toggle to project clean visual output on auditorium walls and monitors.
  - `[ START ARENA SOUND 🔊 ]` toggle with live equalizer wave animation.
  - **Live Event Toasts**: On-screen celebration banners for facility escapes and lead changes.
  - **5-Minute Auto-Refresh**: Configured for 5-minute intervals with an interactive `LIVE (5 MIN)` button for instant manual re-syncing.
  - Department and Shift filtering.

### 5. Session Management & Fair Competition
- **Deterministic Agent Code**: Generates codes (e.g. `CPH-OPS-D-7A9B`) based on participant name and department, enabling seamless cross-device resumption between office laptops and smartphones.
- **Single-Run Policy**: Enforces a single operational attempt per participant to maintain leaderboard integrity.
- **Auto-Save Engine**: Periodically synchronizes checkpoints and score state every 5 seconds.

### 6. Privacy & Support Pages
- **Privacy Policy (`/privacy`)**: Transparent policy ensuring all data (Name, Department, Shift, Score) is strictly internal to DHL CPH Hub training and never shared externally.
- **Contact Us (`/contact`)**: Direct support channel to the DHL IT team (`cphit@dhl.com`) and event FAQs.

---

## 📂 Project Architecture

```
├── app/
│   ├── components/
│   │   ├── GameCanvas.vue             # 3D WebGL Three.js render canvas
│   │   ├── GameHud.vue                # Real-time player HUD (timer, score, sound toggle)
│   │   ├── GamePathMapModal.vue       # Interactive tactical facility mini-map
│   │   ├── GameQuizModal.vue          # Challenge questions and interactive answers
│   │   ├── GameMobileControls.vue     # Virtual joystick and touch controls
│   │   ├── GameMissionBriefingModal.vue # Pre-shift operational briefing
│   │   └── GameMessageModal.vue       # Dispatch notes and station dialogues
│   ├── composables/
│   │   ├── useGameEngine.ts           # Core game loop, player physics, collision, and rendering
│   │   └── useGamePersistence.ts      # Session saving and state restoration
│   ├── pages/
│   │   ├── index.vue                  # Game start, agent registration & resumption
│   │   ├── game.vue                   # Active 3D escape room session
│   │   ├── leaderboard.vue            # Live big-screen championship broadcast
│   │   ├── privacy.vue                # Official DHL internal training privacy policy
│   │   ├── contact.vue                # IT support contact & FAQs
│   │   └── editor.vue                 # Dispatch floorplan layout editor
│   └── utils/
│       └── game/
│           ├── cyber-music.ts         # In-game procedural synth audio engine
│           └── leaderboard-audio.ts   # Big-screen broadcast arena audio engine & fanfares
├── server/
│   ├── api/
│   │   ├── game/
│   │   │   ├── session.post.ts        # Session creation, authentication, and validation
│   │   │   ├── session/[id].post.ts   # Checkpoint saving & score finalization
│   │   │   ├── leaderboard.get.ts     # Aggregated rankings and statistics
│   │   │   ├── floorplan.get.ts       # Floorplan layout retrieval
│   │   │   └── floorplan.put.ts       # Floorplan editor persistence
│   │   └── editor/
│   │       ├── verify.post.ts         # Editor authentication
│   │       └── reset-sessions.post.ts # Admin session reset
│   └── utils/
│       ├── game-redis.ts              # Upstash Redis distributed session & score store
│       └── game-database.ts           # SQLite local fallback store
└── shared/
    └── game/
        ├── types.ts                   # Core game and leaderboard TypeScript interfaces
        ├── questions-data.ts          # 30 IT challenge questions, hints, and departments
        └── runtime.ts                 # 3D math, SoundFX synthesizer, and collision helpers
```

---

## 🛠️ Environment Configuration

Create a `.env` file in the root directory:

```bash
# --- Upstash Redis (Recommended for Production & Cloud Deployments) ---
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# --- SQLite Fallback (Used if Redis credentials are not set) ---
NUXT_GAME_DB_PATH="data/courier.sqlite"

# --- Floorplan Editor Security ---
NUXT_EDITOR_PASSWORD="your-editor-password"
NUXT_DISABLE_EDITOR_PASSWORD=false  # Set to true for local development bypass
```

---

## 📦 Setup & Development

### 1. Prerequisites
- **Node.js**: v22.5.0 or newer (required for native `node:sqlite` fallback).
- **Package Manager**: `npm`, `pnpm`, or `yarn`.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The application will be running at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```

### 5. Preview Production Build
```bash
npm run preview
```

---

## 🏆 Scoring Calculation Model

A player's final operational score is calculated dynamically based on:

$$\text{Final Score} = \sum (\text{Question Points} - \text{Hint Penalties}) - \text{Time Deductions} - \text{Incorrect Deductions}$$

- **Objective Questions**: 100 points each.
- **Hint Penalty**: Using a hint reduces that question's point reward by 50% (-50 points).
- **Time Deduction**: 1 point deducted for each elapsed second.
- **Level Completion Bonuses**: Rewarded upon successfully unlocking each Sector checkpoint.

---

## 🔒 Privacy & Data Protection

- **Internal Training Only**: Developed exclusively for DHL CPH Hub internal engagement and training.
- **No Sensitive Personal Information**: Only First Name, Last Name, Department, Shift, and Game Score are stored.
- **No External Sharing**: All telemetry remains strictly within DHL internal systems.
- For inquiries, reach out to the DHL IT team at `cphit@dhl.com` or visit the `/contact` page.

---

## 📄 License
Internal proprietary software for Deutsche Post DHL Group / DHL CPH Hub. All rights reserved.
