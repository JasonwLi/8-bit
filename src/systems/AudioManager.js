// Procedural 8-bit audio via the Web Audio API. No asset files: SFX are short
// synthesized envelopes and music is a scheduled chiptune loop. A single shared
// instance is exported. Call resume() on a user gesture (browser autoplay rule).
//
// Music is data-driven: each civ has a theme in data/music.js (an 8-bit
// arrangement of a public-domain melody). setTheme() picks the civ; setIntensity()
// swaps between the normal arrangement and a derived boss "remix" of the same notes.
import { getThemeMusic, noteToFreq } from '../data/music.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null; // music voices route here → master
    this.sfxGain = null;   // sfx voices route here → master
    this.vol = { master: 0.6, music: 0.7, sfx: 1.0 }; // 0..1, overwritten by Settings
    this.muted = false;
    this.musicOn = false;
    this._throttle = {}; // name -> next-allowed timestamp
    this._musicTimer = null;
    this._step = 0;
    this._nextNoteTime = 0;
    this.intensity = 0; // 0 normal, 1 boss
    this._themeId = 'default';
    this._song = this.buildSong('default', 0); // {stepDur, lead[], bass[], ...}
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol.master;
    this.master.connect(this.ctx.destination);
    // sub-buses so Music and SFX volume can be set independently
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.vol.music;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.vol.sfx;
    this.sfxGain.connect(this.master);
  }

  // Set 0..1 volumes (any subset). Stores them and applies to live gain nodes.
  setVolumes({ master, music, sfx } = {}) {
    if (master != null) this.vol.master = master;
    if (music != null) this.vol.music = music;
    if (sfx != null) this.vol.sfx = sfx;
    if (this.master && !this.muted) this.master.gain.value = this.vol.master;
    if (this.musicGain) this.musicGain.gain.value = this.vol.music;
    if (this.sfxGain) this.sfxGain.gain.value = this.vol.sfx;
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.ensure();
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.vol.master;
    return this.muted;
  }

  // --- low-level voices ---
  _tone(freq, dur, { type = 'square', vol = 0.2, attack = 0.005, decay = null, sweepTo = null } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    // Anti-fatigue pitch jitter: ±8% randomisation so repeated SFX sound varied
    const jitter = 1 + (Math.random() * 0.16 - 0.08);
    osc.frequency.setValueAtTime(freq * jitter, t);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo * jitter), t + dur);
    const d = decay == null ? dur : decay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + d + 0.02);
  }

  // Bandpass-filtered noise burst — adds a crisp "crack" layer to hits
  _bpNoise(dur, { vol = 0.15, centerFreq = 2400, q = 2.5 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = centerFreq; filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start(t); src.stop(t + dur);
  }

  // --- Charge hum: a persistent oscillator that tracks charge progress ---
  startChargeHum() {
    this.ensure();
    if (!this.ctx || this.muted || this._chargeOsc) return;
    this._chargeOsc = this.ctx.createOscillator();
    this._chargeGain = this.ctx.createGain();
    this._chargeOsc.type = 'sine';
    this._chargeOsc.frequency.value = 180;
    this._chargeGain.gain.value = 0.0001;
    this._chargeOsc.connect(this._chargeGain).connect(this.sfxGain);
    this._chargeOsc.start();
  }

  updateChargeHum(fraction) { // fraction 0..1
    if (!this._chargeOsc || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._chargeOsc.frequency.setTargetAtTime(180 + fraction * 240, t, 0.05);
    this._chargeGain.gain.setTargetAtTime(fraction * 0.12, t, 0.04);
  }

  stopChargeHum() {
    if (!this._chargeOsc || !this.ctx) return;
    try {
      this._chargeGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02);
      this._chargeOsc.stop(this.ctx.currentTime + 0.06);
    } catch (e) { /* already stopped */ }
    this._chargeOsc = null; this._chargeGain = null;
  }

  // --- Hit-rate ducking: slide sfxGain down in crowd combat, recover when quiet ---
  _trackHitRate(now) {
    this._hitTimes = (this._hitTimes || []).filter(t => now - t < 1000);
    this._hitTimes.push(now);
    const rate = this._hitTimes.length;
    if (this.sfxGain && this.ctx) {
      const target = rate > 6 ? Math.max(0.5, 1 - (rate - 6) * 0.06) : 1.0;
      this.sfxGain.gain.setTargetAtTime(target * this.vol.sfx, this.ctx.currentTime, 0.08);
    }
  }

  _noise(dur, { vol = 0.2, lowpass = 2200 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur);
  }

  // Rate-limit spammy SFX (shoot/hit) so dense combat doesn't overload audio.
  _ok(name, ms) {
    const now = performance.now();
    if (this._throttle[name] && now < this._throttle[name]) return false;
    this._throttle[name] = now + ms;
    return true;
  }

  sfx(name) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'shoot':
        if (!this._ok('shoot', 70)) return;
        this._tone(680, 0.08, { type: 'square', vol: 0.08, sweepTo: 320, decay: 0.08 });
        break;
      case 'melee':
        if (!this._ok('melee', 90)) return;
        // Swing whoosh + noise + impact thud
        this._tone(1100, 0.09, { type: 'sine', vol: 0.09, sweepTo: 280, decay: 0.09 });
        this._noise(0.08, { vol: 0.07, lowpass: 5000 });
        this._tone(180, 0.08, { type: 'sawtooth', vol: 0.05, sweepTo: 100 });
        break;
      case 'hit':
        if (!this._ok('hit', 45)) return;
        // Layered: low thud + mid crack + occasional high tick (anti-fatigue)
        this._tone(95, 0.06, { type: 'sine', vol: 0.14, sweepTo: 55, decay: 0.05, attack: 0.003 });
        this._bpNoise(0.04, { vol: 0.12, centerFreq: 1800, q: 2 });
        this._hitTickPhase = ((this._hitTickPhase || 0) + 1) % 3;
        if (this._hitTickPhase === 0) {
          this._tone(3200, 0.018, { type: 'square', vol: 0.04, decay: 0.015 });
        }
        break;
      case 'hit_heavy':
        if (!this._ok('hit_heavy', 60)) return;
        // Heavier sub-thud + stronger crack + sub-drop for weight
        this._tone(70, 0.10, { type: 'sine', vol: 0.22, sweepTo: 38, decay: 0.09, attack: 0.004 });
        this._bpNoise(0.06, { vol: 0.20, centerFreq: 1400, q: 1.8 });
        this._tone(42, 0.12, { type: 'sine', vol: 0.10, sweepTo: 28, decay: 0.12 });
        break;
      case 'kill':
        if (!this._ok('kill', 30)) return;
        this._tone(80, 0.08, { type: 'sine', vol: 0.16, sweepTo: 40, decay: 0.08 });
        this._tone(520, 0.06, { type: 'sawtooth', vol: 0.08, sweepTo: 200, decay: 0.06 });
        break;
      case 'counter':
        // Counter-hit clash ring — replaces the raw 'hit' that used to fire there
        this._tone(1480, 0.07, { type: 'square', vol: 0.16, sweepTo: 880, decay: 0.16 });
        this._noise(0.06, { vol: 0.09, lowpass: 5500 });
        this._tone(340, 0.08, { type: 'triangle', vol: 0.10, sweepTo: 220, decay: 0.08 });
        break;
      case 'execution':
        // Dash-execution finisher — replaces 'parry' on the execution path
        this._tone(1200, 0.05, { type: 'square', vol: 0.18, sweepTo: 600, decay: 0.12 });
        this._noise(0.07, { vol: 0.12, lowpass: 6000 });
        this._tone(200, 0.14, { type: 'sine', vol: 0.14, sweepTo: 80, decay: 0.14 });
        break;
      case 'pickup':
        if (!this._ok('pickup', 40)) return;
        this._tone(880, 0.06, { type: 'square', vol: 0.06, sweepTo: 1320, decay: 0.06 });
        break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.18, { type: 'square', vol: 0.14 }), i * 70)
        );
        break;
      case 'equip':
        this._tone(440, 0.1, { type: 'triangle', vol: 0.12, sweepTo: 660 });
        break;
      case 'hurt':
        if (!this._ok('hurt', 200)) return;
        this._tone(180, 0.18, { type: 'sawtooth', vol: 0.16, sweepTo: 70 });
        break;
      case 'dodge':
        if (!this._ok('dodge', 120)) return;
        this._tone(900, 0.07, { type: 'sine', vol: 0.08, sweepTo: 1500 });
        break;
      case 'boss':
        [110, 110, 146, 110].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.3, { type: 'square', vol: 0.2 }), i * 180)
        );
        this._noise(0.6, { vol: 0.12, lowpass: 800 });
        break;
      case 'bossdown':
        [784, 659, 523, 392, 523, 784].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.22, { type: 'square', vol: 0.16 }), i * 90)
        );
        break;
      case 'death':
        [392, 330, 262, 196].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.3, { type: 'triangle', vol: 0.18, sweepTo: f * 0.6 }), i * 140)
        );
        break;

      // Item 5: new procedural SFX
      case 'descend':
        // Low stone-grind sweep — a slow downward rumble, like a heavy slab sliding shut.
        this._tone(180, 0.55, { type: 'sawtooth', vol: 0.18, sweepTo: 55 });
        this._noise(0.5, { vol: 0.10, lowpass: 900 });
        break;
      case 'empower':
        // Bright power chord — an ascending triad burst when the musou window opens.
        [330, 415, 523].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.28, { type: 'square', vol: 0.15, sweepTo: f * 1.35 }), i * 55)
        );
        break;
      case 'resonance':
        // Resonance synergy unlock — a shimmering bell arpeggio.
        [880, 1108, 1320, 1760].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.22, { type: 'sine', vol: 0.13, attack: 0.02 }), i * 65)
        );
        break;
      case 'elite':
        // Menacing low sting — a sub-bass drone + a harsh descending tone.
        if (!this._ok('elite', 1000)) return; // throttle: at most once per second
        this._tone(110, 0.35, { type: 'sawtooth', vol: 0.16, sweepTo: 72 });
        this._noise(0.28, { vol: 0.08, lowpass: 600 });
        break;
      case 'heartbeat':
        // Near-death heartbeat thump — a single dull kick.
        if (!this._ok('heartbeat', 800)) return;
        this._tone(80, 0.14, { type: 'sine', vol: 0.22, sweepTo: 48, decay: 0.12 });
        break;
      case 'parry':
        // Duel parry counter-hit — a sharp metallic clash ring.
        this._tone(1480, 0.06, { type: 'square', vol: 0.14, sweepTo: 880, decay: 0.14 });
        this._noise(0.06, { vol: 0.08, lowpass: 5000 });
        break;
      case 'whoosh':
        // Dash whoosh — a quick high-pitched air burst sweep.
        if (!this._ok('whoosh', 80)) return;
        this._tone(1200, 0.12, { type: 'sine', vol: 0.11, sweepTo: 320, decay: 0.10 });
        this._noise(0.08, { vol: 0.05, lowpass: 6000 });
        break;
      case 'evolve':
        // Triumphant evolution chord — a rising four-note fanfare followed by a shimmering
        // sustain. Conveys permanent power rather than the brief 'levelup' arpeggio.
        [392, 523, 659, 784].forEach((f, i) =>
          setTimeout(() => this._tone(f, 0.32, { type: 'square', vol: 0.16, sweepTo: f * 1.25 }), i * 80)
        );
        setTimeout(() => {
          // sustain: a bright triangle pad ring that fades over ~0.6s
          [784, 988, 1318].forEach((f, j) =>
            this._tone(f, 0.6, { type: 'triangle', vol: 0.09 - j * 0.02, attack: 0.04 })
          );
        }, 360);
        break;

      default:
        break;
    }
  }

  // --- music: data-driven chiptune loop ---

  // Precompute a playable arrangement (frequency arrays + voicing) from a theme.
  // boss=1 derives the "remix": the same notes, faster, with heavier voicing and
  // percussion layered in by the scheduler.
  buildSong(themeId, boss) {
    const t = getThemeMusic(themeId);
    const bpm = boss ? t.bossBpm : t.bpm;
    return {
      stepDur: 60 / bpm / 2, // eighth notes
      lead: t.leadNotes.map(noteToFreq),
      bass: t.bassNotes.map(noteToFreq),
      chords: (t.chords || []).map((c) => c.map(noteToFreq)), // per-bar chord tones
      leadType: t.lead.type,
      leadVol: boss ? t.lead.vol * 1.2 : t.lead.vol,
      leadDetune: t.lead.detune || 0,
      bassType: boss ? 'sawtooth' : t.bass.type,
      bassVol: boss ? t.bass.vol * 1.15 : t.bass.vol,
      arpType: (t.arp && t.arp.type) || 'square',
      arpVol: t.arp ? (boss ? t.arp.vol * 1.2 : t.arp.vol) : 0,
      padType: (t.pad && t.pad.type) || 'triangle',
      padVol: t.pad ? t.pad.vol : 0,
      // 'none' | 'light' | 'heavy' — heavy whenever a boss is present
      drums: boss ? 'heavy' : (t.drumsNormal ? 'light' : 'none'),
      boss: !!boss,
    };
  }

  _rebuild() {
    this._song = this.buildSong(this._themeId, this.intensity);
  }

  // Switch to a civilization's theme (themeId from data/themes.js: china, japan,
  // byzantium, sumer, or default). Restarts the melody cleanly from the top.
  setTheme(id) {
    if (id === this._themeId) return;
    this._themeId = id;
    this._step = 0;
    this._rebuild();
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this._step = 0;
    this._rebuild();
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.musicOn) return;
      this._scheduler();
      this._musicTimer = setTimeout(tick, 25);
    };
    tick();
  }

  stopMusic() {
    this.musicOn = false;
    if (this._musicTimer) clearTimeout(this._musicTimer);
    this._musicTimer = null;
  }

  // 0 = normal, 1 = boss. Swaps the active arrangement in place (melody keeps
  // playing from the current step, but voicing/tempo/percussion change).
  setIntensity(v) {
    if (v === this.intensity) return;
    this.intensity = v;
    this._rebuild();
  }

  _scheduler() {
    const song = this._song;
    const sd = song.stepDur;
    while (this._nextNoteTime < this.ctx.currentTime + 0.1) {
      const when = this._nextNoteTime;
      const s = this._step;

      // LEAD (melody), fattened with a detuned partner; boss adds an octave-down double
      const lf = song.lead[s % song.lead.length];
      if (lf) {
        this._toneAt(lf, when, sd * 0.9, { type: song.leadType, vol: song.leadVol, detune: song.leadDetune });
        if (song.boss) this._toneAt(lf / 2, when, sd * 0.9, { type: 'square', vol: song.leadVol * 0.4 });
      }

      // BASS (root motion); boss adds a sub-octave saw for menace
      const bf = song.bass[s % song.bass.length];
      if (bf) {
        this._toneAt(bf, when, sd * 1.6, { type: song.bassType, vol: song.bassVol });
        if (song.boss) this._toneAt(bf / 2, when, sd * 1.6, { type: 'sawtooth', vol: song.bassVol * 0.6 });
      }

      // CHORD-DERIVED layers: a sustained pad (once per bar) + a fast arpeggio
      if (song.chords.length) {
        const chord = song.chords[Math.floor(s / 8) % song.chords.length];
        if (chord.length) {
          if (s % 8 === 0 && song.padVol) {
            // pad bed: root + top of the chord, held for the whole bar
            this._padAt(chord[0], when, sd * 8, { type: song.padType, vol: song.padVol });
            this._padAt(chord[chord.length - 1], when, sd * 8, { type: song.padType, vol: song.padVol * 0.75 });
          }
          if (song.arpVol) {
            // arpeggio shimmer: cycle chord tones an octave up, two notes per step (16ths)
            this._toneAt(chord[s % chord.length] * 2, when, sd * 0.45, { type: song.arpType, vol: song.arpVol });
            this._toneAt(chord[(s + 1) % chord.length] * 2, when + sd * 0.5, sd * 0.45, { type: song.arpType, vol: song.arpVol * 0.85 });
          }
        }
      }

      // DRUMS
      if (song.drums === 'heavy') {
        if (s % 2 === 0) this._kickAt(when, 0.18); // four-on-the-floor
        else this._noiseAt(when, 0.03, 0.06); // offbeat hat
        if (s % 8 === 4) this._snareAt(when); // backbeat snare
      } else if (song.drums === 'light') {
        if (s % 8 === 0) this._kickAt(when, 0.1); // gentle downbeat pulse
        if (s % 2 === 1) this._noiseAt(when, 0.018, 0.02); // soft offbeat tick
      }

      this._nextNoteTime += sd;
      this._step++;
    }
  }

  _kickAt(when, gain = 0.18) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + 0.16);
  }

  // Snare: a short noise burst with a faint tonal "crack".
  _snareAt(when) {
    if (!this.ctx || this.muted) return;
    this._noiseAt(when, 0.08, 0.07);
    this._toneAt(180, when, 0.06, { type: 'triangle', vol: 0.05 });
  }

  // Sustained chord voice: slow attack, hold, gentle release (a pad bed).
  _padAt(freq, when, dur, { type = 'triangle', vol = 0.03 } = {}) {
    if (!this.ctx || this.muted || !freq) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + Math.min(0.12, dur * 0.25));
    g.gain.setValueAtTime(vol, when + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  _toneAt(freq, when, dur, { type = 'square', vol = 0.05, detune = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    this._osc(freq, when, dur, type, vol);
    // a slightly detuned partner thickens the tone (chorus/PWM-like richness)
    if (detune) this._osc(freq * Math.pow(2, detune / 1200), when, dur, type, vol * 0.6);
  }

  _osc(freq, when, dur, type, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  _noiseAt(when, dur, vol) {
    if (!this.ctx || this.muted) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(g).connect(this.musicGain);
    src.start(when);
    src.stop(when + dur);
  }
}

export const Audio = new AudioManager();
