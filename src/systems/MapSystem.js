import Phaser from 'phaser';
import { GAME } from '../config.js';
import { Audio } from './AudioManager.js';

// Opinionated map: scatters terrain zones, solid obstacles, breakable crates,
// shrines, and hazards around the world, then applies terrain/hazard effects
// each frame. Obstacles/breakables/shrines live in scene groups created by
// GameScene; terrain and hazard zones are plain {x,y,r} records owned here.
const TERRAIN = {
  mud: { tint: 0x6b5a3a, speed: 0.55 },
  thorns: { tint: 0xb04a5e, speed: 0.8, damage: 5 }, // slow + chip (ranged-type)
};
const TERRAIN_KEYS = Object.keys(TERRAIN);

// Non-colliding environmental decoration for a themed, lived-in battlefield. Props are
// split by ROLE so they can be placed NATURALLY (grouped), not littered at random:
//   veg     = trees/plants → cluster into groves & gardens
//   struct  = landmark structures (torii, columns, banners…) → appear only as the
//             centrepiece of a small compound, never scattered alone everywhere
// Plus universal groundcover (flora = grass/flowers, debris = bones/rubble) used as
// filler around clusters and a light global sprinkle.
const DECOR_ROLES = {
  china: { veg: ['decor_cn_tree'], struct: ['decor_cn_lantern', 'decor_cn_banner', 'decor_cn_vase'] },
  japan: { veg: ['decor_jp_cherry', 'decor_jp_bamboo'], struct: ['decor_jp_torii', 'decor_jp_lantern'] },
  byzantium: { veg: [], struct: ['decor_bz_column', 'decor_bz_statue', 'decor_bz_urn', 'decor_bz_brazier'] },
  sumer:    { veg: ['decor_sm_palm', 'decor_sm_reeds'], struct: ['decor_sm_pot', 'decor_sm_obelisk'] },
  rome:     { veg: ['decor_rm_cypress'], struct: ['decor_rm_column', 'decor_rm_statue', 'decor_rm_eagle'] },
  macedon:  { veg: ['decor_mc_olive', 'decor_mc_cypress'], struct: ['decor_mc_column', 'decor_mc_shield'] },
  mongolia: { veg: ['decor_mn_grass'], struct: ['decor_mn_yurt', 'decor_mn_banner', 'decor_mn_cairn'] },
  norse:    { veg: ['decor_no_pine'], struct: ['decor_no_runestone', 'decor_no_longship', 'decor_no_horn'] },
};
const DECOR_FLORA = ['decor_grass', 'decor_flowers'];
const DECOR_DEBRIS = ['decor_bones', 'decor_rubble'];

