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
//   For the dash / counter / perfect steps, if the player hasn't triggered the
//   step within 20 s a "? for demo" hint appears once; pressing ? (or the
//   prompt itself) queues the tip card for that mechanic.
//
// ONE-TIME TOASTS  (banner-style, fired on first trigger anywhere):
//   momentum | graze | flawless | evolve | mutation | draftHint
//
// TIP CARDS  (animated full-pause demo, replaces the toast for these ids):
//   dash | perfect_dodge | deflect | counter | charge | slam | execution |
//   wall_crunch | momentum
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

// One-time toast ids (plain banner; no tip card for these).
const TOAST_IDS = [
  'graze', 'flawless', 'evolve', 'mutation', 'draftHint',
  // Tier-3 combat mechanics that don't have a tip card yet
  'panic_fire', 'crumple', 'hemorrhage', 'overkill',
];

// Mechanic ids that trigger a FULL TIP CARD instead of a toast.
const TIP_CARD_IDS = [
  'dash', 'perfect_dodge', 'deflect', 'counter', 'charge',
  'slam', 'execution', 'wall_crunch', 'momentum', 'combo',
];

// Floor-1 steps that map to a tip card (so "? for demo" hint can be offered
// after 20 s of no action on that step).
const STEP_TIP_MAP = {
  dash:    'dash',
  counter: 'counter',
  perfect: 'perfect_dodge',
};

