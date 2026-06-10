import Phaser from 'phaser';
import { xpForLevel } from '../config.js';
import { getCivTrait, getPersonalTrait } from '../data/traits.js';
import { SLOTS } from '../data/equipment.js';

const BASE_REGEN_CAP = 0.32; // passive regen only refills up to this fraction of max HP

// The player avatar plus all run-scoped state. Derived combat stats are
// recomputed from (character base + civ trait + personal trait + equipment)
// on equip. Timed buffs (shrines) and terrain modifiers apply per-frame on top.
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character) {
    super(scene, x, y, `char_${character.id}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.character = character;
    this.civTrait = getCivTrait(character.civId);
    this.personalTrait = getPersonalTrait(character.id);

    // No world-bound wall: the world is a TORUS — GameScene.wrapEntity loops the player
    // to the far side at the edge (a hard wall would block the wrap, and would also trap
    // the player out of the boss-arena precinct that lives outside these bounds).
    this.setCollideWorldBounds(false);
    this.setDepth(10);
    this.body.setSize(this.width * 0.5, this.height * 0.6);
    this.body.setOffset(this.width * 0.25, this.height * 0.35);

    this.equipment = {};
    for (const s of SLOTS) this.equipment[s.id] = null;
    this.artifactMods = []; // permanent campaign boons (mod bags)
    this.levelMods = {}; // accumulated HERO STAT upgrades chosen on level-up past the ability cap

    // progression
    this.level = 1;
    this.xp = 0;
    this.xpToNext = xpForLevel(this.level);
    this.kills = 0;

    // transient combat state
    this.invuln = 0;
    this._regenCarry = 0;
    this.rooted = false; // duel: set true during attack-commitment / stun so move() can't walk you out of it

    // dash: 2 independent charges, each recharges in 1.8s
    this.dashCharges = 2;
    this.dashChargeMax = 2;
    this.dashRecharge = [0, 0]; // timestamps at which each spent charge refills
    this.dashing = false;       // true for the ~240ms burst window
    this.dashUntil = 0;         // when the burst velocity ends
    this.dashInvulnUntil = 0;   // i-frames extend 60ms past the burst (separate from takeDamage invuln)
    this.dashDir = { x: 0, y: 0 }; // normalized dash direction
    // perfect-dodge counter: one proc per 3s, triggered when an attack is blocked by dash i-frames
    this.perfectDodgeCooldownUntil = 0;

    // per-frame modifiers layered on top of recompute()
    this.buffs = [];
    this.buffDamageMult = 1;
    this.buffSpeedMult = 1;
    this.buffDamageTakenMult = 1;
    this.invulnBuff = false;
    this.terrainSpeedMult = 1;
    // musou empowered window (opened by casting the secondary ability)
    this.empowerUntil = 0;
    this.empowerColor = 0xffffff;
    this.empowered = false;
    this.momentumStacks = 0; // kills during the musou window
    this.empowerMax = 0; // hard cap on momentum-extended window

    // weapon/ability resonance + elite "curse" slow
    this.resonanceMods = [];
    this.activeResonances = [];
    this.bonusProjectiles = 0;
    this.bonusAbilityCount = 0;
    this.curseSlow = 1;
    this.contractXpMult = 1;

    this.recompute(true);
    this.hp = this.maxHp;
  }

  // Aggregate every modifier source into derived combat stats.
  recompute(initial = false) {
    const prevMax = this.maxHp || 0;
    const b = this.character.stats;

    let maxHpMult = 1;
    let maxHpFlat = 0;
    let speedMult = 1;
    let speedFlat = 0;
    let pickupMult = 1;
    let generalDR = 0;

    this.damageMult = b.attack;
    this.cooldownMult = 1;
    this.reachMult = 1;
    this.effectMult = 1;
    this.meleeDR = b.defense || 0;
    this.rangedDR = b.rangedDefense || 0;
    this.dodge = 0;
    this.lifesteal = b.lifesteal || 0;
    this.regen = b.regen || 0;
    let regenCap = BASE_REGEN_CAP;
    this.xpMult = 1;
    this.luck = b.luck || 0; // biases loot rarity (see PickupController.openLoot)

    const bags = [this.civTrait?.mods, this.personalTrait?.mods, this.levelMods];
    for (const item of Object.values(this.equipment)) if (item) bags.push(item.mods);
    for (const m of this.artifactMods) bags.push(m);
    for (const m of this.resonanceMods) bags.push(m);

    for (const m of bags) {
      if (!m) continue;
      if (m.damageMult) this.damageMult += m.damageMult;
      if (m.cooldownMult) this.cooldownMult += m.cooldownMult;
      if (m.speedMult) speedMult += m.speedMult;
      if (m.speedFlat) speedFlat += m.speedFlat;
      if (m.maxHpMult) maxHpMult += m.maxHpMult;
      if (m.maxHpFlat) maxHpFlat += m.maxHpFlat;
      if (m.reachMult) this.reachMult += m.reachMult;
      if (m.effectMult) this.effectMult += m.effectMult;
      if (m.defense) this.meleeDR += m.defense;
      if (m.rangedDefense) this.rangedDR += m.rangedDefense;
      if (m.damageReduction) generalDR += m.damageReduction;
      if (m.dodge) this.dodge += m.dodge;
      if (m.lifesteal) this.lifesteal += m.lifesteal;
      if (m.regen) this.regen += m.regen;
      if (m.regenCapBonus) regenCap += m.regenCapBonus;
      if (m.xpMult) this.xpMult += m.xpMult;
      if (m.pickupMult) pickupMult += m.pickupMult;
      if (m.luck) this.luck += m.luck;
    }

    this.maxHp = Math.round((b.maxHp + maxHpFlat) * maxHpMult);
    this.speed = (b.speed + speedFlat) * speedMult;
    this.pickup = b.pickup * pickupMult;
    this.cooldownMult = Math.max(0.25, this.cooldownMult);
    // Defensive ceilings kept well below 100% so stacking defense/heal can't make
    // the player unkillable (was the main reason boss fights felt trivial).
    this.meleeDR = Math.min(0.55, this.meleeDR + generalDR);
    this.rangedDR = Math.min(0.55, this.rangedDR + generalDR);
    this.dodge = Math.min(0.5, this.dodge);
    this.lifesteal = Math.min(0.3, this.lifesteal);
    this.regenCap = Math.min(0.6, regenCap); // passive regen can never near-full-heal you

    if (!initial && this.maxHp > prevMax) this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMax));
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  equip(item) {
    this.equipment[item.slot] = item;
    this.recompute();
  }

  // Permanent hero-stat upgrade chosen on level-up (post ability-cap). Accumulates into
  // the levelMods bag, which recompute() folds in like any other mod source.
  addLevelMod(key, amount) {
    this.levelMods[key] = (this.levelMods[key] || 0) + amount;
    this.recompute();
  }

  // Restore carried campaign progression (level + xp) and fix the next threshold.
  loadProgress(level, xp) {
    this.level = level;
    this.xp = xp;
    this.xpToNext = xpForLevel(level);
  }

  move(dirX, dirY) {
    if (this.rooted) { this.setVelocity(0, 0); return; } // committed to an attack / stunned: input can't move you
    // During a dash the velocity is owned by the dash burst — don't let normal move() overwrite it.
    if (this.dashing) return;
    const len = Math.hypot(dirX, dirY) || 1;
    const sp = this.speed * this.buffSpeedMult * this.terrainSpeedMult * this.curseSlow;
    this.setVelocity((dirX / len) * sp, (dirY / len) * sp);
    if (dirX < 0) this.setFlipX(true);
    else if (dirX > 0) this.setFlipX(false);
  }

  // Attempt a dash in direction (dx, dy). Returns true if a charge was consumed.
  // `lastMoveDir` (radians) is the fallback when standing still.
  // Called from GameScene — NOT called when rooted in a duel commitment swing, but
  // IS allowed during duel movement (rooted only blocks attacks, not dashes there).
  startDash(dx, dy, lastMoveDir, now) {
    // Consume a charge (refilling or already available).
    this._refreshCharges(now);
    if (this.dashCharges <= 0) return false;
    // Pick direction: use current movement input, fall back to last known heading.
    let nx = dx;
    let ny = dy;
    if (Math.hypot(nx, ny) < 0.1) {
      // Standing still — use last move heading.
      nx = Math.cos(lastMoveDir);
      ny = Math.sin(lastMoveDir);
    }
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;

    // Mark the consumed charge with a recharge timestamp.
    this.dashCharges -= 1;
    for (let i = 0; i < this.dashChargeMax; i++) {
      if (this.dashRecharge[i] <= now) {
        this.dashRecharge[i] = now + 1800; // 1.8s per charge
        break;
      }
    }

    const SPEED = this.speed * 3.2; // ~3.2x normal speed
    const DURATION = 240;           // ms burst window
    const IFRAME_TAIL = 60;         // extra i-frames after burst ends

    this.dashing = true;
    this.dashUntil = now + DURATION;
    this.dashInvulnUntil = now + DURATION + IFRAME_TAIL;
    // Extend the existing invuln window so both systems agree on immunity.
    this.invuln = Math.max(this.invuln, this.dashInvulnUntil);
    this.dashDir.x = nx;
    this.dashDir.y = ny;
    this.setVelocity(nx * SPEED, ny * SPEED);
    if (nx < 0) this.setFlipX(true);
    else if (nx > 0) this.setFlipX(false);
    return true;
  }

  // Called every frame from GameScene.update — ends the burst and ticks charge refills.
  tickDash(now) {
    // Tick refills regardless of dashing state.
    this._refreshCharges(now);
    // End the burst when the window expires.
    if (this.dashing && now >= this.dashUntil) {
      this.dashing = false;
      // Don't zero velocity — let physics/move take over naturally next frame.
    }
  }

  // Promote any timestamps whose recharge time has passed back into available charges.
  _refreshCharges(now) {
    for (let i = 0; i < this.dashChargeMax; i++) {
      if (this.dashCharges < this.dashChargeMax && this.dashRecharge[i] > 0 && now >= this.dashRecharge[i]) {
        this.dashCharges += 1;
        this.dashRecharge[i] = 0;
      }
    }
  }

  // True when the player is currently covered by dash i-frames (burst or tail).
  isDashInvuln(now) {
    return now < this.dashInvulnUntil;
  }

  // Returns 'dead' | 'hit' | 'dodge' | 'perfect_dodge'. `ranged` picks ranged vs melee defense.
  // When the damage would be blocked by dash i-frames (not regular i-frames and not bypassIframes),
  // the result is 'perfect_dodge' so GameScene can trigger the counter-window.
  takeDamage(amount, time, { bypassIframes = false, ranged = false } = {}) {
    if (this.invulnBuff) return 'hit'; // invulnerability power-up: ignore all damage
    if (!bypassIframes && time < this.invuln) {
      // Check whether the active protection is specifically from a dash (not generic hurt i-frames).
      // Dash i-frames are always >= the regular invuln so if dashInvulnUntil is still active AND
      // the regular hurt window would NOT cover it, we know the dash is doing the blocking.
      const dashCovering = this.isDashInvuln(time);
      return dashCovering ? 'perfect_dodge' : 'hit';
    }
    if (Math.random() < this.dodge) {
      this.showDodge();
      return 'dodge';
    }
    const dr = ranged ? this.rangedDR : this.meleeDR;
    this.hp -= amount * (1 - dr) * this.buffDamageTakenMult;
    if (!bypassIframes) this.invuln = time + 450;
    this.scene.cameras.main.shake(110, 0.005);
    this.setTint(0xff6b6b);
    this.scene.time.delayedCall(110, () => this.active && this.clearTint());
    return this.hp <= 0 ? 'dead' : 'hit';
  }

  showDodge() {
    const t = this.scene.add
      .text(this.x, this.y - 28, 'dodge', { fontFamily: 'monospace', fontSize: '12px', color: '#9ef' })
      .setDepth(20)
      .setOrigin(0.5);
    this.scene.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 500, onComplete: () => t.destroy() });
  }

  // Heal the player. overCap=true lets shrines/pickups push HP up to maxHp*1.25 as a
  // temporary overheal. The excess decays back to maxHp at ~2 HP/s via applyRegen.
  heal(amount, { overCap = false } = {}) {
    const ceiling = overCap ? this.maxHp * 1.25 : this.maxHp;
    this.hp = Math.min(ceiling, this.hp + amount);
  }

  // Heal a fraction of damage dealt (lifesteal from gear/character).
  lifestealFrom(damage) {
    if (this.lifesteal <= 0 || this.hp <= 0) return;
    this.heal(damage * this.lifesteal);
  }

  // Returns number of levels gained.
  addXp(amount) {
    this.xp += Math.round(amount * this.xpMult * this.contractXpMult);
    let gained = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = xpForLevel(this.level);
      gained += 1;
    }
    return gained;
  }

  // Slow passive regen, capped so it can't refill to full (unless gear raises cap).
  // Also drains any temporary overheal (hp > maxHp) back down at 2 HP/s.
  applyRegen(dtSeconds) {
    // Overheal drain: excess above maxHp bleeds off at 2 HP/s (regardless of regen stat).
    if (this.hp > this.maxHp) {
      this.hp = Math.max(this.maxHp, this.hp - 2 * dtSeconds);
      return; // don't also apply forward-regen while overhealed
    }
    if (this.regen <= 0 || this.hp <= 0) return;
    const cap = this.maxHp * this.regenCap;
    if (this.hp >= cap) return;
    this._regenCarry += this.regen * dtSeconds;
    if (this._regenCarry >= 0.5) {
      this.hp = Math.min(cap, this.hp + this._regenCarry);
      this._regenCarry = 0;
    }
  }

  // A kill during the musou window: bank a stack and extend the window (capped).
  addMomentum() {
    if (!this.empowered) return;
    this.momentumStacks += 1;
    this.empowerUntil = Math.min(this.empowerUntil + 200, this.empowerMax);
  }

  // Timed buffs: kind is 'damage' | 'speed' | 'defense' | 'invuln'.
  addBuff(kind, mult, durationMs, now) {
    this.buffs.push({ kind, mult, until: now + durationMs });
  }

  updateBuffs(now) {
    this.buffDamageMult = 1;
    this.buffSpeedMult = 1;
    this.buffDamageTakenMult = 1;
    this.invulnBuff = false;
    this.buffs = this.buffs.filter((bf) => bf.until > now);
    for (const bf of this.buffs) {
      if (bf.kind === 'damage') this.buffDamageMult *= bf.mult;
      else if (bf.kind === 'speed') this.buffSpeedMult *= bf.mult;
      else if (bf.kind === 'defense') this.buffDamageTakenMult *= bf.mult; // e.g. 0.5 = take half
      else if (bf.kind === 'invuln') this.invulnBuff = true;
    }
    this.empowered = now < this.empowerUntil;
  }
}
