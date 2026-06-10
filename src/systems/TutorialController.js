// TutorialController — owns all tutorial/hint state for 8-Bit Dynasties.
//
// PERSISTENCE:  localStorage key '8bit_dynasties_tutorial_v1'.
//   Stores a flat object of completed-step flags that SURVIVE across runs.
//   Steps that are flagged done are never shown again until the player resets
//   from SettingsScene ("Reset Tutorial").
//
// SEQUENCED FLOOR-1 PROMPTS (dungeonMode only, not duelTest):
//   Each step displays a small, pulsing prompt at the bottom-centre of the
//   screen (above the HUD tracker).  Only one step is visible at a time; the
//   earliest incomplete step in the ordered list is shown.
//
//   Step ids (in order):  move | attack | dash | counter | perfect
//
// ONE-TIME TOASTS  (banner-style, fired on first trigger anywhere):
//   momentum | graze | flawless | evolve | mutation | draftHint
//
// HOOKS:  GameScene / UpgradeScene emit tiny 'tut' events this controller
//   listens to.  The hook lines are minimal — see GameScene / UpgradeScene
//   for the exact snippets.
//
// COMBAT MANUAL:  CombatManualScene (separate file) renders the full static
//   reference panel.  Opened from PauseScene and MenuScene.

import { Settings, keyLabel } from './Settings.js';

const STORAGE_KEY = '8bit_dynasties_tutorial_v1';

// Ordered floor-1 prompt sequence.
const STEP_ORDER = ['move', 'attack', 'dash', 'counter', 'perfect'];

// One-time toast ids.
const TOAST_IDS = ['momentum', 'graze', 'flawless', 'evolve', 'mutation', 'draftHint'];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

export function resetTutorial() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ── TutorialController ─────────────────────────────────────────────────────
// Attach one instance per GameScene.  Call attach(gameScene) in create(),
// detach() in shutdown.  Internally uses scene.events to listen for 'tut'
// events emitted by hooks in GameScene / Player / UpgradeScene.
export default class TutorialController {
  constructor() {
    this._state = load();
    this._scene = null;
    // The current visible prompt Phaser text object (and its tween).
    this._promptObj = null;
    this._promptTween = null;
    // Which step is currently displayed.
    this._currentStep = null;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  attach(scene) {
    this._scene = scene;
    // In duelTest mode the tutorial is suppressed entirely.
    if (scene.duelTest) return;
    // Only show sequenced prompts during dungeon runs.
    if (scene.dungeonMode) {
      this._tickPrompt();
    }
    // Always listen for toast triggers (draftHint from UpgradeScene comes
    // through GameScene.events via a re-emit; the rest originate in GameScene).
    scene.events.on('tut', this._onTutEvent, this);
  }

  detach() {
    if (this._scene) {
      this._scene.events.off('tut', this._onTutEvent, this);
    }
    this._destroyPrompt();
    this._scene = null;
  }

  // ── Step completion ──────────────────────────────────────────────────────

  _isDone(id) { return !!this._state[id]; }

  _complete(id) {
    if (this._isDone(id)) return;
    this._state[id] = true;
    save(this._state);
  }

  // ── Event listener ───────────────────────────────────────────────────────

  _onTutEvent(id) {
    // Sequenced steps
    if (STEP_ORDER.includes(id) && !this._isDone(id)) {
      this._complete(id);
      if (this._currentStep === id) {
        this._destroyPrompt();
        this._tickPrompt();
      }
    }
    // One-time toasts
    if (TOAST_IDS.includes(id) && !this._isDone(id)) {
      this._complete(id);
      this._showToast(id);
    }
  }

  // ── Sequenced prompt ─────────────────────────────────────────────────────

  _tickPrompt() {
    // Find the first incomplete step.
    const step = STEP_ORDER.find((s) => !this._isDone(s));
    if (!step) return; // all done
    this._currentStep = step;
    this._showPrompt(step);
  }

  _promptText(step) {
    const b = Settings.binds;
    const kPri  = keyLabel(b.primary);
    const kDash = keyLabel(b.dash);
    switch (step) {
      case 'move':    return 'Move with WASD to explore';
      case 'attack':  return `Hold [${kPri}] to attack`;
      case 'dash':    return `[${kDash}] DASH — i-frames protect you`;
      case 'counter': return 'Enemies flash red before striking — hit them THEN for a COUNTER';
      case 'perfect': return `DASH through an attack at the last instant → PERFECT`;
      default: return '';
    }
  }

  _showPrompt(step) {
    this._destroyPrompt();
    const scene = this._scene;
    if (!scene) return;
    const W = scene.scale.width;
    // Bottom-centre, above the bottom HUD tracker area (~bottom 52 px used by upgText).
    // Y = 490 leaves ~10 px above the tracker line at ~502 in 960x540 layout.
    const Y = 490;
    const txt = this._promptText(step);
    const obj = scene.add.text(W / 2, Y, txt, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e8e2ff',
      stroke: '#000000',
      strokeThickness: 3,
    })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.9);

    // Gentle pulse (alpha 0.9 ↔ 0.5, 1.1 s cycle).
    const tw = scene.tweens.add({
      targets: obj,
      alpha: 0.5,
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this._promptObj = obj;
    this._promptTween = tw;
  }

  _destroyPrompt() {
    if (this._promptTween) { this._promptTween.remove(); this._promptTween = null; }
    if (this._promptObj) { this._promptObj.destroy(); this._promptObj = null; }
    this._currentStep = null;
  }

  // ── One-time toasts ──────────────────────────────────────────────────────

  _toastDef(id) {
    // Returns { text, color } for each toast id.
    switch (id) {
      case 'momentum':
        return { text: 'Momentum: kills without taking damage empower you — don\'t get hit', color: '#ffe08a' };
      case 'graze':
        return { text: 'Graze: bullets that nearly miss charge your ultimate', color: '#00e5ff' };
      case 'flawless':
        return { text: 'Flawless Floor: clear a floor unhurt for a bonus chest', color: '#ffd700' };
      case 'evolve':
        return { text: 'EVOLVE: a maxed skill + artifact unlocks a golden evolution', color: '#ffd700' };
      case 'mutation':
        return { text: 'Mutation: rare purple cards permanently change your playstyle', color: '#cc88ff' };
      case 'draftHint':
        return { text: 'Draft: R reroll · B banish · L lock a card for next time', color: '#9a93c0' };
      default: return null;
    }
  }

  _showToast(id) {
    const scene = this._scene;
    if (!scene) return;
    const def = this._toastDef(id);
    if (!def) return;
    // Use GameScene.showBanner — same style as other mid-game feedback.
    // showBanner queues banners so they stack and don't overlap.
    if (typeof scene.showBanner === 'function') {
      scene.showBanner(def.text, def.color);
    }
  }

  // ── Public helpers ───────────────────────────────────────────────────────

  // Called from update() each frame when dungeonMode is active.  Rebuilds the
  // prompt if it was removed (e.g., scene restart after floor change) without a
  // 'tut' event having fired (i.e., the step is still pending).
  tick() {
    if (!this._scene || this._scene.duelTest) return;
    if (this._currentStep && !this._promptObj) {
      this._showPrompt(this._currentStep);
    }
  }
}
