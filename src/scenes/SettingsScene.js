import Phaser from 'phaser';
import { Settings, BINDABLE, keyLabel, eventToKeyName } from '../systems/Settings.js';
import { Audio } from '../systems/AudioManager.js';
import { resetTutorial } from '../systems/TutorialController.js';

// Settings: audio volume sliders (Master / Music / SFX) + rebindable combat keys.
// Reached from the title and from the pause overlay; returns to whichever opened it.
export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  init(data) {
    this.caller = (data && data.caller) || 'MenuScene';
    this.gs = (data && data.gameScene) || null; // present when opened from PauseScene
    this.listening = null; // action id currently awaiting a new key
    this._sliders = [];
    this._bindRows = [];
  }

  create() {
    const { width, height } = this.scale;
    Audio.resume(); // so volume tweaks are audible immediately

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.96).setOrigin(0);
    this.add.text(width / 2, 36, 'SETTINGS', {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.g = this.add.graphics().setDepth(1); // slider bars (redrawn on change)

    // ── AUDIO ──────────────────────────────────────────────────────────────
    // Layout is compressed vertically so the (now seven) rebind rows below clear the
    // footer buttons — the list had grown past the [ Back ] row and overlapped it.
    this.add.text(90, 80, 'AUDIO', { fontFamily: 'monospace', fontSize: '16px', color: '#8fe6ff', fontStyle: 'bold' });
    this._addSlider(96, 112, 'Master', 'master');
    this._addSlider(96, 150, 'Music', 'music');
    this._addSlider(96, 188, 'SFX', 'sfx');

    // ── CONTROLS ───────────────────────────────────────────────────────────
    this.add.text(90, 232, 'CONTROLS', { fontFamily: 'monospace', fontSize: '16px', color: '#8fe6ff', fontStyle: 'bold' });
    this.add.text(90, 256, 'Move: WASD / Arrows (fixed)  ·  attacks fire where you move', { fontFamily: 'monospace', fontSize: '11px', color: '#7d7896' });
    BINDABLE.forEach((b, i) => this._addBindRow(96, 280 + i * 28, b));

    // ── buttons ──────────────────────────────────────────────────────────────
    const reset = this.add.text(width / 2 - 220, height - 40, '[ Reset Defaults ]', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ff8a8a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    reset.on('pointerdown', () => { Settings.resetDefaults(); this._refreshAll(); });

    const tutReset = this.add.text(width / 2 - 50, height - 40, '[ Reset Tutorial ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#b9b3d8',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    tutReset.on('pointerover', () => tutReset.setColor('#ffffff'));
    tutReset.on('pointerout', () => tutReset.setColor('#b9b3d8'));
    tutReset.on('pointerdown', () => {
      resetTutorial();
      tutReset.setColor('#9ef58b');
      this.time.delayedCall(1200, () => { if (tutReset.active) tutReset.setColor('#b9b3d8'); });
    });

    const back = this.add.text(width / 2 + 180, height - 40, '[ Back ]', {
      fontFamily: 'monospace', fontSize: '18px', color: '#9ef58b', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this._close());

    this.add.text(width / 2, height - 16, 'Click a key to rebind  •  Esc to go back', {
      fontFamily: 'monospace', fontSize: '11px', color: '#7d7896',
    }).setOrigin(0.5);

    // slider dragging
    this.input.on('pointermove', (p) => { if (p.isDown && this._drag) this._applyDrag(p); });
    this.input.on('pointerdown', (p) => { if (this._drag) this._applyDrag(p); });
    this.input.on('pointerup', () => { this._drag = null; });

    // Esc: cancel a pending rebind, else leave
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.listening) { this.listening = null; this._refreshBinds(); }
      else this._close();
    });

    this._redrawSliders();
  }

  // ── audio sliders ─────────────────────────────────────────────────────────
  _addSlider(x, y, label, key) {
    const barX = x + 110, barW = 220;
    this.add.text(x, y - 8, label, { fontFamily: 'monospace', fontSize: '14px', color: '#dcd8ee' });
    const pct = this.add.text(barX + barW + 14, y - 8, '', { fontFamily: 'monospace', fontSize: '13px', color: '#9fd0ff' });
    // a wide hit zone over the bar for click + drag
    const zone = this.add.zone(barX, y - 12, barW, 26).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    const slider = { key, x: barX, y, w: barW, pct };
    zone.on('pointerdown', (p) => { this._drag = slider; this._applyDrag(p); });
    this._sliders.push(slider);
  }

  _applyDrag(pointer) {
    const s = this._drag;
    if (!s) return;
    const v = Phaser.Math.Clamp((pointer.x - s.x) / s.w, 0, 1);
    Settings.setVolume(s.key, v);
    this._redrawSliders();
  }

  _redrawSliders() {
    const g = this.g;
    g.clear();
    for (const s of this._sliders) {
      const v = Settings[s.key];
      g.fillStyle(0x1a1730, 1).fillRect(s.x, s.y - 4, s.w, 8);          // track
      g.fillStyle(0x4f9fd6, 1).fillRect(s.x, s.y - 4, s.w * v, 8);       // fill
      g.fillStyle(0xffffff, 1).fillCircle(s.x + s.w * v, s.y, 7);        // handle
      s.pct.setText(`${Math.round(v * 100)}%`);
    }
  }

  // ── key rebinding ───────────────────────────────────────────────────────────
  _addBindRow(x, y, b) {
    this.add.text(x, y, b.label, { fontFamily: 'monospace', fontSize: '13px', color: '#dcd8ee' });
    const keyTxt = this.add.text(x + 260, y, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd27a', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    keyTxt.on('pointerdown', () => this._beginRebind(b.id));
    this._bindRows.push({ id: b.id, txt: keyTxt });
    this._refreshBinds();
  }

  _beginRebind(action) {
    this.listening = action;
    this._refreshBinds();
    // capture the very next key press
    this.input.keyboard.once('keydown', (e) => {
      if (!this.listening) return;
      if (e.key === 'Escape') { this.listening = null; this._refreshBinds(); return; } // cancel
      const name = eventToKeyName(e);
      Settings.setBind(this.listening, name);
      this.listening = null;
      this._refreshBinds();
    });
  }

  _refreshBinds() {
    for (const row of this._bindRows) {
      if (this.listening === row.id) {
        row.txt.setText('press a key…').setColor('#9ef58b');
      } else {
        row.txt.setText(`[ ${keyLabel(Settings.binds[row.id])} ]`).setColor('#ffd27a');
      }
    }
  }

  _refreshAll() {
    this._redrawSliders();
    this._refreshBinds();
  }

  _close() {
    if (this.caller === 'PauseScene' && this.gs) {
      this.scene.start('PauseScene', { gameScene: this.gs });
    } else {
      this.scene.start('MenuScene');
    }
  }
}
