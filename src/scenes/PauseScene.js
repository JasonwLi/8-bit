import Phaser from 'phaser';
import { DROP_SLOTS, RARITIES } from '../data/equipment.js';
import { getWeapon } from '../data/weapons.js';
import { getAbility } from '../data/abilities.js';
import { getArtifact } from '../data/artifacts.js';
import { CIV_NAME, CIV_ORDER } from '../data/campaign.js';
import { Save } from '../systems/SaveSystem.js';
import { drawPanel } from '../art/ui.js';

// Human-readable labels for every mod key an item can carry.
// Fractional (multiplier) keys are shown as a percentage; flat keys as integers.
// cooldownMult is stored as a negative number (−0.08 = "8% faster") so we negate
// it and display it as a reduction, which is positive-feeling to the player.
const MOD_LABELS = {
  damageMult:      (v) => `+${Math.round(v * 100)}% Damage`,
  maxHpFlat:       (v) => `+${v} Max HP`,
  maxHpMult:       (v) => `+${Math.round(v * 100)}% Max HP`,
  speedMult:       (v) => `+${Math.round(v * 100)}% Move Speed`,
  speedFlat:       (v) => `+${v} Move Speed`,
  defense:         (v) => `+${Math.round(v * 100)}% Melee DR`,
  rangedDefense:   (v) => `+${Math.round(v * 100)}% Ranged DR`,
  damageReduction: (v) => `+${Math.round(v * 100)}% Damage Reduction`,
  dodge:           (v) => `+${Math.round(v * 100)}% Dodge`,
  lifesteal:       (v) => `+${Math.round(v * 100)}% Lifesteal`,
  regen:           (v) => `+${v.toFixed(2)} HP/s`,
  regenCapBonus:   (v) => `+${Math.round(v * 100)}% Regen Cap`,
  cooldownMult:    (v) => `−${Math.abs(Math.round(v * 100))}% Cooldown`,
  reachMult:       (v) => `+${Math.round(v * 100)}% Range`,
  effectMult:      (v) => `+${Math.round(v * 100)}% Effect`,
  luck:            (v) => `+${Math.round(v)} Luck`,
  pickupMult:      (v) => `+${Math.round(v * 100)}% Pickup`,
  xpMult:          (v) => `+${Math.round(v * 100)}% XP`,
};

/** Format a mods object into an array of human-readable strings. */
function formatMods(mods) {
  if (!mods) return [];
  return Object.entries(mods)
    .filter(([k]) => MOD_LABELS[k])
    .map(([k, v]) => MOD_LABELS[k](v));
}

/** Look up a rarity definition by id string (e.g. 'rare'). */
function getRarityDef(id) {
  return RARITIES.find((r) => r.id === id) || RARITIES[0];
}

