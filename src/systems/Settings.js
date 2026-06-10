// Player settings: audio volumes + combat keybindings. Persisted to localStorage so
// they survive across sessions. A single shared object is exported (like Save/Audio).
import { Audio } from './AudioManager.js';

const KEY = '8bit_dynasties_settings_v1';

// Binds are stored as Phaser key NAMES ('J', 'SPACE', 'UP', 'ESC', …) so they can be
// fed straight to input.keyboard.addKey(). Movement stays fixed (WASD + arrows).
const DEFAULTS = {
  master: 0.6, // 0..1
  music: 0.7,
  sfx: 1.0,
  binds: {
    primary: 'J',
    secondary: 'K',
    ultimate: 'L',
    dash: 'SHIFT',
    pause: 'ESC',
    focus: 'F',
  },
};

// The rebindable combat actions, in display order.
export const BINDABLE = [
  { id: 'primary', label: 'Primary attack (hold)' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'ultimate', label: 'Ultimate' },
  { id: 'dash', label: 'Dash (2 charges)' },
  { id: 'pause', label: 'Pause' },
  { id: 'focus', label: 'Focus Aim (lock direction)' },
];

function loadRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

class SettingsStore {
  constructor() {
    const saved = loadRaw() || {};
    this.master = saved.master != null ? clamp01(saved.master) : DEFAULTS.master;
    this.music = saved.music != null ? clamp01(saved.music) : DEFAULTS.music;
    this.sfx = saved.sfx != null ? clamp01(saved.sfx) : DEFAULTS.sfx;
    this.binds = { ...DEFAULTS.binds, ...(saved.binds || {}) };
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        master: this.master, music: this.music, sfx: this.sfx, binds: this.binds,
      }));
    } catch (e) { /* storage full / unavailable — settings just won't persist */ }
  }

  // push the current volumes into the audio engine
  applyAudio() {
    Audio.setVolumes({ master: this.master, music: this.music, sfx: this.sfx });
  }

  setVolume(kind, v) {
    this[kind] = clamp01(v);
    this.applyAudio();
    this.save();
  }

  bind(action) { return this.binds[action]; }

  setBind(action, keyName) {
    // prevent two actions sharing a key: if another action already uses it, swap
    for (const a of Object.keys(this.binds)) {
      if (a !== action && this.binds[a] === keyName) this.binds[a] = this.binds[action];
    }
    this.binds[action] = keyName;
    this.save();
  }

  resetDefaults() {
    this.master = DEFAULTS.master; this.music = DEFAULTS.music; this.sfx = DEFAULTS.sfx;
    this.binds = { ...DEFAULTS.binds };
    this.applyAudio();
    this.save();
  }
}

export const Settings = new SettingsStore();

// Convert a DOM keyboard event to a Phaser key NAME usable by addKey().
export function eventToKeyName(e) {
  const k = e.key;
  if (k === ' ' || e.code === 'Space') return 'SPACE';
  if (k === 'Escape') return 'ESC';
  if (k === 'ArrowUp') return 'UP';
  if (k === 'ArrowDown') return 'DOWN';
  if (k === 'ArrowLeft') return 'LEFT';
  if (k === 'ArrowRight') return 'RIGHT';
  if (k === 'Enter') return 'ENTER';
  if (k === 'Tab') return 'TAB';
  if (k === 'Shift') return 'SHIFT';
  if (k === 'Control') return 'CTRL';
  if (k === 'Alt') return 'ALT';
  if (k === 'Backspace') return 'BACKSPACE';
  if (/^[a-zA-Z]$/.test(k)) return k.toUpperCase();
  if (/^[0-9]$/.test(k)) return k;
  return k.toUpperCase();
}

// Friendly display label for a Phaser key name.
export function keyLabel(name) {
  const map = { SPACE: 'Space', ESC: 'Esc', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', ENTER: '↵' };
  return map[name] || name;
}
