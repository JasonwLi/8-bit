import Phaser from 'phaser';
import Player from '../entities/Player.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import AbilitySystem from '../systems/AbilitySystem.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import { getCharacter } from '../data/characters.js';
import { rollItem } from '../data/equipment.js';
import Boss from '../entities/Boss.js';
import { getBoss } from '../data/bosses.js';
import { ENEMIES } from '../data/enemies.js';
import { getTheme } from '../data/themes.js';
import { getMap } from '../data/maps.js';
import { CIV_BOSS, CIV_NAME, stageIndex, bossSequence, floorsForStage, bossFloorsFor } from '../data/campaign.js';
import FloorSystem from '../systems/FloorSystem.js';
import FlowField from '../systems/FlowField.js';
import { getArtifact } from '../data/artifacts.js';
import { contractEffects } from '../data/contracts.js';
import { Save } from '../systems/SaveSystem.js';
import Fx from '../systems/Fx.js';
import MapSystem from '../systems/MapSystem.js';
import DuelController from '../systems/DuelController.js';
import PickupController from '../systems/PickupController.js';
import * as EnemyAI from '../systems/EnemyAI.js';
import { Audio } from '../systems/AudioManager.js';
import { Settings } from '../systems/Settings.js';
import { GAME, DUNGEON } from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    // the active run lives in the registry (set by Menu/Conquest/Artifact scenes)
    this.run = this.registry.get('run');
    this.characterDef = getCharacter(this.run.characterId);
    this.isFinal = !!this.run.final;
    this.stageCiv = this.isFinal ? this.run.ownCiv : this.run.currentCiv;
    this.theme = getTheme(this.stageCiv);
    this.mapDef = getMap(this.stageCiv);
    this.mapMods = this.mapDef.mods;
    // long, escalating stages: 15 min for civ stages, 30 min for the final
    this.stageDuration = this.isFinal ? 1800000 : 900000;
    this.bossSeq = bossSequence(this.run); // lieutenants... then the local final boss
    // schedule each boss across the stage; the champion lands near the very end
    const N = this.bossSeq.length;
    this.bossTimes = this.bossSeq.map((_, i) => {
      const frac = N === 1 ? 0.92 : 0.3 + 0.62 * (i / (N - 1));
      return Math.round(this.stageDuration * frac);
    });
    this.bossPhase = this.run.bossPhase || 0; // resume support
    this.stageScale = 1 + stageIndex(this.run) * 0.9; // each cleared stage ramps difficulty
    this.contract = contractEffects(this.run.contracts || []); // active difficulty contracts

    this.pendingLevels = 0;
    this.levelingUp = false;
    this.lootOpen = false;
    this.gameOver = false;
    this.stageCleared = false;
    this.dueling = false; // set by DuelController; read across the loop
    this.challengePending = false;
    this._hazardWarned = false; // first-touch explainer for damage zones

    // secret duel-test mode (from the title-screen easter egg): fight one chosen
    // boss directly, then bounce back to the menu — no campaign progression.
    this.duelTest = this.run.duelTest || null;
    if (this.duelTest) { this.bossSeq = [this.duelTest]; this.bossPhase = 0; }

    // ── Dungeon-floor descent (replaces the open-arena stage timer + boss schedule).
    // Duel-test jumps straight to the boss arena, so it stays in open-arena mode.
    this.dungeonMode = !this.duelTest;
    // crawler combat: the player's attacks hit non-boss enemies softer than in the old
    // swarm, so fights are deliberate (paired with early-floor enemy HP in SpawnSystem).
    this.playerDmgScale = this.dungeonMode ? DUNGEON.playerDmgScale : 1;
    this.floor = this.run.floor || 1;
    this.floorsTotal = floorsForStage(this.run);
    this.bossFloors = bossFloorsFor(this.run); // { floorNumber: bossIndex }
    this.bossActiveThisFloor = false;
    this._navAcc = 0;
    this._lastRevealX = -1e9; this._lastRevealY = -1e9; // force a fog reveal on the first frame
    this._fogVisAcc = 0; // accumulator for the ~100ms fog-concealment visibility pass
    this._lastMoveDir = 0; // last movement heading (radians); persists while standing still
    this.aimDir = null;    // effective aim each frame = move direction (null in duels → auto-target)
  }

  create() {
    const { worldSize } = GAME;
    this.physics.world.setBounds(-worldSize, -worldSize, worldSize * 2, worldSize * 2);
    const civ = this.theme.id;

    // themed ground (tiling, 1:1 scroll)
    this.bg = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, `bg_ground_${civ}`)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);
    // faint distant scenery backdrop — ONE stretched copy (a horizon scene must not
    // tile, or it repeats into an obvious grid). Sits fixed behind the battlefield.
    this.bgMotif = this.add
      .image(0, 0, `bg_motif_${civ}`)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-9)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setAlpha(0.14); // faint atmospheric tint only — keep it subtle so it reads as a top-down field

    // vignette overlay (above the field, below banners)
    this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(40);

    this.fx = new Fx(this);
    this.duel = new DuelController(this);
    this.drops = new PickupController(this);
    Audio.setIntensity(0);
    Settings.applyAudio(); // honor saved volume settings
    Audio.setTheme(this.theme.id); // civ-specific music for this stage

    // musou empowered aura (shown while the empowered window is open)
    this.empowerAura = this.add.image(0, 0, 'soft_circle').setDepth(9).setAlpha(0.4).setVisible(false);

    // groups
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.allies = this.physics.add.group(); // Caesar's summoned legionaries
    this.gems = this.physics.add.group();
    this.chests = this.physics.add.group();
    this.pickups = this.physics.add.group(); // health hearts
    this.powerups = this.physics.add.group(); // strong buff orbs
    this.obstacles = this.physics.add.staticGroup();
    this.breakables = this.physics.add.group();
    this.shrines = this.physics.add.staticGroup();

    // player + systems
    this.player = new Player(this, 0, 0, this.characterDef);
    this.weapons = new WeaponSystem(this, this.player, this.characterDef.startingWeapon); // primary (auto)
    this.secondary = new WeaponSystem(this, this.player, this.characterDef.secondary); // secondary (K, ~3s)
    this.ability = new AbilitySystem(this, this.player, this.characterDef.ultimate); // ultimate (SPACE, ~10s)
    this.spawner = new SpawnSystem(this, this.player);
    this.map = new MapSystem(this, this.player);

    // restore carried run progression (level / points / gear / artifacts)
    const r = this.run;
    this.player.loadProgress(r.level, r.xp);
    this.player.kills = r.kills || 0;
    Object.assign(this.weapons.points, r.weaponPoints);
    Object.assign(this.secondary.points, r.secondaryPoints || {});
    Object.assign(this.ability.points, r.abilityPoints);
    if (r.levelMods) Object.assign(this.player.levelMods, r.levelMods); // carried hero-stat upgrades
    for (const [slot, item] of Object.entries(r.equipment || {})) if (item) this.player.equipment[slot] = item;
    this.player.artifactMods = (r.artifacts || []).map((id) => getArtifact(id).mods);
    this.updateResonances(); // recomputes from carried weapon/ability points
    if (this.contract.playerHpMult !== 1) this.player.maxHp = Math.round(this.player.maxHp * this.contract.playerHpMult);
    this.player.contractXpMult = 1 + this.contract.xpBonus;
    this.player.hp = this.player.maxHp; // full heal at each stage start

    // Camera follow tuned by GAME.cameraLerp (middle ground): tight enough that the world
    // doesn't glide floatily, loose enough that the player drifts slightly off-centre so
    // you actually see it pixel-step (lock-step pins it dead-centre → looks unchanged).
    this.cameras.main.startFollow(this.player, true, GAME.cameraLerp, GAME.cameraLerp);
    // Render-only motion FX (see applyWalkFx): the walk-wobble rotation, plus the dormant
    // pixel-snap/bob knobs. Runs on POST_UPDATE, AFTER arcade syncs bodies → sprites, so it
    // only touches the rendered sprite, never the body — physics/collisions stay exact.
    // Idempotent, so a duplicate listener across scene restarts is harmless.
    this.events.on('postupdate', this.applyWalkFx, this);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    // overlaps
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.enemies, this.allies, this.onAllyHit, null, this); // enemies damage legionaries
    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHit, null, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.onEnemyProjectileHit, null, this);
    this.physics.add.overlap(this.player, this.gems, this.drops.onGem, null, this.drops);
    this.physics.add.overlap(this.player, this.chests, this.drops.onChest, null, this.drops);
    this.physics.add.overlap(this.player, this.pickups, this.drops.onHeart, null, this.drops);
    this.physics.add.overlap(this.player, this.powerups, this.drops.onPowerup, null, this.drops);
    this.physics.add.overlap(this.projectiles, this.breakables, this.drops.onProjectileHitBreakable, null, this.drops);
    this.physics.add.overlap(this.player, this.shrines, this.drops.onShrine, null, this.drops);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    // Solid walls (the dark rock) BLOCK projectiles — BOTH the player's and the enemies' —
    // so cover matters and you can't fire Nobunaga's volleys through the rock. (The fog of
    // war is just a visual overlay and never blocks anything.)
    this.physics.add.overlap(this.projectiles, this.obstacles, this.onProjectileHitObstacle, null, this);
    this.physics.add.overlap(this.enemyProjectiles, this.obstacles, this.onProjectileHitObstacle, null, this);

    this.runTime = 0;
    if ((this.run.stageTime || 0) > 0) {
      // resuming an in-progress stage: restore the clock + wave difficulty
      this.runTime = this.run.stageTime;
      this.spawner.elapsed = this.runTime / 1000;
    } else {
      // FRESH later stage: CARRY the swarm difficulty forward from the stage you just
      // cleared (you keep all your gear + upgrades, so it shouldn't reset to early-game
      // fodder). Start ~70% as deep into the wave curve as the previous stage ended — a
      // brief breather, then it climbs past where you were. Boss timing uses the fresh clock.
      const carried = (this.run.swarmElapsed || 0) * 0.7;
      this.spawner.elapsed = Math.max(carried, stageIndex(this.run) * 300);
    }
    this._saveAcc = 0;
    this.activeBoss = null;

    // Combat keys are MANUAL and REBINDABLE (Settings.binds): primary = hold to fire at
    // the weapon's cadence (auto-aims), secondary + ultimate = tap, plus a pause key.
    // Polled in update() so a mid-run rebind takes effect immediately. Mute (M) and the
    // duel accept/decline (Y/N) stay as fixed listeners.
    this.refreshBinds();
    this.events.on('resume', () => this.refreshBinds()); // pick up rebinds done in the pause→settings menu
    this.input.keyboard.on('keydown-M', () => Audio.toggleMute());
    this.input.keyboard.on('keydown-Y', () => { if (this.challengePending) this.duel.accept(); });
    this.input.keyboard.on('keydown-N', () => { if (this.challengePending) this.duel.decline(); });
    // Backspace / Delete = "go back": bail a duel test to character select; in a
    // normal run, open the pause menu (the safe "back" — quitting lives there).
    this.input.keyboard.addCapture('BACKSPACE,DELETE');
    const goBack = () => {
      if (this.gameOver) return;
      if (this.duelTest) {
        this.gameOver = true; // halt the loop during the transition
        this.registry.set('reopenDuelPanel', true);
        this.scene.stop('UIScene');
        this.scene.start('MenuScene');
      } else if (this.canAct() && !this.scene.isActive('PauseScene')) {
        this.scene.pause();
        this.scene.launch('PauseScene', { gameScene: this });
      }
    };
    this.input.keyboard.on('keydown-BACKSPACE', goBack);
    this.input.keyboard.on('keydown-DELETE', goBack);

    this.scene.launch('UIScene', { gameScene: this });
    this.events.once('shutdown', () => this.scene.stop('UIScene'));

    // ── Dungeon descent: build the first floor (FloorSystem provides the ground +
    // walls + stairs, so the open-world scrolling backdrop is hidden). ───────────
    if (this.dungeonMode) {
      this.bg.setVisible(false);
      this.bgMotif.setVisible(false);
      this.floorSys = new FloorSystem(this);
      // Resume on the saved floor with its saved spawn budget: a floor you already cleared
      // stays cleared on Continue — no fresh swarm AND no re-scattered loot (see enterFloor).
      this.enterFloor(this.floor, this.run.spawnedThisFloor || 0);
    }

    if (this.duelTest) this.duel.begin(); // jump straight into the test duel
  }

  // Generate + realize a floor (deterministic per (floorSeed+floor) for save-resume):
  // build walls/stairs, place the player at the start room, make the nav field, anchor
  // loot in rooms, reset the swarm, and gate the stairs if it's a boss floor.
  // `resumeSpawned` = the spawn budget already spent on this floor (from a save). 0 on a
  // fresh floor (descent / new run). If it's at/above the floor's budget the floor was
  // already CLEARED in a prior session — keep it cleared (no swarm) AND skip re-scattering
  // loot, so Continue can't be used to re-farm a floor's enemies OR its chests.
  enterFloor(floor, resumeSpawned = 0) {
    this.floor = floor;
    this.stageCleared = false;
    this.bossActiveThisFloor = false;
    const isBossFloor = this.bossFloors[floor] !== undefined;

    this.floorSys.build(this.run.floorSeed + floor, { lockStairs: isBossFloor });
    const start = this.floorSys.startWorld();
    this.player.setPosition(start.x, start.y);
    this.player.body.reset(start.x, start.y);
    this.cameras.main.centerOn(start.x, start.y);
    this._lastRevealX = -1e9; this._lastRevealY = -1e9; // re-reveal fog from the new spawn

    const d = this.floorSys.data;
    this.nav = new FlowField(d.cols, d.rows, d.grid);
    this._navAcc = 0;

    this.spawner.onFloorStart(floor);                 // sets floorBudget, resets spawnedThisFloor=0
    this.spawner.spawnedThisFloor = resumeSpawned;    // restore the saved budget (runs before captureRunState below)
    const clearedOnResume = resumeSpawned >= this.spawner.floorBudget;
    if (!clearedOnResume) {
      this.map.scatterInRooms(d.lootCells); // loot only on a fresh / uncleared floor
    } else if (d.encounters) {
      // cleared-floor resume: consume the treasure encounters too, so you can't re-enter
      // to re-pop their chests (the swarm + room loot are already suppressed above).
      for (const enc of d.encounters) if (enc.kind === 'treasure') enc.triggered = true;
    }
    if (isBossFloor) this.bossPhase = this.bossFloors[floor]; // this floor's champion/lieutenant

    this.showBanner(`Floor ${floor} / ${this.floorsTotal}${isBossFloor ? '   ⚔ boss' : ''}`, '#ffd700');
    Audio.setIntensity(isBossFloor ? 1 : 0);
    this.captureRunState();
  }

  // Step on the (unlocked) stairs → shed the swarm and drop to the next floor. The last
  // floor's champion ends the stage via conquerStage instead of a descent.
  descendFloor() {
    if (this.floor >= this.floorsTotal) return;
    this.clearField();
    Audio.sfx('levelup');
    this.enterFloor(this.floor + 1);
  }

  // Deactivate all transient field entities between floors (enemies/projectiles/gems/allies).
  clearField() {
    for (const e of this.enemies.getChildren()) if (e.active && !e.isBoss) this.deactivate(e);
    for (const p of this.projectiles.getChildren()) if (p.active) this.deactivate(p);
    for (const p of this.enemyProjectiles.getChildren()) if (p.active) this.deactivate(p);
    for (const g of this.gems.getChildren()) if (g.active) this.deactivate(g);
    for (const pu of this.powerups.getChildren()) if (pu.active) this.deactivate(pu);
    if (this.allies) for (const a of this.allies.getChildren()) if (a.active) this.deactivate(a);
  }

  update(time, delta) {
    if (this.gameOver) return;
    this.runTime += delta;
    this.fx.newFrame();

    const cam = this.cameras.main;
    if (!this.dungeonMode) {
      this.bg.tilePositionX = cam.scrollX;
      this.bg.tilePositionY = cam.scrollY;
      // bgMotif is a fixed scenery backdrop (an Image, not a tileSprite) — no scroll
    }

    // movement (WASD/arrows; arrows are also the duel controls)
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.A.isDown || k.LEFT.isDown) dx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) dx += 1;
    if (k.W.isDown || k.UP.isDown) dy -= 1;
    if (k.S.isDown || k.DOWN.isDown) dy += 1;

    // Aim follows MOVEMENT: attacks fire in the direction you're moving, or the last
    // direction you moved while standing still (no mouse). `this.aimDir` (radians, or
    // null in duels → auto-target) is read by the weapon/ability aiming.
    if (dx !== 0 || dy !== 0) this._lastMoveDir = Math.atan2(dy, dx); // remember heading
    this.aimDir = (this.dungeonMode && !this.dueling) ? this._lastMoveDir : null;
    this.player.move(dx, dy);
    if (!this.dungeonMode) this.wrapEntity(this.player, true); // open world is a torus; floors have hard walls

    this.updateEnemies(delta);

    // primary is MANUAL: tick its cooldown every frame; firing is driven by the held
    // bind key in handleCombatInput(). (Duels drive the primary through their own swing.)
    this.weapons.tick(delta);
    this.secondary.tick(delta); // tick the secondary's ~3s cooldown
    this.ability.update(time, delta); // ultimate cooldown + empower/momentum
    this.handleCombatInput();
    if (!this.dueling) this.spawner.update(time, delta); // no swarm during a 1v1 duel

    // friendly projectile lifespans (+ glowing trail behind each)
    for (const p of this.projectiles.getChildren()) {
      if (!p.active) continue;
      this.fx.trail(p.x, p.y, p.trailColor);
      if (p.spin) p.rotation += p.spin * (delta / 1000); // Ragnar's spinning axes
      // Gilgamesh Gate of Babylon: each spear curves toward the nearest un-hit foe (capped
      // turn rate → it banks and hunts rather than snapping). Flies straight if none in range.
      if (p.homing) {
        const t = this.nearestEnemyExcept(p.x, p.y, p.hitSet, p.homingRange);
        if (t) {
          const cur = Math.atan2(p.body.velocity.y, p.body.velocity.x);
          const diff = Phaser.Math.Angle.Wrap(Math.atan2(t.y - p.y, t.x - p.x) - cur);
          const na = cur + Math.max(-p.homingTurn, Math.min(p.homingTurn, diff));
          const sp = Math.hypot(p.body.velocity.x, p.body.velocity.y) || 1;
          this.physics.velocityFromRotation(na, sp, p.body.velocity);
          p.rotation = na;
        }
      }
      // Ragnar boomerang: fly out to range, then home back to the (moving) thrower
      if (p.boomerang) {
        const dx = p.x - this.player.x;
        const dy = p.y - this.player.y;
        if (p.boomPhase === 'out') {
          if (dx * dx + dy * dy >= p.boomRange * p.boomRange) {
            p.boomPhase = 'back';
            if (p.hitSet) p.hitSet.clear(); // re-hits allowed on the return leg
          }
        } else {
          const ang = Math.atan2(this.player.y - p.y, this.player.x - p.x);
          this.physics.velocityFromRotation(ang, p.boomSpeed, p.body.velocity);
          if (dx * dx + dy * dy < 26 * 26) { this.deactivate(p); continue; }
        }
      }
      p.lifespan -= delta;
      if (p.lifespan <= 0) this.deactivate(p);
    }
    this.updateAllies(time, delta); // Caesar's legionaries seek + fight
    // enemy projectile lifespans (+ trail)
    for (const p of this.enemyProjectiles.getChildren()) {
      if (!p.active) continue;
      this.fx.trail(p.x, p.y, p.trailColor || 0xff6b6b);
      p.lifespan -= delta;
      if (p.lifespan <= 0) this.deactivate(p);
    }

    if (this.dungeonMode) {
      // refresh the flow field a few times/sec (or when the player changes cell)
      this._navAcc += delta;
      if (this._navAcc >= 180 && this.nav && this.floorSys) {
        this._navAcc = 0;
        const pc = this.floorSys.worldToTile(this.player.x, this.player.y);
        this.nav.recompute(pc.col, pc.row);
      }

      // Fog of war: erase a radius of fog around the player as they explore (only
      // when they've moved far enough — the erase + explored-grid update is cheap
      // but pointless every frame while standing still).
      if (this.floorSys && this.floorSys.revealAt) {
        const dx = this.player.x - this._lastRevealX, dy = this.player.y - this._lastRevealY;
        if (dx * dx + dy * dy > 18 * 18) {
          this._lastRevealX = this.player.x; this._lastRevealY = this.player.y;
          this.floorSys.revealAt(this.player.x, this.player.y);
        }
      }

      // ── Fog-of-war concealment: hide entities that sit in unexplored (dark) tiles so
      // enemies, loot, and props don't bleed through the fog overlay. Throttled to ~100ms
      // to keep per-frame cost negligible — visibility can lag by at most one tick.
      // Bosses are always shown (they announce themselves; hiding a boss is jarring).
      // Allies follow the player and so are always in explored space — skip them.
      this._fogVisAcc += delta;
      if (this._fogVisAcc >= 100 && this.floorSys) {
        this._fogVisAcc = 0;
        const fs = this.floorSys;
        const _vis = (obj) => {
          if (!obj.active) return;
          const { col, row } = fs.worldToTile(obj.x, obj.y);
          obj.setVisible(fs.isExplored(col, row));
        };
        for (const e of this.enemies.getChildren()) {
          if (!e.active) continue;
          if (e.isBoss) { e.setVisible(true); continue; } // bosses always shown
          const { col, row } = fs.worldToTile(e.x, e.y);
          e.setVisible(fs.isExplored(col, row));
        }
        for (const p of this.enemyProjectiles.getChildren()) _vis(p);
        for (const g of this.gems.getChildren()) _vis(g);
        for (const c of this.chests.getChildren()) _vis(c);
        for (const p of this.pickups.getChildren()) _vis(p);
        for (const pu of this.powerups.getChildren()) _vis(pu);
        for (const b of this.breakables.getChildren()) _vis(b);
        for (const sh of this.shrines.getChildren()) _vis(sh);
        if (this.map && this.map._floorProps) {
          for (const prop of this.map._floorProps) {
            if (!prop || !prop.active) continue;
            const { col, row } = fs.worldToTile(prop.x, prop.y);
            prop.setVisible(fs.isExplored(col, row));
          }
        }
      }

      // Scattered encounters: trigger a zone the first time the player reaches it.
      const encs = this.floorSys && this.floorSys.data && this.floorSys.data.encounters;
      if (encs) {
        for (const enc of encs) {
          if (enc.triggered) continue;
          const w = this.floorSys.tileToWorld(enc.col, enc.row);
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, w.x, w.y) < 100) {
            enc.triggered = true;
            this.onEncounter(enc, w);
          }
        }
      }

      const isBossFloor = this.bossFloors[this.floor] !== undefined;
      const st = this.floorSys && this.floorSys.stairs;
      // Soft-lock guard: if the stage-boss reference went stale (the boss is no longer a
      // live entity but was never formally defeated to unlock the stairs), drop it and
      // re-arm the challenge — otherwise a boss floor could be locked forever.
      if (isBossFloor && this.activeBoss && !this.activeBoss.active && st && st.locked) {
        this.activeBoss = null;
        this.bossActiveThisFloor = false;
      }
      // boss floor: reaching the stairs (boss) room triggers the duel challenge
      if (isBossFloor && st && !this.activeBoss && !this.bossActiveThisFloor && !this.dueling
          && !this.challengePending && !this.stageCleared
          && Phaser.Math.Distance.Between(this.player.x, this.player.y, st.x, st.y) < 200) {
        this.bossActiveThisFloor = true;
        this.duel.promptChallenge();
      }
      // unlocked stairs: step on them to descend
      if (!this.dueling && !this.challengePending && !this.stageCleared
          && this.floorSys && this.floorSys.atStairs(this.player.x, this.player.y)) {
        this.descendFloor();
      }
    }
    this.duel.update(delta); // challenge countdown + in-duel combat timers

    // periodic autosave so closing the tab resumes mid-stage with full progression
    // (never in duel-test mode — it must not create or overwrite a real run save)
    if (!this.duelTest) {
      this._saveAcc += delta;
      if (this._saveAcc >= 10000) {
        this._saveAcc = 0;
        this.captureRunState();
        Save.save(this.run);
      }
    }

    this.drops.updateMagnet();
    this.map.update(delta, time);
    this.player.updateBuffs(time);
    this.player.applyRegen(delta / 1000);

    // empowered aura follows the player while the musou window is open
    if (this.player.empowered) {
      this.empowerAura.setVisible(true).setPosition(this.player.x, this.player.y)
        .setScale(1.2).setTint(this.player.empowerColor);
    } else if (this.empowerAura.visible) {
      this.empowerAura.setVisible(false);
    }

    if (this.pendingLevels > 0 && !this.levelingUp && !this.lootOpen) this.requestLevelUp();
  }

  // Toroidal wrap: if an entity passes an edge, teleport it the world's width to the
  // far side, shifting its physics body (and, for the player, the camera) by the same
  // delta so velocity and the on-screen view are preserved — the loop is seamless.
  wrapEntity(o, isPlayer = false) {
    if (this.dueling) return; // the boss arena lives in a reserved precinct outside the torus
    const H = GAME.worldSize;
    const W = H * 2;
    let sx = 0;
    let sy = 0;
    if (o.x > H) sx = -W; else if (o.x < -H) sx = W;
    if (o.y > H) sy = -W; else if (o.y < -H) sy = W;
    if (!sx && !sy) return;
    o.x += sx; o.y += sy;
    if (o.body) { o.body.x += sx; o.body.y += sy; }
    if (isPlayer) {
      const cam = this.cameras.main;
      cam.scrollX += sx; cam.scrollY += sy; // jump the camera with the player → no lerp slide
    }
  }

  // Shortest delta on the torus (player may be across a seam from the enemy).
  _wrapDelta(d) {
    const H = GAME.worldSize;
    if (d > H) return d - H * 2;
    if (d < -H) return d + H * 2;
    return d;
  }

  updateEnemies(delta) {
    const px = this.player.x;
    const py = this.player.y;
    this.player.curseSlow = 1; // reset; Hex elites re-apply below
    const now = this.time.now;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      // bleed DoT (Lü Bu thrust) — ticks 1×dps per second, for mobs and bosses alike
      if (e.bleedUntil && now < e.bleedUntil) {
        e.bleedAcc += delta;
        if (e.bleedAcc >= 1000) {
          e.bleedAcc -= 1000;
          this.fx.impact(e.x, e.y - 6, 0xcc1830); // a small red blood spurt
          this.damageEnemy(e, e.bleedDps);
          if (!e.active) continue; // bleed finished it off
        }
      } else if (e.bleedUntil) {
        e.bleedUntil = 0; e.bleedStacks = 0; e.bleedDps = 0;
      }
      if (e.isBoss) {
        if (this.dueling) e.bossDuelUpdate(delta); // fighting-game melee + block
        else e.bossUpdate(delta); // open-field ranged patterns (declined duel)
        continue;
      }
      if (!this.dungeonMode) this.wrapEntity(e); // open world is a torus; floors have hard walls
      const ddx = this.dungeonMode ? px - e.x : this._wrapDelta(px - e.x);
      const ddy = this.dungeonMode ? py - e.y : this._wrapDelta(py - e.y);
      const dist = Math.hypot(ddx, ddy);
      const ang = Math.atan2(ddy, ddx);
      e.setFlipX(ddx < 0);

      // elite-modifier behaviors
      if (e.eliteMod) {
        if (e.warlordEvery) {
          e.warlordTimer -= delta;
          if (e.warlordTimer <= 0) { this.summonMinions(e.x, e.y, e.warlordCount); e.warlordTimer = e.warlordEvery; }
        }
        if (e.curseRadius && dist < e.curseRadius) {
          this.player.curseSlow = Math.min(this.player.curseSlow, e.curseSlowAmt);
        }
        if (e.casterEvery) { // Caster elite: lob a 3-shot spread at the player
          e.casterTimer -= delta;
          if (e.casterTimer <= 0) {
            e.casterTimer = e.casterEvery;
            const base = Math.atan2(py - e.y, px - e.x);
            for (let i = -1; i <= 1; i++) this.spawnHostileProjectile(e.x, e.y, base + i * 0.22, e.castSpeed, e.castDmg, { tint: e.eliteTint });
          }
        }
      }

      // Stun (Genghis's Khan's Cleave): frozen — no movement, no attack — for the window.
      if (e.stunUntil && now < e.stunUntil) {
        e.setVelocity(0, 0);
        continue;
      } else if (e.stunUntil) {
        e.stunUntil = 0;
        if (e.isElite) e.setTint(e.eliteTint || 0xffd54a); else e.clearTint(); // restore look
      }

      // Fear (Lü Bu's War Cry "Dread", etc.): the foe flees AWAY from the player.
      if (e.fearUntil && now < e.fearUntil) {
        e.setVelocity(-Math.cos(ang) * e.speed, -Math.sin(ang) * e.speed);
        e.setFlipX(ang < 0 ? false : true);
        continue;
      } else if (e.fearUntil) e.fearUntil = 0;

      // Caesar's legionaries draw AGGRO: a melee enemy with a legionary nearer than the
      // player engages IT instead (the enemy↔ally overlap deals the damage). Lets allies
      // actually die / tank, instead of being free invincible DPS.
      if (!e.isBoss && e.attack !== 'ranged' && this.allies && this.allies.countActive(true)) {
        const ally = this.nearestAllyTo(e.x, e.y, 220);
        if (ally) {
          const adx = ally.x - e.x, ady = ally.y - e.y;
          if (adx * adx + ady * ady < dist * dist) { // ally closer than the player
            const aang = Math.atan2(ady, adx);
            e.setVelocity(Math.cos(aang) * e.speed, Math.sin(aang) * e.speed);
            e.setFlipX(adx < 0);
            continue;
          }
        }
      }

      EnemyAI.updateMob(this, e, delta, dist, ang); // movement + attack (owned by EnemyAI.js)
      // If the swarm crush / a beeline shoved this mob INTO the rock, steer it back out so
      // it can't sit (and attack) from inside a wall. Overrides the velocity AI just set.
      if (this.dungeonMode) this.unstickFromWall(e);
      // Alexander's javelin slow: damp the velocity EnemyAI just set, while it lasts
      if (e.slowUntil && now < e.slowUntil) e.body.velocity.scale(e.slowFactor || 0.5);
      else if (e.slowUntil) e.slowUntil = 0;
    }
  }

  // When an enemy body ends up inside a wall tile (pushed there by the swarm, or a beeline
  // through a corner), drive it toward the nearest WALKABLE neighbour tile that's most
  // toward the player — so it walks back out to the fight instead of clipping the rock.
  unstickFromWall(e) {
    const fs = this.floorSys;
    if (!fs || !e.body || fs.isWalkable(e.x, e.y)) return;
    const t = fs.tile;
    const { col, row } = fs.worldToTile(e.x, e.y);
    let bx = 0, by = 0, best = Infinity;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const cx = (col + dc) * t + t / 2, cy = (row + dr) * t + t / 2;
      if (!fs.isWalkable(cx, cy)) continue;
      const ddx = this.player.x - cx, ddy = this.player.y - cy;
      const d2 = ddx * ddx + ddy * ddy; // walkable tile closest to the player
      if (d2 < best) { best = d2; bx = cx; by = cy; }
    }
    if (best < Infinity) {
      const a = Math.atan2(by - e.y, bx - e.x);
      e.setVelocity(Math.cos(a) * e.speed, Math.sin(a) * e.speed);
    }
  }

  // Shove an enemy `dist` px along `ang` — but NEVER into a wall. Knockback teleports the
  // body directly (it bypasses the collider), so on dungeon floors we push only as far as
  // the destination stays walkable (stepping back to the furthest clear fraction).
  knockbackEnemy(e, ang, dist) {
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const fs = this.floorSys;
    if (!this.dungeonMode || !fs) { e.x += cos * dist; e.y += sin * dist; return; }
    if (fs.isWalkable(e.x + cos * dist, e.y + sin * dist)) { e.x += cos * dist; e.y += sin * dist; return; }
    for (let f = 0.66; f >= 0.2; f -= 0.23) {
      if (fs.isWalkable(e.x + cos * dist * f, e.y + sin * dist * f)) { e.x += cos * dist * f; e.y += sin * dist * f; return; }
    }
    // immediate path is blocked — leave the enemy where it is rather than clip the rock
  }

  // Shared by ranged enemies and bosses. Pooled, so scale/tint are reset here.
  spawnHostileProjectile(x, y, angle, speed, damage, opts = {}) {
    const p = this.enemyProjectiles.get(x, y, 'enemy_proj');
    if (!p) return null;
    p.setActive(true).setVisible(true);
    p.body.reset(x, y);
    p.body.enable = true;
    p.setDepth(7);
    p.setScale(opts.scale || 1);
    // forgiving hitbox: the collision circle is much smaller than the visible bullet
    // so grazes don't count — bullets are dodgeable even with chunky movement (VS-style)
    const r = p.width * 0.26;
    p.body.setCircle(r, p.width / 2 - r, p.height / 2 - r);
    if (opts.tint !== undefined) p.setTint(opts.tint);
    else p.clearTint();
    this.physics.velocityFromRotation(angle, speed, p.body.velocity);
    p.damage = damage;
    p.lifespan = opts.lifespan || 4000;
    p.trailColor = opts.tint || 0xff6b6b; // red-ish glow trail by default
    return p;
  }

  // A telegraphed ground hazard: warning ring, then a lingering pool that ticks damage.
  // `style` picks the look: 'acid' (sickly green, boss/siege/trap zones), 'fire' (orange
  // scorched-earth, heroes' burn/crater/ember effects) or 'trample' (brown churned dirt,
  // the cavalry charge's wake). `affects` picks who it ticks: 'player' (environmental
  // hazards) or 'enemies' (the heroes' own offensive zones — burn/trample hit the horde,
  // not the caster). Hard cap: 12 simultaneous zones so the screen can't flood.
  spawnHazardZone(x, y, radius, damage, delay, tick, linger, style = 'acid', affects = 'player') {
    if (!this._hazardZoneCount) this._hazardZoneCount = 0;
    if (this._hazardZoneCount >= 12) return; // cap — drop this fire-and-forget request
    this._hazardZoneCount++;

    let tex, warnTint, poolTint;
    if (style === 'trample') {
      tex = this.textures.exists('trample_dust') ? 'trample_dust' : 'caltrops';
      warnTint = 0x9a7748; poolTint = tex === 'trample_dust' ? undefined : 0x9a7748;
    } else if (style === 'fire') {
      tex = this.textures.exists('scorch_fire') ? 'scorch_fire' : 'flame_pool';
      warnTint = 0xff7a2a; poolTint = tex === 'scorch_fire' ? undefined : 0xff7a2a;
    } else {
      tex = 'acid_pool'; warnTint = 0x44ff44; poolTint = undefined;
    }
    const scale = (radius * 2) / 64; // all hazard textures are ~64px source
    const warn = this.add.image(x, y, tex).setDepth(2).setScale(scale).setAlpha(0.25).setTint(warnTint);
    this.tweens.add({ targets: warn, alpha: 0.55, duration: delay / 2, yoyo: true, repeat: 1 });
    this.time.delayedCall(delay, () => {
      warn.destroy();
      const pool = this.add.image(x, y, tex).setDepth(2).setScale(scale).setAlpha(0.9);
      if (poolTint !== undefined) pool.setTint(poolTint);
      const ticks = Math.max(1, Math.floor(linger / tick));
      let done = 0;
      const ev = this.time.addEvent({
        delay: tick,
        repeat: ticks - 1,
        callback: () => {
          if (affects === 'enemies') {
            for (const e of this.enemies.getChildren()) {
              if (!e.active) continue;
              const dx = e.x - x, dy = e.y - y;
              if (dx * dx + dy * dy <= radius * radius) this.damageEnemy(e, damage);
            }
          } else if (this.player.active) {
            const dx = this.player.x - x;
            const dy = this.player.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
              this.warnHazardOnce();
              this.reactToHit(this.player.takeDamage(damage, this.time.now, { bypassIframes: true, ranged: true }));
            }
          }
          if (++done >= ticks) this.tweens.add({ targets: pool, alpha: 0, duration: 200, onComplete: () => pool.destroy() });
        },
      });
      pool.on('destroy', () => {
        ev.remove(false);
        this._hazardZoneCount = Math.max(0, (this._hazardZoneCount || 1) - 1);
      });
    });
  }

  // Render-only motion FX, applied on POST_UPDATE (after arcade syncs bodies → sprites) so
  // it only touches what's DRAWN, never the physics body. The live effect is the WALK
  // WOBBLE; the pixel-snap + y-bob are dormant knobs kept for tuning (both default off).
  //  • walk wobble — rock a MOVING character's sprite side-to-side (a rotation), easing
  //    upright when it stops, so single-frame sprites read as WALKING instead of gliding.
  //    Rotation never affects the axis-aligned arcade body → safe on the player too.
  applyWalkFx() {
    const s = GAME.pixelStep | 0;
    const amp = GAME.walkBobAmp | 0;
    const wob = GAME.walkWobbleAngle || 0;
    if (s <= 1 && amp <= 0 && wob <= 0) return; // everything off → nothing to do
    const bobStride = GAME.walkBobStride || 16;
    const wobStride = GAME.walkWobbleStride || 18;
    const snap = (o) => { if (s > 1) { o.x = Math.round(o.x / s) * s; o.y = Math.round(o.y / s) * s; } };
    // distance-driven phase helpers gate on VELOCITY (framerate-independent): at high refresh
    // rates the per-frame distance is tiny, so a distance threshold would wrongly read a
    // moving mob as stopped. Phase accumulates by distance so cadence is the same at any fps.
    const bob = (o) => {
      if (amp <= 0 || !o.body) return 0;
      const cx = o.body.center.x, cy = o.body.center.y;
      const v = o.body.velocity;
      if ((v.x * v.x + v.y * v.y) < 25) { o._bobPhase = 0; o._lbx = cx; o._lby = cy; return 0; }
      const d = Math.hypot(cx - (o._lbx ?? cx), cy - (o._lby ?? cy));
      o._lbx = cx; o._lby = cy;
      o._bobPhase = (o._bobPhase || 0) + (d / bobStride) * Math.PI;
      return -Math.round(Math.abs(Math.sin(o._bobPhase)) * amp);
    };
    const wobble = (o) => {
      if (wob <= 0 || !o.body || o.isBoss) return; // bosses keep their own bearing
      const cx = o.body.center.x, cy = o.body.center.y;
      const v = o.body.velocity;
      if ((v.x * v.x + v.y * v.y) < 25) { // stopped → ease upright
        o.rotation *= 0.8; if (Math.abs(o.rotation) < 0.004) o.rotation = 0;
        o._wlx = cx; o._wly = cy; return;
      }
      const d = Math.hypot(cx - (o._wlx ?? cx), cy - (o._wly ?? cy));
      o._wlx = cx; o._wly = cy;
      o._wphase = (o._wphase || 0) + (d / wobStride) * Math.PI;
      o.rotation = Math.sin(o._wphase) * wob;
    };
    if (this.player && this.player.active) { snap(this.player); wobble(this.player); }
    for (const e of this.enemies.getChildren()) { if (!e.active) continue; snap(e); e.y += bob(e); wobble(e); }
    for (const a of this.allies.getChildren()) { if (!a.active) continue; snap(a); a.y += bob(a); wobble(a); }
    if (s > 1) {
      for (const p of this.projectiles.getChildren()) snap(p);
      for (const p of this.enemyProjectiles.getChildren()) snap(p);
    }
  }

  // A quick slash-arc flash telegraphing a melee enemy's swing (see EnemyAI handleSwing).
  enemySwingArc(e, ang) {
    const reach = e.swingRange || 60;
    const x = e.x + Math.cos(ang) * reach * 0.45;
    const y = e.y + Math.sin(ang) * reach * 0.45;
    const tint = e.eliteTint || 0xffd0d0;
    if (this.textures.exists('sweep')) {
      const arc = this.add.image(x, y, 'sweep').setDepth(6).setRotation(ang)
        .setScale((reach * 2) / 128).setAlpha(0).setTint(tint);
      this.tweens.add({ targets: arc, alpha: 0.9, duration: 60, yoyo: true, hold: 50, onComplete: () => arc.destroy() });
    } else {
      const g = this.add.circle(x, y, reach * 0.6, 0xff5050, 0.45).setDepth(6);
      this.tweens.add({ targets: g, alpha: 0, scale: 1.4, duration: 150, onComplete: () => g.destroy() });
    }
  }

  // Cao Cao summons reinforcements around himself.
  summonMinions(x, y, count) {
    const def = ENEMIES.soldier;
    for (let i = 0; i < count; i++) {
      const ax = x + Phaser.Math.Between(-50, 50);
      const ay = y + Phaser.Math.Between(-50, 50);
      const e = this.enemies.get(ax, ay, 'enemy_soldier');
      if (!e) continue;
      e.setActive(true).setVisible(true);
      e.body.reset(ax, ay);
      e.body.enable = true;
      e.setDepth(5).setScale(1).clearTint();
      e.typeId = 'soldier';
      e.attack = 'melee';
      e.speed = def.speed;
      e.xpValue = Math.max(def.xp, Math.round(def.xp * Math.pow(this.spawner.difficulty, 0.62)));
      e.range = undefined;
      e.winding = false;
      e.isElite = false;
      e.isBoss = false;
      const mult = this.spawner.difficulty;
      e.maxHp = Math.round(def.hp * mult);
      e.hp = e.maxHp;
      e.damage = Math.round(def.damage * (1 + this.spawner.elapsed / 120) * (this.stageScale || 1));
      e.contactDamage = e.damage;
    }
  }

  canAct() {
    return !this.gameOver && !this.levelingUp && !this.lootOpen && !this.stageCleared;
  }

  // Weapon/ability cross-track synergies: matching 4+ point investments unlock
  // passive bonuses you can't get by specializing in one track.
  updateResonances() {
    const wp = this.weapons.points;
    const ap = this.ability.points;
    const mods = [];
    const names = [];
    let bonusProj = 0;
    let bonusAbil = 0;
    if (wp.damage >= 4 && ap.power >= 4) { mods.push({ damageMult: 0.12 }); names.push('Blade & Breath'); }
    if (wp.reach >= 4 && ap.area >= 4) { mods.push({ reachMult: 0.18 }); names.push('Range & Reach'); }
    if (wp.speed >= 4 && ap.haste >= 4) { mods.push({ cooldownMult: -0.1 }); names.push('Storm & Haste'); }
    if (wp.effect >= 4 && ap.amount >= 4) { bonusProj = 1; bonusAbil = 1; names.push('Arsenal & Multitude'); }
    this.player.resonanceMods = mods;
    this.player.bonusProjectiles = bonusProj;
    this.player.bonusAbilityCount = bonusAbil;
    this.player.activeResonances = names;
    this.player.recompute();
  }

  // A rough OFFENSE multiplier vs a fresh hero — base attack × gear/trait damage, the
  // invested damage points, fire-rate, and extra projectiles. Enemy + boss HP scale off
  // this so a heavily-upgraded build faces proportionally tankier foes (TTK stays
  // meaningful) instead of one-shotting everything. Grows from ~1, clamped to a ceiling.
  playerPower() {
    const p = this.player;
    const wp = this.weapons.points;
    const sp = this.secondary.points;
    const dmgPts = (wp.damage || 0) + (sp.damage || 0);
    const spdPts = (wp.speed || 0) + (sp.speed || 0);
    const effPts = (wp.effect || 0) + (sp.effect || 0);
    const offense = (p.damageMult || 1)
      * (1 + 0.13 * dmgPts)
      * (1 / Math.pow(0.94, Math.min(spdPts, 16)))
      * (1 + 0.04 * effPts);
    return Math.max(1, Math.min(offense, 14));
  }

  spawnStageBoss() {
    const isLocalFinal = this.bossPhase === this.bossSeq.length - 1;
    const def = getBoss(this.bossSeq[this.bossPhase]);
    let x;
    let y;
    if (this.dueling) {
      const a = Math.random() * Math.PI * 2;
      x = this.duel.center.x + Math.cos(a) * 200;
      y = this.duel.center.y + Math.sin(a) * 200;
    } else {
      ({ x, y } = this.spawner.spawnPointAroundCamera());
    }
    // Boss HP tracks the PLAYER'S ACTUAL OFFENSE (playerPower: damage points + gear +
    // fire-rate), not just time — that's what kept letting a stacked build one-shot
    // bosses. Scaling HP by power keeps the fight a consistent ~8-12s no matter how
    // geared you are; ×base + the final-boss role multiplier make it a real bout.
    const hpScale = this.stageScale
      * this.playerPower()
      * 2.6                              // bumped (bosses died too fast / felt easy)
      * (isLocalFinal ? 2.2 : 1.0)
      * this.contract.bossHpMult;
    // Boss DAMAGE tracks the same character stats — campaign stage × the player's own
    // offense (capped so it threatens without one-shotting). Without this, projectile
    // damage stayed flat and a stacked build barely felt the hits.
    const bossDmgScale = Math.min(6, this.stageScale
      * (1 + (this.playerPower() - 1) * 0.15)
      * (isLocalFinal ? 1.2 : 1.0)
      * this.contract.enemyDmgMult);
    const boss = new Boss(this, x, y, def, hpScale, bossDmgScale);
    boss.isStageBoss = true;
    boss.isLocalFinal = isLocalFinal;
    boss.duelBlockChance = Math.min(0.6, 0.32 + 0.06 * stageIndex(this.run)); // blocks more on later stages
    this.enemies.add(boss);
    this.activeBoss = boss;
    const tag = isLocalFinal ? '⚔  ' : '⚔  General  ';
    this.showBanner(`${tag}${def.name}`, '#ff5252');
    this.fx.shockwave(boss.x, boss.y, 0xff5252, 280);
    Audio.sfx('boss');
    Audio.setIntensity(1);
  }

  defeatBoss(boss) {
    const wasDuel = this.dueling;
    const clean = this.duel.clean;
    this.fx.death(boss.x, boss.y);
    this.fx.explosion(boss.x, boss.y, this.theme.accent, 220); // big death blast
    Audio.sfx('bossdown');

    if (wasDuel) {
      this.duel.finisher(boss); // freeze-frame zoom punch + slow-mo + shockwave
    } else {
      this.fx.shockwave(boss.x, boss.y, this.theme.accent, 360);
      this.cameras.main.flash(220, 255, 255, 255);
    }

    boss.cleanup();
    boss.destroy();
    this.activeBoss = null;
    this.duel.end(); // pull the camera back (1.65 -> 1 = punch-out), resume the swarm

    if (this.duelTest) { // test mode: no progression, back to the duel-test picker
      this.registry.set('reopenDuelPanel', true);
      this.showBanner('⚔  Duel cleared — back to fighter select', '#ffd700');
      this.time.delayedCall(1700, () => { this.scene.stop('UIScene'); this.scene.start('MenuScene'); });
      return;
    }

    // Bosses are milestones — award a big XP chunk sized RELATIVE to the current level
    // requirement (so it stays meaningful even as the late curve steepens). A lieutenant
    // is worth ~0.7 levels; the stage-final boss ~1.4. (Previously bosses gave no XP at all.)
    const bossLevels = (boss.isLocalFinal ? 1.4 : 0.7) * (clean ? 1.2 : 1);
    const gained = this.player.addXp(this.player.xpToNext * bossLevels);
    if (gained > 0) this.pendingLevels += gained;

    if (boss.isLocalFinal) {
      this.conquerStage();
      return;
    }
    // a lieutenant fell — reward the player
    this.showBanner(`${boss.bossName} falls!`, '#9ef58b');
    this.drops.spawnChest(boss.x, boss.y);
    this.drops.spawnPowerup(boss.x + 30, boss.y);
    if (wasDuel && clean) { this.drops.spawnChest(boss.x - 40, boss.y); this.drops.spawnPowerup(boss.x - 70, boss.y); } // flawless bonus
    this.player.heal(Math.round(this.player.maxHp * (clean ? 0.2 : 0.12)));
    if (this.dungeonMode) {
      this.floorSys.unlockStairs(); // the boss gate opens — descend to continue
      this.showBanner('↓  The stairs open', '#ffd700');
    } else {
      this.bossPhase += 1; // open-world: the next boss arrives on the time schedule
    }
    Audio.setIntensity(0);
  }

  // Write current live progression back into the run object.
  captureRunState() {
    const r = this.run;
    r.level = this.player.level;
    r.xp = this.player.xp;
    r.weaponPoints = { ...this.weapons.points };
    r.secondaryPoints = { ...this.secondary.points };
    r.abilityPoints = { ...this.ability.points };
    r.levelMods = { ...this.player.levelMods };
    r.swarmElapsed = this.spawner.elapsed; // carry swarm difficulty into the next stage
    r.equipment = {};
    for (const [slot, item] of Object.entries(this.player.equipment)) if (item) r.equipment[slot] = item;
    r.kills = this.player.kills;
    r.stageTime = this.runTime; // legacy; floor is the resume point in dungeon mode
    r.floor = this.floor; // resume on the same floor (same floorSeed → same layout)
    r.spawnedThisFloor = this.spawner.spawnedThisFloor; // a cleared floor stays cleared on resume
    r.bossPhase = this.bossPhase;
    this.registry.set('run', r);
  }

  conquerStage() {
    if (this.stageCleared) return;
    this.stageCleared = true;
    this.physics.pause();
    const civName = this.isFinal ? 'the World' : CIV_NAME[this.run.currentCiv];
    this.showBanner(`${civName} Conquered!`, '#9ef58b');
    this.captureRunState();
    if (!this.isFinal) this.run.conquered.push(this.run.currentCiv);
    // clear stage-resume state so Continue routes to the next conquest, not a replay
    this.run.currentCiv = null;
    this.run.stageTime = 0;
    this.run.bossPhase = 0;
    Save.save(this.run);
    this.time.delayedCall(1500, () => {
      this.scene.stop('UIScene');
      if (this.isFinal) {
        Save.clear();
        this.scene.start('WinScene', { run: this.run });
      } else {
        this.scene.start('ArtifactScene');
      }
    });
  }

  showBanner(text, color) {
    // sits below the top HUD cluster (timer / boss bar / buff row), then drifts up +
    // fades. Multiple callouts (e.g. "FLAWLESS DUEL!" + "{boss} falls!" on a kill, or a
    // spawn + phase banner) STACK downward so they never print on top of each other.
    if (!this._banners) this._banners = [];
    this._banners = this._banners.filter((b) => b.active);
    const y = 188 + this._banners.length * 30;
    const t = this.add
      .text(this.scale.width / 2, y, text, {
        fontFamily: 'monospace', fontSize: '24px', color, fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);
    this._banners.push(t);
    this.tweens.add({
      targets: t, y: y - 22, alpha: 0, delay: 900, duration: 1600, ease: 'Quad.easeIn',
      onComplete: () => { this._banners = this._banners.filter((b) => b !== t); t.destroy(); },
    });
  }

  // First time the player stands in a damaging zone (map hazard or boss flame
  // pool), explain it once so the orange/spiked patches aren't a mystery.
  warnHazardOnce() {
    if (this._hazardWarned) return;
    this._hazardWarned = true;
    this.showBanner('⚠  Damage zone — step out!', '#ff7b3a');
  }

  // --- damage / death ---
  damageEnemy(enemy, amount, opts = {}) {
    if (!enemy.active) return;
    if (enemy.rageInvuln) { this.fx.impact(enemy.x, enemy.y); return; } // boss RAGE musou: untouchable
    let dmg = amount;
    // crawler attack-softening: weaken all player damage to non-boss enemies (bosses
    // keep their own playerPower-tracked tuning, so duels stay balanced).
    if (this.playerDmgScale !== 1 && !enemy.isBoss) dmg *= this.playerDmgScale;
    // duel guard: a blocking boss soaks most of any attack until you break it
    if (enemy.blocking) dmg *= 0.2;
    // Ironclad elite: an armored shell (top 40% HP) resists, then turns brittle
    if (enemy.ironclad) dmg *= enemy.hp > enemy.maxHp * 0.6 ? 0.35 : 1.3;
    if (enemy.armor && !opts.armorPierce) dmg *= 1 - enemy.armor; // armored types; Armor-Piercing ignores it
    dmg = Math.round(dmg);
    enemy.hp -= dmg;
    this.fx.damageNumber(enemy.x, enemy.y - enemy.displayHeight * 0.4, dmg,
      enemy.isBoss ? { color: this.theme.accentCss, big: true } : {});
    this.fx.impact(enemy.x, enemy.y);
    Audio.sfx('hit');
    this.player.lifestealFrom(dmg);
    if (!enemy.winding) {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(50, () => {
        if (!enemy.active) return;
        if (enemy.isElite) enemy.setTint(enemy.eliteTint || 0xffd54a);
        else enemy.clearTint();
      });
    }
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (enemy.isBoss) {
      this.defeatBoss(enemy);
      return;
    }
    this.player.kills += 1;
    this.player.addMomentum(); // builds/extends the musou window if active
    this.fx.death(enemy.x, enemy.y);
    // Volatile elite: detonate a telegraphed AoE where it died (back off when it's low!)
    if (enemy.volatile) {
      this.fx.shockwave(enemy.x, enemy.y, enemy.eliteTint || 0xff7a2a, enemy.blastRadius || 120);
      this.spawnHazardZone(enemy.x, enemy.y, enemy.blastRadius || 120, enemy.blastDmgElite || 30, 320, 320, 320, 'fire');
    }
    this.drops.spawnGem(enemy.x, enemy.y, enemy.xpValue);
    if (enemy.isElite) {
      this.drops.spawnChest(enemy.x, enemy.y);
      if (Math.random() < 0.6) this.drops.spawnPowerup(enemy.x + 30, enemy.y);
    } else if (Math.random() < 0.04) {
      this.drops.spawnHeart(enemy.x, enemy.y); // rare health drop
    }
    this.deactivate(enemy);
  }

  deactivate(obj) {
    obj.setActive(false).setVisible(false);
    if (obj.body) {
      obj.body.stop();
      obj.body.enable = false;
    }
  }

  // delegators so external systems keep their stable `scene.X` entry points
  spawnChest(x, y) { this.drops.spawnChest(x, y); } // SpawnSystem field chests
  damageBreakable(b, amount) { this.drops.damageBreakable(b, amount); } // WeaponSystem melee sweep

  // --- overlap callbacks ---
  onPlayerHit(player, enemy) {
    if (!enemy.active) return;
    if (enemy.stunUntil && this.time.now < enemy.stunUntil) return; // stunned foes can't hit
    this.reactToHit(player.takeDamage(enemy.contactDamage, this.time.now));
  }

  onEnemyProjectileHit(player, proj) {
    if (!proj.active) return;
    this.deactivate(proj);
    this.reactToHit(player.takeDamage(proj.damage, this.time.now, { bypassIframes: true, ranged: true }));
  }

  reactToHit(result) {
    if (result === 'dodge') Audio.sfx('dodge');
    else if (result === 'hit') Audio.sfx('hurt');
    else if (result === 'dead') this.endRun();
  }

  onProjectileHit(projectile, enemy) {
    if (!projectile.active || !enemy.active) return;
    if (projectile.hitSet && projectile.hitSet.has(enemy)) return;
    this.damageEnemy(enemy, projectile.damage, { armorPierce: projectile.armorPierce });
    if (projectile.bleed) this.applyBleed(enemy, projectile.bleed);
    if (projectile.knockback && enemy.active && !enemy.isBoss) { // shove-on-hit
      const ka = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
      this.knockbackEnemy(enemy, ka, projectile.knockback);
    }
    if (projectile.slow) { // slow-on-hit (Pinning javelins, etc.)
      enemy.slowUntil = this.time.now + projectile.slow.dur;
      enemy.slowFactor = projectile.slow.factor;
    }
    if (projectile.stunMs && enemy.active && !enemy.isBoss) enemy.stunUntil = this.time.now + projectile.stunMs;
    if (projectile.fearMs && enemy.active && !enemy.isBoss) enemy.fearUntil = this.time.now + projectile.fearMs;
    if (projectile.weaponLifesteal) this.player.heal(projectile.damage * projectile.weaponLifesteal);
    if (projectile.leaveBurn && this.fx && Math.random() < 0.5) { // incendiary / scorch
      const lb = projectile.leaveBurn;
      this.spawnHazardZone(projectile.x, projectile.y, lb.radius, lb.dmg, 120, 300, lb.dur, 'fire', 'enemies');
    }
    if (projectile.hitSet) projectile.hitSet.add(enemy);
    // Genghis ricochet: chain to the next-nearest un-hit enemy instead of dying
    if (projectile.ricochet && projectile.bouncesLeft > 0) {
      const next = this.nearestEnemyExcept(projectile.x, projectile.y, projectile.hitSet, projectile.bounceRange);
      if (next) {
        projectile.bouncesLeft -= 1;
        const ang = Math.atan2(next.y - projectile.y, next.x - projectile.x);
        projectile.setRotation(ang);
        this.physics.velocityFromRotation(ang, projectile.bounceSpeed, projectile.body.velocity);
        this.fx.chainArc(projectile.x, projectile.y, next.x, next.y, projectile.trailColor || 0xffe08a); // visible chain link
        projectile.lifespan = 900; // refresh so it can reach the next link in the chain
        return;
      }
    }
    projectile.pierceLeft -= 1;
    if (projectile.pierceLeft <= 0) this.deactivate(projectile);
  }

  // Nearest active enemy to (x,y) — used by allied units and ricochet retargeting.
  nearestEnemyTo(x, y, maxRange = Infinity) {
    let best = null;
    let bestD = maxRange * maxRange;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  // Nearest active legionary to a point (for enemy aggro).
  nearestAllyTo(x, y, maxRange = Infinity) {
    if (!this.allies) return null;
    let best = null;
    let bestD = maxRange * maxRange;
    for (const a of this.allies.getChildren()) {
      if (!a.active) continue;
      const d = (a.x - x) ** 2 + (a.y - y) ** 2;
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  }

  // Enemies damage Caesar's legionaries on contact (they're no longer invincible — they
  // have HP and die). Throttled per-legionary so an overlapping mob doesn't shred instantly.
  onAllyHit(enemy, ally) {
    if (!ally.active || !enemy.active || enemy.isBoss) return;
    if (ally.allyHurtCd > 0) return;
    ally.allyHurtCd = 450;
    ally.allyHp -= enemy.contactDamage || enemy.damage || 8;
    ally.setTintFill(0xff6b6b);
    this.time.delayedCall(60, () => { if (ally.active) ally.clearTint(); });
    if (ally.allyHp <= 0) { this.fx.death(ally.x, ally.y, 0xffe08a); this.deactivate(ally); }
  }

  // Nearest enemy excluding those already hit (ricochet chains never double-back).
  nearestEnemyExcept(x, y, exclude, maxRange = Infinity) {
    let best = null;
    let bestD = maxRange * maxRange;
    for (const e of this.enemies.getChildren()) {
      if (!e.active || (exclude && exclude.has(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  // A persistent caltrop/arrow-field ground hazard: ticks damage to enemies standing in
  // it for `duration`, then fades. Shared by Genghis's primary trail AND his ultimate.
  spawnCaltropField(x, y, radius, damage, duration, tick) {
    const key = this.textures.exists('caltrops') ? 'caltrops' : 'acid_pool';
    const field = this.add.image(x, y, key).setDepth(2).setScale((radius * 2) / 48).setAlpha(0.95);
    // a soft, NON-glowing brown dust puff as the volley thunks in — matches the dirt/steel
    // caltrop palette (the old additive flash read as a bright out-of-place circle).
    const dust = this.add.circle(x, y, radius * 0.5, 0x8a7048, 0.4).setDepth(3);
    this.tweens.add({ targets: dust, scale: 1.4, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => dust.destroy() });
    const ticks = Math.max(1, Math.floor(duration / tick));
    let done = 0;
    const ev = this.time.addEvent({
      delay: tick,
      repeat: ticks - 1,
      callback: () => {
        for (const e of this.enemies.getChildren()) {
          if (!e.active) continue;
          const dx = e.x - x;
          const dy = e.y - y;
          if (dx * dx + dy * dy <= radius * radius) this.damageEnemy(e, damage);
        }
        done++;
        if (done >= ticks) this.tweens.add({ targets: field, alpha: 0, duration: 200, onComplete: () => field.destroy() });
      },
    });
    field.on('destroy', () => ev.remove(false));
  }

  // ── Caesar's legionaries: timed allied units that seek + melee enemies ──────
  spawnLegionary(x, y, opts) {
    // Boss duels are 1v1 — hard-cap the legion at 4 so Caesar can't drown the boss
    // in an endless summon swarm (no cap in the open-world swarm mode).
    if (this.dueling && this.allies.countActive(true) >= 4) return;
    const a = this.allies.get(x, y, 'ally_legionary');
    if (!a) return;
    a.setActive(true).setVisible(true);
    a.setTexture('ally_legionary'); // pooled sprites may carry a stale texture
    a.body.reset(x, y);
    a.body.enable = true;
    a.setDepth(7).setScale(0.95).clearTint(); // the legionary sprite is already coloured
    a.allyDamage = opts.damage;
    a.allySpeed = opts.speed;
    a.allyRange = opts.range + 18;
    a.allyUntil = this.time.now + opts.life;
    a.allyHitCd = 0;
    a.allyHp = opts.hp || 40; a.allyMaxHp = a.allyHp; // legionaries are mortal now (Caesar nerf)
    a.allyHurtCd = 0;
    this.fx.legionDeploy(x, y);
  }

  updateAllies(time, delta) {
    if (!this.allies) return;
    for (const a of this.allies.getChildren()) {
      if (!a.active) continue;
      if (a.allyHurtCd > 0) a.allyHurtCd -= delta; // cooldown between taking enemy hits
      if (time >= a.allyUntil) { this.fx.death(a.x, a.y, 0xffe08a); this.deactivate(a); continue; }
      const e = this.nearestEnemyTo(a.x, a.y);
      if (!e) { a.setVelocity(0, 0); continue; }
      const dist = Phaser.Math.Distance.Between(a.x, a.y, e.x, e.y);
      if (dist > a.allyRange) {
        let ang = Math.atan2(e.y - a.y, e.x - a.x);

        // In dungeon mode, make legionaries wall-aware: sample a step ahead and
        // try ±50° slide rotations if the direct path is blocked.
        if (this.dungeonMode && this.floorSys) {
          const STEP = 26;
          const aheadX = a.x + Math.cos(ang) * STEP;
          const aheadY = a.y + Math.sin(ang) * STEP;
          if (!this.floorSys.isWalkable(aheadX, aheadY)) {
            const SLIDE = 50 * (Math.PI / 180); // ~50 degrees in radians
            const leftAng  = ang - SLIDE;
            const rightAng = ang + SLIDE;
            const lx = a.x + Math.cos(leftAng)  * STEP;
            const ly = a.y + Math.sin(leftAng)  * STEP;
            const rx = a.x + Math.cos(rightAng) * STEP;
            const ry = a.y + Math.sin(rightAng) * STEP;
            if (this.floorSys.isWalkable(lx, ly)) {
              ang = leftAng;
            } else if (this.floorSys.isWalkable(rx, ry)) {
              ang = rightAng;
            } else {
              // all three options blocked — stop this frame
              a.setVelocity(0, 0);
              continue;
            }
          }
        }

        a.setVelocity(Math.cos(ang) * a.allySpeed, Math.sin(ang) * a.allySpeed);
        a.setFlipX(e.x < a.x);
      } else {
        a.setVelocity(0, 0);
        a.allyHitCd -= delta;
        if (a.allyHitCd <= 0) {
          this.damageEnemy(e, a.allyDamage);
          this.fx.impact(e.x, e.y, 0xffe08a);
          a.allyHitCd = 650;
        }
      }
    }
  }

  // (Re)build the rebindable combat Key objects from Settings.binds. Called on create
  // and on scene resume (so a rebind made in the pause→settings menu takes effect).
  refreshBinds() {
    const kb = this.input.keyboard;
    const b = Settings.binds;
    this.bindKeys = {
      primary: kb.addKey(b.primary),
      secondary: kb.addKey(b.secondary),
      ultimate: kb.addKey(b.ultimate),
      pause: kb.addKey(b.pause),
    };
  }

  // Poll the rebindable combat keys each frame. Primary = HELD (fire at cadence);
  // secondary/ultimate/pause = tap (JustDown). Duels route the same keys to the
  // duel state machine (primary becomes a single swing per press).
  handleCombatInput() {
    if (this.gameOver) return;
    const bk = this.bindKeys;
    if (!bk) return;
    const JustDown = Phaser.Input.Keyboard.JustDown;

    // pause
    if (JustDown(bk.pause) && this.canAct() && !this.scene.isActive('PauseScene')) {
      this.scene.pause();
      this.scene.launch('PauseScene', { gameScene: this });
      return;
    }

    if (this.dueling) {
      if (JustDown(bk.primary)) this.duel.primary();
      if (JustDown(bk.secondary)) this.duel.secondary();
      if (JustDown(bk.ultimate)) this.duel.ultimate();
      return;
    }

    if (!this.canAct()) return;
    if (bk.primary.isDown) this.weapons.fireHeld();            // held manual primary (move-aimed)
    if (JustDown(bk.secondary) && this.secondary.ready()) this.secondary.castManual(this.aimDir); // along movement
    if (JustDown(bk.ultimate)) this.ability.tryCast(this.time.now);
  }

  // Called once per encounter zone, the first time the player reaches it (proximity
  // check in update). `w` is the zone's world centre. Branches on enc.kind to trigger
  // an ambush swarm, a treasure cache, or a trap field — all placed on walkable floor.
  onEncounter(enc, w) {
    // a walkable point within `spread` px of (x,y) — keeps drops/hazards out of rock
    const walkableNear = (x, y, spread) => {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * spread;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (this.floorSys.isWalkable(px, py)) return { x: px, y: py };
      }
      return { x, y };
    };

    switch (enc.kind) {
      case 'ambush': {
        // Ambush: burst-spawn 8–12 enemies around the player and spike the music.
        const count = Phaser.Math.Between(8, 12);
        for (let i = 0; i < count; i++) this.spawner.spawnOne();
        this.showBanner('⚠ Ambush!', '#ff5252');
        Audio.setIntensity(1);
        break;
      }
      case 'treasure': {
        // Treasure cache: chest + powerup at the zone (powerup nudged to open floor).
        this.drops.spawnChest(w.x, w.y);
        const pu = walkableNear(w.x, w.y, 40);
        this.drops.spawnPowerup(pu.x, pu.y);
        this.showBanner('✦ Treasure Cache', '#ffd700');
        break;
      }
      case 'trap': {
        // Trap field: 2–3 hazard zones scattered on walkable floor around the zone.
        const nTraps = Phaser.Math.Between(2, 3);
        this.map._floorProps = this.map._floorProps || [];
        for (let i = 0; i < nTraps; i++) {
          const { x: tx, y: ty } = walkableNear(w.x, w.y, 90);
          const r = Phaser.Math.Between(40, 65);
          // Draw the hazard visual (soft_circle + spikes) and push to map.hazards so
          // the existing MapSystem tick deals damage. Track the visuals in the map's
          // _floorProps so clearFloorProps() tears them down on descent.
          this.map._floorProps.push(this.add.image(tx, ty, 'soft_circle')
            .setScale((r * 2) / 128).setTint(0xff5a3a).setAlpha(0.4).setDepth(-7));
          this.map._floorProps.push(this.add.image(tx, ty, 'spikes').setDepth(3).setScale(0.9));
          this.map.hazards.push({ x: tx, y: ty, r, dmg: 9, enemyDmg: 16 });
        }
        this.showBanner('⚠ Trap Field', '#ff8a3a');
        break;
      }
      default:
        break;
    }
  }

  // A projectile (player or enemy) hits a solid obstacle → absorbed by the wall.
  onProjectileHitObstacle(projectile) {
    if (!projectile.active) return;
    if (projectile.pierceWalls) return; // heroic charges/lances trample through rock
    this.fx.impact(projectile.x, projectile.y, projectile.trailColor || 0xffffff);
    this.deactivate(projectile);
  }

  // Wound-on-hit DoT. Each hit adds a stack (capped) and refreshes the timer; the
  // per-second tick lives in updateEnemies so it applies to mobs AND bosses.
  applyBleed(e, b) {
    e.bleedStacks = Math.min((e.bleedStacks || 0) + 1, b.stackMax || 8);
    e.bleedDps = e.bleedStacks * (b.dps || 1);
    e.bleedUntil = this.time.now + b.duration;
    if (e.bleedAcc === undefined) e.bleedAcc = 0;
  }

  // --- secondary ability casts (called by AbilitySystem) ---
  abilityNova(x, y, radius, damage, color, knockback) {
    this.fx.explosion(x, y, color, radius * 1.2);
    this.fx.shockwave(x, y, color, radius * 1.5);
    Audio.sfx('hit');
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > radius * radius) continue;
      this.damageEnemy(e, damage);
      if (knockback && e.active && !e.isBoss) {
        this.knockbackEnemy(e, Math.atan2(dy, dx), knockback);
      }
    }
  }

  abilityBlast(x, y, radius, damage, color, { telegraph = false, delay = 0 } = {}) {
    const scale = (radius * 2) / 128;
    const explode = () => {
      this.fx.explosion(x, y, color, radius); // flash + fire-flash + twin rings + embers
      for (const e of this.enemies.getChildren()) {
        if (!e.active) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy <= radius * radius) this.damageEnemy(e, damage);
      }
    };
    if (telegraph) {
      const warn = this.add.image(x, y, 'soft_circle').setScale(scale).setTint(color).setAlpha(0.25).setDepth(2);
      this.tweens.add({ targets: warn, alpha: 0.5, duration: Math.max(80, delay / 2), yoyo: true, repeat: 1 });
      this.time.delayedCall(delay, () => { warn.destroy(); explode(); });
    } else {
      explode();
    }
  }

  // A charging lance reuses the player projectile path (pierces everything).
  spawnFriendlyLance(x, y, angle, s) {
    const p = this.projectiles.get(x, y, 'abil_lance');
    if (!p) return;
    p.setActive(true).setVisible(true);
    p.body.reset(x, y);
    p.body.enable = true;
    p.setRotation(angle).setDepth(8).setTint(s.def.color);
    p.setScale(1.4, Math.max(1, s.width / 22));
    // Arcade bodies are WORLD-space and ignore setScale, so the hitbox stayed as thin as
    // the lance texture while the visual was wide → tiny damage range. Size the body to a
    // square the width of the charge lane (covers ~width px either side of the path).
    p.body.setSize(s.width, s.width, true);
    this.physics.velocityFromRotation(angle, s.speed, p.body.velocity);
    p.damage = s.damage;
    p.pierceLeft = 9999;
    p.pierceWalls = true; // a cavalry charge tramples through walls (not a normal shot)
    p.hitSet = new Set();
    p.lifespan = (s.length / s.speed) * 1000;
  }

  // --- modals ---
  requestLevelUp() {
    this.levelingUp = true;
    this.scene.pause();
    this.scene.launch('UpgradeScene', { gameScene: this });
  }

  endRun() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    Audio.setIntensity(0);
    Audio.sfx('death');
    if (this.duelTest) { // test mode: back to the duel-test picker (real save untouched)
      this.registry.set('reopenDuelPanel', true);
      this.cameras.main.flash(300, 120, 0, 0);
      this.time.delayedCall(700, () => { this.scene.stop('UIScene'); this.scene.start('MenuScene'); });
      return;
    }
    Save.clear(); // death ends the run
    this.cameras.main.flash(300, 120, 0, 0);
    this.time.delayedCall(700, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        characterId: this.characterDef.id,
        level: this.player.level,
        kills: this.player.kills,
        time: this.runTime,
        conquered: this.run.conquered.length,
      });
    });
  }
}
