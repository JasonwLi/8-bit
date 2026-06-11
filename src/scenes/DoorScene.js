import Phaser from 'phaser';
import { drawPanel } from '../art/ui.js';
import { Audio } from '../systems/AudioManager.js';

// ── Floor-door type definitions ───────────────────────────────────────────────
// Each entry: id, label, flavour, accent colour, weight (relative probability).
// NORMAL is always included; the others are weighted draws to fill the remaining
// 1-2 slots. Selection is deduped so you never see the same type twice.
export const DOOR_TYPES = {
  NORMAL:  { id: 'NORMAL',  label: 'Normal Path',    flavour: 'An ordinary descent.', color: 0x7888aa, weight: 0 },
  VAULT:   { id: 'VAULT',   label: 'Vault',           flavour: 'An elite warband guards a treasure vault.', color: 0xffd700, weight: 30 },
  HORDE:   { id: 'HORDE',   label: 'Horde',           flavour: 'The horde masses beyond.', color: 0xff5252, weight: 28 },
  CURSED:  { id: 'CURSED',  label: 'Cursed Floor',    flavour: 'A dark mandate hangs over this floor.', color: 0xb05aff, weight: 22 },
  SHRINE:  { id: 'SHRINE',  label: 'Sanctuary',       flavour: 'A quiet sanctuary offers respite.', color: 0x66dd88, weight: 20 },
};

// Secondary flavour lines that elaborate on each type for the card body.
export const DOOR_DETAIL = {
  NORMAL:  'No special conditions.',
  VAULT:   '+3 forced elites  |  guaranteed chest cluster  |  loot luck +8',
  HORDE:   'Enemy budget ×1.6  |  gems & gold value ×2',
  CURSED:  'One random floor curse  —  but stairs reward a powerup + big gold',
  SHRINE:  'Fewer enemies  |  +2 shrines  |  +1 treasure encounter',
};

// The per-floor curses (only one is active at a time).
export const CURSED_MODS = [
  { id: 'fast_enemies',   label: 'Bloodlust',    desc: 'Enemies move 15% faster.' },
  { id: 'small_pickup',   label: 'Shrouded',     desc: 'Pickup radius −20%.' },
  { id: 'tight_fog',      label: 'Blind March',  desc: 'Fog of war is tighter (−30 px radius).' },
];

// Roll 2-3 door options: always NORMAL + 1-2 weighted specials (no duplicates).
export function rollDoors(rng = Math.random) {
  const specials = Object.values(DOOR_TYPES).filter((d) => d.id !== 'NORMAL');
  const totalWeight = specials.reduce((s, d) => s + d.weight, 0);

  // Weighted sample without replacement to pick 1-2 specials.
  const pool = [...specials];
  const chosen = [];
  const count = rng() < 0.55 ? 2 : 1; // 55% chance = 3 doors total, else 2
  for (let i = 0; i < count && pool.length > 0; i++) {
    let r = rng() * pool.reduce((s, d) => s + d.weight, 0);
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) { chosen.push(pool[j]); pool.splice(j, 1); break; }
    }
  }

  // Shuffle so NORMAL doesn't always appear first.
  const all = [DOOR_TYPES.NORMAL, ...chosen];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// Roll which CURSED mod applies for this floor.
export function rollCursedMod(rng = Math.random) {
  return CURSED_MODS[Math.floor(rng() * CURSED_MODS.length)];
}

// DoorScene — modal over a paused GameScene.
// Launched via: scene.pause() + scene.launch('DoorScene', { gameScene, doors })
// Dismissed via: scene.stop('DoorScene') + scene.resume('GameScene')
export default class DoorScene extends Phaser.Scene {
  constructor() { super('DoorScene'); }

  init(data) {
    this.gs = data.gameScene;
    this.doors = data.doors;       // array of DOOR_TYPES entries
    this.nextFloor = data.nextFloor;
  }

  create() {
    const { width, height } = this.scale;
    const W = width, H = height;
    const gs = this.gs;
    const accent = gs.theme ? gs.theme.accent : 0xffd700;

    Audio.sfx('levelup'); // satisfying "choice available" chime

    // Dim overlay
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.82).setOrigin(0).setDepth(0);

