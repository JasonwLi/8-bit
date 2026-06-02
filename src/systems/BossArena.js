import Phaser from 'phaser';
import { getTheme } from '../data/themes.js';

// A dedicated, themed 1v1 boss ARENA (Hades / Diablo-style). When a duel begins the
// player + boss are teleported to a reserved precinct in the void (outside the wrapping
// playfield) where this builds a bounded circular battleground keyed to the civ:
//   • a stone platform floor with a bold perimeter wall ring
//   • themed dressing props around the rim (columns / torii / obelisks …)
//   • DESTRUCTIBLE COVER pillars you duck behind to break the boss's line of sight
//   • baitable HAZARD zones that damage BOTH the player and the boss
//   • ESCALATION as the boss loses HP (new hazards open, cover gets shattered)
// Boss summons are allowed in here, so adds must be kited. Everything is torn down on
// duel end. DuelController owns the camera/letterbox/combat; this owns the environment.

// Reserved arena origin — far outside the ±worldSize torus so no field props bleed in.
export const ARENA_ORIGIN = { x: 24000, y: 24000 };

// Per-civ environment kit. dressing = rim atmosphere; cover = destructible pillar;
// stone/wall = platform colours; hazardTint = the bait-zone colour.
const ARENA_KITS = {
  china: { dressing: ['decor_cn_lantern', 'decor_cn_banner'], cover: 'block_china', stone: 0x6a5640, wall: 0xe0563f, hazardTint: 0xff5a3a },
  japan: { dressing: ['decor_jp_lantern', 'decor_jp_torii', 'decor_jp_cherry'], cover: 'block_japan', stone: 0x4f5d44, wall: 0x7c8cff, hazardTint: 0xff7a4a },
  byzantium: { dressing: ['decor_bz_column', 'decor_bz_brazier', 'decor_bz_statue'], cover: 'block_byzantium', stone: 0x7d7768, wall: 0xc074e0, hazardTint: 0xffa030 },
  sumer:    { dressing: ['decor_sm_obelisk', 'decor_sm_palm'], cover: 'block_sumer', stone: 0xa98a5c, wall: 0x33b8d6, hazardTint: 0xffb020 },
  rome:     { dressing: ['decor_rm_column', 'decor_rm_eagle'],   cover: 'block_rome',     stone: 0x7a6e60, wall: 0xd23b3b, hazardTint: 0xff5a3a },
  macedon:  { dressing: ['decor_mc_column', 'decor_mc_olive'],   cover: 'block_macedon',  stone: 0x6e7464, wall: 0x3a7bd5, hazardTint: 0xff8a3a },
  mongolia: { dressing: ['decor_mn_yurt', 'decor_mn_banner'],    cover: 'block_mongolia', stone: 0x6e6440, wall: 0xc9a13a, hazardTint: 0xffb020 },
  norse:    { dressing: ['decor_no_runestone', 'decor_no_pine'],  cover: 'block_norse',   stone: 0x5a6470, wall: 0x4f9fd6, hazardTint: 0xff7a4a },
  default: { dressing: ['decor_rubble'], cover: 'pillar', stone: 0x5e5850, wall: 0xffd700, hazardTint: 0xff5a3a },
};

export default class BossArena {
  constructor(scene) {
    this.s = scene;
    this.active = false;
    this.objects = []; // floor / wall / dressing display objects
    this.hazards = []; // { x, y, r, dmg, sprite } persistent bait zones (hurt player + boss)
    this.cover = []; // { sprite, hp } destructible pillars
    this.coverGroup = null;
    this._colliders = [];
    this._hazardAcc = 0;
  }

  get theme() { return getTheme(this.s.stageCiv || (this.s.theme && this.s.theme.id) || 'default'); }
  get kit() { return ARENA_KITS[this.theme.id] || ARENA_KITS.default; }

  // Assemble the arena centred on (cx,cy) with the given ring radius.
  build(cx, cy, radius) {
    const s = this.s;
    const kit = this.kit;
    this.center = { x: cx, y: cy };
    this.radius = radius;
    this.active = true;

    const g = s.add.graphics().setDepth(-8);
    // platform floor: themed stone disc with concentric rings + a bold perimeter wall
    g.fillStyle(0x000000, 0.5).fillCircle(cx, cy + 8, radius + 26); // drop shadow
    g.fillStyle(kit.stone, 1).fillCircle(cx, cy, radius + 18);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(kit.stone).darken(18).color, 1).fillCircle(cx, cy, radius);
    g.lineStyle(3, kit.wall, 0.5);
    for (let rr = radius - 60; rr > 40; rr -= 60) g.strokeCircle(cx, cy, rr); // floor inlay rings
    g.lineStyle(10, kit.wall, 0.9).strokeCircle(cx, cy, radius + 12); // the wall ring
    g.lineStyle(3, 0x000000, 0.4).strokeCircle(cx, cy, radius + 18);
    this.objects.push(g);

