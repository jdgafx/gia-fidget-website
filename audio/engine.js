// audio/engine.js — Calming Web Audio Engine
// Detuned paired-tone chime feedback + fading ambient background drone.
// Persistent mute status.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('gia_fidget_muted') === 'true';
    this.ambientOscs = [];
    this.ambientGain = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.initAmbient();
  }

  initAmbient() {
    if (!this.ctx) return;

    this.ambientGain = this.ctx.createGain();
    // Start ambient low, swell it later.
    this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Create a detuned pair of soft low-frequency oscillators for a warm hum
    const freq = 110; // A2
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq - 1, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq + 1, this.ctx.currentTime);

    // Low-pass filter to make it super soft and warm
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.ambientGain);

    osc1.start();
    osc2.start();

    this.ambientOscs = [osc1, osc2];
  }

  playInteractionTone() {
    this.init();
    if (!this.ctx || this.muted) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    
    // Detuned sines (paired tones)
    const baseFreq = 330; // E4 (soothing, positive note)
    const detune = 4;     // 4Hz difference

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq - detune, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq + detune, now);

    // Soft envelope to avoid clicks
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  }

  swellAmbient() {
    this.init();
    if (!this.ctx || !this.ambientGain) return;
    // Passive mode: swell the ambient bed volume
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.linearRampToValueAtTime(0.25, now + 2.0);
  }

  normalizeAmbient() {
    this.init();
    if (!this.ctx || !this.ambientGain) return;
    // Active mode: return to soft hum
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('gia_fidget_muted', String(this.muted));
    
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.8, now + 0.15);
    }
    return this.muted;
  }
}