// Minimum gap between consecutive tip-card shows (ms). Prevents chain-nag.
const TIP_MIN_INTERVAL_MS = 10000;

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

    // Tip card queue + throttle
    this._tipQueue = [];       // mechanic ids waiting to be shown
    this._tipLastShownAt = 0;  // timestamp of the last tip card launch
    this._tipOpen = false;     // true while TipScene is live (prevents double-launch)

    // Per-step idle-demo timers: { [stepId]: { timer, hintObj, hintTween, fired } }
    this._stepIdleTimers = {};
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
    this._clearIdleTimers();
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
      // Cancel idle-demo hint for this step if still pending
      this._cancelIdleTimer(id);
      if (this._currentStep === id) {
        this._destroyPrompt();
        this._tickPrompt();
      }
    }
    // Tip-card mechanics (full pause demo, once per profile)
    if (TIP_CARD_IDS.includes(id) && !this._isDone(id)) {
      this._complete(id);
      this._enqueueTip(id);
    }
    // One-time plain toasts
    if (TOAST_IDS.includes(id) && !this._isDone(id)) {
      this._complete(id);
      this._showToast(id);
    }
  }

  // ── Tip card queue ────────────────────────────────────────────────────────

  _enqueueTip(mechanic) {
    if (!this._tipQueue.includes(mechanic)) {
      this._tipQueue.push(mechanic);
    }
  }

  _tryShowNextTip() {
    const scene = this._scene;
    if (!scene) return;
    if (this._tipOpen) return;
    if (this._tipQueue.length === 0) return;
    // Don't fire while a duel, upgrade, loot, or another modal is open
    if (scene.dueling || scene.levelingUp || scene.lootOpen) return;
    if (scene.gameOver || scene.stageCleared) return;
    // Rate-limit to avoid chaining tips
    const now = scene.time ? scene.time.now : Date.now();
    if (now - this._tipLastShownAt < TIP_MIN_INTERVAL_MS) return;

    const mechanic = this._tipQueue.shift();
    this._tipLastShownAt = now;
    this._tipOpen = true;
    scene.tipOpen = true;

    // Destroy bottom-lane prompt while the card is open (it will be rebuilt on resume)
    this._destroyPrompt();

    scene.scene.pause();
    scene.scene.launch('TipScene', { gameScene: scene, mechanic });

    // When TipScene stops, clear our _tipOpen flag and restore the prompt.
    // TipScene sets gs.tipOpen = false before resuming GameScene; we listen
    // for the GameScene resume event to reset our own flag and rebuild the prompt.
    scene.events.once('resume', () => {
      this._tipOpen = false;
      // Rebuild floor-1 prompt if a step is still pending
      if (scene.dungeonMode) {
        this._tickPrompt();
      }
      // Show next queued tip after the cooldown interval
    });
  }

  // ── Sequenced prompt ─────────────────────────────────────────────────────

  _tickPrompt() {
    // Find the first incomplete step.
    const step = STEP_ORDER.find((s) => !this._isDone(s));
    if (!step) return; // all done
    this._currentStep = step;
    this._showPrompt(step);
    // For dash / counter / perfect, start a 20-s idle timer.
    if (STEP_TIP_MAP[step]) {
      this._startIdleTimer(step);
    }
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

  // ── Idle-demo hint (20 s no-action → "? for demo" nudge) ─────────────────

  _startIdleTimer(step) {
    const scene = this._scene;
    if (!scene) return;
    if (this._stepIdleTimers[step]) return; // already running

    const timer = scene.time.delayedCall(20000, () => {
      if (this._isDone(step) || this._tipOpen) return;
      this._showIdleHint(step);
    });
    this._stepIdleTimers[step] = { timer, hintObj: null, hintTween: null, fired: false };
  }

  _cancelIdleTimer(step) {
    const entry = this._stepIdleTimers[step];
    if (!entry) return;
    if (entry.timer) entry.timer.remove(false);
    this._destroyIdleHint(step);
    delete this._stepIdleTimers[step];
  }

  _showIdleHint(step) {
    const scene = this._scene;
    if (!scene) return;
    const entry = this._stepIdleTimers[step];
    if (!entry) return;
    if (entry.fired) return;
    entry.fired = true;

    // Tiny hint below the main prompt: "Press ? to see a demo"
    const W = scene.scale.width;
    const Y = 508;
    const hobj = scene.add.text(W / 2, Y, '[ ? ] see animated demo', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.8)
      .setInteractive({ useHandCursor: true });

    hobj.on('pointerdown', () => {
      this._cancelIdleTimer(step);
      const mechanic = STEP_TIP_MAP[step];
      if (mechanic && !this._isDone(mechanic)) {
        this._complete(mechanic);
        this._enqueueTip(mechanic);
      }
    });

    const htw = scene.tweens.add({
      targets: hobj,
      alpha: 0.4,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    entry.hintObj = hobj;
    entry.hintTween = htw;

    // Keyboard ? also triggers it
    const qKey = scene.input.keyboard.addKey('QUESTION_MARK');
    if (qKey) {
      qKey.once('down', () => {
        this._cancelIdleTimer(step);
        const mechanic = STEP_TIP_MAP[step];
        if (mechanic && !this._isDone(mechanic)) {
          this._complete(mechanic);
          this._enqueueTip(mechanic);
        }
      });
    }
  }

  _destroyIdleHint(step) {
    const entry = this._stepIdleTimers[step];
    if (!entry) return;
    if (entry.hintTween) { entry.hintTween.remove(); entry.hintTween = null; }
    if (entry.hintObj) { entry.hintObj.destroy(); entry.hintObj = null; }
  }

  _clearIdleTimers() {
    for (const step of Object.keys(this._stepIdleTimers)) {
      this._cancelIdleTimer(step);
    }
  }

  // ── One-time toasts ──────────────────────────────────────────────────────

  _toastDef(id) {
    // Returns { text, color } for each toast id.
    switch (id) {
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
      case 'panic_fire':
        return { text: 'Panic Fire: feared enemies that are burning drop fire patches as they flee', color: '#ff6a00' };
      case 'crumple':
        return { text: 'Crumple: a charged shot on a stunned enemy extends the stun and hits harder', color: '#cc44ff' };
      case 'hemorrhage':
        return { text: 'Hemorrhage: 5 bleed stacks detonate for massive instant damage', color: '#cc1830' };
      case 'overkill':
        return { text: 'Overkill: excess damage from a kill bleeds 60% into the nearest enemy', color: '#ffd700' };
      default: return null;
    }
  }

  _showToast(id) {
    const scene = this._scene;
    if (!scene) return;
    const def = this._toastDef(id);
    if (!def) return;
    // Use GameScene.showBanner — routed through BannerQueue so only one banner
    // is visible at a time.  Tutorial toasts are low priority: dropped if the
    // queue is full or a stage-intro card is showing.
    if (typeof scene.showBanner === 'function') {
      scene.showBanner(def.text, def.color, 'low');
    }
  }

  // ── Public helpers ───────────────────────────────────────────────────────

  // Called from update() each frame when dungeonMode is active.  Rebuilds the
  // prompt if it was removed (e.g., scene restart after floor change) without a
  // 'tut' event having fired (i.e., the step is still pending).
  // Also drives the tip queue — at most one tip per 10 s.
  tick() {
    if (!this._scene || this._scene.duelTest) return;
    if (this._currentStep && !this._promptObj && !this._tipOpen) {
      this._showPrompt(this._currentStep);
    }
    // Drive tip queue
    if (this._tipQueue.length > 0 && !this._tipOpen) {
      this._tryShowNextTip();
    }
  }
}