// Esc pause overlay: full stat / inventory / artifact readout + resume / exit.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.gs = data.gameScene;
  }

  create() {
    const { width, height } = this.scale;
    const gs = this.gs;
    const p = gs.player;
    const accent = gs.theme.accentCss;

    // Tooltip state — reset each time the scene is created.
    this._tooltip = null;
    this._tooltipObjects = null;

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.92).setOrigin(0);
    this.add.text(width / 2, 34, 'PAUSED', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const stage = gs.isFinal ? 'Final Stage — Warlord of Warlords'
      : `Invading ${CIV_NAME[gs.run.currentCiv]}  (${gs.run.conquered.length}/${CIV_ORDER.length - 1} conquered)`;
    this.add.text(width / 2, 70, stage, {
      fontFamily: 'monospace', fontSize: '14px', color: accent,
    }).setOrigin(0.5);

    // --- left column: stats ---
    const lx = 90;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const stats = [
      `HP        ${Math.ceil(p.hp)} / ${p.maxHp}`,
      `Level     ${p.level}`,
      `Attack    x${(p.damageMult).toFixed(2)}`,
      `Move Spd  ${Math.round(p.speed)}`,
      `Defense   ${pct(p.meleeDR)}`,
      `Rng Def   ${pct(p.rangedDR)}`,
      `Dodge     ${pct(p.dodge)}`,
      `Lifesteal ${pct(p.lifesteal)}`,
      `Regen     ${p.regen.toFixed(2)}/s (cap ${pct(p.regenCap)})`,
      `Kills     ${p.kills}`,
    ];
    this.add.text(lx, 110, 'STATS', { fontFamily: 'monospace', fontSize: '15px', color: accent, fontStyle: 'bold' });
    this.add.text(lx, 134, stats.join('\n'), { fontFamily: 'monospace', fontSize: '13px', color: '#dcd8ee', lineSpacing: 6 });

    // --- middle column: weapon + ability + equipment ---
    const mx = 470;
    const wDef = getWeapon(gs.weapons.weaponId);
    const aDef = getAbility(gs.ability.abilityId);
    const wp = gs.weapons.points;
    const ap = gs.ability.points;
    this.add.text(mx, 110, 'ARMS', { fontFamily: 'monospace', fontSize: '15px', color: accent, fontStyle: 'bold' });
    this.add.text(mx, 134,
      `Weapon  ${wDef.name}\n  Dmg ${wp.damage}  Reach ${wp.reach}  Spd ${wp.speed}  Fx ${wp.effect}\n` +
      `Ability ${aDef.name}\n  Pwr ${ap.power}  Freq ${ap.haste}  Area ${ap.area}  Mult ${ap.amount}`,
      { fontFamily: 'monospace', fontSize: '13px', color: '#dcd8ee', lineSpacing: 6 });

    this.add.text(mx, 230, 'EQUIPMENT', { fontFamily: 'monospace', fontSize: '15px', color: accent, fontStyle: 'bold' });

    // Row metrics: fontSize 12px monospace ≈ 17px per line with lineSpacing:5.
    const EQ_ROW_H = 17;
    const EQ_ROW_W = 240; // approximate width of the equipment column text area
    const EQ_START_Y = 254;
    DROP_SLOTS.forEach((s, i) => {
      const it = p.equipment[s.id];
      const label = `${s.name.padEnd(8)} ${it ? it.name : '—'}`;
      const rowY = EQ_START_Y + i * EQ_ROW_H;
      const color = it ? (getRarityDef(it.rarity).textColor) : '#cfcbe2';
      this.add.text(mx, rowY, label, { fontFamily: 'monospace', fontSize: '12px', color, lineSpacing: 5 });

      // Only add an interactive zone if the slot has an item.
      if (it) {
        const zone = this.add.zone(mx, rowY, EQ_ROW_W, EQ_ROW_H).setOrigin(0, 0).setInteractive({ useHandCursor: false });
        zone.on('pointerover', () => this._showTooltip(it, mx + EQ_ROW_W / 2, rowY, width, height));
        zone.on('pointerout', () => this._hideTooltip());
      }
    });

    // --- right column: artifacts ---
    const rx = 700;
    this.add.text(rx, 110, 'ARTIFACTS', { fontFamily: 'monospace', fontSize: '15px', color: accent, fontStyle: 'bold' });
    const arts = gs.run.artifacts.length
      ? gs.run.artifacts.map((id) => { const a = getArtifact(id); return `• ${a.name}\n   ${a.desc}`; }).join('\n')
      : '(none yet)';
    this.add.text(rx, 134, arts, { fontFamily: 'monospace', fontSize: '12px', color: '#ffd27a', lineSpacing: 5, wordWrap: { width: 250 } });

    // --- buttons ---
    const resume = this.add.text(width / 2 - 190, height - 50, '[ Resume ]', {
      fontFamily: 'monospace', fontSize: '20px', color: '#9ef58b', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resume.on('pointerdown', () => this.resumeGame());

    const settings = this.add.text(width / 2, height - 50, '[ Settings ]', {
      fontFamily: 'monospace', fontSize: '20px', color: '#8fe6ff', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    settings.on('pointerdown', () => this.scene.start('SettingsScene', { caller: 'PauseScene', gameScene: this.gs }));

    const exit = this.add.text(width / 2 + 190, height - 50, '[ Save & Exit ]', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ff8a8a', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exit.on('pointerdown', () => this.exitToTitle());

    this.add.text(width / 2, height - 22, 'Esc/R resume  •  progress is saved on exit (Continue from the title)', {
      fontFamily: 'monospace', fontSize: '11px', color: '#7d7896',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-R', () => this.resumeGame());
  }

  resumeGame() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  exitToTitle() {
    this.gs.captureRunState();
    Save.save(this.gs.run);
    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  // -----------------------------------------------------------------------
  // Tooltip helpers
  // -----------------------------------------------------------------------

  /**
   * Show a tooltip for `item` near the anchor point (anchorX, anchorY).
   * The tooltip is clamped so it always fits within the 960×540 canvas.
   *
   * Layout: NAME (rarity color) → "Rarity · Slot" label → one line per mod.
   */
  _showTooltip(item, anchorX, anchorY, canvasW, canvasH) {
    this._hideTooltip(); // destroy any previous tooltip

    const rarityDef = getRarityDef(item.rarity);
    const modLines = formatMods(item.mods);

    // Measure content to size the panel.
    // Approximately: name (14px) + subLabel (12px) + each mod line (12px) + padding.
    const PAD = 12;
    const lineH = 16;
    const contentLines = 2 + modLines.length; // name + subLabel + mods
    const panelW = 200;
    const panelH = PAD * 2 + 18 + contentLines * lineH;

    // Default position: to the right of the anchor; clamp to canvas edges.
    const MARGIN = 6;
    let px = anchorX + MARGIN;
    let py = anchorY - panelH / 2;

    // Clamp horizontally
    if (px + panelW > canvasW - MARGIN) px = anchorX - panelW - MARGIN;
    if (px < MARGIN) px = MARGIN;
    // Clamp vertically
    if (py + panelH > canvasH - MARGIN) py = canvasH - MARGIN - panelH;
    if (py < MARGIN) py = MARGIN;

    // Build tooltip objects at high depth so they render on top of everything.
    const DEPTH = 100;
    const accentNum = this.gs.theme.accent;

    const g = this.add.graphics().setDepth(DEPTH);
    drawPanel(g, px, py, panelW, panelH, accentNum, { fill: 0x120e20, alpha: 0.98, radius: 8, bracket: false });

    // Item name in rarity color
    this.add.text(px + PAD, py + PAD, item.name, {
      fontFamily: 'monospace', fontSize: '13px', color: rarityDef.textColor, fontStyle: 'bold',
      wordWrap: { width: panelW - PAD * 2 },
    }).setDepth(DEPTH + 1);

    // Rarity · Slot sub-label
    const subLabel = `${rarityDef.name}  ·  ${item.slotName}`;
    this.add.text(px + PAD, py + PAD + 18, subLabel, {
      fontFamily: 'monospace', fontSize: '11px', color: '#8a869e',
    }).setDepth(DEPTH + 1);

    // Mod lines
    modLines.forEach((line, idx) => {
      this.add.text(px + PAD, py + PAD + 18 + lineH + idx * lineH, line, {
        fontFamily: 'monospace', fontSize: '11px', color: '#d4d0f0',
      }).setDepth(DEPTH + 1);
    });

    // No-mods fallback
    if (modLines.length === 0) {
      this.add.text(px + PAD, py + PAD + 18 + lineH, '(no bonuses)', {
        fontFamily: 'monospace', fontSize: '11px', color: '#5a5670',
      }).setDepth(DEPTH + 1);
    }

    // Tag all tooltip objects so _hideTooltip can collect them by name.
    // We store them on a dedicated container instead — use scene data to track.
    this._tooltip = { g };
    // Collect all newly added objects after the graphics — they were pushed into
    // the display list after `g`, so we can snapshot the list tail.
    const list = this.children.list;
    const startIdx = list.indexOf(g);
    this._tooltipObjects = list.slice(startIdx); // includes g itself
  }

  /** Destroy the current tooltip if one is visible. */
  _hideTooltip() {
    if (this._tooltipObjects) {
      for (const obj of this._tooltipObjects) {
        if (obj && obj.destroy) obj.destroy();
      }
      this._tooltipObjects = null;
    }
    this._tooltip = null;
  }
}
