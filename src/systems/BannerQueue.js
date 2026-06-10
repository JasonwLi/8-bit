// BannerQueue — one banner visible at a time in the centre-top lane.
//
// PRIORITY CLASSES
//   'critical'  — boss challenge/duel text, death, conquest. Bypasses the queue,
//                 clears any queued normal/low item, and shows immediately.
//   'normal'    — floor banners, dialogue quotes, flawless, resonance, mutation,
//                 skill evolution, ambush, treasure, trap, boss defeat.
//   'low'       — tutorial toasts, elite spawns, hazard warning, misc.
//
// LANES
//   Main lane   — handled entirely by this class (centre, y≈188 in 960×540).
//   Side lane   — compact right-edge notices for elite-spawn banners.
//   Speech lane — showSpeechText() above the player; stays as-is, separate.
//   Prompt lane — bottom tutorial step prompt; stays as-is, separate.
//
// STAGE-INTRO SUPPRESSION
//   During the 2.5s stage intro card call setIntroActive(true)/setIntroActive(false).
//   normal/low items arriving during that window are queued (up to 4); they
//   flush in order once the card fades.
//
// QUEUE LIMITS
//   low items are DROPPED when the main queue depth ≥ 3 or the intro card is up.
//   normal items are queued without limit but won't pre-empt a running item.
//
// CROSSFADE
//   Each banner fades out over 150ms then the next one fades in over 150ms.

const BANNER_DURATION = 1600;   // ms a banner is fully visible
const CROSSFADE_MS    = 150;    // fade out + fade in between queued items
const MAIN_Y          = 188;    // centre-top Y in 960×540 internal res
const MAIN_DEPTH      = 50;
const SIDE_X_FRAC     = 0.97;   // right-edge fraction of screen width
const SIDE_Y_START    = 130;    // top of the side-notice column
const SIDE_GAP        = 22;     // vertical gap between stacked side notices
const SIDE_DEPTH      = 50;
const SIDE_DURATION   = 2800;   // ms a side notice lives
const LOW_QUEUE_CAP   = 3;      // drop low items if main queue ≥ this

export default class BannerQueue {
  constructor(scene) {
    this._s = scene;

    // Main lane state
    this._queue   = [];     // { text, color, priority }
    this._current = null;   // live Phaser.Text object
    this._running = false;  // true while a banner is on screen or cross-fading
    this._introActive = false;

    // Side lane state (elite notices)
    this._side = [];        // live side-notice Phaser.Text objects
  }

  // ── Public API ────────────────────────────────────────────────────────────

  // Push a banner to the main lane.
  // priority: 'critical' | 'normal' | 'low'
  push(text, color, priority = 'normal') {
    if (!text) return;
    const s = this._s;
    if (!s || s.gameOver) return;

    if (priority === 'critical') {
      // Critical: flush the queue, kill the running banner immediately, show now.
      this._queue = this._queue.filter((q) => q.priority === 'critical'); // keep only other criticals
      this._killCurrent();
      this._queue.unshift({ text, color, priority });
      this._next();
      return;
    }

    // During stage intro card: suppress normal/low (queue normal, drop low silently)
    if (this._introActive) {
      if (priority === 'low') return; // drop
      // queue normal items (cap at 4 to avoid a wall of banners after the card)
      const normalPending = this._queue.filter((q) => q.priority === 'normal').length;
      if (normalPending < 4) this._queue.push({ text, color, priority });
      return;
    }

    if (priority === 'low') {
      // Drop if queue is getting long
      if (this._queue.length >= LOW_QUEUE_CAP) return;
    }

    this._queue.push({ text, color, priority });
    if (!this._running) this._next();
  }

  // Push a compact right-edge elite notice (separate lane, never queued through main).
  pushSide(text, color = '#ffd54a') {
    if (!text) return;
    const s = this._s;
    if (!s || s.gameOver) return;
    // Throttle: keep at most 3 side notices visible simultaneously
    if (this._side.length >= 3) return;

    const idx = this._side.length;
    const y = SIDE_Y_START + idx * SIDE_GAP;
    const t = s.add.text(
      s.scale.width * SIDE_X_FRAC, y, text,
      { fontFamily: 'monospace', fontSize: '11px', color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2 },
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(SIDE_DEPTH).setAlpha(0.9);

    this._side.push(t);
    s.tweens.add({
      targets: t,
      alpha: 0,
      delay: SIDE_DURATION - 400,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        const i = this._side.indexOf(t);
        if (i !== -1) this._side.splice(i, 1);
        if (t.active) t.destroy();
      },
    });
  }

  // Called by _showStageIntroCard at the start/end of the cinematic card.
  setIntroActive(active) {
    this._introActive = active;
    if (!active) {
      // Flush any queued banners that were held during the intro
      if (!this._running) this._next();
    }
  }

  // Tear down everything (scene shutdown).
  destroy() {
    this._killCurrent();
    this._queue = [];
    for (const t of this._side) { if (t && t.active) t.destroy(); }
    this._side = [];
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _next() {
    if (this._queue.length === 0) { this._running = false; return; }
    const item = this._queue.shift();
    this._running = true;
    this._show(item);
  }

  _show({ text, color }) {
    const s = this._s;
    if (!s || s.gameOver) { this._running = false; return; }

    const t = s.add.text(
      s.scale.width / 2, MAIN_Y, text,
      { fontFamily: 'monospace', fontSize: '24px', color, fontStyle: 'bold' },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(MAIN_DEPTH).setAlpha(0);

    this._current = t;

    // Fade in
    s.tweens.add({
      targets: t,
      alpha: 1,
      duration: CROSSFADE_MS,
      onComplete: () => {
        // Hold, then fade out
        s.tweens.add({
          targets: t,
          alpha: 0,
          delay: BANNER_DURATION,
          duration: CROSSFADE_MS,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (t === this._current) this._current = null;
            if (t.active) t.destroy();
            // Small gap then show the next
            s.time.delayedCall(60, () => this._next());
          },
        });
      },
    });
  }

  _killCurrent() {
    if (this._current) {
      const s = this._s;
      if (s) s.tweens.killTweensOf(this._current);
      if (this._current.active) this._current.destroy();
      this._current = null;
    }
    this._running = false;
  }
}
