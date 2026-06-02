import Phaser from 'phaser';
import { DROP_SLOTS } from '../data/equipment.js';
import { getArtifact } from '../data/artifacts.js';
import { GAME } from '../config.js';
import { Settings, keyLabel } from '../systems/Settings.js';

// HUD overlay. Runs in parallel with GameScene and reads its state each frame.
// Layout is organized into three lanes that never overlap: LEFT (level, HP +
// stats, the K/SPACE ability readouts, resonances), CENTER (timer, then the
// boss bar + name, then the active-buff row stacked below it), and RIGHT (kills,
// traits, artifacts). Equipment sits along the bottom-left.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  init(data) {
    this.gs = data.gameScene;
  }

  create() {
    const { width, height } = this.scale;
    const p = this.gs.player;
    this.accent = this.gs.theme.accent;

    this.g = this.add.graphics().setDepth(100);

    // Minimap graphics (dungeon mode only; redrawn every frame in update)
    this.mmg = this.add.graphics().setDepth(102).setScrollFactor(0);

    // --- CENTER: timer (open world) / floor indicator (dungeon) ---
    this.timerText = this.add
      .text(width / 2, 10, '00:00', { fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setDepth(101);
    // descend prompt — shown when the player stands on the (unlocked) stairs
    this.descendText = this.add
      .text(width / 2, 40, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd700', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setDepth(101);

    // --- LEFT lane ---
    this.levelText = this.add
      .text(14, 14, 'LV 1', { fontFamily: 'monospace', fontSize: '16px', color: this.gs.theme.accentCss, fontStyle: 'bold' }).setDepth(101);
    // HP number (sits just right of the HP bar) + defensive stats on their own line below
    this.hpText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' }).setDepth(101);
    this.statsText = this.add
      .text(16, 60, '', { fontFamily: 'monospace', fontSize: '11px', color: '#9fd0ff' }).setDepth(101);
    // K / SPACE ability readouts (icons + labels; cooldown bars drawn in update)
    // Secondary: prefer abil_icon_<id>, fall back to proj_<id>
    const secIconKey = this.textures.exists(`abil_icon_${this.gs.secondary.weaponId}`)
      ? `abil_icon_${this.gs.secondary.weaponId}`
      : `proj_${this.gs.secondary.weaponId}`;
    this.add.image(24, 92, secIconKey).setScale(0.5).setDepth(101);
    this.secText = this.add
      .text(44, 86, '', { fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0' }).setDepth(101);
    // Ultimate: prefer abil_icon_<id>, fall back to abil_<id>
    const ultIconKey = this.textures.exists(`abil_icon_${this.gs.ability.abilityId}`)
      ? `abil_icon_${this.gs.ability.abilityId}`
      : `abil_${this.gs.ability.abilityId}`;
    this.add.image(24, 120, ultIconKey).setScale(0.5).setDepth(101);
    this.abilText = this.add
      .text(44, 114, '', { fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0' }).setDepth(101);
    this.resonanceText = this.add
      .text(12, 146, '', { fontFamily: 'monospace', fontSize: '10px', color: '#8fe6ff', lineSpacing: 2 }).setDepth(101);

    // --- CENTER: boss name (above its bar; bar drawn in update) ---
    this.bossNameText = this.add
      .text(width / 2, 42, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ff8a8a', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setDepth(101).setVisible(false);

    // --- CENTER: active power-up / musou timers (row below the boss bar) ---
    const kinds = ['musou', 'damage', 'defense', 'speed', 'invuln'];
    this.buffSlots = kinds.map((_, i) => {
      const x = width / 2 - 80 + i * 40;
      const icon = this.add.image(x, 92, 'pu_atk').setScale(0.5).setDepth(101).setVisible(false);
      const label = this.add.text(x, 108, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
        .setOrigin(0.5, 0).setDepth(101).setVisible(false);
      return { icon, label };
    });

    // --- RIGHT lane: kills, traits, artifacts ---
    this.killText = this.add
      .text(width - 14, 14, 'Kills 0', { fontFamily: 'monospace', fontSize: '16px', color: '#c9c4e0' })
      .setOrigin(1, 0).setDepth(101);
    this.add
      .text(width - 14, 38, `🏛 ${p.civTrait.name}\n👤 ${p.personalTrait.name}`,
        { fontFamily: 'monospace', fontSize: '11px', color: '#9a93c0', align: 'right', lineSpacing: 2 })
      .setOrigin(1, 0).setDepth(101);
    const arts = this.gs.run.artifacts || [];
    if (arts.length) {
      this.add.text(width - 14, 74, arts.map((id) => `✦ ${getArtifact(id).name}`).join('\n'), {
        fontFamily: 'monospace', fontSize: '10px', color: '#ffd27a', align: 'right', lineSpacing: 2,
      }).setOrigin(1, 0).setDepth(101);
      this.add.text(width - 14, 74 + arts.length * 14 + 4, '(Esc: stats)', {
        fontFamily: 'monospace', fontSize: '9px', color: '#7d7896', align: 'right',
      }).setOrigin(1, 0).setDepth(101);
    }

    // per-ability upgrade counts (how maxed each ability is, toward the cap)
    this.upgText = this.add.text(14, height - 52, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#b9b3d8',
    }).setDepth(101);

    // --- BOTTOM-LEFT: equipment slots ---
    this.slotIcons = {};
    const sy = height - 30;
    DROP_SLOTS.forEach((slot, i) => {
      const x = 22 + i * 38;
      // use the AI common-rarity icon as the slot's base look (falls back to the placeholder glyph)
      const base = this.textures.exists(`icon_${slot.id}_common`) ? `icon_${slot.id}_common` : slot.icon;
      this.add.image(x, sy, base).setScale(0.55).setDepth(101).setAlpha(0.28);
      const icon = this.add.image(x, sy, base).setScale(0.55).setDepth(102).setVisible(false);
      this.slotIcons[slot.id] = { x, y: sy, icon };
    });

    // Legibility: give every HUD text a crisp dark shadow so it reads on any
    // background (the AI grounds can be very light and washed out plain text).
    this.children.list.forEach((o) => {
      if (o.type === 'Text') o.setShadow(1, 1, '#000000', 3, true, true);
    });
  }

  buffIcon(kind, abilityId) {
    switch (kind) {
      case 'damage': return 'pu_atk';
      case 'defense': return 'pu_def';
      case 'speed': return 'pu_spd';
      case 'invuln': return 'pu_invuln';
      case 'musou': return `abil_${abilityId}`;
      default: return 'pu_atk';
    }
  }

  update() {
    const gs = this.gs;
    if (!gs || !gs.player || !gs.player.active) return;
    const p = gs.player;
    const { width } = this.scale;

    if (gs.dungeonMode) {
      const bossFloor = gs.bossFloors && gs.bossFloors[gs.floor] !== undefined;
      this.timerText.setText(`Floor ${gs.floor}/${gs.floorsTotal}${bossFloor ? '  ⚔' : ''}`);
      const onStairs = gs.floorSys && !gs.dueling && !gs.challengePending && gs.floorSys.atStairs(p.x, p.y);
      this.descendText.setText(onStairs ? '↓  descend' : '');
    } else {
      const total = Math.floor(gs.runTime / 1000);
      this.timerText.setText(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
    }
    this.levelText.setText(`LV ${p.level}`);
    this.killText.setText(`Kills ${p.kills}`);
    const abil = gs.ability;
    const sec = gs.secondary;
    const kSec = keyLabel(Settings.binds.secondary);
    const kUlt = keyLabel(Settings.binds.ultimate);
    this.secText.setText(sec.ready() ? `[${kSec}] secondary` : `[${kSec}] ${(sec.timer / 1000).toFixed(1)}s`);
    this.abilText.setText(abil.ready() ? `[${kUlt}] ultimate` : `[${kUlt}] ${(abil.cdRemaining / 1000).toFixed(1)}s`);
    this.resonanceText.setText(p.activeResonances.length ? p.activeResonances.map((n) => `⟡ ${n}`).join('\n') : '');
    const cap = GAME.upgradeCap;
    const kPri = keyLabel(Settings.binds.primary);
    this.upgText.setText(`⬆ ${kPri}·Pri ${gs.weapons.totalLevel()}/${cap}  ${kSec}·Sec ${sec.totalLevel()}/${cap}  ${kUlt}·Ult ${abil.totalLevel()}/${cap}`);

    const g = this.g;
    g.clear();

    // XP bar (very top edge)
    const xpPct = Phaser.Math.Clamp(p.xp / p.xpToNext, 0, 1);
    g.fillStyle(0x141225, 1).fillRect(0, 0, width, 6);
    g.fillStyle(this.accent, 1).fillRect(0, 0, width * xpPct, 6);

    // HP bar (left) + HP number to its right; defensive stats on their own line below
    const hpPct = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    const hx = 16, hy = 38, hw = 190, hh = 16;
    g.fillStyle(0x000000, 0.5).fillRect(hx - 2, hy - 2, hw + 4, hh + 4);
    g.fillStyle(0x3a1414, 1).fillRect(hx, hy, hw, hh);
    g.fillStyle(0xff4d4d, 1).fillRect(hx, hy, hw * hpPct, hh);
    this.hpText.setPosition(hx + hw + 8, hy + 1).setText(`${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`);
    const extra = [];
    if (p.meleeDR > 0) extra.push(`DEF ${Math.round(p.meleeDR * 100)}`);
    if (p.rangedDR > 0) extra.push(`RDEF ${Math.round(p.rangedDR * 100)}`);
    if (p.dodge > 0) extra.push(`DGE ${Math.round(p.dodge * 100)}`);
    if (p.lifesteal > 0) extra.push(`LS ${Math.round(p.lifesteal * 100)}`);
    if (p.luck > 0) extra.push(`LCK ${Math.round(p.luck)}`);
    this.statsText.setText(extra.join('   '));

    // boss HP bar (centered, below the timer; name sits above it)
    const boss = gs.activeBoss;
    if (boss && boss.active) {
      this.bossNameText.setVisible(true).setText(boss.bossName);
      const bw = 460, bh = 14, bx = width / 2 - bw / 2, by = 60;
      const pct = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      g.fillStyle(0x000000, 0.5).fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      g.fillStyle(0x2a0d0d, 1).fillRect(bx, by, bw, bh);
      g.fillStyle(0xff3b3b, 1).fillRect(bx, by, bw * pct, bh);
    } else {
      this.bossNameText.setVisible(false);
    }

    // equipment rarity borders
    for (const slot of DROP_SLOTS) {
      const item = p.equipment[slot.id];
      const ref = this.slotIcons[slot.id];
      if (item) {
        // show the item's rarity-specific icon (fall back to the base slot icon)
        const ikey = item.icon && this.textures.exists(item.icon) ? item.icon : slot.icon;
        if (ref.icon.texture.key !== ikey) ref.icon.setTexture(ikey);
        ref.icon.setVisible(true);
        g.lineStyle(2, item.color, 1).strokeRect(ref.x - 13, ref.y - 13, 26, 26);
      } else {
        ref.icon.setVisible(false);
      }
    }

    // cooldown bars: secondary (K) under its icon, ultimate (SPACE) under its icon
    const sfrac = sec.readyFraction();
    g.fillStyle(0x000000, 0.5).fillRect(9, 103, 30, 6);
    g.fillStyle(sfrac >= 1 ? 0x66dd88 : this.accent, 1).fillRect(10, 104, 28 * sfrac, 4);
    const frac = abil.readyFraction();
    g.fillStyle(0x000000, 0.5).fillRect(9, 131, 30, 6);
    g.fillStyle(frac >= 1 ? 0x66dd88 : this.accent, 1).fillRect(10, 132, 28 * frac, 4);

    // active power-up / musou timers (centered row, below the boss bar)
    const now = this.time.now;
    const active = [];
    if (p.empowered) active.push({ kind: 'musou', remain: (p.empowerUntil - now) / 1000, stacks: p.momentumStacks });
    for (const b of p.buffs) active.push({ kind: b.kind, remain: (b.until - now) / 1000 });
    this.buffSlots.forEach((slot, i) => {
      const a = active[i];
      if (a) {
        slot.icon.setTexture(this.buffIcon(a.kind, gs.ability.abilityId)).setVisible(true);
        const txt = a.kind === 'musou' && a.stacks > 0 ? `x${a.stacks}` : `${Math.ceil(a.remain)}`;
        slot.label.setText(txt).setVisible(true);
      } else {
        slot.icon.setVisible(false);
        slot.label.setVisible(false);
      }
    });

    // --- Minimap (dungeon mode only): the EXPLORED cavern, revealed as you walk ---
    // Throttled — the explored area changes slowly and redrawing thousands of tiles
    // every frame is wasteful. Between redraws the previous map persists.
    if (gs.dungeonMode && gs.floorSys && gs.floorSys.data && gs.floorSys.exploredGrid) {
      const now2 = this.time.now;
      if (!this._mmLast || now2 - this._mmLast > 120) {
        this._mmLast = now2;
        this.drawMinimap(gs, p);
      }
    } else if (this._mmDrawn) {
      this.mmg.clear();
      this._mmDrawn = false;
    }
  }

  // Render the explored portion of the cavern into the bottom-right minimap box.
  // Explored FLOOR tiles are drawn as a dot grid (so the cave shape emerges as you
  // explore); the stairs are gold (once seen) and the player is a white dot.
  drawMinimap(gs, p) {
    const mmg = this.mmg;
    mmg.clear();
    this._mmDrawn = true;

    const { width: sw, height: sh } = this.scale;
    const MAP_SIZE = 140, PADDING = 4, MARGIN = 10;
    const bx = sw - MAP_SIZE - MARGIN;
    const by = sh - MAP_SIZE - MARGIN;

    // Panel background + border
    mmg.fillStyle(0x080810, 0.70).fillRect(bx, by, MAP_SIZE, MAP_SIZE);
    mmg.lineStyle(1, 0x555577, 0.90).strokeRect(bx, by, MAP_SIZE, MAP_SIZE);

    const fs = gs.floorSys;
    const { cols, rows, grid } = fs.data;
    const inner = MAP_SIZE - PADDING * 2;
    const sx = inner / cols, sy = inner / rows;       // px per tile
    const toMM = (col, row) => ({ mx: bx + PADDING + col * sx, my: by + PADDING + row * sy });
    const cell = Math.max(1, Math.ceil(Math.max(sx, sy)));

    // Explored floor tiles
    const FLOOR = 1;
    const grad = fs.exploredGrid;
    mmg.fillStyle(0x4870b0, 0.85);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        if (grad[i] === 1 && grid[i] === FLOOR) {
          const { mx, my } = toMM(col, row);
          mmg.fillRect(mx, my, cell, cell);
        }
      }
    }

    // Stairs (gold) once its tile has been explored
    if (fs.stairs && fs.stairs.x !== undefined) {
      const st = fs.worldToTile(fs.stairs.x, fs.stairs.y);
      if (fs.isExplored(st.col, st.row)) {
        const { mx, my } = toMM(st.col, st.row);
        mmg.fillStyle(0xffd700, 1).fillCircle(mx + sx * 0.5, my + sy * 0.5, Math.max(2.5, cell));
      }
    }

    // Player (white dot)
    const pt = fs.worldToTile(p.x, p.y);
    const { mx: pdx, my: pdy } = toMM(pt.col, pt.row);
    mmg.fillStyle(0xffffff, 1).fillCircle(pdx + sx * 0.5, pdy + sy * 0.5, 2.5);
  }
}
