/**
 * Procedural Cyberpunk Escape Room Music Engine
 * Uses the Web Audio API to synthesize an exciting, driving, tension-building soundtrack
 * in real time without requiring external MP3 or audio asset downloads.
 *
 * Features:
 * - 130 BPM pulsing 16th-note cyber bassline
 * - Ticking countdown SLA clock simulation
 * - Sub-bass heartbeat pulse
 * - Tension atmospheric drone
 * - Real-time escalation mode when timer is critical (< 60s)
 * - Lookahead Web Audio scheduling (zero audio jitter during 3D rendering)
 * - Mute/Unmute persistence in localStorage
 */

export class CyberMusicEngine {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private isUrgent = false;
  private sectorLevel: 1 | 2 | 3 = 1;
  private enabled = true;

  // Master Gain & Dynamics
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Drone Nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  // Noise Buffer for ticking clock
  private noiseBuffer: AudioBuffer | null = null;

  // Lookahead Sequencer state
  private timerId: number | null = null;
  private currentStep = 0;
  private nextStepTime = 0;
  private readonly tempo = 130; // BPM
  private readonly stepDuration = 60 / (130 * 4); // 16th-note duration (~0.1154s)
  private readonly scheduleAheadTime = 0.15; // Schedule 150ms ahead

  // Musical scales (D Minor / Cyber Phrygian)
  // Step frequencies for 16-step bassline pattern
  private readonly bassFrequencies: number[] = [
    73.42, 73.42, 87.31, 73.42,   // D2, D2, F2, D2
    98.00, 73.42, 110.00, 98.00,  // G2, D2, A2, G2
    73.42, 73.42, 65.41, 73.42,   // D2, D2, C2, D2
    87.31, 98.00, 110.00, 130.81, // F2, G2, A2, C3
  ];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("cph_music_enabled");
        // Default to enabled unless explicitly turned off
        this.enabled = stored !== "false";
      } catch {
        this.enabled = true;
      }
    }
  }

  public get isMusicEnabled(): boolean {
    return this.enabled;
  }

  public get isPlaying(): boolean {
    return this.isRunning;
  }

  private initAudio() {
    if (typeof window === "undefined" || this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx({ latencyHint: "interactive" });

      // Master Dynamics Compressor to glue the synth elements and avoid harsh peaks
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master BGM Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.32 : 0, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // Generate 1-second white noise buffer for crisp mechanical ticking
      const bufferSize = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } catch (err) {
      console.warn("[CyberMusic] Failed to initialize AudioContext:", err);
    }
  }

  /**
   * Synchronously unlocks iOS Safari / Android Web Audio during user gesture.
   */
  public unlock(): void {
    this.initAudio();
    if (!this.ctx) return;

    // iOS Web Audio unlock: Play 1-sample silent buffer synchronously inside user gesture
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch {}

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  /**
   * Starts the background cyber soundtrack.
   */
  public async start(): Promise<void> {
    this.initAudio();
    if (!this.ctx) return;

    this.unlock();

    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        return;
      }
    }

    if (this.isRunning) {
      // If already running, ensure volume is smoothly unmuted
      if (this.masterGain && this.enabled) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + 0.3);
      }
      return;
    }

    this.isRunning = true;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;

    // Fade in master gain smoothly
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(
        this.enabled ? 0.32 : 0.001,
        this.ctx.currentTime + 1.2,
      );
    }

    this.startDrone();
    this.scheduleLoop();
  }

  /**
   * Pauses or stops the soundtrack with a smooth fade-out.
   */
  public stop(fadeSeconds = 1.0): void {
    if (!this.isRunning || !this.ctx) return;
    this.isRunning = false;

    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.masterGain) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + fadeSeconds);
      } catch {}
    }

    setTimeout(() => {
      this.stopDrone();
    }, fadeSeconds * 1000);
  }

  /**
   * Toggles music on/off and persists setting in localStorage.
   */
  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cph_music_enabled", String(this.enabled));
      } catch {}
    }

    this.initAudio();
    if (this.ctx) {
      this.unlock();
    }

    if (this.enabled) {
      if (!this.isRunning || !this.ctx || this.ctx.state === "suspended") {
        void this.start();
      } else if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(Math.max(0.001, this.masterGain.gain.value), this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + 0.3);
      }
    } else {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      }
    }

    return this.enabled;
  }

  /**
   * Changes tension mode: in critical SLA (< 60s), pulse accelerates and adds warning frequencies.
   */
  public setUrgent(urgent: boolean): void {
    this.isUrgent = urgent;
    if (this.droneFilter && this.ctx) {
      // Open up drone filter when urgent
      this.droneFilter.frequency.setTargetAtTime(urgent ? 600 : 250, this.ctx.currentTime, 0.5);
    }
  }

  /**
   * Adapts the track to the current Sector.
   */
  public setSector(level: 1 | 2 | 3): void {
    this.sectorLevel = level;
    if (this.droneFilter && this.ctx) {
      const freqs = { 1: 220, 2: 320, 3: 450 };
      this.droneFilter.frequency.setTargetAtTime(freqs[level] || 250, this.ctx.currentTime, 1.0);
    }
  }

  // --- INTERNAL SYNTHESIS METHODS ---

  private scheduleLoop = () => {
    if (!this.isRunning || !this.ctx) return;

    // Guard against background tab delay or suspended AudioContext timing jump
    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 40);
  };

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // 1. Driving Cyber Bassline (16th-note arpeggio)
    this.playBassNote(step, time);

    // 2. Ticking Countdown Clock (every 16th note, accented on quarter notes)
    const isQuarter = step % 4 === 0;
    this.playClockTick(time, isQuarter);

    // 3. Heartbeat Sub-Kick (on beats 1 and 9 / beats 1 and 3 in 4/4)
    if (step === 0 || step === 8 || (this.isUrgent && step % 4 === 0)) {
      this.playHeartbeatKick(time);
    }

    // 4. Critical Warning Pulse (when < 60 seconds remain)
    if (this.isUrgent && (step === 2 || step === 6 || step === 10 || step === 14)) {
      this.playAlarmPulse(time);
    }
  }

  private playBassNote(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const freq = this.bassFrequencies[step] || 73.42;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    // Octave up during sector 3 or urgent
    osc.frequency.setValueAtTime(this.isUrgent && step % 2 === 1 ? freq * 2 : freq, time);

    filter.type = "lowpass";
    filter.Q.setValueAtTime(5, time);

    // Punchy filter envelope
    const baseCutoff = this.sectorLevel === 3 ? 550 : (this.sectorLevel === 2 ? 400 : 320);
    const peakCutoff = this.isUrgent ? 1600 : (this.sectorLevel === 3 ? 1200 : 800);
    filter.frequency.setValueAtTime(peakCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(baseCutoff, time + this.stepDuration * 0.85);

    // Amplitude envelope
    const volume = this.isUrgent ? 0.28 : 0.22;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + this.stepDuration);
  }

  private playClockTick(time: number, isAccent: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(isAccent ? 4500 : 3200, time);
    filter.Q.setValueAtTime(isAccent ? 4 : 8, time);

    const gain = this.ctx.createGain();
    const vol = isAccent ? 0.12 : 0.045;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.04 : 0.02));

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + 0.05);
  }

  private playHeartbeatKick(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Pitch drop from 160Hz to 52Hz creates punch audible on mobile phone speakers & desktop
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(52, time + 0.09);

    gain.gain.setValueAtTime(0.46, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  private playAlarmPulse(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, time); // High C

    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain || this.droneOsc1) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    // Two detuned low saw oscillators for thick dark containment texture
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = "sawtooth";
    this.droneOsc1.frequency.setValueAtTime(36.71, this.ctx.currentTime); // D1

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = "sawtooth";
    this.droneOsc2.frequency.setValueAtTime(36.71 * 1.5, this.ctx.currentTime); // A1 (Fifth)
    this.droneOsc2.detune.setValueAtTime(7, this.ctx.currentTime); // Detune for rich chorusing

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  private stopDrone() {
    if (this.droneOsc1) {
      try {
        this.droneOsc1.stop();
        this.droneOsc1.disconnect();
      } catch {}
      this.droneOsc1 = null;
    }
    if (this.droneOsc2) {
      try {
        this.droneOsc2.stop();
        this.droneOsc2.disconnect();
      } catch {}
      this.droneOsc2 = null;
    }
    if (this.droneGain) {
      try {
        this.droneGain.disconnect();
      } catch {}
      this.droneGain = null;
    }
    if (this.droneFilter) {
      try {
        this.droneFilter.disconnect();
      } catch {}
      this.droneFilter = null;
    }
  }

  public dispose(): void {
    this.stop(0.2);
    if (this.ctx && this.ctx.state !== "closed") {
      try {
        this.ctx.close();
      } catch {}
    }
    this.ctx = null;
  }
}

