import Phaser from 'phaser';
import { drawPanel } from '../art/ui.js';
import { rollOmens } from '../data/omens.js';
import { rollItem } from '../data/equipment.js';
import { Audio } from '../systems/AudioManager.js';

// ── OmenScene ─────────────────────────────────────────────────────────────────
// Modal overlay shown at the very start of a fresh run (stage 1, floor 1 only).
// Pauses GameScene, presents 3 random War Omens, player picks one. The chosen
// omen's effect is applied once via omen.apply(run, player) before resume.
// Dismissed only by selecting an omen — no Esc shortcut (choice is mandatory).

const W = 960;
const H = 540;

export default class OmenScene extends Phaser.Scene {
  constructor() { super('OmenScene'); }

  init(data) {
    this.gs = data.gameScene;
    this._omens = data.omens || rollOmens(3);
  }

  create() {
    const gs = this.gs;
    const accent = gs.theme ? gs.theme.accent : 0xffd700;

    Audio.sfx('levelup');

    // Dim overlay
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.92).setOrigin(0).setDepth(0);

    // Header
    const hg = this.add.graphics().setDepth(1);
    drawPanel(hg, W / 2 - 300, 22, 600, 56, 0xb05aff, { header: 56, radius: 8 });

    this.add.text(W / 2, 30, 'WAR OMEN', {
      fontFamily: 'monospace', fontSize: '11px', color: '#9a6abf',
    }).setOrigin(0.5, 0).setDepth(2);

    this.add.text(W / 2, 48, 'Choose the fate that follows your campaign', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(2);

    // Omen cards
    const omens = this._omens;
    const cardW = 250;
    const cardH = 240;
    const gap = 22;
    const total = omens.length * cardW + (omens.length - 1) * gap;
    const startX = (W - total) / 2 + cardW / 2;
    const cy = H / 2 + 30;

    omens.forEach((omen, i) => {
      this._buildOmenCard(startX + i * (cardW + gap), cy, cardW, cardH, omen, i + 1, accent);
    });

    // Hint row
    const hints = omens.map((_, i) => `[${i + 1}]`).join('  ');
    this.add.text(W / 2, H - 26, `${hints}  or click a card  —  this choice lasts the whole run`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#66607a',
    }).setOrigin(0.5, 1).setDepth(2);

    // Keyboard shortcuts
    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= omens.length) this._pick(omens[n - 1]);
    });
  }

  _buildOmenCard(cx, cy, w, h, omen, num, accent) {
    const top = cy - h / 2;
    const g = this.add.graphics().setDepth(1);
    drawPanel(g, cx - w / 2, top, w, h, omen.color, { header: 34, radius: 10 });

    // Number
    this.add.text(cx, top + 18, `${num}.`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd27a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Emblem icon (fall back to a coloured pip when the texture is missing)
    const iconKey = `omen_${omen.id}`;
    if (this.textures.exists(iconKey)) {
      this.add.image(cx, top + 72, iconKey).setDepth(2).setDisplaySize(44, 44);
    } else {
      const pipG = this.add.graphics().setDepth(2);
      pipG.fillStyle(omen.color, 0.85);
      pipG.fillCircle(cx, top + 72, 20);
      pipG.lineStyle(2, 0xffffff, 0.5);
      pipG.strokeCircle(cx, top + 72, 20);
    }

    // Name
    this.add.text(cx, top + 102, omen.name, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5).setDepth(2);

    // Description
    this.add.text(cx, top + 128, omen.desc, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0).setDepth(2);

    // Hover + click
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(3);
    zone.on('pointerover', () => { g.setAlpha(0.80); });
    zone.on('pointerout', () => { g.setAlpha(1); });
    zone.on('pointerdown', () => this._pick(omen));
  }

  _pick(omen) {
    const gs = this.gs;
    const run = gs.run;

    // Record the omen on the run (persisted via captureRunState)
    run.omen = omen.id;

    // Apply the omen's effect now (player + run already exist)
    try {
      omen.apply(run, gs.player);
    } catch (err) {
      // If apply() throws we still close gracefully
      console.warn('[OmenScene] omen.apply error:', err);
    }

    // Handle Old Wounds special: roll + equip a relic item immediately
    if (omen.id === 'old_wounds') {
      const depth = gs.conquestDepth || 0;
      const relicItem = rollItem(depth * 0.3 + 40, null, 1 + depth * 0.012);
      const current = gs.player.equipment[relicItem.slot];
      if (!current) {
        gs.player.equip(relicItem);
      }
    }

    // Iron Spine: run._omenIronSpine flag is read by WeaponSystem.computeStats on the primary weapon.
    // Shattered Sky: cooldown reduction is baked into player.levelMods by omen.apply() above.

    // Blood debt: init kill counter + apply XP penalty
    if (omen.id === 'blood_debt') {
      run._omenBloodDebtKillCount = 0;
      // Apply XP penalty via contractXpMult (stacks with existing contract multiplier)
      if (gs.player) {
        gs.player.contractXpMult = (gs.player.contractXpMult || 1) * (run._omenXpPenalty || 0.85);
      }
    }

    // Wind Riders: dashCharges already set by omen.apply — no double-add here

    gs.captureRunState();

    // Tutorial toast on first omen pick
    if (gs.tutorial) gs.events.emit('tut', 'omen');

    Audio.sfx('equip');

    this.scene.stop('OmenScene');
    // GameScene.resume is triggered by the shutdown event listener in _showOmenScene
  }
}
