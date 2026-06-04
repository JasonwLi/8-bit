import Phaser from 'phaser';

const TAU = Math.PI * 2;
// Global boss-damage multiplier — bosses were barely scratching a defensive
// build, so projectile + contact damage is scaled up once at construction (a
// single tunable chokepoint instead of editing every attack in bosses.js).
// Tuning pass: bumped ~1.3× for harder hits across all bosses.
const BOSS_DMG = 2.38; // global boss damage buff (was 2.8 — eased ~15%)

// Global boss attack-speed multiplier. Dividing all cooldown/interval timers
// by this constant makes every boss attack ~30 % more often without touching
// individual attack definitions.  Raise it to speed bosses up further.
const BOSS_ATK_SPEED = 1.55;

// A boss. Joins the scene's `enemies` group (so the player's weapon damages it
// and contact hurts the player) but is flagged `isBoss` so GameScene runs
// bossUpdate(). State machine: idle -> telegraph -> execute -> (cast/charge).
//
// Bosses may define a single `attack` OR an `attacks` array that the boss
// cycles through. With `phaseThresholds` (descending HP fractions) the boss
// escalates at each threshold: faster casts + a phase-transition burst.
export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def, hpScale = 1, dmgScale = 1) {
    super(scene, x, y, `boss_${def.id}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.def = def;
    this.isBoss = true;
    this.bossName = def.name;
    // Every attack's damage is scaled by BOSS_DMG (the global boss buff) AND dmgScale
    // (the campaign stage + the player's own offense), so a boss hits as hard as the
    // build it's fighting — projectiles stay a real threat against a stacked character
    // instead of chipping 5 a shot. Clone so the shared data defs aren't mutated.
    this.dmgScale = dmgScale;
    const rawAttacks = def.attacks && def.attacks.length ? def.attacks : [def.attack];
    this.attacks = rawAttacks.map((a) => ({ ...a, damage: Math.round(a.damage * BOSS_DMG * dmgScale) }));
    this.attackIndex = 0;
    this.currentAttack = this.attacks[0];
    this.summon = def.summon || null;
    this.tintColor = def.palette.secondary;

    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.speed = def.speed;
    this.baseContact = Math.round(def.contactDamage * BOSS_DMG * dmgScale);
    this.contactDamage = this.baseContact;
    this.xpValue = def.xp;

    // phase escalation
    this.phaseThresholds = def.phaseThresholds || [];
    this.phase = 0;
    this.atkCdMult = 1 / BOSS_ATK_SPEED; // baseline: attacks ~30 % faster (enterNextPhase multiplies this further)

    this.setDepth(6);
    this.body.setSize(this.width * 0.6, this.height * 0.7);
    this.body.setOffset(this.width * 0.2, this.height * 0.25);

    this.state = 'idle';
    this.attackTimer = this.currentAttack.cooldown * 0.6; // small grace after arrival
    this.summonTimer = this.summon ? this.summon.cooldown : Infinity;
    this.chargeLine = null;
    this.rageInvuln = false; // true during the duel RAGE musou (hits whiff — see bossDuelUpdate)
  }

  bossUpdate(delta) {
    if (!this.active) return;
    // staggered by a won clash: stand dazed
    if (this.scene.time.now < (this.stunUntil || 0)) {
      this.setVelocity(0, 0);
      this.setTint(0x8888ff);
      this._stunned = true;
      return;
    }
    if (this._stunned) { this._stunned = false; this.clearTint(); }
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
    this.setFlipX(p.x < this.x);

    // phase escalation as HP drops
    if (this.phase < this.phaseThresholds.length && this.hp / this.maxHp <= this.phaseThresholds[this.phase]) {
      this.enterNextPhase();
    }

    this.tickSummon(delta); // reinforcements (also active inside the boss arena now)

    if (this.state === 'idle') {
      if (dist > 230) this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
      else this.setVelocity(Math.cos(ang + Math.PI / 2) * this.speed * 0.6, Math.sin(ang + Math.PI / 2) * this.speed * 0.6);
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) this.beginAttack(ang);
    } else {
      this.advanceAttackState(delta, ang);
    }
  }

  // Resolve an in-progress telegraphed attack (telegraph -> fire, or sustained
  // cast/charge). Shared by the open-field AI and the duel AI so both use the
  // boss's own dodgeable, per-boss attack repertoire.
  advanceAttackState(delta, ang) {
    switch (this.state) {
      case 'telegraph':
        this.setVelocity(0, 0);
        this.setTint(0xff5555); // re-apply each frame so weapon-hit flashes don't clear it
        this.telegraphTimer -= delta;
        if (this.telegraphTimer <= 0) this.executeAttack(ang);
        break;
      case 'casting':
        this.setVelocity(Math.cos(ang) * this.speed * 0.4, Math.sin(ang) * this.speed * 0.4);
        this.castTimer -= delta;
        this.emitTimer -= delta;
        if (this.emitTimer <= 0) this.castStep(ang);
        if (this.castTimer <= 0) this.endAttack();
        break;
      case 'charging':
        this.chargeTimer -= delta;
        if (this.chargeTimer <= 0) {
          this.setVelocity(0, 0);
          this.contactDamage = this.baseContact;
          this.endAttack();
        }
        break;
      default:
        break;
    }
  }

  // Duel AI. The boss fights with its OWN telegraphed attack repertoire (the same
  // dodgeable `attacks[]` it uses in the open field — radial bursts, volleys,
  // spirals, flame zones, charges) so every boss duels uniquely. It keeps a
  // fighting distance and strafes (no fast unavoidable lunges), reactively raises
  // a guard (which the player's ultimate breaks), and rarely unleashes a slow,
  // telegraphed RAGE signature you dodge by spacing out. Telegraphs ARE the
  // dodge windows; the player attacks in the gaps.
  bossDuelUpdate(delta) {
    if (!this.active) return;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.time.now;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    this.setFlipX(p.x < this.x);

    // staggered (guard broken by the player's ultimate / hard stun): stand dazed
    if (now < (this.stunUntil || 0)) {
      this.setVelocity(0, 0); this.setTint(0x8888ff);
      this.blocking = false; this.rageInvuln = false; this._raging = false; this._stunned = true;
      this.state = 'idle';
      return;
    }
    if (this._stunned) { this._stunned = false; this.clearTint(); this.state = 'idle'; this.dState = 'neutral'; this.dTimer = 700; }

    // phase escalation still applies (faster casts as HP drops)
    if (this.phase < this.phaseThresholds.length && this.hp / this.maxHp <= this.phaseThresholds[this.phase]) {
      this.enterNextPhase();
    }
    this.tickSummon(delta); // summon adds to kite inside the arena

    if (this.dState === undefined) {
      this.dState = 'neutral'; this.dTimer = 900; this.blocking = false;
      this.rageInvuln = false; this._raging = false; this.state = 'idle';
      this.attackIndex = Math.floor(Math.random() * this.attacks.length);
      this.strafeDir = Math.random() < 0.5 ? 1 : -1;
      this.nextRageAt = now + Phaser.Math.Between(7000, 10000);
    }

    // a telegraphed attack is mid-flight — resolve it (THIS is the dodge window)
    if (this.state !== 'idle') { this.advanceAttackState(delta, ang); return; }

    // the attack just finished: a short breather, then back to neutral. Kept
    // tight so the boss keeps pressure on instead of idling between casts.
    if (this._duelAttacking) {
      this._duelAttacking = false;
      this.dState = 'neutral';
      this.dTimer = Phaser.Math.Between(320, 650);
    }

    // RAGE — a rare, slow, telegraphed "ultimate" signature (dodge by distance)
    if (this.dState === 'neutral' && !this._raging && now >= this.nextRageAt) {
      this._raging = true; this.dState = 'rage_tele'; this.dTimer = 800; this.blocking = false;
      scene.showBanner(`⚠  ${this.bossName}: ONSLAUGHT!`, '#ff3b3b');
      scene.cameras.main.shake(200, 0.006);
    }

    switch (this.dState) {
      case 'neutral': {
        this.blocking = false;
        // hold a fighting distance: close if far, back off if crowded, else strafe (moderate pace)
        if (dist > 240) this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
        else if (dist < 130) this.setVelocity(-Math.cos(ang) * this.speed * 0.8, -Math.sin(ang) * this.speed * 0.8);
        else this.setVelocity(Math.cos(ang + Math.PI / 2) * this.speed * this.strafeDir * 0.8,
                              Math.sin(ang + Math.PI / 2) * this.speed * this.strafeDir * 0.8);
        this.dTimer -= delta;
        // reactively raise guard if the player is swinging up close (ultimate breaks it)
        if (scene.duel && scene.duel.atkState !== 'ready' && dist < 150 && Math.random() < 0.03) {
          this.dState = 'block'; this.dTimer = 650; break;
        }
        if (this.dTimer <= 0) {
          this.strafeDir = Math.random() < 0.5 ? 1 : -1;
          this.beginAttack(ang); // launch this boss's own telegraphed attack (state -> 'telegraph')
          this._duelAttacking = true;
        }
        break;
      }
      case 'block':
        this.setVelocity(0, 0); this.blocking = true; this.setTint(0x66aaff);
        this.dTimer -= delta;
        if (this.dTimer <= 0) { this.blocking = false; this.clearTint(); this.dState = 'neutral'; this.dTimer = 500; }
        break;
      case 'rage_tele':
        this.setVelocity(0, 0);
        this.setTint((Math.floor(now / 90) % 2) ? 0xffffff : 0xff2020); // flashing warning
        this.dTimer -= delta;
        if (this.dTimer <= 0) { this.dState = 'rage_active'; this.dTimer = 700; this.rageInvuln = true; }
        break;
      case 'rage_active':
        // slow advance — outrun it — then a shockwave that only bites if you're close
        this.setTint(0xffd24a);
        this.setVelocity(Math.cos(ang) * this.speed * 0.7, Math.sin(ang) * this.speed * 0.7);
        this.dTimer -= delta;
        if (this.dTimer <= 0) {
          this.setVelocity(0, 0); this.rageInvuln = false; this.clearTint();
          if (scene.fx) scene.fx.shockwave(this.x, this.y, 0xff3b3b, 300);
          scene.cameras.main.flash(150, 255, 80, 80);
          if (dist <= 150) scene.reactToHit(p.takeDamage(Math.round(this.contactDamage * 1.4), now)); // dodgeable by spacing
          this.nextRageAt = now + Phaser.Math.Between(9000, 12000);
          this._raging = false; this.dState = 'neutral'; this.dTimer = 600;
        }
        break;
      default:
        this.dState = 'neutral';
    }
  }

  // Summon reinforcements on the boss's own cadence (open field AND the arena duel).
  tickSummon(delta) {
    if (!this.summon) return;
    this.summonTimer -= delta;
    if (this.summonTimer <= 0) {
      this.scene.summonMinions(this.x, this.y, this.summon.count);
      this.summonTimer = this.summon.cooldown;
    }
  }

  enterNextPhase() {
    this.phase += 1;
    this.atkCdMult *= 0.7; // enrage: cast more often
    this.attackTimer = Math.min(this.attackTimer, 600); // press the attack quickly
    if (this.summon) this.summonTimer = Math.min(this.summonTimer, 1500);
    this.scene.fx.shockwave(this.x, this.y, 0xffffff, 380);
    this.scene.cameras.main.flash(200, 255, 90, 90);
    this.scene.showBanner(`${this.bossName} — Phase ${this.phase + 1}!`, '#ff5252');
    // gain NEW attack patterns this phase (def.phaseAttacks[phaseIndex]) — the repertoire
    // grows as HP drops, so late phases throw combinations you haven't seen.
    const unlock = this.def.phaseAttacks && this.def.phaseAttacks[this.phase - 1];
    if (unlock && unlock.length) {
      const extra = unlock.map((at) => ({ ...at, damage: Math.round(at.damage * BOSS_DMG * this.dmgScale) }));
      this.attacks = this.attacks.concat(extra);
    }
    // the arena turns hostile each phase: a new hazard opens + cover shatters
    if (this.scene.dueling && this.scene.duel.arena.active) this.scene.duel.arena.escalate();
  }

  beginAttack(ang) {
    // cycle to the next attack in the boss's repertoire
    this.currentAttack = this.attacks[this.attackIndex % this.attacks.length];
    this.attackIndex += 1;
    const a = this.currentAttack;
    this.state = 'telegraph';
    this.telegraphTimer = a.telegraph;
    if (a.kind === 'charge') {
      this.lockAngle = ang;
      this.chargeLine = this.scene.add
        .rectangle(this.x, this.y, 520, 10, 0xff3b3b, 0.35)
        .setOrigin(0, 0.5)
        .setRotation(ang)
        .setDepth(3);
    }
  }

  executeAttack(ang) {
    this.clearTint();
    const a = this.currentAttack;
    switch (a.kind) {
      case 'radial_burst': {
        const step = TAU / a.count;
        const off = Math.random() * step;
        for (let i = 0; i < a.count; i++) this.shoot(off + i * step, a.speed, a.damage);
        this.endAttack();
        break;
      }
      case 'aimed_volley': {
        for (let i = -2; i <= 2; i++) this.shoot(ang + i * 0.12, a.speed, a.damage);
        this.endAttack();
        break;
      }
      case 'spiral': {
        this.state = 'casting';
        this.castTimer = a.duration;
        this.emitTimer = 0;
        this.spiralAngle = Math.random() * TAU;
        break;
      }
      case 'flame_zones': {
        const p = this.scene.player;
        for (let i = 0; i < a.zones; i++) {
          const zx = p.x + Phaser.Math.Between(-a.spread, a.spread);
          const zy = p.y + Phaser.Math.Between(-a.spread, a.spread);
          this.scene.spawnHazardZone(zx, zy, a.radius, a.damage, 600, a.tick, a.linger);
        }
        this.endAttack();
        break;
      }
      case 'charge': {
        this.state = 'charging';
        this.chargeTimer = a.dashMs;
        this.contactDamage = a.damage;
        this.scene.physics.velocityFromRotation(this.lockAngle, a.chargeSpeed, this.body.velocity);
        if (this.chargeLine) { this.chargeLine.destroy(); this.chargeLine = null; }
        break;
      }
      // WALL: a curtain of projectiles fired along the line perpendicular to the
      // player, all travelling toward them, with ONE gap you must slide into.
      case 'wall': {
        const count = a.count || 11;
        const gap = Phaser.Math.Between(1, count - 2); // index of the gap
        const perp = ang + Math.PI / 2;
        const spacing = a.spacing || 42;
        for (let i = 0; i < count; i++) {
          if (i === gap || i === gap + 1) continue; // a 2-wide opening
          const off = (i - (count - 1) / 2) * spacing;
          const sx = this.x + Math.cos(perp) * off;
          const sy = this.y + Math.sin(perp) * off;
          this.scene.spawnHostileProjectile(sx, sy, ang, a.speed, a.damage, { scale: 1.1, tint: this.tintColor });
        }
        this.endAttack();
        break;
      }
      // AIMED_REPEAT: a tracking burst — fires several aimed volleys in quick
      // succession (re-aims each shot), so you must keep strafing, not just dodge once.
      case 'aimed_repeat': {
        this.state = 'casting';
        this.castTimer = a.duration || 1100;
        this.emitTimer = 0;
        break;
      }
      // CONVERGING: a ring of shots spawns AROUND where the player is now and collapses
      // inward — slide out of the closing circle (or through its gap) before it crushes.
      case 'converging': {
        const p = this.scene.player;
        const cx = p.x;
        const cy = p.y;
        const ringR = a.ringRadius || 300;
        const n = a.count || 18;
        const gap = a.gap ? Phaser.Math.Between(0, n - 1) : -1;
        for (let i = 0; i < n; i++) {
          if (i === gap || i === (gap + 1) % n) continue; // optional escape slot
          const ta = (i / n) * TAU;
          const sx = cx + Math.cos(ta) * ringR;
          const sy = cy + Math.sin(ta) * ringR;
          this.scene.spawnHostileProjectile(sx, sy, Math.atan2(cy - sy, cx - sx), a.speed, a.damage, { scale: 1.1, tint: this.tintColor });
        }
        this.endAttack();
        break;
      }
      // NOVA_RINGS: concentric expanding rings, each with a 2-slot gap that ROTATES ring
      // to ring — weave outward through the shifting opening.
      case 'nova_rings': {
        this.state = 'casting';
        this.castTimer = a.duration || 1500;
        this.emitTimer = 0;
        this.ringCount = 0;
        break;
      }
      // SPREAD_CONE: a wide forward shotgun fan aimed at the player — sidestep the cone.
      case 'spread_cone': {
        const n = a.count || 9;
        const arc = a.arc || 1.0; // total spread in radians
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0 : i / (n - 1) - 0.5;
          this.shoot(ang + t * arc, a.speed, a.damage);
        }
        this.endAttack();
        break;
      }
      // CROSS_WALLS: bullet curtains close in from several sides at once (a shrinking
      // box) — each wall has a gap; line them up and slip through before they meet.
      case 'cross_walls': {
        const p = this.scene.player;
        const dirs = a.dirs || 4;
        const reach = a.reach || 360;
        const count = a.count || 9;
        const spacing = a.spacing || 44;
        const spin = Math.random() * TAU;
        for (let d = 0; d < dirs; d++) {
          const travel = spin + (d / dirs) * TAU; // direction this wall moves (inward)
          const ox = p.x - Math.cos(travel) * reach; // spawn on the far side
          const oy = p.y - Math.sin(travel) * reach;
          const perp = travel + Math.PI / 2;
          const gap = Phaser.Math.Between(1, count - 2);
          for (let i = 0; i < count; i++) {
            if (i === gap || i === gap + 1) continue;
            const off = (i - (count - 1) / 2) * spacing;
            this.scene.spawnHostileProjectile(ox + Math.cos(perp) * off, oy + Math.sin(perp) * off, travel, a.speed, a.damage, { scale: 1.1, tint: this.tintColor });
          }
        }
        this.endAttack();
        break;
      }
      default:
        this.endAttack();
        break;
    }
  }

  // One emission tick of a sustained ('casting') attack, dispatched by kind.
  castStep(ang) {
    const a = this.currentAttack;
    if (a.kind === 'aimed_repeat') {
      const spread = a.spread || 0.16;
      for (let i = -1; i <= 1; i++) this.shoot(ang + i * spread, a.speed, a.damage);
      this.emitTimer = (a.interval || 280) / BOSS_ATK_SPEED; // ~30 % faster bursts
      return;
    }
    if (a.kind === 'nova_rings') {
      const n = a.count || 14;
      const step = TAU / n;
      const skip = this.ringCount % n; // the gap walks one slot per ring
      for (let i = 0; i < n; i++) {
        if (i === skip || i === (skip + 1) % n) continue;
        this.shoot(i * step, a.speed, a.damage);
      }
      this.ringCount += 1;
      this.emitTimer = (a.interval || 260) / BOSS_ATK_SPEED; // ~30 % faster rings
      return;
    }
    // default: spiral (optionally with a counter-rotating second set = interlocking arms)
    const arms = a.arms || 1;
    for (let k = 0; k < arms; k++) {
      this.shoot(this.spiralAngle + (k * TAU) / arms, a.speed, a.damage);
    }
    if (a.counterArms) {
      for (let k = 0; k < a.counterArms; k++) {
        this.shoot(-this.spiralAngle + (k * TAU) / a.counterArms + Math.PI, a.speed, a.damage);
      }
    }
    this.spiralAngle += a.rotSpeed * (a.interval / 1000);
    this.emitTimer = a.interval / BOSS_ATK_SPEED; // ~30 % faster spiral cadence
  }

  endAttack() {
    this.state = 'idle';
    this.attackTimer = this.currentAttack.cooldown * this.atkCdMult;
    this.clearTint();
    if (this.chargeLine) { this.chargeLine.destroy(); this.chargeLine = null; }
  }

  shoot(angle, speed, damage) {
    this.scene.spawnHostileProjectile(this.x, this.y, angle, speed, damage, {
      scale: 1.15,
      tint: this.tintColor,
    });
  }

  cleanup() {
    if (this.chargeLine) { this.chargeLine.destroy(); this.chargeLine = null; }
  }
}
