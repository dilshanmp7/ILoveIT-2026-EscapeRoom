/**
 * Procedural Broadcast Audio Engine for Big Screen Leaderboard
 * Synthesizes an energetic, inspiring, championship arena broadcast soundtrack
 * and live celebratory event fanfares via the Web Audio API without external MP3 assets.
 *
 * Features:
 * - 122 BPM heroic cyberpunk championship soundtrack (pads, rolling bass, arpeggios, electro beat)
 * - Synchronous WebKit/iOS audio unlock
 * - Dynamic event fanfares for new escapes and podium leader changes
 * - Master Dynamics Compressor for punchy, balanced PA/projector speaker playback
 * - Volume persistence in localStorage
 */

export class LeaderboardAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private enabled = false; // Default to muted until presenter activates big-screen sound

  // Master Gain & Dynamics
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Ambient Pad Nodes
  private padGain: GainNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padFilter: BiquadFilterNode | null = null;

  // Noise Buffer for percussion
  private noiseBuffer: AudioBuffer | null = null;

  // Sequencer loop
  private timerId: number | null = null;
  private currentStep = 0; // 0 to 63 (4 bars of 16 steps)
  private nextStepTime = 0;
  private readonly tempo = 122; // BPM
  private readonly stepDuration = 60 / (122 * 4); // ~0.123s per 16th note
  private readonly scheduleAheadTime = 0.18;

  // 4-Bar Chord Progression (D Minor -> Bb Major -> C Major -> F/A Turnaround)
  // Chord root frequencies
  private readonly chordProgression = [
    { root: 73.42, notes: [146.83, 174.61, 220.0, 293.66], name: "Dm" }, // D3, F3, A3, D4
    { root: 58.27, notes: [116.54, 146.83, 174.61, 233.08], name: "Bb" }, // Bb2, D3, F3, Bb3
    { root: 65.41, notes: [130.81, 164.81, 196.0, 261.63], name: "C" }, // C3, E3, G3, C4
    { root: 87.31, notes: [174.61, 220.0, 261.63, 349.23], name: "F" }, // F3, A3, C4, F4
  ];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("cph_leaderboard_sound_enabled");
        // Big screen: restore preference if previously turned on
        this.enabled = stored === "true";
      } catch {
        this.enabled = false;
      }
    }
  }

  public get isSoundEnabled(): boolean {
    return this.enabled;
  }

  public get isPlaying(): boolean {
    return this.isRunning && this.ctx?.state === "running";
  }

  private initAudio() {
    if (typeof window === "undefined" || this.ctx) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx({ latencyHint: "playback" });

      // Master Compressor to optimize audio for large displays, monitors, and PA systems
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.35 : 0, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // White noise buffer for hats, snares, and celebratory sweeps
      const bufferSize = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } catch (err) {
      console.warn("[LeaderboardAudio] Failed to initialize AudioContext:", err);
    }
  }

  /**
   * Synchronously unlocks Web Audio during a user click or keypress
   */
  public unlock(): void {
    this.initAudio();
    if (!this.ctx) return;

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
   * Starts the broadcast theme
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

    this.enabled = true;
    try {
      localStorage.setItem("cph_leaderboard_sound_enabled", "true");
    } catch {}

    if (this.isRunning) {
      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 0.4);
      }
      return;
    }

    this.isRunning = true;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 1.0);
    }

    this.startAmbientPads();
    this.scheduleLoop();
  }

  /**
   * Smoothly stops or mutes the broadcast theme
   */
  public stop(fadeSeconds = 0.5): void {
    if (!this.isRunning && !this.masterGain) return;

    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + fadeSeconds);
      } catch {}
    }

    setTimeout(() => {
      this.isRunning = false;
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.stopAmbientPads();
    }, fadeSeconds * 1000);
  }

  /**
   * Toggles sound on/off
   */
  public toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("cph_leaderboard_sound_enabled", this.enabled ? "true" : "false");
    } catch {}

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
        this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 0.3);
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
   * Lookahead Sequencer for continuous, zero-jitter playback
   */
  private scheduleLoop = () => {
    if (!this.isRunning || !this.ctx) return;

    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % 64; // 64 steps = 4 bars
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 45);
  };

  /**
   * Schedules notes, rhythms, and arpeggios for each 16th note step
   */
  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const bar = Math.floor(step / 16); // 0, 1, 2, 3
    const stepInBar = step % 16; // 0 to 15
    const chord = this.chordProgression[bar] || this.chordProgression[0]!;

    // 1. Kick on every quarter beat (steps 0, 4, 8, 12)
    if (stepInBar % 4 === 0) {
      this.playBroadcastKick(time);
    }

    // 2. Cyber Snare / Clap on beats 2 and 4 (steps 4 and 12)
    if (stepInBar === 4 || stepInBar === 12) {
      this.playSnare(time);
    }

    // 3. Crisp Hi-Hat on offbeat 16ths (steps 2, 6, 10, 14, and subtle syncopations)
    if (stepInBar % 2 === 1 || stepInBar % 4 === 2) {
      const accent = stepInBar % 4 === 2;
      this.playHiHat(time, accent);
    }

    // 4. Rolling Bass (offbeat 8th note groove)
    if (stepInBar % 2 === 1 || stepInBar % 4 === 2) {
      this.playBassNote(chord.root, time, 0.1);
    }

    // 5. Championship Arpeggio (melodic synths cascading on 16th notes)
    // Select note from chord based on step pattern
    const noteIndex = [0, 1, 2, 3, 2, 1, 3, 2, 1, 0, 2, 3, 1, 2, 0, 3][stepInBar] ?? 0;
    const arpFreq = chord.notes[noteIndex] ?? chord.notes[0]!;
    this.playArpPluck(arpFreq, time);

    // 6. Bar transition sweep
    if (stepInBar === 15 && (bar === 1 || bar === 3)) {
      this.playTransitionSweep(time);
    }
  }

  // --- Sound Generation Methods ---

  private playBroadcastKick(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Punchy 150Hz -> 48Hz drop creates full, professional stadium punch
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.08);

    gain.gain.setValueAtTime(0.48, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Noise component
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Tonal snap component
    const tone = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(190, time);
    tone.frequency.exponentialRampToValueAtTime(80, time + 0.05);

    toneGain.gain.setValueAtTime(0.2, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    tone.connect(toneGain);
    toneGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.13);
    tone.start(time);
    tone.stop(time + 0.08);
  }

  private playHiHat(time: number, accent: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    const volume = accent ? 0.08 : 0.04;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (accent ? 0.06 : 0.035));

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + 0.07);
  }

  private playBassNote(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + duration);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playArpPluck(freq: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq * 2, time); // Bright octave

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.1);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playTransitionSweep(time: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(3200, time + 0.2);
    filter.Q.setValueAtTime(2.5, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.23);
  }

  private startAmbientPads() {
    if (!this.ctx || !this.masterGain || this.padOsc1) return;

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.setValueAtTime(550, this.ctx.currentTime);

    this.padOsc1 = this.ctx.createOscillator();
    this.padOsc1.type = "sawtooth";
    this.padOsc1.frequency.setValueAtTime(146.83, this.ctx.currentTime); // D3

    this.padOsc2 = this.ctx.createOscillator();
    this.padOsc2.type = "sawtooth";
    this.padOsc2.frequency.setValueAtTime(220.0, this.ctx.currentTime); // A3 (fifth)
    this.padOsc2.detune.setValueAtTime(9, this.ctx.currentTime); // Rich chorus detune

    this.padOsc1.connect(this.padFilter);
    this.padOsc2.connect(this.padFilter);
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.masterGain);

    this.padOsc1.start();
    this.padOsc2.start();
  }

  private stopAmbientPads() {
    if (this.padOsc1) {
      try {
        this.padOsc1.stop();
        this.padOsc1.disconnect();
      } catch {}
      this.padOsc1 = null;
    }
    if (this.padOsc2) {
      try {
        this.padOsc2.stop();
        this.padOsc2.disconnect();
      } catch {}
      this.padOsc2 = null;
    }
    if (this.padGain) {
      try {
        this.padGain.disconnect();
      } catch {}
      this.padGain = null;
    }
    if (this.padFilter) {
      try {
        this.padFilter.disconnect();
      } catch {}
      this.padFilter = null;
    }
  }

  // --- Live Event Fanfares for Big Screen Presentation ---

  /**
   * Triumphant fanfare when an agent successfully escapes the facility
   */
  public playCelebrationFanfare(): void {
    this.initAudio();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const fanfareNotes = [293.66, 369.99, 440.0, 587.33, 739.99]; // D4, F#4, A4, D5, F#5 (D Major Triumph)

    fanfareNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.compressor) return;
      const noteTime = now + idx * 0.08;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });

    // Shimmering sparkle burst
    if (this.noiseBuffer && this.compressor) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(3500, now + 0.4);
      filter.Q.setValueAtTime(3, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);

      noise.start(now + 0.38);
      noise.stop(now + 0.9);
    }
  }

  /**
   * Fanfare when a new participant claims the #1 Rank on the leaderboard
   */
  public playLeadChangeChime(): void {
    this.initAudio();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const chords = [
      [349.23, 440.0, 523.25], // F4, A4, C5 (F Major)
      [392.0, 493.88, 587.33], // G4, B4, D5 (G Major)
      [440.0, 554.37, 659.25], // A4, C#5, E5 (A Major)
    ];

    chords.forEach((chord, step) => {
      if (!this.ctx || !this.compressor) return;
      const stepTime = now + step * 0.14;

      chord.forEach((freq) => {
        if (!this.ctx || !this.compressor) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, stepTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1600, stepTime);

        gain.gain.setValueAtTime(0.18, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        osc.start(stepTime);
        osc.stop(stepTime + 0.42);
      });
    });
  }

  public dispose(): void {
    this.stop(0.1);
    if (this.ctx && this.ctx.state !== "closed") {
      try {
        this.ctx.close();
      } catch {}
    }
    this.ctx = null;
  }
}

let leaderboardAudioInstance: LeaderboardAudioEngine | null = null;

export function useLeaderboardAudio(): LeaderboardAudioEngine {
  if (!leaderboardAudioInstance) {
    leaderboardAudioInstance = new LeaderboardAudioEngine();
  }
  return leaderboardAudioInstance;
}

