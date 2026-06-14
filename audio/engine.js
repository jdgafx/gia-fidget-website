// audio/engine.js — Lullatone-style audio feedback.
// Lazy-creates AudioContext on first user gesture.
// Paired tones: two detuned sine oscillators, attack ~80ms, release ~300ms.
// Ambient bed: very quiet LFO-modulated sine at 110Hz.
// Mute state persisted to localStorage key `gia-audio-muted`.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.ambientOsc = null;
    this.ambientLfo = null;
    this.ambientLfoGain = null;
    this.baseAmbientVolume = 0.03;

    // Restore mute state (wrapped for Safari private browsing).
    try {
      this.muted = localStorage.getItem('gia-audio-muted') === '1';
    } catch {}
  }

  _ensureCtx() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio not supported — zero fail state.
      this.ctx = null;
    }
  }

  _resumeCtx() {
    this._ensureCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch {}
    }
  }

  playNote(freq, duration = 0.3, type = 'sine') {
    this._resumeCtx();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = type;
    osc2.type = type;
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.003; // slight detune

    // Attack ~80ms, release ~300ms.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.08);
    gain.gain.setValueAtTime(0.15, now + duration - 0.08);
    gain.gain.linearRampToValueAtTime(0, now + duration + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.35);
    osc2.stop(now + duration + 0.35);
  }

  playDragTone() {
    // Soft paired tone for drag interaction.
    const freq = 220 + Math.random() * 110; // A3–C4 range
    this.playNote(freq, 0.2, 'sine');
  }

  playReleaseTone() {
    // Softer release tone.
    const freq = 330 + Math.random() * 55;
    this.playNote(freq, 0.15, 'sine');
  }

  startAmbientBed() {
    this._resumeCtx();
    if (!this.ctx || this.ambientOsc) return;

    try {
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();
      this.ambientLfo = this.ctx.createOscillator();
      this.ambientLfoGain = this.ctx.createGain();

      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.value = 110;

      this.ambientLfo.type = 'sine';
      this.ambientLfo.frequency.value = 0.1; // very slow LFO
      this.ambientLfoGain.gain.value = 8; // ±8 Hz modulation

      this.ambientLfo.connect(this.ambientLfoGain);
      this.ambientLfoGain.connect(this.ambientOsc.frequency);

      this.ambientGain.gain.value = this.baseAmbientVolume;
      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc.start();
      this.ambientLfo.start();
    } catch {}
  }

  stopAmbientBed() {
    try {
      if (this.ambientOsc) { this.ambientOsc.stop(); this.ambientOsc = null; }
      if (this.ambientLfo) { this.ambientLfo.stop(); this.ambientLfo = null; }
      this.ambientGain = null;
      this.ambientLfoGain = null;
    } catch {}
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 1;
    }
    try {
      localStorage.setItem('gia-audio-muted', this.muted ? '1' : '0');
    } catch {}
    return this.muted;
  }

  swellAmbient() {
    // Increase ambient bed volume by 20%.
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.baseAmbientVolume * 1.2;
    }
  }

  restoreAmbientVolume() {
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.baseAmbientVolume;
    }
  }

  destroy() {
    this.stopAmbientBed();
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}