    // Title
    this.add.text(W / 2, H / 2 - 198, `FLOOR  ${this.nextFloor}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#9a93c0',
    }).setOrigin(0.5).setDepth(1);

    this.add.text(W / 2, H / 2 - 176, 'Choose the next floor\'s nature', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    // Cards
    const doors = this.doors;
    const cardW = 200;
    const cardH = 230;
    const gap = 18;
    const total = doors.length * cardW + (doors.length - 1) * gap;
    const startX = (W - total) / 2 + cardW / 2;
    const cy = H / 2 + 20;

    doors.forEach((door, i) => {
      this._buildCard(startX + i * (cardW + gap), cy, cardW, cardH, door, i + 1, accent);
    });

    // Hint row
    const hints = doors.map((_, i) => `[${i + 1}]`).join('  ');
    this.add.text(W / 2, H / 2 + cardH / 2 + 42, `${hints}  or click a card`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#66607a',
    }).setOrigin(0.5).setDepth(1);

    // Keyboard
    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= doors.length) this._pick(doors[n - 1]);
    });
  }

  _buildCard(cx, cy, w, h, door, num, accent) {
    const top = cy - h / 2;
    const g = this.add.graphics().setDepth(1);
    drawPanel(g, cx - w / 2, top, w, h, door.color, { header: 30 });

    // Highlighted border for non-NORMAL doors
    if (door.id !== 'NORMAL') {
      const eg = this.add.graphics().setDepth(1);
      eg.lineStyle(2, door.color, 0.7);
      eg.strokeRect(cx - w / 2 + 3, top + 3, w - 6, h - 6);
    }

    // Number label (top of header)
    this.add.text(cx, top + 16, `${num}.`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd27a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Icon — small inline icon per type using existing textures where available,
    // otherwise a colored text glyph so it always renders.
    const ICON_KEYS = { VAULT: 'chest', HORDE: 'gem', CURSED: 'pickup_heart', SHRINE: 'pickup_heart', NORMAL: 'gem' };
    const ICON_GLYPHS = { VAULT: '🗝', HORDE: '☠', CURSED: '✦', SHRINE: '⚕', NORMAL: '→' };
    const iconKey = ICON_KEYS[door.id];
    if (iconKey && this.textures.exists(iconKey)) {
      this.add.image(cx, top + 72, iconKey).setDepth(2).setScale(0.9);
    } else {
      this.add.text(cx, top + 60, ICON_GLYPHS[door.id] || '?', {
        fontFamily: 'monospace', fontSize: '28px', color: Phaser.Display.Color.IntegerToColor(door.color).rgba,
      }).setOrigin(0.5).setDepth(2);
    }

    // Label
    this.add.text(cx, top + 106, door.label, {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5).setDepth(2);

    // Flavour line
    this.add.text(cx, top + 130, door.flavour, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5, 0).setDepth(2);

    // Detail
    const detail = DOOR_DETAIL[door.id] || '';
    this.add.text(cx, top + 166, detail, {
      fontFamily: 'monospace', fontSize: '9px', color: '#9a93c0',
      align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5, 0).setDepth(2);

    // Click zone
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(3);
    zone.on('pointerover', () => g.setAlpha(0.80));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', () => this._pick(door));
  }

  _pick(door) {
    const gs = this.gs;
    const run = gs.run;

    // Apply mod: store on the run so captureRunState persists it.
    if (door.id === 'CURSED') {
      // Roll which curse is active; store it so the floor can apply it.
      const mod = rollCursedMod();
      run.nextFloorMod = { type: 'CURSED', curseId: mod.id, curseLabel: mod.label, curseDesc: mod.desc };
    } else {
      run.nextFloorMod = { type: door.id };
    }

    gs.captureRunState(); // persist the choice

    this.scene.stop('DoorScene');
    this.scene.resume('GameScene');
    // Trigger the actual descent (deferred to avoid Phaser scene-manager re-entrancy)
    gs.events.once('resume', () => gs._commitDescent());
  }
}