    // rim dressing: themed props spaced evenly just outside the wall
    const dress = kit.dressing.filter((k) => s.textures.exists(k));
    if (dress.length) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const key = dress[i % dress.length];
        const px = cx + Math.cos(a) * (radius + 46);
        const py = cy + Math.sin(a) * (radius + 46);
        const img = s.add.image(px, py, key).setDepth(py > cy ? 6 : -7).setScale(0.95).setFlipX(Math.cos(a) < 0);
        this.objects.push(img);
      }
    }

    // destructible cover: a few pillars inside the ring (block the boss's projectiles)
    this.coverGroup = s.physics.add.group({ allowGravity: false, immovable: true });
    const coverKey = s.textures.exists(kit.cover) ? kit.cover : 'pillar';
    const spots = [[0.45, -0.6], [-0.5, -0.2], [0.15, 0.55], [-0.35, 0.5]];
    for (const [fx, fy] of spots) {
      this.addCover(cx + fx * radius, cy + fy * radius, coverKey);
    }

    // colliders: player + enemies (boss/adds) bump cover; boss shots blocked here.
    // Player shots reach cover via the existing projectiles↔breakables overlap in
    // GameScene (cover is now registered in s.breakables in addCover), so we do NOT
    // add a separate overlap for s.projectiles here — that would double-count damage.
    this._colliders.push(s.physics.add.collider(s.player, this.coverGroup));
    this._colliders.push(s.physics.add.collider(s.enemies, this.coverGroup));
    this._colliders.push(s.physics.add.overlap(s.enemyProjectiles, this.coverGroup, this._bossShotHitsCover, null, this));

    // seed a couple of baitable hazards
    this.addHazard(cx + radius * 0.55, cy + radius * 0.1);
    this.addHazard(cx - radius * 0.2, cy - radius * 0.55);
  }

  addCover(x, y, key) {
    const s = this.s;
    const c = this.coverGroup.create(x, y, key).setDepth(5);
    c.body.setSize(c.width * 0.6, c.height * 0.5);
    c.body.setOffset(c.width * 0.2, c.height * 0.45);
    c.body.immovable = true;
    c.refreshBody();
    c.coverHp = 260; // tanky — it must survive a few boss volleys so you can actually hide behind it

    // --- Breakable contract ---
    // Register with the scene's breakables group so that the melee arc sweep
    // (WeaponSystem.fireMeleeArc iterates breakables) and the existing
    // projectiles↔breakables overlap both reach this pillar automatically.
    //
    // We intercept the `hp` property via a getter/setter so that any write
    // from damageBreakable/onProjectileHitBreakable routes through _damageCover
    // (our loot-free, coverHp-tracking path) rather than breakBreakable
    // (which would drop gems and call c.destroy before we can clean up).
    //
    // The getter returns `c.active ? c.coverHp : 1` — returning 1 when the
    // cover is already deactivated prevents damageBreakable's `if (b.hp <= 0)`
    // branch from ever reaching breakBreakable after we've handled destruction.
    c.isBreakable = true;
    c.noDrop = true; // belt-and-suspenders flag in case drop code is extended later
    Object.defineProperty(c, 'hp', {
      get: () => (c.active ? c.coverHp : 1),
      set: (v) => {
        const dmg = c.coverHp - v; // how much damageBreakable tried to subtract
        if (dmg > 0) this._damageCover(c, dmg); // delegate to our handler
        // intentionally do NOT write through to coverHp — _damageCover owns that
      },
      configurable: true,
    });

    // Also add to the scene breakables group (used by fireMeleeArc + GameScene overlap).
    // NOTE: Arcade Group.add() re-applies the group's defaults to the child body —
    // including setImmovable(false) — which would un-pin the pillar so the player shoves
    // it on contact. Re-assert immovable/pushable AFTER the add so cover stays put.
    if (s.breakables) s.breakables.add(c);
    c.body.immovable = true;
    c.body.pushable = false;

    this.cover.push(c);
    return c;
  }

  // boss projectile stopped by cover (chips it).
  // Player shots are now handled by the existing projectiles↔breakables overlap in
  // GameScene (which calls onProjectileHitBreakable → damageBreakable → our hp
  // setter → _damageCover), so _playerShotHitsCover is removed to avoid double-damage.
  _bossShotHitsCover(proj, c) { this.s.deactivate(proj); this._damageCover(c, 4); }

  _damageCover(c, amount) {
    if (!c.active) return;
    c.coverHp -= amount;
    this.s.fx.impact(c.x, c.y, this.kit.wall);
    c.setTint(0xff8866);
    this.s.time.delayedCall(60, () => c.active && c.clearTint());
    if (c.coverHp <= 0) {
      this.s.fx.death(c.x, c.y, 0xbbbbbb);
      this.cover = this.cover.filter((o) => o !== c);
      // Remove from breakables before deactivating so no orphaned entry lingers
      if (this.s.breakables) this.s.breakables.remove(c, false, false);
      // Deactivate first (keeps the sprite alive momentarily so any in-flight
      // damageBreakable calls can safely read b.x/b.y and b.setTintFill),
      // then destroy on the next tick.
      c.setActive(false).setVisible(false);
      this.s.time.delayedCall(0, () => { if (c.scene) c.destroy(); });
    }
  }

  addHazard(x, y, radius = 60) {
    const s = this.s;
    const sprite = s.add.image(x, y, 'flame_pool').setDepth(2).setScale((radius * 2) / 64).setAlpha(0.55).setTint(this.kit.hazardTint);
    s.tweens.add({ targets: sprite, alpha: 0.8, duration: 700, yoyo: true, repeat: -1 });
    this.hazards.push({ x, y, r: radius, dmg: 14, sprite });
  }

  // Phase escalation = a LAYOUT SHIFT. Each phase visibly reshapes the arena so the
  // late fight plays in a different, nastier space:
  //   phase 1 → a ring of bait-hazards blooms at mid-radius + half the cover shatters
  //   phase 2 → a hazard erupts at dead centre + ALL remaining cover collapses (open,
  //              exposed kiting) + the floor pulses to the danger colour
  escalate() {
    if (!this.active) return;
    const { x, y } = this.center;
    const r = this.radius;
    this._layoutPhase = (this._layoutPhase || 0) + 1;
    const TAU = Math.PI * 2;

    if (this._layoutPhase === 1) {
      const off = Math.random() * TAU;
      for (let i = 0; i < 4; i++) {
        const a = off + (i / 4) * TAU;
        this.addHazard(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, 64);
      }
      // shatter roughly half the cover (drop the inner-most pillars)
      const half = Math.ceil(this.cover.length / 2);
      for (const c of this.cover.slice(0, half)) this._damageCover(c, 999);
    } else {
      // later breaks: centre erupts and the arena opens up completely
      this.addHazard(x, y, 96);
      for (const c of [...this.cover]) this._damageCover(c, 999);
      const ring = this.s.add.circle(x, y, r + 12).setStrokeStyle(10, this.kit.hazardTint, 0.9).setDepth(-8);
      this.objects.push(ring);
      this.s.tweens.add({ targets: ring, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
    }
    this.s.showBanner('The arena turns against you!', '#ff7a3a');
    this.s.cameras.main.shake(240, 0.006);
  }

  // Tick the bait hazards: damage the player AND the boss standing in them.
  update(delta) {
    if (!this.active || !this.hazards.length) return;
    this._hazardAcc += delta;
    if (this._hazardAcc < 300) return;
    this._hazardAcc = 0;
    const s = this.s;
    const p = s.player;
    const boss = s.activeBoss;
    for (const h of this.hazards) {
      if (p && p.active) {
        const dx = p.x - h.x;
        const dy = p.y - h.y;
        if (dx * dx + dy * dy <= h.r * h.r) {
          s.warnHazardOnce();
          s.reactToHit(p.takeDamage(h.dmg, s.time.now, { bypassIframes: true, ranged: true }));
        }
      }
      if (boss && boss.active && !boss.rageInvuln) {
        const dx = boss.x - h.x;
        const dy = boss.y - h.y;
        if (dx * dx + dy * dy <= h.r * h.r) s.damageEnemy(boss, Math.round(h.dmg * 1.5)); // baiting the boss in is rewarded
      }
    }
  }

  teardown() {
    this.active = false;
    const s = this.s;
    // Non-physics visuals can be destroyed immediately.
    for (const o of this.objects) if (o && o.destroy) o.destroy();
    this.objects = [];
    for (const h of this.hazards) if (h.sprite && h.sprite.destroy) h.sprite.destroy();
    this.hazards = [];

    // PHYSICS teardown is DEFERRED to the next tick. teardown() is usually called from
    // a collision callback (the boss dies to a projectile → defeatBoss → duel.end →
    // here), i.e. MID physics-step. Destroying the cover group + its colliders
    // synchronously then makes Phaser read a now-destroyed group later in the SAME step
    // → "Cannot read properties of undefined (reading 'size')" crash + a frozen screen.
    // Disable the bodies now (stops collisions this frame), destroy after the step.
    const colliders = this._colliders;
    const group = this.coverGroup;
    const cover = this.cover;
    this._colliders = [];
    this.coverGroup = null;
    this.cover = [];
    for (const c of cover) { if (c && c.body) c.body.enable = false; }
    s.time.delayedCall(0, () => {
      for (const col of colliders) if (col) s.physics.world.removeCollider(col);
      if (s.breakables) for (const c of cover) { if (c) s.breakables.remove(c, false, false); }
      for (const c of cover) if (c && c.destroy) c.destroy();
      if (group) { group.clear(true, true); group.destroy(); }
    });
  }
}