export default class MapSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.terrain = [];
    this.hazards = [];
    this.hazardAcc = 0;
    this.scatter();
  }

  // Random world point within `range` of origin, avoiding the spawn area.
  _point(range = 2600, minFromSpawn = 340) {
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(-range, range);
      const y = Phaser.Math.Between(-range, range);
      if (Math.hypot(x, y) > minFromSpawn) return { x, y };
    }
    return { x: range, y: range };
  }

  scatter() {
    const s = this.scene;
    if (s.dungeonMode) return; // dungeon floors anchor features in rooms (scatterInRooms) instead
    const mods = s.mapMods || { obstacles: 1, hazards: 1, breakables: 1 };
    const nHazards = Math.round(16 * (mods.hazards ?? 1));
    const nObstacles = Math.round(130 * (mods.obstacles ?? 1));
    const nBreakables = Math.round(90 * (mods.breakables ?? 1));

    // resolve civ-themed gameplay-object art, falling back to the generic placeholder
    const civ = (s.theme && s.theme.id) || 'default';
    const themed = (base, fallback) => (s.textures.exists(`${base}_${civ}`) ? `${base}_${civ}` : fallback);
    const obstacleKeys = [themed('rock', 'rock'), themed('block', 'pillar')];
    const crateKey = themed('crate', 'crate');
    const shrineKey = themed('shrine', 'shrine');

    // dense themed decoration (non-colliding flavour) — makes the field feel like a place
    this.scatterDecor();

    // terrain zone texture keys per type
    const MUD_KEYS = ['terrain_swamp', 'terrain_sand', 'terrain_grass'];
    const THORN_KEY = 'terrain_thorns';

    // terrain zones
    for (let i = 0; i < 70; i++) {
      const { x, y } = this._point();
      const type = TERRAIN_KEYS[Phaser.Math.Between(0, TERRAIN_KEYS.length - 1)];
      const r = Phaser.Math.Between(70, 130);
      const cfg = TERRAIN[type];

      // pick the texture set for this zone type
      const isThorns = type === 'thorns';
      const texPool = isThorns
        ? (s.textures.exists(THORN_KEY) ? [THORN_KEY] : null)
        : MUD_KEYS.filter((k) => s.textures.exists(k));

      if (texPool && texPool.length) {
        // subtle tint ring underneath so the zone boundary is still legible
        s.add.image(x, y, 'soft_circle')
          .setScale((r * 2.1) / 128)
          .setTint(cfg.tint)
          .setAlpha(0.25)
          .setDepth(-8);

        // scatter 3 overlapping texture patches to fill the zone naturally
        const PATCH_TEX_SIZE = 112; // native size of these props
        const patchScale = (r * 2) / PATCH_TEX_SIZE; // centre patch covers full diameter
        const offsets = [
          { ox: 0, oy: 0, sc: patchScale, a: 0.92 },
          { ox: r * 0.38, oy: -r * 0.28, sc: patchScale * 0.72, a: 0.80 },
          { ox: -r * 0.32, oy: r * 0.32, sc: patchScale * 0.68, a: 0.78 },
        ];
        for (const { ox, oy, sc, a } of offsets) {
          const tk = texPool[Phaser.Math.Between(0, texPool.length - 1)];
          s.add.image(x + ox, y + oy, tk)
            .setScale(sc)
            .setAlpha(a)
            .setDepth(-7);
        }
      } else {
        // graceful fallback: original tinted soft_circle if textures are missing
        s.add.image(x, y, 'soft_circle').setScale((r * 2) / 128).setTint(cfg.tint).setAlpha(0.5).setDepth(-7);
      }

      this.terrain.push({ x, y, r, type, cfg });
    }

    // hazards (damage the player AND enemies inside)
    for (let i = 0; i < nHazards; i++) {
      const { x, y } = this._point();
      const r = Phaser.Math.Between(55, 85);
      s.add.image(x, y, 'soft_circle').setScale((r * 2) / 128).setTint(0xff5a3a).setAlpha(0.4).setDepth(-7);
      s.add.image(x, y, 'spikes').setDepth(3).setScale(0.9);
      this.hazards.push({ x, y, r, dmg: 9, enemyDmg: 16 });
    }

    // solid obstacles (block player + enemies)
    for (let i = 0; i < nObstacles; i++) {
      const { x, y } = this._point();
      const key = Math.random() < 0.5 ? obstacleKeys[0] : obstacleKeys[1];
      const o = s.obstacles.create(x, y, key);
      o.setDepth(4);
      o.body.setSize(o.width * 0.7, o.height * 0.5);
      o.body.setOffset(o.width * 0.15, o.height * 0.45);
      o.refreshBody();
    }

    // breakable crates (destroyed by the player's weapon -> loot)
    for (let i = 0; i < nBreakables; i++) {
      const { x, y } = this._point();
      const c = s.breakables.create(x, y, crateKey);
      c.setDepth(4);
      c.isBreakable = true;
      c.hp = 30;
      if (c.body) c.body.setImmovable(true);
    }

    // shrines (one-time buff or heal) — suppressed by the Scorched Earth contract
    const shrineCount = s.contract && s.contract.noShrines ? 0 : 10;
    for (let i = 0; i < shrineCount; i++) {
      const { x, y } = this._point(2600, 600);
      const sh = s.shrines.create(x, y, shrineKey);
      sh.setDepth(4);
      sh.used = false;
      if (sh.body) {
        sh.body.setSize(sh.width, sh.height * 0.5);
        sh.body.setOffset(0, sh.height * 0.5);
        sh.refreshBody();
      }
    }
  }

  // Floor mode: anchor crates / shrines / hazards / slow-terrain at the generator's room
  // loot cells (converted tile→world) instead of scattering across an open world. Tracks
  // everything it creates so a descent can tear the floor's props down cleanly.
  scatterInRooms(lootCells) {
    const s = this.scene;
    const fs = s.floorSys;
    if (!fs || !lootCells) return;
    this.clearFloorProps();
    const civ = (s.theme && s.theme.id) || 'default';
    const themed = (base, fallback) => (s.textures.exists(`${base}_${civ}`) ? `${base}_${civ}` : fallback);
    const crateKey = themed('crate', 'crate');
    const shrineKey = themed('shrine', 'shrine');
    const mods = s.mapMods || { hazards: 1, breakables: 1 };
    const MUD_KEYS = ['terrain_swamp', 'terrain_sand', 'terrain_grass'];
    const THORN_KEY = 'terrain_thorns';
    const maxShrines = s.contract && s.contract.noShrines ? 0 : 2;
    let shrines = 0;
    this._floorProps = this._floorProps || [];

    for (const cell of lootCells) {
      const { x, y } = fs.tileToWorld(cell.col, cell.row);
      const roll = Math.random();
      if (roll < 0.5 * (mods.breakables ?? 1)) {
        const c = s.breakables.create(x, y, crateKey).setDepth(4);
        c.isBreakable = true; c.hp = 30;
        if (c.body) c.body.setImmovable(true);
      } else if (shrines < maxShrines && roll < 0.62) {
        const sh = s.shrines.create(x, y, shrineKey).setDepth(4);
        sh.used = false;
        if (sh.body) { sh.body.setSize(sh.width, sh.height * 0.5); sh.body.setOffset(0, sh.height * 0.5); sh.refreshBody(); }
        shrines++;
      } else if (roll < 0.62 + 0.18 * (mods.hazards ?? 1)) {
        const r = Phaser.Math.Between(42, 64);
        this._floorProps.push(s.add.image(x, y, 'soft_circle').setScale((r * 2) / 128).setTint(0xff5a3a).setAlpha(0.4).setDepth(-7));
        this._floorProps.push(s.add.image(x, y, 'spikes').setDepth(3).setScale(0.85));
        this.hazards.push({ x, y, r, dmg: 9, enemyDmg: 16 });
      } else {
        const type = TERRAIN_KEYS[Phaser.Math.Between(0, TERRAIN_KEYS.length - 1)];
        const r = Phaser.Math.Between(48, 80);
        const cfg = TERRAIN[type];
        const texPool = type === 'thorns'
          ? (s.textures.exists(THORN_KEY) ? [THORN_KEY] : null)
          : MUD_KEYS.filter((kk) => s.textures.exists(kk));
        this._floorProps.push(s.add.image(x, y, 'soft_circle').setScale((r * 2.1) / 128).setTint(cfg.tint).setAlpha(0.25).setDepth(-8));
        if (texPool && texPool.length) {
          const tk = texPool[Phaser.Math.Between(0, texPool.length - 1)];
          this._floorProps.push(s.add.image(x, y, tk).setScale((r * 2) / 112).setAlpha(0.9).setDepth(-7));
        }
        this.terrain.push({ x, y, r, type, cfg });
      }
    }
  }

  // Tear down the current floor's props before building the next floor.
  clearFloorProps() {
    const s = this.scene;
    for (const p of (this._floorProps || [])) if (p && p.destroy) p.destroy();
    this._floorProps = [];
    if (s.breakables) s.breakables.clear(true, true);
    if (s.shrines) s.shrines.clear(true, true);
    this.terrain = [];
    this.hazards = [];
  }

  // Decorate the world NATURALLY: a light groundcover sprinkle everywhere, then
  // hand-grouped clusters — leafy GROVES/GARDENS (trees + flowers) and small building
  // COMPOUNDS (a landmark structure + a little debris). Landmark structures only ever
  // appear as a cluster centrepiece, so you get gardens and ruins instead of lone torii
  // gates littered across the map. Every placement is duplicated across the world seam
  // (the 3×3 offset loop) so the toroidal wrap stays visually continuous.
  scatterDecor() {
    const s = this.scene;
    const civ = (s.theme && s.theme.id) || 'default';
    const roles = DECOR_ROLES[civ] || { veg: [], struct: [] };
    const exists = (k) => s.textures.exists(k);
    const veg = roles.veg.filter(exists);
    const struct = roles.struct.filter(exists);
    const flora = DECOR_FLORA.filter(exists);
    const debris = DECOR_DEBRIS.filter(exists);
    const ground = [...flora, ...debris];
    if (!veg.length && !struct.length && !ground.length) return; // nothing generated yet

    const H = GAME.worldSize;
    const W = H * 2;
    const margin = 560; // > half a screen, so the seam is filled before it scrolls into view
    const pick = (arr) => arr[Phaser.Math.Between(0, arr.length - 1)];
    // place one prop + any toroidal copy that lands within the seam band
    const place = (x, y, key, big) => {
      if (!key) return;
      const depth = big ? 3 : 1; // small clutter lowest; landmarks above, below entities (5+)
      const scale = Phaser.Math.FloatBetween(big ? 0.8 : 0.65, big ? 1.2 : 1.05);
      const alpha = big ? 1 : 0.88;
      const flip = Math.random() < 0.5;
      for (const ox of [-W, 0, W]) {
        for (const oy of [-W, 0, W]) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < -H - margin || nx > H + margin || ny < -H - margin || ny > H + margin) continue;
          s.add.image(nx, ny, key).setDepth(depth).setScale(scale).setAlpha(alpha).setFlipX(flip);
        }
      }
    };
    // scatter n props of `pool` in a disc of `r` around (cx,cy)
    const around = (cx, cy, pool, n, r, big) => {
      if (!pool.length) return;
      for (let j = 0; j < n; j++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * r;
        place(cx + Math.cos(a) * d, cy + Math.sin(a) * d, pick(pool), big);
      }
    };

    // 1) light groundcover sprinkle — grass/flowers (+ a little debris) read as natural
    // ground texture and are fine scattered freely.
    if (flora.length) for (let i = 0; i < 950; i++) { const p = this._point(H, 200); place(p.x, p.y, pick(flora), false); }
    if (debris.length) for (let i = 0; i < 200; i++) { const p = this._point(H, 240); place(p.x, p.y, pick(debris), false); }

    // 2) natural clusters
    for (let i = 0; i < 150; i++) {
      const { x, y } = this._point(H, 360);
      const garden = veg.length && Math.random() < 0.6;
      if (garden) {
        // a grove/garden: a few trees/plants tightly grouped, ringed by flowers & grass
        const spread = Phaser.Math.FloatBetween(80, 170);
        around(x, y, veg, Phaser.Math.Between(2, 4), spread * 0.55, true);
        around(x, y, flora, Phaser.Math.Between(7, 13), spread, false);
        if (debris.length && Math.random() < 0.3) around(x, y, debris, Phaser.Math.Between(1, 3), spread, false);
      } else if (struct.length) {
        // a small compound: 1-2 landmark structures with debris & a little flora nearby
        const spread = Phaser.Math.FloatBetween(70, 150);
        around(x, y, struct, Phaser.Math.Between(1, 2), spread * 0.45, true);
        around(x, y, debris.length ? debris : flora, Phaser.Math.Between(2, 5), spread, false);
        if (flora.length && Math.random() < 0.5) around(x, y, flora, Phaser.Math.Between(2, 5), spread, false);
      } else {
        // civ with neither veg nor struct generated yet → just a patch of groundcover
        around(x, y, ground, Phaser.Math.Between(5, 10), 130, false);
      }
    }
  }

  update(delta, now) {
    const dt = delta / 1000;
    const p = this.player;
    p.terrainSpeedMult = 1;

    // terrain effects (player only)
    for (const z of this.terrain) {
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      if (dx * dx + dy * dy > z.r * z.r) continue;
      p.terrainSpeedMult *= z.cfg.speed;
      if (z.cfg.heal) p.heal(z.cfg.heal * dt, { overCap: true });
      if (z.cfg.damage) {
        p.hp -= z.cfg.damage * dt * (1 - p.rangedDR);
        if (p.hp <= 0) this.scene.endRun();
      }
    }

    // hazards tick on an interval; affect player + nearby enemies
    this.hazardAcc += delta;
    if (this.hazardAcc >= 300) {
      this.hazardAcc = 0;
      for (const h of this.hazards) {
        // only process hazards near the player to bound cost
        if (Phaser.Math.Distance.Between(h.x, h.y, p.x, p.y) > 900) continue;
        const pdx = p.x - h.x;
        const pdy = p.y - h.y;
        if (pdx * pdx + pdy * pdy <= h.r * h.r) {
          this.scene.warnHazardOnce();
          this.scene.reactToHit(p.takeDamage(h.dmg, now, { bypassIframes: true, ranged: true }));
          Audio.sfx('hit');
        }
        for (const e of this.scene.enemies.getChildren()) {
          if (!e.active) continue;
          const edx = e.x - h.x;
          const edy = e.y - h.y;
          if (edx * edx + edy * edy <= h.r * h.r) this.scene.damageEnemy(e, h.enemyDmg);
        }
      }
    }
  }
}
