import Phaser from 'phaser';
import { ENEMIES, SPAWN_TABLE, ELITE_MODIFIERS } from '../data/enemies.js';
import { DUNGEON } from '../config.js';
import { Audio } from './AudioManager.js';

// Spawns enemies in a ring just outside the camera. Difficulty (hp/damage/rate)
// scales with elapsed run time. Occasionally promotes a spawn to an "elite"
// (tougher, drops a chest) and periodically drops a free chest on the field.
export default class SpawnSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.accum = 0;
    this.elapsed = 0; // seconds (ticks for elite/boss-minion difficulty scaling only)
    this.dwell = 0;   // seconds spent on the CURRENT floor (resets each descent)
    this.chestTimer = 30000; // first field chest after ~30s
    this.eliteTimer = 24000; // first elite after ~24s (elites come thicker now)
    // Per-floor spawn BUDGET: a floor only ever spawns this many enemies, so you can't
    // park on a floor and farm XP forever — descend for more (and tougher) foes.
    this.floorBudget = 60;
    this.spawnedThisFloor = 0;
  }

  get difficulty() {
    // FLOOR is the primary driver (+ a mild dwell term so lingering ramps pressure),
    // and we KEEP the PLAYER'S OFFENSE × the campaign stage scale so a stacked build
    // stays challenged and later civs stay harder. Drives enemy HP, XP, and damage.
    const power = this.scene.playerPower ? this.scene.playerPower() : 1;
    const floor = this.scene.floor || 1;
    return power * (1 + (floor - 1) * 0.14 + this.dwell / 200) * (this.scene.stageScale || 1);
  }

  get spawnInterval() {
    const floor = this.scene.floor || 1;
    // Depth-based pacing only. (The old `- dwell*0.4` accelerated spawns the longer you
    // lingered — fine for an endless arena, but with a finite per-floor budget it just
    // front-loaded the fight and left dead air while you explored to the stairs.)
    return Math.max(200, 820 - floor * 22);
  }

  // reset per-floor spawn pacing + budget (called by GameScene on each descent)
  onFloorStart(floor = this.scene.floor || 1) {
    this.dwell = 0;
    this.accum = 0;
    this.spawnedThisFloor = 0;
    // deeper floors field a larger horde before they run dry (bumped — game was too easy)
    this.floorBudget = Math.round(85 + (floor - 1) * 16);
  }

  // a walkable spawn point on the ring around the camera (reject wall tiles)
  spawnPointOnFloor() {
    const fs = this.scene.floorSys;
    if (!fs) return this.spawnPointAroundCamera();
    for (let i = 0; i < 10; i++) {
      const p = this.spawnPointAroundCamera();
      if (fs.isWalkable(p.x, p.y)) return p;
    }
    return fs.randomWalkableNear(this.player.x, this.player.y);
  }

  pickType() {
    // Enemy VARIETY unlocks by DEPTH, not elapsed time — you must descend to meet the
    // tougher archetypes (can't grind floor 1 to see them all). The table's legacy
    // `from` (seconds, 0–400) maps to a floor gate at ~1 floor per 30s of that curve,
    // so the full bestiary is unlocked by ~floor 13.
    const floor = this.scene.floor || 1;
    const gate = (s) => Math.max(1, Math.round(s.from / 30));
    const eligible = SPAWN_TABLE.filter((s) => floor >= gate(s));
    const total = eligible.reduce((a, s) => a + s.weight, 0);
    let r = Math.random() * total;
    for (const s of eligible) {
      r -= s.weight;
      if (r <= 0) return s.id;
    }
    return 'soldier';
  }

  spawnPointAroundCamera() {
    const cam = this.scene.cameras.main;
    const margin = 60;
    const left = cam.worldView.x - margin;
    const right = cam.worldView.right + margin;
    const top = cam.worldView.y - margin;
    const bottom = cam.worldView.bottom + margin;
    switch (Phaser.Math.Between(0, 3)) {
      case 0: return { x: Phaser.Math.Between(left, right), y: top };
      case 1: return { x: Phaser.Math.Between(left, right), y: bottom };
      case 2: return { x: left, y: Phaser.Math.Between(top, bottom) };
      default: return { x: right, y: Phaser.Math.Between(top, bottom) };
    }
  }

  spawnOne(forceElite = false) {
    const typeId = this.pickType();
    const def = ENEMIES[typeId];
    const { x, y } = this.spawnPointOnFloor();
    const e = this.scene.enemies.get(x, y, `enemy_${def.id}`);
    if (!e) return;
    this.spawnedThisFloor++; // counts against this floor's spawn budget
    e.setActive(true).setVisible(true);
    e.body.reset(x, y);
    e.body.enable = true;
    e.setDepth(5);

    e.typeId = typeId;
    e.attack = def.attack;
    e.speed = def.speed;
    // XP scales sub-linearly with the same difficulty that drives enemy HP, so deeper/
    // tougher enemies are worth proportionally more — keeps leveling alive past lv 30
    // (when the curve gets steep) without flooding XP in the opening minutes.
    e.xpValue = Math.max(def.xp, Math.round(def.xp * Math.pow(this.difficulty, 0.62)));

    // ── Movement pattern tag + per-entity state (melee) ──────────────────────
    e.move = def.move || 'chase';

    // zigzag
    e.weaveAmp  = def.weaveAmp  || 60;
    e.weaveFreq = def.weaveFreq || 2.5;
    e.weavePhase = Math.random() * Math.PI * 2; // randomise start phase so mobs aren't in sync

    // circle
    e.orbitRadius = def.orbitRadius || 160;
    e.orbitSpeed  = def.orbitSpeed  || 120;
    e.orbitDir    = Math.random() < 0.5 ? 1 : -1; // CW or CCW per entity

    // charger
    e.dashSpeed    = def.dashSpeed    || 380;
    e.dashDuration = def.dashDuration || 350;
    e.dashCooldown = def.dashCooldown || 2800;
    e.dashRange    = def.dashRange    || 280;
    e.dashWindup   = def.dashWindup   || 400;
    e.dashTimer    = Phaser.Math.Between(500, e.dashCooldown); // stagger first dash
    e.dashWindTimer = 0;
    e.dashActive   = false;
    e.dashDx       = 0;
    e.dashDy       = 0;

    // lunger
    e.lungeSpeed    = def.lungeSpeed    || 360;
    e.lungeDuration = def.lungeDuration || 300;
    e.lungeCooldown = def.lungeCooldown || 3200;
    e.lungeRange    = def.lungeRange    || 240;
    e.lungeWindup   = def.lungeWindup   || 300;
    e.recoverTime   = def.recoverTime   || 400;
    e.lungeTimer    = Phaser.Math.Between(600, e.lungeCooldown);
    e.lungeWindTimer = 0;
    e.lungeActive   = false;
    e.lungeRecovering = false;
    e.lungeRecoverTimer = 0;
    e.lungeDx       = 0;
    e.lungeDy       = 0;

    // flyer (harpy)
    e.diveSpeed     = def.diveSpeed     || 420;
    e.diveRange     = def.diveRange     || 260;
    e.diveWindup    = def.diveWindup    || 260;
    e.exitDuration  = def.exitDuration  || 1200;
    e.flyPhase      = 'approach';   // start cruising toward the player
    e.flyWindRemain = 0;
    e.flyExitTimer  = 0;
    e.flyDx         = 0;
    e.flyDy         = 0;

    // melee swing — chase/zigzag/circle "strikers" stop, telegraph, and SLASH an arc in
    // front (dodge-able) instead of just dealing passive touch damage. Opt-in via def.swing.
    e.swing         = !!def.swing;
    e.swingRange    = def.swingRange    || 60;   // reach the slash arc covers
    e.swingArc      = def.swingArc      || 1.7;  // cone width (radians) the strike hits
    e.swingWindup   = def.swingWindup   || 360;  // telegraph (freeze + red flash) before the hit
    e.swingActiveT  = def.swingActiveT  || 130;  // strike-active window
    e.swingRecover  = def.swingRecover  || 280;  // recovery hang after the swing
    e.swingCooldown = def.swingCooldown || 1100; // gap between swings
    e.swingDmgMult  = def.swingDmgMult  || 1.6;  // the swing hits HARD (vs the contact chip)
    e.swingState    = null;  // null | 'wind' | 'strike' | 'recover'
    e.swingTimer    = 0;
    e.swingCd       = Phaser.Math.Between(250, 850); // stagger first swing across the swarm
    e.swingAng      = 0;     // facing snapshot at windup (so the player can sidestep)
    e.swingHitDone  = false;

    // bomber
    e.fuseRange       = def.fuseRange     || 80;
    e.fuseDuration    = def.fuseDuration  || 1400;
    e.blastRadius     = def.blastRadius   || 110;
    e.blastDamage     = def.blastDamage   || 35;
    e.blastDelay      = def.blastDelay    || 0;
    e.blastTick       = def.blastTick     || 9999;
    e.blastLinger     = def.blastLinger   || 400;
    e.bomberPhase     = 'rush';     // always start in rush mode
    e.bomberFuseTimer = 0;
    e.bomberFlashAccum = 0;
    e.bomberFlashState = false;

    // ── Ranged firing style + per-entity state ────────────────────────────────
    e.rangedKind  = def.rangedKind  || 'single';
    e.spreadCount = def.spreadCount || 3;
    e.spreadAngle = def.spreadAngle || 0.3;
    e.rapidBurst  = def.rapidBurst  || 3;
    e.rapidInterval = def.rapidInterval || 130;
    e.rapidShotsFired = 0;
    e.rapidIntervalTimer = 0;
    e.burstActive = false;

    // ranged params (undefined for melee)
    e.range = def.range;
    e.fireCooldown = def.fireCooldown;
    e.windup = def.windup;
    e.projSpeed = def.projSpeed;
    e.projDamage = def.projDamage;
    e.fireTimer = Phaser.Math.Between(400, def.fireCooldown || 1000);
    e.winding = false;

    // siege (catapult) — AoE hazard zone parameters
    e.splashRadius = def.splashRadius || 90;
    e.splashDamage = def.splashDamage || 20;
    e.splashDelay  = def.splashDelay  || 1000;
    e.splashTick   = def.splashTick   || 200;
    e.splashLinger = def.splashLinger || 1800;

    // blink (teleporting caster) — reposition state
    e.blinkCooldown  = def.blinkCooldown  || 2200;
    e.blinkDistance  = def.blinkDistance  || 220;
    e.blinkTimer     = Phaser.Math.Between(800, def.blinkCooldown || 2200); // stagger first blink

    // reset elite-modifier state (pooled enemies are reused)
    e.isElite = forceElite;
    e.eliteMod = null;
    e.ironclad = false;
    e.warlordEvery = 0;
    e.curseRadius = 0;
    e.casterEvery = 0; // caster elite: periodic ranged volley
    e.volatile = false; // volatile elite: AoE detonation on death
    e.bleedUntil = 0; e.bleedStacks = 0; e.bleedAcc = 0; e.bleedDps = 0; // clear any stale bleed DoT
    e.slowUntil = 0; // clear any stale slow (Alexander's javelins)
    e.stunUntil = 0; // clear any stale stun (Genghis's Khan's Cleave)
    e.fearUntil = 0; // clear any stale fear

    // Damage scales with FLOOR depth + dwell AND the campaign stage AND (mildly) the
    // player's offense — so deeper floors / later stages / stronger builds hit back hard.
    const power = this.scene.playerPower ? this.scene.playerPower() : 1;
    const floor = this.scene.floor || 1;
    // Capped so the depth×stage×power stack can't let a high-base-damage mob (titan/golem)
    // one-shot even a stacked build — threatening, not instant-death.
    const dmgScale = Math.min(10, (1 + (floor - 1) * 0.12 + this.dwell / 160) * (this.scene.stageScale || 1) * (1 + (power - 1) * 0.06));
    e.maxHp = Math.round(def.hp * this.difficulty * (forceElite ? 4 : 1));
    // early-floor toughness so nothing is one-shot on arrival (fades by earlyHpFloors)
    if (this.scene.dungeonMode) {
      const earlyHp = 1 + Math.max(0, DUNGEON.earlyHpFloors - floor) * DUNGEON.earlyHpBonus;
      e.maxHp = Math.round(e.maxHp * earlyHp);
    }
    e.damage = Math.round(def.damage * dmgScale);
    e.armor = def.armor || 0; // flat damage reduction (Stone Golem); applied in damageEnemy

    if (forceElite) {
      const mod = ELITE_MODIFIERS[Phaser.Math.Between(0, ELITE_MODIFIERS.length - 1)];
      e.eliteMod = mod.id;
      e.eliteName = mod.name;
      e.maxHp = Math.round(e.maxHp * mod.hpMult);
      e.speed *= mod.speedMult;
      e.damage = Math.round(e.damage * mod.dmgMult);
      if (e.projDamage) e.projDamage = Math.round(e.projDamage * mod.dmgMult);
      if (mod.id === 'ironclad') e.ironclad = true;
      if (mod.id === 'warlord') { e.warlordEvery = mod.summonEvery; e.warlordCount = mod.summonCount; e.warlordTimer = mod.summonEvery; }
      if (mod.id === 'hex') { e.curseRadius = mod.curseRadius; e.curseSlowAmt = mod.curseSlow; }
      if (mod.id === 'caster') { e.casterEvery = mod.castEvery; e.casterTimer = mod.castEvery; e.castDmg = mod.castDmg; e.castSpeed = mod.castSpeed; }
      if (mod.id === 'volatile') { e.volatile = true; e.blastRadius = mod.blastRadius; e.blastDmgElite = mod.blastDmg; }
      e.eliteTint = mod.tint;
      e.setScale(1.5).setTint(mod.tint);
      Audio.sfx('elite'); // menacing low sting (internally throttled to ≤1/s)
    } else {
      e.setScale(1).clearTint();
    }
    // active difficulty contracts
    const ct = this.scene.contract;
    if (ct) {
      e.maxHp = Math.round(e.maxHp * ct.enemyHpMult);
      e.damage = Math.round(e.damage * ct.enemyDmgMult);
      if (e.projDamage) e.projDamage = Math.round(e.projDamage * ct.enemyDmgMult);
    }
    e.hp = e.maxHp;
    // Strikers do their real damage with the telegraphed swing, so passive contact is just
    // a light chip (brushing past still stings, but the headline hit is dodge-able).
    e.contactDamage = e.swing ? Math.max(1, Math.round(e.damage * 0.25)) : e.damage;
  }

  update(_time, delta) {
    this.elapsed += delta / 1000; // gates enemy variety (SPAWN_TABLE) + display
    this.dwell += delta / 1000;   // pressure on the current floor
    this.accum += delta;

    const interval = this.spawnInterval;
    const MAX_ENEMIES = 280; // perf + sanity cap
    const floor = this.scene.floor || 1;
    // budget only applies in dungeon mode (duel-test/open-arena keeps the endless swarm)
    const budgeted = this.scene.dungeonMode;
    while (this.accum >= interval) {
      this.accum -= interval;
      const remaining = budgeted ? this.floorBudget - this.spawnedThisFloor : Infinity;
      if (remaining <= 0) break; // this floor's budget is spent — find the stairs
      if (this.scene.enemies.countActive(true) >= MAX_ENEMIES) continue;
      let burst = Math.min(8, 2 + Math.floor((floor - 1) / 2)); // density rises with DEPTH (steady across the floor)
      burst = Math.min(burst, remaining);
      const eliteChance = Math.min(0.14, 0.03 + floor * 0.009); // elites mix into the horde, more with depth
      for (let i = 0; i < burst; i++) this.spawnOne(Math.random() < eliteChance);
    }

    // elites — held back once the floor's budget is spent
    this.eliteTimer -= delta;
    if (this.eliteTimer <= 0) {
      if (!budgeted || this.spawnedThisFloor < this.floorBudget) this.spawnOne(true);
      this.eliteTimer = Math.max(14000, 34000 - this.elapsed * 90);
    }

    // free field chests
    this.chestTimer -= delta;
    if (this.chestTimer <= 0) {
      this.scene.spawnChest();
      this.chestTimer = Phaser.Math.Between(40000, 60000);
    }
  }
}
