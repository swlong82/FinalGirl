// Procedural horror soundscape. Everything is synthesized at runtime —
// no audio files, no licensing. Layers:
//   drone      – detuned saws, low-passed, slow filter LFO; darkens with horror
//   ambience   – wind (filtered noise), crickets, faint projector clatter
//   heartbeat  – rate & level follow horror
//   motif      – original slow minor music-box arpeggio with tape delay
//   stingers   – one-shots for game events

type Mood = { horror: number; finale: boolean; killerNear: boolean };

class AudioEngine {
  ctx?: AudioContext;
  master?: GainNode;
  musicBus?: GainNode;
  sfxBus?: GainNode;
  private droneFilter?: BiquadFilterNode;
  private droneGain?: GainNode;
  private droneOscs: OscillatorNode[] = [];
  private windGain?: GainNode;
  private noise?: AudioBuffer;
  private timers: number[] = [];
  private mood: Mood = { horror: 0, finale: false, killerNear: false };
  private nextBeat = 0;
  private motifStep = 0;
  private nextNote = 0;
  enabled = true;
  volume = 0.8;
  musicVolume = 0.7;

  get ready() {
    return !!this.ctx;
  }

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);

    // white noise buffer
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.buildDrone();
    this.buildWind();
    this.nextBeat = ctx.currentTime + 0.5;
    this.nextNote = ctx.currentTime + 2;
    this.timers.push(window.setInterval(() => this.schedule(), 100));
    this.timers.push(window.setInterval(() => this.cricket(), 2300));
    this.timers.push(window.setInterval(() => this.projectorClatter(), 6000));
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.2);
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx && this.enabled) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  setMood(m: Mood) {
    this.mood = m;
    const ctx = this.ctx;
    if (!ctx || !this.droneFilter || !this.droneGain || !this.windGain) return;
    const t = ctx.currentTime;
    const h = m.horror / 6;
    this.droneFilter.frequency.setTargetAtTime(160 + h * 520 + (m.finale ? 500 : 0), t, 1.5);
    this.droneGain.gain.setTargetAtTime(0.06 + h * 0.07 + (m.killerNear ? 0.05 : 0), t, 1);
    this.windGain.gain.setTargetAtTime(0.03 + h * 0.03, t, 2);
    const base = m.finale ? 41.2 : 55; // E1 in finale, A1 otherwise
    this.droneOscs.forEach((o, i) => o.frequency.setTargetAtTime(base * [1, 1.003, 1.5, 0.5][i], t, 2));
  }

  private buildDrone() {
    const ctx = this.ctx!;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 200;
    this.droneFilter.Q.value = 6;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.06;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(this.droneFilter.frequency);
    lfo.start();
    for (const [mul, type] of [[1, 'sawtooth'], [1.003, 'sawtooth'], [1.5, 'triangle'], [0.5, 'sine']] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 55 * mul;
      o.connect(this.droneFilter);
      o.start();
      this.droneOscs.push(o);
    }
    this.droneFilter.connect(this.droneGain).connect(this.musicBus!);
  }

  private buildWind() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lg = ctx.createGain();
    lg.gain.value = 250;
    lfo.connect(lg).connect(bp.frequency);
    lfo.start();
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.03;
    src.connect(bp).connect(this.windGain).connect(this.musicBus!);
    src.start();
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    const ahead = ctx.currentTime + 0.3;
    // heartbeat
    if (this.mood.horror >= 2 || this.mood.killerNear || this.mood.finale) {
      const bpm = 58 + this.mood.horror * 12 + (this.mood.killerNear ? 18 : 0) + (this.mood.finale ? 20 : 0);
      while (this.nextBeat < ahead) {
        const lvl = 0.25 + this.mood.horror * 0.06 + (this.mood.killerNear ? 0.15 : 0);
        this.thump(this.nextBeat, lvl);
        this.thump(this.nextBeat + 0.18, lvl * 0.65);
        this.nextBeat += 60 / bpm;
      }
    } else this.nextBeat = Math.max(this.nextBeat, ctx.currentTime);
    // motif: original slow arpeggio (A minor with a chromatic sigh). Plays sparser as horror grows.
    const MOTIF = [57, 60, 64, 69, 68, 64, 60, 59, 57, 60, 64, 71, 69, 65, 64, 63];
    while (this.nextNote < ahead) {
      const rest = this.mood.horror >= 4 && this.motifStep % 4 === 3;
      if (!rest) {
        let note = MOTIF[this.motifStep % MOTIF.length];
        if (this.mood.finale) note -= 1; // a semitone flat: everything sours
        this.bell(this.nextNote, note, this.mood.finale ? 0.05 : 0.07);
      }
      this.motifStep++;
      this.nextNote += this.mood.finale ? 0.42 : 0.62;
      if (this.motifStep % MOTIF.length === 0) this.nextNote += 6 + Math.random() * 6; // breathe between phrases
    }
  }

  private thump(t: number, lvl: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.musicBus!);
    o.start(t);
    o.stop(t + 0.25);
  }

  private bell(t: number, midi: number, lvl: number) {
    const ctx = this.ctx!;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    for (const [mul, a] of [[1, 1], [2.01, 0.35], [3.98, 0.12]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul + (Math.random() - 0.5) * 1.5; // slight warble = worn tape
      const og = ctx.createGain();
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 2.4);
    }
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.37;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = 1800;
    g.connect(this.musicBus!);
    g.connect(delay);
    delay.connect(lp).connect(fb).connect(delay);
    lp.connect(this.musicBus!);
  }

  private noiseBurst(t: number, dur: number, freq: number, q: number, lvl: number, bus = this.sfxBus!) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private cricket() {
    if (!this.ctx || this.mood.finale || Math.random() < 0.35 + this.mood.horror * 0.08) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.value = 4200 + Math.random() * 300;
      g.gain.setValueAtTime(0.0001, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.012, t + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.05);
      o.connect(g).connect(this.musicBus!);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.06);
    }
  }

  private projectorClatter() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 24; i++) this.noiseBurst(t + i * (1 / 24), 0.015, 2500, 3, 0.012, this.musicBus!);
  }

  // ── Stingers ──
  play(name: string) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'click':
        this.noiseBurst(t, 0.03, 3000, 4, 0.08);
        break;
      case 'card':
        this.noiseBurst(t, 0.25, 1800, 0.8, 0.12);
        break;
      case 'dice':
        for (let i = 0; i < 7; i++) this.noiseBurst(t + i * 0.06 + Math.random() * 0.03, 0.03, 2200 + Math.random() * 1500, 6, 0.18);
        break;
      case 'move':
        this.noiseBurst(t, 0.12, 300, 1, 0.12);
        this.noiseBurst(t + 0.28, 0.12, 280, 1, 0.1);
        break;
      case 'item':
        this.tone(t, 880, 0.15, 'triangle', 0.08);
        this.tone(t + 0.08, 1320, 0.25, 'triangle', 0.06);
        break;
      case 'killer': {
        // dissonant cluster swell + scraping noise
        for (const f of [110, 116.5, 155.6, 233]) this.tone(t, f, 2.2, 'sawtooth', 0.05, 0.6);
        this.noiseBurst(t, 1.6, 900, 2, 0.15);
        break;
      }
      case 'wound':
        this.tone(t, 90, 0.4, 'square', 0.2);
        this.noiseBurst(t, 0.25, 600, 1, 0.35);
        break;
      case 'hit':
        this.noiseBurst(t, 0.18, 1200, 1.2, 0.4);
        this.tone(t, 160, 0.25, 'triangle', 0.18);
        break;
      case 'slain': {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1400, t);
        o.frequency.exponentialRampToValueAtTime(260, t + 1.1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200;
        bp.Q.value = 2;
        o.connect(bp).connect(g).connect(this.sfxBus!);
        o.start(t);
        o.stop(t + 1.3);
        this.tone(t, 55, 1.5, 'sine', 0.25);
        break;
      }
      case 'saved':
        [57, 64, 69, 72].forEach((n, i) => this.tone(t + i * 0.09, 440 * Math.pow(2, (n - 69) / 12), 1.6, 'triangle', 0.06));
        break;
      case 'hide':
        this.noiseBurst(t, 0.8, 500, 0.5, 0.08);
        break;
      case 'stun':
        this.tone(t, 2400, 0.5, 'sine', 0.05);
        this.tone(t, 2470, 0.5, 'sine', 0.05);
        break;
      case 'finale':
        for (const f of [41.2, 43.65, 61.7, 82.4]) this.tone(t, f, 4, 'sawtooth', 0.09, 1.5);
        this.noiseBurst(t, 3, 200, 0.5, 0.2);
        break;
      case 'win':
        [57, 61, 64, 69, 73, 76].forEach((n, i) => this.tone(t + i * 0.15, 440 * Math.pow(2, (n - 69) / 12), 3, 'triangle', 0.06, 0.3));
        break;
      case 'lose':
        this.tone(t, 36, 4, 'sine', 0.35);
        for (const f of [73.4, 77.8]) this.tone(t, f, 4, 'sawtooth', 0.04, 1);
        break;
    }
  }

  private tone(t: number, f: number, dur: number, type: OscillatorType, lvl: number, attack = 0.01) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = 2400;
    o.connect(lp).connect(g).connect(this.sfxBus!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

export const audio = new AudioEngine();
