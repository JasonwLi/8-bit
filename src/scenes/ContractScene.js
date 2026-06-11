import Phaser from 'phaser';
import { CONTRACTS, totalHeatFor } from '../data/contracts.js';
import { Save, Legacy } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';

// Optional pre-stage difficulty contracts / MANDATE OF HEAVEN mandates.
// Toggle up to 3, then begin the invasion.
// After the first full conquest (hasWonRun), this scene rebrands as
// MANDATE OF HEAVEN and also offers the harder mandate contracts.
const MAX_ACTIVE = 3;        // pre-win contract cap
const MAX_ACTIVE_MANDATE = 6; // post-win: stack deeper — Crown of Heaven (heat 10) must be reachable

// Heat thresholds for mandate-exclusive artifact injection.
export const MANDATE_ARTIFACT_HEAT = 5;
export const MANDATE_CROWN_HEAT = 10;

export default class ContractScene extends Phaser.Scene {
  constructor() {
    super('ContractScene');
  }

  create() {
    const { width, height } = this.scale;
    this.selected = new Set();

    // MANDATE OF HEAVEN mode: unlocked after the player's first full conquest.
    this.mandateMode = Legacy.hasWonRun();

    // Pool: base contracts always; mandate-only contracts only after unlock.
    this.pool = this.mandateMode
      ? CONTRACTS
      : CONTRACTS.filter((c) => !c.mandateOnly);

    if (this.mandateMode) {
      this.add.text(width / 2, 26, 'MANDATE OF HEAVEN', {
        fontFamily: 'monospace', fontSize: '34px', color: '#ff8c00', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(width / 2, 64, `Bind mandates — each adds Heat; greater Heat, richer spoils.`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#c9c4e0',
      }).setOrigin(0.5);
      // Heat legend
      this.add.text(width / 2, 82, '🔥 Heat 1 = mild    🔥🔥 Heat 2 = harsh    🔥🔥🔥 Heat 3 = brutal', {
        fontFamily: 'monospace', fontSize: '11px', color: '#b08060',
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, 36, 'HEAT OF CONQUEST', {
        fontFamily: 'monospace', fontSize: '34px', color: '#ff7b3a', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(width / 2, 74, `Bind up to ${this._cap()} ${this.mandateMode ? 'mandates' : 'contracts'} — harder stage, richer spoils. Or take none.`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#c9c4e0',
      }).setOrigin(0.5);
    }

    const cardW = 220;
    const gap = 14;
    const perRow = 5;
    const rows = Math.ceil(this.pool.length / perRow);
    this.cards = [];
    this.pool.forEach((c, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, this.pool.length - row * perRow);
      const rowW = inRow * cardW + (inRow - 1) * gap;
      const startX = (width - rowW) / 2 + cardW / 2;
      const cx = startX + col * (cardW + gap);
      const topOffset = this.mandateMode ? 108 : 104;
      const cy = topOffset + row * 140 + (rows === 1 ? 40 : 0);
      this.buildCard(cx, cy, cardW, c, i);
    });

    // Heat display (mandate mode only)
    if (this.mandateMode) {
      this._heatText = this.add.text(width / 2, height - 88, '', {
        fontFamily: 'monospace', fontSize: '15px', color: '#ff8c00', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._updateHeatDisplay();
    }

    this.beginText = this.add.text(width / 2, height - 58, '[ Begin Invasion ]', {
      fontFamily: 'monospace', fontSize: '22px', color: '#9ef58b', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.beginText.on('pointerdown', () => this.begin());

    const hintKeys = this.pool.length <= 9
      ? `Press 1–${this.pool.length} to toggle • `
      : '';
    this.add.text(width / 2, height - 28, `${hintKeys}Enter to begin`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#7d7896',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'Enter') { this.begin(); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this.pool.length) this.toggle(this.pool[n - 1].id);
    });
    // Backspace / Delete = back to the land-select (Conquest) screen
    this.input.keyboard.addCapture('BACKSPACE,DELETE');
    const back = () => this.scene.start('ConquestScene');
    this.input.keyboard.on('keydown-BACKSPACE', back);
    this.input.keyboard.on('keydown-DELETE', back);
  }

  _updateHeatDisplay() {
    if (!this._heatText) return;
    const heat = totalHeatFor([...this.selected]);
    const flames = '🔥'.repeat(Math.min(heat, 10));
    let bonusStr = '';
    if (heat > 0) {
      const coinMult = Math.round(heat * 15);
      const luckBonus = Math.round(heat * 1.5);
      const goldBonus = Math.round(heat * 5);
      bonusStr = `  →  +${luckBonus} Loot Luck  +${goldBonus}% Gold  Coins ×${(1 + heat * 0.15).toFixed(2)}`;
      if (heat >= MANDATE_CROWN_HEAT) bonusStr += '  ★ Crown of Heaven';
      else if (heat >= MANDATE_ARTIFACT_HEAT) bonusStr += '  ★ Seal of the Mandate';
    }
    this._heatText.setText(`${flames || 'No heat'} Heat ${heat}${bonusStr}`);
  }

  buildCard(cx, cy, w, c, i) {
    const h = 118;
    const top = cy - h / 2;
    const g = this.add.graphics();
    const ref = { c, g, cx, cy, w, h };
    this.cards.push(ref);
    // Small icon on the left side of the header
    const iconX = cx - w / 2 + 22;
    const contractIconKey = (c.icon && this.textures.exists(c.icon)) ? c.icon
      : (c.iconFallback && this.textures.exists(c.iconFallback)) ? c.iconFallback
      : null;
    if (contractIconKey) {
      this.add.image(iconX, top + 18, contractIconKey).setScale(0.45);
    }
    // Heat pip(s) top-right
    if (this.mandateMode && c.heat) {
      const heatStr = '🔥'.repeat(c.heat);
      this.add.text(cx + w / 2 - 8, top + 6, heatStr, {
        fontFamily: 'monospace', fontSize: '10px',
      }).setOrigin(1, 0);
    }
    this.add.text(cx + (contractIconKey ? 8 : 0), top + 10, `${i + 1}. ${c.name}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(cx, top + 36, `− ${c.penalty}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ff8a8a', align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5, 0);
    this.add.text(cx, top + 74, `+ ${c.reward}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#9ef58b', align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5, 0);
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.toggle(c.id));
    this.drawCard(ref);
  }

  drawCard(ref) {
    const on = this.selected.has(ref.c.id);
    const accentColor = this.mandateMode ? 0xff8c00 : 0xff7b3a;
    ref.g.clear();
    drawPanel(ref.g, ref.cx - ref.w / 2, ref.cy - ref.h / 2, ref.w, ref.h, on ? accentColor : 0x3a3556, { fill: on ? 0x2a1808 : 0x1d1a2e, header: on ? 22 : 0, bracket: on });
  }

  toggle(id) {
    if (this.selected.has(id)) this.selected.delete(id);
    else if (this.selected.size < this._cap()) this.selected.add(id);
    this.cards.forEach((r) => this.drawCard(r));
    this._updateHeatDisplay();
    Audio.sfx('pickup');
  }

  _cap() { return this.mandateMode ? MAX_ACTIVE_MANDATE : MAX_ACTIVE; }

  begin() {
    const run = this.registry.get('run');
    run.contracts = [...this.selected];
    run.artifactBonus = run.contracts.length; // +1 artifact choice per contract/mandate

    // Compute and persist total heat for this stage
    const heat = totalHeatFor(run.contracts);
    run.mandateHeat = heat;

    // Apply heat-scaled loot luck bonus to the run (read by PickupController/chest rolls)
    run.mandateLootLuck = heat * 1.5;

    // Gold start bonus (heat*5% of the base starting gold = 0; gold earned during run
    // gets a multiplier — we store the mult so SpawnSystem / pickup can scale drops)
    run.mandateGoldMult = 1 + heat * 0.05;

    this.registry.set('run', run);
    Save.save(run);
    Audio.resume();
    Audio.startMusic();
    this.scene.start('GameScene');
  }
}
