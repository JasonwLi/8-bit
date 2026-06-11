import Phaser from 'phaser';
import Player from '../entities/Player.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import AbilitySystem from '../systems/AbilitySystem.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import { rollDoors } from '../scenes/DoorScene.js';
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
import { CIV_AMBIENCE, KIND_CLASS } from '../data/civFlavour.js';
import { Save, Legacy } from '../systems/SaveSystem.js';
import Fx from '../systems/Fx.js';
import MapSystem from '../systems/MapSystem.js';
import DuelController from '../systems/DuelController.js';
import PickupController from '../systems/PickupController.js';
import * as EnemyAI from '../systems/EnemyAI.js';
import { isTelegraphing, releaseAttackToken, resetAttackTokens } from '../systems/EnemyAI.js';
import { Audio } from '../systems/AudioManager.js';
import { Settings } from '../systems/Settings.js';
import { GAME, DUNGEON } from '../config.js';
import { resolveStringDef } from '../data/weapons.js';
import TutorialController from '../systems/TutorialController.js';
import BannerQueue from '../systems/BannerQueue.js';
import { HERO_DIALOGUE, BOSS_DIALOGUE, STAGE_INTROS, pickRandom } from '../data/dialogue.js';
import { rollOmens, getOmen } from '../data/omens.js';

// ── New tier-3 combat mechanics ───────────────────────────────────────────────
const WALL_CRUNCH_DMG_FRAC  = 0.35;   // bonus damage as fraction of the shove's source hit
const WALL_CRUNCH_DMG_MIN   = 8;      // floor so a tiny shove still hurts
const WALL_CRUNCH_STUN_MS   = 400;
const BURN_TAG_DURATION     = 1500;   // ms _burnTag stays active after leaving a fire zone
const PANIC_FIRE_INTERVAL   = 400;    // ms between dropped fire patches while PANIC FIRE is active
const CRUMPLE_STUN_EXTEND   = 600;    // ms stun extension on a heavy hit vs. a stunned foe
const CRUMPLE_DMG_BONUS     = 1.25;   // +25% damage multiplier
const HEMORRHAGE_BURST_AT   = 5;      // stack count that detonates the burst
const HEMORRHAGE_RESET_TO   = 2;      // stacks after burst
const EXECUTION_HP_THRESH   = 0.18;
const DEFLECT_RADIUS        = 90;
const DEFLECT_SPEED_MULT    = 1.5;
const DEFLECT_MAX_REFLECT   = 8;
const SLAM_WINDOW_MS        = 180;    // ms after dash ends to trigger slam
const SLAM_RADIUS           = 90;
const SLAM_DMG_MULT         = 1.2;
const SLAM_COOLDOWN_MS      = 1000;
const OVERKILL_CARRY_FRAC   = 0.60;
const OVERKILL_CARRY_RANGE  = 120;

// ── Juice / game-feel constants ───────────────────────────────────────────────
const JUICE = {
  flinchBudget:          12,   // max concurrent flinch tweens
  lightEnemyHpThreshold: 40,   // maxHp ≤ this = interruptable on hit
  interruptCooldownMs:   800,  // min ms between interrupts per enemy
  overkillThreshold:     0.50, // dmg > 50% maxHp = overkill visual
  corpseBudget:          8,    // max concurrent corpse fling tweens
  corpseStayChance:      0.20, // probability corpse lingers before fling
  corpseStayMs:          1200, // how long a lingering corpse stays before fling
};

const JUICE_CAM = {
  budgetPerSec: 18,    // max px of total kick per second (all hits combined)
  hitPowerMin:  1.0,   // px per normal hit
  hitPowerMax:  3.0,   // px cap per hit (scaled by damage)
  heavyPower:   5.0,   // px for heavy/slam
  bossPower:    8.0,   // px for boss hits
  slamExtra:    4.0,   // additional for ground-slam
  shakeDecayMs: 80,    // how long each kick lasts
};

const MOTION_PARAMS = {
  melee_arc:          { antMs:40, antSX:0.92, antSY:1.06, leanPx:8, leanRot:-0.14, lungeMs:70, lungeSX:1.08, lungeSY:0.94, lungePx:10, settleMs:90 },
  line_thrust:        { antMs:25, antSX:0.88, antSY:1.10, leanPx:6, leanRot:-0.10, lungeMs:55, lungeSX:1.12, lungeSY:0.90, lungePx:16, settleMs:70 },
  projectile_aimed:   { antMs:20, antSX:0.94, antSY:1.00, leanPx:0, leanRot:0,     lungeMs:30, lungeSX:1.00, lungeSY:1.00, lungePx:-6, settleMs:60 },
  burst_aimed:        { antMs:20, antSX:0.94, antSY:1.00, leanPx:0, leanRot:0,     lungeMs:30, lungeSX:1.00, lungeSY:1.00, lungePx:-6, settleMs:60 },
  ricochet:           { antMs:20, antSX:0.94, antSY:1.00, leanPx:0, leanRot:0,     lungeMs:30, lungeSX:1.00, lungeSY:1.00, lungePx:-6, settleMs:60 },
  boomerang:          { antMs:20, antSX:0.94, antSY:1.00, leanPx:0, leanRot:0,     lungeMs:30, lungeSX:1.00, lungeSY:1.00, lungePx:-6, settleMs:60 },
  projectile_radial:  { antMs:15, antSX:0.92, antSY:0.92, leanPx:0, leanRot:0,     lungeMs:25, lungeSX:1.10, lungeSY:1.10, lungePx:0,  settleMs:50 },
  lob_aoe:            { antMs:30, antSX:0.96, antSY:1.04, leanPx:5, leanRot:0.17,  lungeMs:60, lungeSX:1.04, lungeSY:0.97, lungePx:8,  settleMs:80 },
  charge_tap:         { antMs:20, antSX:0.97, antSY:1.00, leanPx:0, leanRot:0,     lungeMs:30, lungeSX:1.00, lungeSY:1.00, lungePx:-3, settleMs:60 },
  charge_heavy:       { antMs:30, antSX:0.88, antSY:1.10, leanPx:8, leanRot:-0.21, lungeMs:90, lungeSX:1.14, lungeSY:0.92, lungePx:18, settleMs:110 },
  default:            { antMs:20, antSX:0.95, antSY:1.00, leanPx:0, leanRot:0,     lungeMs:30, lungeSX:1.00, lungeSY:1.00, lungePx:-4, settleMs:50 },
};

// Per-enemy-type debris tint for juicyDeath colored particles
const ENEMY_DEBRIS_COLOR = {
  soldier:0xd45030, archer:0xd45030, weaver:0xc04028, circler:0xb84830,
  charger:0xd85040, lunger:0xd05038, brute:0xc04838, sentinel:0xb04030,
  reaver:0xd04838, repeater:0xd04030, cannoneer:0xc85040, gunner:0xd04038,
  spreader:0x9090a0, lobber:0xa09080, catapult:0x808898, bomber:0xa09080,
  machine:0x8090a0, ballista:0x9098a8,
  harpy:0x80d0d0, vulture:0x9090c0, jackal:0xc0a060, shaman:0xb060c0,
  acolyte:0xd0d0f0, blinker:0xff8040, wraith:0xc0b0ff, shard:0xc0b090,
  golem:0xa09080, titan:0xa08870,
};

// ── DW string combo constants ─────────────────────────────────────────────────
// FODDER: base grunts at or below this HP threshold die to 1–2 string hits.
// Elites/bosses are never fodder regardless of HP.
const FODDER_HP_THRESHOLD = 28; // covers soldier(14), archer(12), weaver, circler

// FINISHER cooldown and window constants
const FINISHER_CD_MS      = 1200; // ~1.2s per-depth finisher internal cooldown
const FINISHER_CD_APEX_MS = 2000; // ~2s longer cooldown after the C6 APEX finisher
const STRING_WINDOW_MS    = 900;  // chain window after each J tap

// ── Charge attack constants ────────────────────────────────────────────────────
const CHARGE_FULL_MS   = 650;   // ms to reach heavy shot (was 900 — snappier hold cadence)
const CHARGE_TAP_MS    = 120;   // release under this = tap (quick shot); fires INSTANTLY on press
const CHARGE_TAP_DMG   = 0.60;  // damage mult for tap
const CHARGE_HEAVY_DMG = 1.80;  // damage mult for heavy (auto-release)
const CHARGE_HEAVY_MANUAL_DMG = 1.80 * 1.15; // +15% for manual release at ≥95% charge
const CHARGE_MANUAL_PCT = 0.95; // fraction of full charge that counts as "perfect" manual release
const CHARGE_TAP_CD    = 0.45;  // cooldown mult for tap (shorter inter-shot gap)

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
    this.contract = contractEffects(this.run.contracts || []); // active difficulty contracts
    // Mandate of Heaven: heat-scaled loot luck (stacks with player luck in PickupController)
    this._mandateLootLuck = this.run.mandateLootLuck || 0;

    this.pendingLevels = 0;
    this.levelingUp = false;
    this.lootOpen = false;
    this.tipOpen = false;
    this.gameOver = false;
    this.stageCleared = false;
    this.dueling = false; // set by DuelController; read across the loop
    this.challengePending = false;
    this._hazardWarned = false; // first-touch explainer for damage zones
    this._lowHpLineShown = false; // show once per floor when hp first drops <25%
    this._ultSpeechUntil = 0; // throttle ult speech (no spam)

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
    // Restore active floor mod (from a mid-floor save/continue).
    this.activeFloorMod = this.run.activeFloorMod ? { ...this.run.activeFloorMod } : null;
    // Cursed mod debuff state (derived from activeFloorMod; set in _applyCursedMod).
    this._cursedPickupMult = 1;
    this._cursedFogRadius = 0;
    this._navAcc = 0;
    this._lastRevealX = -1e9; this._lastRevealY = -1e9; // force a fog reveal on the first frame
    this._fogVisAcc = 0; // accumulator for the ~100ms fog-concealment visibility pass
    this._lastMoveDir = 0; // last movement heading (radians); persists while standing still
    this.aimDir = null;    // effective aim each frame = move direction (null in duels → auto-target)
    this._dashAfterimageAcc = 0; // accumulator for cyan afterimage ghost cadence during a dash

    // ── Charge attack state (primary hold) ──────────────────────────────────
    this._chargeMs = 0;        // ms the primary bind has been held this cycle
    this._chargeArmed = false; // true once _chargeMs >= CHARGE_FULL_MS
    this._chargeFired = false; // true after auto-release fires (prevents double-fire on key-up)
    this._chargeFx = null;     // Phaser.GameObjects.Arc — the charge ring on the player

    // ── Deliberate counter-arm state ─────────────────────────────────────────
    this._lastPrimaryFireAt = 0;  // timestamp of the last primary shot
    this._counterArmed = false;   // gold glint appears while true
    this._counterGlintFx = null;  // pulsing gold ring around the player
    this._counterReadyShown = 0;  // how many times 'COUNTER READY' text has shown this session

    // ── Focus aim state (mechanic 4 — included here for completeness) ────────
    this._focusLockedDir = null;  // snapshot of aimDir when focus was first pressed
    this._focusAimArrow = null;   // triangle indicator while focus is held

    // ── Dash-strike hit tracking ──────────────────────────────────────────────
    this._dashStrikeHit = new Set(); // enemies already hit this dash

    // ── Slam combo state ──────────────────────────────────────────────────────
    this._slamWindowUntil = 0;   // when slam-combo window closes
    this._slamCdUntil     = 0;   // internal slam cooldown
    this._lastDashing     = false; // edge-detect dash->stop transition

    // ── DW String-combo state ────────────────────────────────────────────────
    this._stringDepth        = 0;   // 0=idle, 1–6 = steps fired so far in the string
    this._stringWindowMs     = 0;   // ms remaining before the chain window expires
    this._finisherCdUntil    = 0;   // timestamp: finisher on CD until this time
    this._tumbleEnemies      = new Set(); // enemies currently in TUMBLE state
    this._stringStepActive   = false; // true while a string step is in damageEnemy callstack
    this._stringLauncherActive = false; // true while a launcher finisher is in callstack

    // ── Juice tween budgets — must reset on restart so stale counts from a
    // previous run don't permanently reduce the concurrent-tween caps.
    this._flinchTweenCount = 0;
    this._corpseTweenCount = 0;
    this._camBudgetUsed    = 0;

    // Risk/reward event state (one interactable per floor; null between floors)
    this._riskEvent = null;
  }

  // CONTINUOUS progress across the WHOLE 7/7 conquest: total floors descended so far
  // (cleared stages × floorsPerStage + the current floor). 0-based. Drives a single smooth
  // difficulty + loot curve so a NEW stage's floor 1 is harder than the last stage's floor
  // 15 (no per-stage reset/dip) — important because gear/levels carry across stages.
  get conquestDepth() {
    return stageIndex(this.run) * DUNGEON.floorsPerStage + ((this.floor || 1) - 1);
  }

  // Campaign difficulty multiplier — now continuous with conquestDepth (was a per-stage
  // step of 0.9, which dropped at each new stage). Drives enemy HP/damage + boss scaling.
  get stageScale() {
    return 1 + this.conquestDepth * 0.14; // tune here: higher = harder overall
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
    this.coins = this.physics.add.group(); // gold coins
    this.obstacles = this.physics.add.staticGroup();
    this.breakables = this.physics.add.group();
    this.shrines = this.physics.add.staticGroup();

    // player + systems
    this.player = new Player(this, 0, 0, this.characterDef);
    this.weapons = new WeaponSystem(this, this.player, this.characterDef.startingWeapon); // primary (auto)
    this.weapons.isPrimary = true; // iron_spine omen targets primary cadence only
    this.secondary = new WeaponSystem(this, this.player, this.characterDef.secondary); // secondary (K, ~3s)
    this.ability = new AbilitySystem(this, this.player, this.characterDef.ultimate); // ultimate (SPACE, ~10s)
    this.spawner = new SpawnSystem(this, this.player);
    this.map = new MapSystem(this, this.player);

    // restore carried run progression (level / points / gear / artifacts)
    const r = this.run;
    this.player.loadProgress(r.level, r.xp);
    this.player.kills = r.kills || 0;
    this.applyPointsByPosition(this.weapons, r.weaponPoints);
    this.applyPointsByPosition(this.secondary, r.secondaryPoints);
    Object.assign(this.ability.points, r.abilityPoints); // ability points key on stable slots

    if (r.levelMods) Object.assign(this.player.levelMods, r.levelMods); // carried hero-stat upgrades
    // Restore mutation flags so behavior hooks work correctly on stage resume.
    if (r.mutations) this.player.mutations = { ...r.mutations };
    else this.player.mutations = {};
    // Apply one-time legacy boon at the start of a fresh run (not on stage resumes).
    // `r._boonApplied` guards against re-applying on Continue or multi-stage saves.
    if (!r._boonApplied) {
      r._boonApplied = true;
      if (Legacy.consumeBoon('veteransEdge')) {
        // Veteran's Edge: +10% damage for this entire run (consumed — one-shot purchase)
        this.player.levelMods.damageMult = (this.player.levelMods.damageMult || 0) + 0.10;
      }
    }
    for (const [slot, item] of Object.entries(r.equipment || {})) if (item) this.player.equipment[slot] = item;
    this.player.artifactMods = (r.artifacts || []).map((id) => getArtifact(id).mods);
    // Restore evolution state (earned last session or earlier in this run).
    if (r.weaponEvolved) this.weapons.evolved = true;
    if (r.secondaryEvolved) this.secondary.evolved = true;
    this.updateResonances(); // recomputes from carried weapon/ability points

    // ── Omen resume path ─────────────────────────────────────────────────────────
    // On a stage transition or Continue the omen flags are already on `r` (captureRunState
    // persists them all). Effects baked into levelMods (iron_spine HP, shattered_sky
    // cooldownMult) survive because levelMods is saved/restored.
    // Guard: shattered_sky was previously a direct cooldownMult assignment (lost on
    // recompute). If the saved run has _omenUltCdMult but not _omenShatteredSkyApplied,
    // apply the -20% to levelMods now (one-time migration for saves from before this fix).
    if (r._omenUltCdMult && !r._omenShatteredSkyApplied) {
      r._omenShatteredSkyApplied = true;
      this.player.levelMods.cooldownMult = (this.player.levelMods.cooldownMult || 0) - 0.20;
      this.player.recompute();
    }

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
    this.physics.add.overlap(this.player, this.coins, this.drops.onCoin, null, this.drops);
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

    // Banner manager — one banner at a time, FIFO with priorities and lanes.
    this.bannerQueue = new BannerQueue(this);

    this.events.once('shutdown', () => {
      this._stopAmbienceEmitter();
      this._despawnRiskEvents();
      this.scene.stop('UIScene');
      if (this.tutorial) { this.tutorial.detach(); this.tutorial = null; }
      if (this.bannerQueue) { this.bannerQueue.destroy(); this.bannerQueue = null; }
      if (this._chargeFx) { this._chargeFx.destroy(); this._chargeFx = null; }
      if (this._counterGlintFx) { this._counterGlintFx.destroy(); this._counterGlintFx = null; }
      if (this._focusAimArrow) { this._focusAimArrow.destroy(); this._focusAimArrow = null; }
      // Safety: kill any stuck charge oscillator on scene teardown
      Audio.stopChargeHum();
    });
    // Also stop the charge hum whenever the scene is paused (e.g. opening the pause menu)
    // so the oscillator can't play while the game is frozen.
    this.events.on('pause', () => { Audio.stopChargeHum(); });

    // Tutorial: attach after UIScene is live so tut toasts can use showBanner.
    this.tutorial = new TutorialController();
    this.tutorial.attach(this);

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

    // ── Consume the floor mod chosen in DoorScene (or restored from a save) ───
    // On a RESUME (resumeSpawned > 0) the mod was already loaded into this.activeFloorMod
    // in init() from run.activeFloorMod — don't overwrite it.
    // On a FRESH floor (resumeSpawned === 0) read nextFloorMod, consume it, and set active.
    let mod;
    if (resumeSpawned > 0 && this.activeFloorMod) {
      mod = this.activeFloorMod; // already restored
    } else {
      mod = this.run.nextFloorMod || { type: 'NORMAL' };
      this.run.nextFloorMod = null; // consumed
      this.activeFloorMod = mod;   // keep for this floor's lifetime (read by spawner/pickup)
    }
    // Reset cursed debuffs; _applyCursedMod below will re-apply them if needed.
    this._cursedPickupMult = 1;
    this._cursedFogRadius = 0;
    this._cursedPriceMult = 1;
    // Cursed bargain countdown: decrement on each new floor entry; re-apply lingering debuffs while active.
    if (this._cursedBargainFloorsLeft > 0) {
      this._cursedBargainFloorsLeft -= 1;
      if (this._cursedBargainFloorsLeft <= 0) {
        this._cursedBargainFloorsLeft = 0;
        // debuffs lapse — leave _cursedPickupMult/_cursedFogRadius/_cursedPriceMult at default (1/0/1)
      } else {
        // Re-apply whichever bargain debuffs were active so they persist for the full 2-floor window.
        if (this._cursedBargainPickupMult) this._cursedPickupMult = this._cursedBargainPickupMult;
        if (this._cursedBargainFogRadius)  this._cursedFogRadius  = this._cursedBargainFogRadius;
        if (this._cursedBargainPriceMult)  this._cursedPriceMult  = this._cursedBargainPriceMult;
      }
    }

    this.floorSys.build(this.run.floorSeed + floor, { lockStairs: isBossFloor });
    const start = this.floorSys.startWorld();
    this._lastSafeX = start.x; this._lastSafeY = start.y; // re-anchor the anti-tunnel guard
    this.player.setPosition(start.x, start.y);
    this.player.body.reset(start.x, start.y);
    this.cameras.main.centerOn(start.x, start.y);
    this._lastRevealX = -1e9; this._lastRevealY = -1e9; // re-reveal fog from the new spawn

    // FLAWLESS FLOOR: assume we arrive undamaged; any real hit clears the flag.
    // The _haadEnemy flag gates the bonus so empty / cleared-resume floors don't hand
    // out free chests — it's set true once the first spawn is placed on this floor.
    this._flawlessFloor = true;
    this._floorHadEnemies = false;

    const d = this.floorSys.data;
    this.nav = new FlowField(d.cols, d.rows, d.grid);
    this._navAcc = 0;

    resetAttackTokens(this);                          // prevent token leaks across floors
    this.spawner.onFloorStart(floor);                 // sets floorBudget, resets spawnedThisFloor=0
    this.spawner.spawnedThisFloor = resumeSpawned;    // restore the saved budget (runs before captureRunState below)

    // Apply HORDE mod: inflate budget before garrisons are placed.
    if (mod.type === 'HORDE') {
      this.spawner.floorBudget = Math.round(this.spawner.floorBudget * 1.6);
    }
    // Apply SHRINE mod: reduce budget + add shrines.
    if (mod.type === 'SHRINE') {
      this.spawner.floorBudget = Math.round(this.spawner.floorBudget * 0.5);
    }

    this.spawner.placeGarrisons();                    // pre-place ~45% of budget as dormant clusters
    const clearedOnResume = resumeSpawned >= this.spawner.floorBudget;
    if (!clearedOnResume) {
      this.map.scatterInRooms(d.lootCells); // loot only on a fresh / uncleared floor
    } else if (d.encounters) {
      // cleared-floor resume: consume the treasure encounters too, so you can't re-enter
      // to re-pop their chests (the swarm + room loot are already suppressed above).
      for (const enc of d.encounters) if (enc.kind === 'treasure') enc.triggered = true;
    }
    if (isBossFloor) this.bossPhase = this.bossFloors[floor]; // this floor's champion/lieutenant

    // Apply VAULT mod: force-spawn 3 elites near a guaranteed chest cluster.
    if (mod.type === 'VAULT' && !isBossFloor && resumeSpawned === 0) {
      this._applyVaultMod();
    }
    // Apply SHRINE mod: scatter extra shrines.
    if (mod.type === 'SHRINE' && !isBossFloor && resumeSpawned === 0) {
      this._applyShrineModExtras();
    }
    // Apply CURSED mod: show the curse banner.
    if (mod.type === 'CURSED' && !isBossFloor) {
      this._applyCursedMod(mod);
    }

    // Floor banner — include a small mod tag for non-NORMAL floors.
    const MOD_TAG = { VAULT: '  [vault]', HORDE: '  [horde]', CURSED: '  [cursed]', SHRINE: '  [shrine]' };
    const modTag = (mod.type && mod.type !== 'NORMAL') ? (MOD_TAG[mod.type] || '') : '';
    this.showBanner(`Floor ${floor} / ${this.floorsTotal}${isBossFloor ? '   ⚔ boss' : ''}${modTag}`, '#ffd700', 'normal');
    Audio.setIntensity(isBossFloor ? 1 : 0);

    // Hero stage-start flavour line on floor 1 (new stage or resume to floor 1)
    if (floor === 1) {
      this._lowHpLineShown = false;
      const heroId = this.characterDef && this.characterDef.id;
      const heroLines = heroId && HERO_DIALOGUE[heroId];
      if (heroLines && heroLines.stageStart) {
        const civId = this.stageCiv;
        const pool = (heroLines.stageStart[civId] && heroLines.stageStart[civId].length)
          ? heroLines.stageStart[civId]
          : heroLines.stageStart.default;
        const line = pickRandom(pool);
        if (line) this.time.delayedCall(1100, () => { if (!this.gameOver) this.showBanner(`"${line}"`, '#d8d3ee', 'normal'); });
      }
      // Stage intro card (Item B) — skip in duelTest mode
      if (!this.duelTest) {
        const civKey = this.isFinal ? 'final' : this.stageCiv;
        const intro = STAGE_INTROS[civKey];
        if (intro) this._showStageIntroCard(intro);
      }
    } else {
      this._lowHpLineShown = false; // also reset per floor for the low-hp warning
    }

    // ambient particle layer keyed to the civ theme
    this._startAmbienceEmitter();

    // WAR-CAMP MERCHANT: every 4th floor (non-boss) a robed trader appears near the start room.
    this._merchantNpc = null;
    this._merchantPrompt = null;
    if (!isBossFloor && floor % 4 === 0 && !this.duelTest) {
      this._spawnMerchant();
    }

    // RISK/REWARD EVENTS: ~1 event per 2-3 floors (never on boss floors, never on duelTest).
    // Clear existing event NPC references on every floor entry.
    this._despawnRiskEvents();
    if (!isBossFloor && !this.duelTest && resumeSpawned === 0) {
      // ~40% chance of an event on this floor (avg ~1 per 2.5 floors)
      if (Math.random() < 0.40) {
        this._spawnRiskEvent();
      }
    }

    // WAR OMENS: show the omen picker only on a truly fresh run at stage 1, floor 1.
    // Conditions: dungeon mode, not a resume (resumeSpawned===0), not duelTest,
    // conquered list is empty (stage 1), floor 1, and no omen assigned yet.
    if (this.dungeonMode && !this.duelTest && floor === 1
        && stageIndex(this.run) === 0
        && resumeSpawned === 0
        && !this.run.omen) {
      this._showOmenScene();
    }

    this.captureRunState();
  }

  // Step on the (unlocked) stairs → shed the swarm and drop to the next floor. The last
  // floor's champion ends the stage via conquerStage instead of a descent.
  descendFloor() {
    if (this.floor >= this.floorsTotal) return;

    // WARLORD'S TAX omen: deduct a fraction of gold on each floor descent.
    if (this.run._omenFloorGoldTax && (this.run.gold || 0) > 0) {
      const tax = Math.floor(this.run.gold * this.run._omenFloorGoldTax);
      if (tax > 0) {
        this.run.gold = Math.max(0, this.run.gold - tax);
        this.showBanner(`Warlord's Tax: −${tax} gold`, '#e8a040', 'low');
      }
    }

    // FLAWLESS FLOOR: if the player cleared the floor without taking a real hit
    // (and the floor actually had enemies), spawn a bonus chest + play a banner.
    if (this._flawlessFloor && this._floorHadEnemies) {
      // Place the bonus chest at the stairs so the player sees it immediately
      const st = this.floorSys.stairs;
      if (st) this.drops.spawnChest(st.x, st.y);
      this.showBanner('Flawless floor — the spoils are yours', '#ffd700', 'normal');
      Audio.sfx('levelup');
      if (this.tutorial) this.events.emit('tut', 'flawless'); // tut: flawless toast
    }

    // CURSED floor: drop the stairs reward (powerup + big gold) at the exit.
    if (this.activeFloorMod && this.activeFloorMod.type === 'CURSED') {
      this._cursedStairsReward();
    }

    const nextFloor = this.floor + 1;
    const nextIsBossFloor = this.bossFloors[nextFloor] !== undefined;

    // Door-choice modal: skip for duelTest and when descending INTO a boss floor.
    if (!this.duelTest && !nextIsBossFloor) {
      // Roll door options and show the DoorScene (modal). The actual descent is
      // committed later in _commitDescent(), called when DoorScene closes.
      const doors = rollDoors();
      this.scene.pause();
      this.scene.launch('DoorScene', { gameScene: this, doors, nextFloor });
      return;
    }

    // Boss-floor descents (or duelTest): instant, no choice.
    this._commitDescent();
  }

  // Perform the actual floor transition — called directly for boss floors / duelTest,
  // or via resume-once event after DoorScene is dismissed for normal floors.
  _commitDescent() {
    this.clearField();
    Audio.sfx('descend'); // low stone-grind sweep (item 5)

    // Floor-completion XP bonus: award at least ~50% of the CURRENT xp-to-next so
    // deep floors — where the exponential curve steepens — always yield upgrade choices.
    const bonusXp = Math.ceil(this.player.xpToNext * 0.5);
    const gained = this.player.addXp(bonusXp);
    if (gained > 0) this.pendingLevels += gained;

    this.enterFloor(this.floor + 1);
  }

  // Deactivate all transient field entities between floors (enemies/projectiles/gems/allies).
  clearField() {
    // ITEM D: tear down the ambient emitter before building the next floor
    this._stopAmbienceEmitter();
    for (const e of this.enemies.getChildren()) if (e.active && !e.isBoss) this.deactivate(e);
    for (const p of this.projectiles.getChildren()) if (p.active) this.deactivate(p);
    for (const p of this.enemyProjectiles.getChildren()) if (p.active) this.deactivate(p);
    for (const g of this.gems.getChildren()) if (g.active) this.deactivate(g);
    for (const pu of this.powerups.getChildren()) if (pu.active) this.deactivate(pu);
    if (this.allies) for (const a of this.allies.getChildren()) if (a.active) this.deactivate(a);
    // Coins also clear between floors
    if (this.coins) for (const c of this.coins.getChildren()) if (c.active) this.deactivate(c);
    // Despawn merchant NPC on floor descent
    this._despawnMerchant();
    // Despawn risk/reward event NPCs on floor descent
    this._despawnRiskEvents();
  }

  // Centralised hit-stop. The old per-site save/restore pattern raced: two overlapping
  // hit-stops saved each other's slowed timeScale as the "restore" value and left the
  // whole game stuck in slow motion. Overlaps now just extend one deadline; the watchdog
  // in update() restores normal speed exactly once.
  hitStop(ms, scale = 8) {
    this.physics.world.timeScale = Math.max(this.physics.world.timeScale, scale);
    this._hitStopUntil = Math.max(this._hitStopUntil || 0, this.time.now + ms);
  }

  // ── Juice helpers ─────────────────────────────────────────────────────────────

  // Per-frame-budgeted directional camera nudge. All hit/kill/boss reactions funnel
  // through here so crowds can't compound into nauseating shakes.
  screenKick(ang, power) {
    this._camBudgetUsed = (this._camBudgetUsed || 0) + power;
    if (this._camBudgetUsed > JUICE_CAM.budgetPerSec / 60) return;
    const cam = this.cameras.main;
    const kx = Math.cos(ang) * power;
    const ky = Math.sin(ang) * power;
    cam.setScroll(cam.scrollX + kx, cam.scrollY + ky);
    this.time.delayedCall(JUICE_CAM.shakeDecayMs, () => {
      if (!cam) return;
      cam.setScroll(cam.scrollX - kx, cam.scrollY - ky);
    });
  }

  // Render-only attack body-motion: three-phase squash/lean/lunge tween.
  // Never touches the physics body — only sprite x/y/scale/rotation.
  // Skips while the player is dashing (dash has its own motion).
  playerAttackMotion(kind, aim) {
    const p = this.player;
    if (p._attackMotionActive) return;
    if (p.dashing) return; // dash has its own motion — don't fight it
    // No body motion for continuous/cast types
    if (kind === 'orbital' || kind === 'summon' || kind === 'trail' || kind === 'pike_wall') return;
    p._attackMotionActive = true;
    const sx0 = p.scaleX, sy0 = p.scaleY, r0 = p.rotation;
    const cos = Math.cos(aim), sin = Math.sin(aim);
    const T = MOTION_PARAMS[kind] || MOTION_PARAMS.default;
    // Phase 1: anticipation (lean back from aim)
    this.tweens.add({
      targets: p,
      scaleX: sx0 * T.antSX, scaleY: sy0 * T.antSY,
      x: p.x - cos * T.leanPx, y: p.y - sin * T.leanPx,
      rotation: r0 + T.leanRot,
      duration: T.antMs, ease: 'Quad.easeOut',
      onComplete: () => {
        if (!p.active) { p._attackMotionActive = false; return; }
        const x1 = p.x, y1 = p.y;
        // Phase 2: lunge forward
        this.tweens.add({
          targets: p,
          scaleX: sx0 * T.lungeSX, scaleY: sy0 * T.lungeSY,
          x: x1 + cos * T.lungePx, y: y1 + sin * T.lungePx,
          rotation: r0,
          duration: T.lungeMs, ease: 'Quad.easeIn',
          onComplete: () => {
            if (!p.active) { p._attackMotionActive = false; return; }
            const x2 = p.x, y2 = p.y;
            // Phase 3: settle back to original scale
            this.tweens.add({
              targets: p,
              scaleX: sx0, scaleY: sy0, rotation: r0,
              x: x2 - cos * T.lungePx + cos * T.leanPx,
              y: y2 - sin * T.lungePx + sin * T.leanPx,
              duration: T.settleMs, ease: 'Back.easeOut',
              onComplete: () => { p._attackMotionActive = false; },
            });
          },
        });
      },
    });
  }

  // Replace the standard fx.death() with a directional corpse-fling + colored debris.
  juicyDeath(enemy, dmg = 0) {
    const x = enemy.x, y = enemy.y;
    const ang = Math.atan2(y - this.player.y, x - this.player.x);
    const overkill = dmg > (enemy.maxHp || 1) * JUICE.overkillThreshold;
    const flingDist = overkill ? Phaser.Math.Between(55, 80) : Phaser.Math.Between(30, 55);
    const flingDur  = overkill ? 300 : 350;
    const debrisColor = ENEMY_DEBRIS_COLOR[enemy.typeId] || 0xbfc4d0;

    // Inline death visuals tinted to the enemy type
    if (this.fx.budgetPoof > 0) {
      this.fx.budgetPoof -= 1;
      this.fx._tint(this.fx.poof, debrisColor);
      this.fx.poof.emitParticleAt(x, y, 8);
    }
    this.fx._tint(this.fx.spark, debrisColor);
    this.fx.spark.emitParticleAt(x, y, overkill ? 10 : 5);
    this.fx._ring(x, y, overkill ? 72 : 56, debrisColor, 340, 3);
    this.fx._flash(x, y, overkill ? 12 : 8, 0xffffff, 0.7, 160);
    if (overkill && this.fx.explosion) this.fx.explosion(x, y, this.theme.accent || 0xff8a3a, 60);

    // Corpse fling (render-only ghost image that slides + spins + fades)
    if ((this._corpseTweenCount || 0) < JUICE.corpseBudget) {
      this._corpseTweenCount = (this._corpseTweenCount || 0) + 1;
      const tex = enemy.texture ? enemy.texture.key : 'spark';
      const corpse = this.add.image(x, y, tex)
        .setDepth(4).setAlpha(0.85).setFlipX(enemy.flipX)
        .setScale(enemy.scaleX || 1, enemy.scaleY || 1)
        .setTint(0x888888);
      const ex = x + Math.cos(ang) * flingDist;
      const ey = y + Math.sin(ang) * flingDist;
      const extraStay = Math.random() < JUICE.corpseStayChance ? JUICE.corpseStayMs : 0;
      this.tweens.add({
        targets: corpse,
        x: ex, y: ey,
        rotation: (Math.random() > 0.5 ? 1 : -1) * Math.PI * 3,
        alpha: 0,
        delay: extraStay,
        duration: flingDur,
        ease: 'Quad.easeOut',
        onComplete: () => {
          corpse.destroy();
          this._corpseTweenCount = Math.max(0, (this._corpseTweenCount || 1) - 1);
        },
      });
    }

    // Screen micro-pulse
    const killAng = Math.atan2(y - this.player.y, x - this.player.x);
    this.screenKick(killAng, overkill ? 2.5 : 1.2);
  }

  update(time, delta) {
    if (this.gameOver) return;
    // per-frame camera budget reset (screenKick uses this)
    this._camBudgetUsed = 0;
    // hit-stop watchdog: restore physics speed once the freeze window passes
    if (this._hitStopUntil && this.time.now >= this._hitStopUntil) {
      this._hitStopUntil = 0;
      this.physics.world.timeScale = 1;
    }
    this.runTime += delta;
    this.fx.newFrame();
    if (this.tutorial) this.tutorial.tick(); // tut: keep prompt alive across frames

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
    if (dx !== 0 || dy !== 0) {
      this._lastMoveDir = Math.atan2(dy, dx); // remember heading
      if (this.tutorial) this.events.emit('tut', 'move'); // tut: step (a)
    }
    // ── Focus Aim (mechanic 4): hold focus bind to lock the aim direction ──────
    if (this.dungeonMode && !this.dueling) {
      if (this.bindKeys && this.bindKeys.focus && this.bindKeys.focus.isDown) {
        if (!this._focusLockedDir) {
          this._focusLockedDir = this._lastMoveDir; // snapshot on first press
        }
        this.aimDir = this._focusLockedDir;
      } else {
        this._focusLockedDir = null; // release lock
        this.aimDir = this._lastMoveDir;
      }
    } else {
      this._focusLockedDir = null;
      this.aimDir = null;
    }
    // Aim-direction indicator while focus is locked
    if (this._focusLockedDir != null) {
      if (!this._focusAimArrow) {
        this._focusAimArrow = this.add.triangle(0, 0, 0, -5, 12, 0, 0, 5, 0x00e5ff, 0.85).setDepth(11);
      }
      const arrowDist = 26;
      this._focusAimArrow
        .setPosition(
          this.player.x + Math.cos(this._focusLockedDir) * arrowDist,
          this.player.y + Math.sin(this._focusLockedDir) * arrowDist,
        )
        .setRotation(this._focusLockedDir)
        .setVisible(true);
    } else {
      if (this._focusAimArrow) this._focusAimArrow.setVisible(false);
    }

    // ── Counter-arm logic: counter fires when the player hasn't shot for ≥400ms,
    //    OR when the charge ring reaches ≥50% (so hold-players pass through armed
    //    windows every cycle instead of never seeing counters). ──────────────────
    {
      const COUNTER_ARM_DELAY = 400;
      const counterNow = this.time.now;
      const wasArmedPrev = this._counterArmed;
      // Arm by idle time OR by charge progress (50%+ charge counts as "not firing")
      const idleArmed = !this.dueling && (counterNow - (this._lastPrimaryFireAt || 0)) >= COUNTER_ARM_DELAY;
      const chargeArmed = !this.dueling && this._chargeMs >= CHARGE_FULL_MS * 0.50 && !this._chargeFired;
      this._counterArmed = idleArmed || chargeArmed;
      if (this._counterArmed && !wasArmedPrev) {
        // Just became armed: destroy any stale glint and create an unmissable pulsing
        // gold ring around the player (larger + brighter than the old barely-visible arc).
        if (this._counterGlintFx) { this._counterGlintFx.destroy(); this._counterGlintFx = null; }
        const g = this.add.arc(this.player.x, this.player.y, 22, 0, 360, false, 0xffd700, 0)
          .setDepth(11).setStrokeStyle(3, 0xffd700, 0.9);
        this._counterGlintFx = g;
        // Show 'COUNTER READY' micro-text the first 3 times per session
        if (this._counterReadyShown < 3) {
          this._counterReadyShown++;
          const ct = this.add.text(this.player.x, this.player.y - 36, 'COUNTER READY', {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffd700', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(52).setScrollFactor(1);
          this.tweens.add({ targets: ct, y: ct.y - 18, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => ct.destroy() });
        }
      } else if (!this._counterArmed && wasArmedPrev) {
        if (this._counterGlintFx) { this._counterGlintFx.destroy(); this._counterGlintFx = null; }
      }
      if (this._counterGlintFx && this._counterArmed) {
        this._counterGlintFx.setPosition(this.player.x, this.player.y);
        // Bright pulsing ring — alternates 0.65-0.95 alpha so it's unmissable
        this._counterGlintFx.setAlpha(0.65 + 0.30 * Math.sin(counterNow * 0.009));
      }
    }

    this.player.move(dx, dy);
    // Anti-tunnel guard: at high speed (speed gear/buffs × dash) the arcade body can step
    // clean past a thin wall in a single frame (no continuous collision in Arcade). Track
    // the last walkable position and snap back if a frame ends inside rock. Skipped in
    // duels — the arena lives off the floor grid where isWalkable is false everywhere.
    if (this.dungeonMode && this.floorSys && !this.dueling) {
      if (this.floorSys.isWalkable(this.player.x, this.player.y)) {
        this._lastSafeX = this.player.x; this._lastSafeY = this.player.y;
      } else if (this._lastSafeX !== undefined) {
        this.player.body.reset(this._lastSafeX, this._lastSafeY);
      }
    }
    if (!this.dungeonMode) this.wrapEntity(this.player, true); // open world is a torus; floors have hard walls

    this.updateEnemies(delta);

    // primary is MANUAL: tick its cooldown every frame; firing is driven by the held
    // bind key in handleCombatInput(). (Duels drive the primary through their own swing.)
    this.weapons.tick(delta);
    this.secondary.tick(delta); // tick the secondary's ~3s cooldown
    this.ability.update(time, delta); // ultimate cooldown + empower/momentum
    this.handleCombatInput(delta);
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
            // Storm of Axes (evolution): spawn a trample zone at the turnaround point
            if (p.boomExplosion) {
              this.spawnHazardZone(
                p.x, p.y,
                p.boomExplosionRadius || 70,
                p.boomExplosionDmg || 20,
                0, 300, p.boomExplosionLinger || 1200,
                'trample', 'enemies',
              );
              this.fx.shockwave(p.x, p.y, 0xb0b0c0, (p.boomExplosionRadius || 70) * 1.2);
            }
          }
        } else {
          const ang = Math.atan2(this.player.y - p.y, this.player.x - p.x);
          this.physics.velocityFromRotation(ang, p.boomSpeed, p.body.velocity);
          if (dx * dx + dy * dy < 26 * 26) { this.deactivate(p); continue; }
        }
      }
      p.lifespan -= delta;
      if (p.lifespan <= 0) {
        // Fragmentation mutation: unexpired projectiles that hit nothing split into 3 shards
        if (this.player.mutations && this.player.mutations.proj_split_on_expire && !p._isShard) {
          const sp = Math.hypot(p.body.velocity.x, p.body.velocity.y) || 200;
          for (let i = 0; i < 3; i++) {
            const a = p.rotation + (i - 1) * 0.55;
            const sh = this.weapons.spawnProjectile(
              Object.assign({}, this.weapons.computeStats(), { speed: sp * 0.6, pierce: 0, damage: Math.round((p.damage || 4) * 0.4), reachMult: 0.5 }),
              p.x, p.y, a,
            );
            if (sh) { sh._isShard = true; sh.homing = false; }
          }
        }
        this.deactivate(p);
      }
    }
    this.updateAllies(time, delta); // Caesar's legionaries seek + fight
    // enemy projectile lifespans (+ trail) + GRAZE detection
    // A graze fires when an enemy projectile passes within ~30px of the player
    // WITHOUT hitting (the overlap handler above consumed it on a real hit). Each
    // graze shaves 150ms off the ultimate's remaining cooldown and sparks a tiny
    // cyan flash at the player edge. Rate-capped to ~5/sec to prevent farm exploits.
    // No graze while dash-invulnerable (no double-dipping on the perfect-dodge window).
    const _now = this.time.now;
    const GRAZE_RADIUS2 = 30 * 30; // squared — avoids sqrt in the hot path
    const GRAZE_CD_MS = 200;       // minimum 200ms between any two grazes (~5/sec)
    const GRAZE_CD_REDUCE = 150;   // ms shaved from ult cooldown per graze
    if (!this._grazeLastAt) this._grazeLastAt = 0;
    const _grazeDashInvuln = this.player.isDashInvuln(_now);
    for (const p of this.enemyProjectiles.getChildren()) {
      if (!p.active) continue;
      this.fx.trail(p.x, p.y, p.trailColor || 0xff6b6b);
      p.lifespan -= delta;
      if (p.lifespan <= 0) { this.deactivate(p); continue; }

      // Graze check: projectile alive, player not dash-invuln, hasn't been counted yet
      if (!p._grazed && !_grazeDashInvuln && _now - this._grazeLastAt >= GRAZE_CD_MS) {
        const gdx = p.x - this.player.x;
        const gdy = p.y - this.player.y;
        if (gdx * gdx + gdy * gdy <= GRAZE_RADIUS2) {
          p._grazed = true;
          this._grazeLastAt = _now;
          // Shave cooldown — never below 0
          if (this.ability.cdRemaining > 0) {
            this.ability.cdRemaining = Math.max(0, this.ability.cdRemaining - GRAZE_CD_REDUCE);
          }
          // Tiny cyan spark at the player's edge toward the bullet
          const ga = Math.atan2(gdy, gdx); // angle from player toward bullet
          const sx = this.player.x + Math.cos(ga) * 14;
          const sy = this.player.y + Math.sin(ga) * 14;
          this.fx._flash(sx, sy, 5, 0x00e5ff, 0.85, 130);
          this.fx._tint(this.fx.spark, 0x00e5ff);
          this.fx.spark.emitParticleAt(sx, sy, 3);
          if (this.tutorial) this.events.emit('tut', 'graze'); // tut: graze toast
        }
      }
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
          // CURSED tight_fog mod: reduce reveal radius by 30px
          const fogAdj = (this._cursedFogRadius || 0);
          this.floorSys.revealAt(this.player.x, this.player.y, 360 + fogAdj);
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
        for (const co of this.coins.getChildren()) _vis(co);
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
    if (this.dungeonMode) this._updateMerchant();
    if (this.dungeonMode) this._updateRiskEvents(time);
    this.map.update(delta, time);
    this.player.updateBuffs(time);
    this.player.applyRegen(delta / 1000);

    // Dash tick: advance burst/recharge state; spawn cyan afterimage ghosts during dash.
    this.player.tickDash(time);

    // SLAM COMBO: edge-detect dash end to open a 180ms attack window
    {
      const nowDashing = this.player.dashing;
      if (this._lastDashing && !nowDashing) {
        this._slamWindowUntil = time + SLAM_WINDOW_MS;
      }
      this._lastDashing = nowDashing;
    }

    if (this.player.dashing) {
      this._dashAfterimageAcc = (this._dashAfterimageAcc || 0) + delta;
      // Spawn a ghost every ~55ms during the burst window (matches the swift-elite pattern).
      if (this._dashAfterimageAcc >= 55) {
        this._dashAfterimageAcc = 0;
        const ghost = this.add.image(this.player.x, this.player.y, this.player.texture.key)
          .setDepth(9)
          .setScale(this.player.scaleX, this.player.scaleY)
          .setTint(0x00e5ff)   // cyan
          .setAlpha(0.5)
          .setFlipX(this.player.flipX);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
      }

      // DASH-STRIKE: deal damage to each enemy the player body overlaps during the dash.
      // One hit per enemy per dash (tracked by _dashStrikeHit, cleared at dash start).
      // Uses fromPlayer:true so the counter-arm check in damageEnemy applies — a
      // counter-armed dash through a telegraphing enemy pays the full 1.5× counter bonus.
      // No knockback or bleed during the dash to avoid wall-shove chaos.
      {
        const ds = this.weapons.computeStats();
        const dashDmg = Math.round(ds.damage * 0.80);
        const pr = 28; // hit radius around player centre (generous — bigger than the body hitbox)
        const pr2 = pr * pr;
        for (const e of this.enemies.getChildren()) {
          if (!e.active || this._dashStrikeHit.has(e)) continue;
          const ddx = e.x - this.player.x;
          const ddy = e.y - this.player.y;
          if (ddx * ddx + ddy * ddy <= pr2) {
            this._dashStrikeHit.add(e);

            // ELITE EXECUTION: dash-strike a marked (low-HP) elite → instant kill
            if (e.isElite && !e.isBoss && e._executionMarked) {
              this.fx._flash(this.player.x, this.player.y, 120, 0xffffff, 0.75, 160);
              this.fx._flash(e.x, e.y, 32, 0xff4444, 0.95, 240);
              this.fx._ring(e.x, e.y, 80, 0xff4444, 380, 6);
              this.fx.spark.emitParticleAt(e.x, e.y, 12);
              this.hitStop(80, 80); // execution freeze-frame
              this.player.heal(8);
              this.player.streak += 5;
              this.killEnemy(e);
              Audio.sfx('execution');
              continue; // skip normal damageEnemy for this enemy
            }

            this.damageEnemy(e, dashDmg, { fromPlayer: true }); // can trigger counter-hit!
            // Small cyan spark impact at the point of contact
            const ang = Math.atan2(ddy, ddx);
            const sx = this.player.x + Math.cos(ang) * 20;
            const sy = this.player.y + Math.sin(ang) * 20;
            this.fx._flash(sx, sy, 6, 0x00e5ff, 0.7, 100);
            this.fx._tint(this.fx.spark, 0x00e5ff);
            this.fx.spark.emitParticleAt(sx, sy, 4);
          }
        }
      }
    }

    // Status aura around the player — makes active buffs/debuffs obvious at a glance.
    // Priority: empowered (musou) > berserk (red) > defense/testudo (gold) > speed (green)
    // > slowed/cursed (blue).
    const p = this.player;
    let aura = null;
    if (p.empowered) aura = p.empowerColor;
    else if (p.buffDamageMult > 1) aura = 0xff4444;                 // berserker rage
    else if (p.buffDamageTakenMult < 1) aura = 0xffd766;            // testudo / defense
    else if (p.buffSpeedMult > 1) aura = 0x66ff99;                  // speed
    else if (p.curseSlow < 0.99) aura = 0x6699ff;                   // hex curse / slow
    if (aura != null) {
      this.empowerAura.setVisible(true).setPosition(p.x, p.y)
        .setScale(p.empowered ? 1.25 : 1.1).setTint(aura);
    } else if (this.empowerAura.visible) {
      this.empowerAura.setVisible(false);
    }

    if (this.pendingLevels > 0 && !this.levelingUp && !this.lootOpen) this.requestLevelUp();

    // Near-death heartbeat: slow low thump every ~1s while HP < 20% (throttled by Audio)
    if (this.player.active && this.player.hp > 0 && this.player.hp / this.player.maxHp < 0.20) {
      Audio.sfx('heartbeat');
    }

    // Low-HP flavour line: once per floor when HP first drops below 25%
    if (!this._lowHpLineShown && this.player.active && this.player.hp > 0
        && this.player.hp / this.player.maxHp < 0.25) {
      this._lowHpLineShown = true;
      const heroId = this.characterDef && this.characterDef.id;
      const heroLines = heroId && HERO_DIALOGUE[heroId];
      if (heroLines && heroLines.lowHp) {
        const line = pickRandom(heroLines.lowHp);
        if (line) this.showBanner(`"${line}"`, '#ff8c8c', 'normal');
      }
    }
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
    // Bulwark elite damage-reduction aura: reset each frame, re-applied below per active bulwark
    for (const e of this.enemies.getChildren()) { if (e.active && !e.isBoss) e._bulwarkShield = false; }
    // Drum aura: reset _drumBuffed flag each frame so the drummer re-applies (or lets it lapse)
    for (const e of this.enemies.getChildren()) {
      if (e.active && !e.isBoss && e._drumBuffed) {
        // Restore speed here; the drummer will re-apply if still in range below
        if (e._baseSpeed != null) e.speed = e._baseSpeed;
        e._drumBuffed = false;
      }
    }
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
      this.applyStatusTint(e, now, delta); // OBVIOUS status: stun/fear/slow tint + stun stars
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
          if (e.warlordTimer <= 0) {
            this.summonMinions(e.x, e.y, e.warlordCount);
            e.warlordTimer = e.warlordEvery;
            // visual: brief crown-burst particle when the warlord calls for reinforcements
            this.fx.impact(e.x, e.y - (e.displayHeight || 30) * 0.6, 0xb15bff);
            this.fx.shockwave(e.x, e.y, 0xb15bff, 60);
          }
        }
        if (e.curseRadius && dist < e.curseRadius) {
          this.player.curseSlow = Math.min(this.player.curseSlow, e.curseSlowAmt);
        }
        if (e.casterEvery) { // Caster elite: lob a 3-shot spread at the player
          e.casterTimer -= delta;
          if (e.casterTimer <= 0) {
            e.casterTimer = e.casterEvery;
            const base = Math.atan2(py - e.y, px - e.x);
            for (let i = -1; i <= 1; i++) this.spawnHostileProjectile(e.x, e.y, base + i * 0.22, e.castSpeed, e.castDmg, { tint: e.eliteTint, kindClass: (e.typeId && KIND_CLASS[e.typeId]) || null });
          }
        }
        // Berserker: rage visual — pulsing red ring drawn each frame (cheap line-circle; reuses existing arc fx)
        if (e.eliteMod === 'berserker') {
          e._berserkerPulse = (e._berserkerPulse || 0) + delta;
          if (e._berserkerPulse >= 600) {
            e._berserkerPulse = 0;
            const r = (e.displayWidth || 36) * 0.7;
            const ring = this.add.circle(e.x, e.y, r, 0xff5a2a, 0).setDepth(4).setStrokeStyle(2, 0xff5a2a, 0.8);
            this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
          }
        }
        // Swift: afterimage trail — brief ghost every ~150ms
        if (e.eliteMod === 'swift') {
          e._swiftTrailAcc = (e._swiftTrailAcc || 0) + delta;
          if (e._swiftTrailAcc >= 150 && (e.body && (Math.abs(e.body.velocity.x) > 10 || Math.abs(e.body.velocity.y) > 10))) {
            e._swiftTrailAcc = 0;
            const ghost = this.add.image(e.x, e.y, e.texture.key).setDepth(4)
              .setScale(e.scaleX, e.scaleY).setTint(0x33d6d6).setAlpha(0.45).setFlipX(e.flipX);
            this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
          }
        }
        // Bulwark: nearby-ally damage-reduction aura — mark allies within bulwarkAuraRadius
        if (e.eliteMod === 'bulwark' && e.bulwarkAuraRadius) {
          for (const nb of this.enemies.getChildren()) {
            if (!nb.active || nb === e || nb.isBoss) continue;
            const bx = nb.x - e.x, by = nb.y - e.y;
            if (bx * bx + by * by <= e.bulwarkAuraRadius * e.bulwarkAuraRadius) {
              nb._bulwarkShield = true;
            }
          }
          // pulsing gold ring around the bulwark itself
          e._bulwarkRingAcc = (e._bulwarkRingAcc || 0) + delta;
          if (e._bulwarkRingAcc >= 900) {
            e._bulwarkRingAcc = 0;
            const br = this.add.circle(e.x, e.y, e.bulwarkAuraRadius, 0xffd54a, 0)
              .setDepth(3).setStrokeStyle(2, 0xffd54a, 0.55);
            this.tweens.add({ targets: br, scale: 1.06, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => br.destroy() });
          }
        }
        // Ironclad: silver glow ring when the armored shell is active (top 60% HP)
        if (e.eliteMod === 'ironclad' && e.ironclad) {
          const shellActive = e.hp > e.maxHp * 0.6;
          if (shellActive) {
            e._ironcladRingAcc = (e._ironcladRingAcc || 0) + delta;
            if (e._ironcladRingAcc >= 1400) {
              e._ironcladRingAcc = 0;
              const ir = this.add.circle(e.x, e.y, (e.displayWidth || 36) * 0.65, 0x9aa6c0, 0)
                .setDepth(3).setStrokeStyle(3, 0x9aa6c0, 0.9);
              this.tweens.add({ targets: ir, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => ir.destroy() });
            }
          }
        }
        // Vampiric lifesteal: handled in damageEnemy via e.vampiric flag (set at spawn)
        // Hex: pulsing green aura ring so players can read the slow zone visually
        if (e.eliteMod === 'hex' && e.curseRadius) {
          e._hexRingAcc = (e._hexRingAcc || 0) + delta;
          if (e._hexRingAcc >= 1100) {
            e._hexRingAcc = 0;
            const hr = this.add.circle(e.x, e.y, e.curseRadius, 0x66dd66, 0)
              .setDepth(3).setStrokeStyle(2, 0x66dd66, 0.5);
            this.tweens.add({ targets: hr, alpha: 0, duration: 900, ease: 'Sine.easeInOut', onComplete: () => hr.destroy() });
          }
        }
      }

      // ── Signature-unit per-frame aura systems ─────────────────────────────────
      // Āšipu / caster aura: periodically buff nearby allies (speed + damage)
      // Also used by: Shaman (TWEAK 2 — heals allies), Acolyte (TWEAK 7 — damage buff)
      if (e.ashipuAura) {
        e.auraPulseTimer = (e.auraPulseTimer || 0) - delta;
        if (e.auraPulseTimer <= 0) {
          e.auraPulseTimer = e.auraPulseCooldown || 5000;
          const r2 = (e.auraRadius || 140) ** 2;
          for (const ally of this.enemies.getChildren()) {
            if (!ally.active || ally === e || ally.isBoss) continue;
            const dx = ally.x - e.x, dy = ally.y - e.y;
            if (dx * dx + dy * dy <= r2) {
              ally._ashipuBuffUntil = now + 2500;
              ally._ashipuDmgBoost  = e.auraDmgBoost  || 1.18;
              ally._ashipuSpeedBoost = e.auraSpeedBoost || 1.15;
              // TWEAK 2: Shaman heal — restore HP to nearby non-boss allies
              if (e.auraHealAmt) {
                ally.hp = Math.min(ally.maxHp, ally.hp + e.auraHealAmt);
                // Green heal puff on the healed unit
                this.fx.impact(ally.x, ally.y - (ally.displayHeight || 30) * 0.4, 0x66ff88);
              }
            }
          }
          // Visual: brief gold shockwave ring
          const ring = this.add.circle(e.x, e.y, e.auraRadius || 140, 0xffd54a, 0)
            .setDepth(3).setStrokeStyle(2, 0xffd54a, 0.8);
          this.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
        }
      }
      // TWEAK 5: Titan fear aura (phase 1: > 50% HP) + rage flip (phase 2: ≤ 50% HP)
      if (e.titanAura && e.maxHp > 0) {
        const hpFrac = e.hp / e.maxHp;
        const rageThresh = e.titanRageThreshold || 0.50;
        if (hpFrac > rageThresh) {
          // Phase 1: pulsing dark-purple slow aura
          const dx = this.player.x - e.x, dy = this.player.y - e.y;
          if (dx * dx + dy * dy <= (e.titanAuraRadius || 100) ** 2) {
            this.player.curseSlow = Math.min(this.player.curseSlow, e.titanAuraSlow || 0.70);
          }
          e._titanRingAcc = (e._titanRingAcc || 0) + delta;
          if (e._titanRingAcc >= 2000) {
            e._titanRingAcc = 0;
            const tr = this.add.circle(e.x, e.y, e.titanAuraRadius || 100, 0x5500aa, 0)
              .setDepth(3).setStrokeStyle(2, 0x5500aa, 0.45);
            this.tweens.add({ targets: tr, alpha: 0, duration: 1600, ease: 'Sine.easeInOut', onComplete: () => tr.destroy() });
          }
        } else if (!e._titanRaged) {
          // Phase 2: one-shot rage flip when HP drops at or below threshold
          e._titanRaged = true;
          e.speed = Math.round(e.speed * (e.titanRageSpeedMult || 1.60));
          e.setTint(0xaa2200);
          this.fx.shockwave(e.x, e.y, 0xaa2200, 80);
          e.contactDamage = Math.max(1, Math.round(e.damage * 0.15));
          e._baseContactDamage = e.contactDamage;
        }
      }

      // Drummer speed aura: passive, applied every frame to nearby allies
      if (e.drumAura) {
        const r2 = (e.auraRadius || 180) ** 2;
        for (const ally of this.enemies.getChildren()) {
          if (!ally.active || ally === e || ally.isBoss) continue;
          const dx = ally.x - e.x, dy = ally.y - e.y;
          if (dx * dx + dy * dy <= r2) {
            if (!ally._drumBuffed) {
              ally._baseSpeed = ally._baseSpeed || ally.speed;
              ally.speed = ally._baseSpeed * (e.auraSpeedBoost || 1.20);
              ally._drumBuffed = true;
            }
          } else if (ally._drumBuffed) {
            // Fell out of range: restore
            if (ally._baseSpeed != null) ally.speed = ally._baseSpeed;
            ally._drumBuffed = false;
          }
        }
      }

      // Berserkr rage: check HP threshold once per frame (only flips once)
      if (e.berserkrRage && !e.raging && e.maxHp > 0 && e.hp / e.maxHp < e.rageThreshold) {
        e.raging = true;
        e.speed = Math.round(e.speed * 1.45);
        e.damage = Math.round(e.damage * 1.6);
        if (e.swingDmgMult != null) e.swingDmgMult *= 1.6;
        e.swingArc = 2.6;
        e.armor = 0;
        e.setTint(0xff2200);
        // brief pulse effect
        const rr = this.add.circle(e.x, e.y, (e.displayWidth || 40) * 0.8, 0xff2200, 0)
          .setDepth(4).setStrokeStyle(3, 0xff2200, 0.9);
        this.tweens.add({ targets: rr, scale: 1.8, alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => rr.destroy() });
        // Contact damage re-baked from new damage value
        e.contactDamage = Math.max(1, Math.round(e.damage * 0.15));
        e._baseContactDamage = e.contactDamage;
      }

      // Norse berserk threshold (civ modifier, applies to non-sig Norse melee)
      if (this.stageCiv === 'norse' && e.attack === 'melee' && !e._norseRage && !e.berserkrRage
          && e.maxHp > 0 && e.hp / e.maxHp < 0.30) {
        e._norseRage = true;
        e.speed = Math.round(e.speed * 1.20);
        if (e.swingDmgMult != null) e.swingDmgMult = (e.swingDmgMult || 1.8) * 1.15;
        e.setTint(0xff4400);
        this.time.delayedCall(200, () => { if (e.active && !e.isElite) e.clearTint(); });
      }

      // Ashipu buff: apply per-frame to buffed allies
      if (e._ashipuBuffUntil && now < e._ashipuBuffUntil) {
        // damage boost is applied in damageEnemy; speed boost is ephemeral here
        if (e._ashipuSpeedBoost && !e._ashipuSpeedApplied) {
          e._ashipuSpeedApplied = true;
          e._preAshipuSpeed = e._preAshipuSpeed || e.speed;
          e.speed = Math.round(e._preAshipuSpeed * e._ashipuSpeedBoost);
        }
      } else if (e._ashipuBuffUntil && now >= e._ashipuBuffUntil) {
        e._ashipuBuffUntil = 0;
        e._ashipuSpeedApplied = false;
        if (e._preAshipuSpeed != null) { e.speed = e._preAshipuSpeed; e._preAshipuSpeed = null; }
      }

      // update overhead elite nameplate (position + visibility follows the sprite)
      this._updateElitePlate(e);

      // ── TUMBLE: enemy is airborne (launched by a DW string launcher step) ──────
      // While tumbling, the enemy can't act, takes +30% damage, and shows a pale
      // aerial tint. On expiry we restore scale + clear tint + destroy shadow.
      if (e.tumbleUntil) {
        if (now >= e.tumbleUntil) {
          e.tumbleUntil = 0;
          e.setScale(e.tumbleScaleBase || 1);
          if (e._tumbleShadow) { e._tumbleShadow.destroy(); e._tumbleShadow = null; }
          this._tumbleEnemies.delete(e);
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a); else e.clearTint();
        } else {
          // Update shadow position while tumbling
          if (e._tumbleShadow) e._tumbleShadow.setPosition(e.x, e.y + 14);
          e.setVelocity(0, 0); // tumbling enemies freeze in place (top-down "airborne")
          continue;
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
        // PANIC FIRE: feared + burning → drop a small fire patch every 400ms
        if (e._burnTag && now < e._burnTag && !e.isBoss) {
          e._panicFireAcc = (e._panicFireAcc || 0) + delta;
          if (e._panicFireAcc >= PANIC_FIRE_INTERVAL) {
            e._panicFireAcc = 0;
            this.spawnHazardZone(e.x, e.y, 28, 3, 300, 400, 1200, 'fire', 'enemies');
            this.fx._flash(e.x, e.y, 8, 0xff6a00, 0.65, 180);
            if (this.tutorial && !this._panicFireTutShown) {
              this._panicFireTutShown = true;
              this.events.emit('tut', 'panic_fire');
            }
          }
        } else {
          e._panicFireAcc = 0;
        }
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
  // opts._sourceDmg: the damage of the attack that triggered the shove (for wall-crunch calc).
  knockbackEnemy(e, ang, dist, opts) {
    // Gravitic Pull mutation: flip the angle 180° so the shove pulls toward the player.
    if (this.player.mutations && this.player.mutations.reverse_knockback) ang = ang + Math.PI;
    const travelled = this._sweepShove(e, ang, dist);
    if (travelled <= 0) return; // hard against a wall — no shove, no chain

    // WALL CRUNCH: truncated shove = enemy hit the wall; bonus dmg + stun
    if (this.dungeonMode && !e.isBoss && travelled > 0 && travelled < dist - 4) {
      const sourceDmg = (opts && opts._sourceDmg != null) ? opts._sourceDmg : dist;
      const crunchDmg = Math.max(WALL_CRUNCH_DMG_MIN, Math.round(sourceDmg * WALL_CRUNCH_DMG_FRAC));
      e.stunUntil = Math.max(e.stunUntil || 0, this.time.now + WALL_CRUNCH_STUN_MS);
      this.damageEnemy(e, crunchDmg); // no fromPlayer — avoids double counter-hit/crumple proc
      if (e.active) {
        const wallX = e.x; const wallY = e.y;
        this.fx._flash(wallX, wallY, 12, 0xc8c0b0, 0.8, 200);
        this.fx.dustEmitter.emitParticleAt(wallX, wallY, 8);
        this.fx._ring(wallX, wallY, 28, 0xffffff, 220, 3);
        if (this.tutorial && !this._wallCrunchTutShown) {
          this._wallCrunchTutShown = true;
          this.events.emit('tut', 'wall_crunch');
        }
      }
    }

    // Billiards mutation: a knocked-back enemy collides with nearby foes and shoves them too.
    // The chain is NOT recursive (we don't re-check mutKnockbackChain on the secondary shove).
    if (this.player.mutations && this.player.mutations.knockback_chain) {
      const chainR = 48, chainR2 = chainR * chainR;
      for (const nb of this.enemies.getChildren()) {
        if (!nb.active || nb === e || nb.isBoss) continue;
        const dx = nb.x - e.x, dy = nb.y - e.y;
        if (dx * dx + dy * dy <= chainR2) {
          this._sweepShove(nb, Math.atan2(dy, dx), dist * 0.45); // wall-aware like the primary shove
          this.damageEnemy(nb, Math.round(dist * 0.3));
        }
      }
    }
  }

  // Wall-aware shove: advance in small steps along `ang`, stopping at the last walkable
  // point. Checking only the DESTINATION let a big knockback vault clean OVER a thin wall
  // onto walkable floor beyond it — stepping the PATH makes that impossible. Returns
  // how far the entity actually moved (0 = stuck). (Open world: no grid, full shove.)
  _sweepShove(e, ang, dist) {
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const fs = this.floorSys;
    if (!this.dungeonMode || !fs) { e.x += cos * dist; e.y += sin * dist; return dist; }
    const STEP = 12;
    let travelled = 0;
    for (let d = STEP; d <= dist + 0.01; d += STEP) {
      const step = Math.min(d, dist);
      if (!fs.isWalkable(e.x + cos * step, e.y + sin * step)) break;
      travelled = step;
    }
    if (travelled <= 0) return 0;
    e.x += cos * travelled;
    e.y += sin * travelled;
    return travelled;
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
    p._grazed = false; // reset graze flag so recycled projectiles can trigger graze again
    p.piercing = opts._piercing || false; // scorpio: persists until lifespan
    p._lastPierceHit = 0;
    p._shooterId = opts._shooterId || null; // china streak tracking
    // Beast Tongue omen: shooter's kindClass carried on the projectile for intake modifier lookup
    p.kindClass = opts.kindClass || null;
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
    const warn = this.add.image(x, y, tex).setDepth(3).setScale(scale).setAlpha(0.25).setTint(warnTint);
    this.tweens.add({ targets: warn, alpha: 0.55, duration: delay / 2, yoyo: true, repeat: 1 });
    this.time.delayedCall(delay, () => {
      warn.destroy();
      const pool = this.add.image(x, y, tex).setDepth(3).setScale(scale).setAlpha(0.9);
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
              if (dx * dx + dy * dy <= radius * radius) {
                this.damageEnemy(e, damage);
                // PANIC FIRE: mark enemy as burning when standing in a fire zone
                if (style === 'fire') e._burnTag = this.time.now + BURN_TAG_DURATION;
              }
            }
          } else if (this.player.active) {
            const dx = this.player.x - x;
            const dy = this.player.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
              this.warnHazardOnce();
              // Shared 250ms hazard gate: zone ticks bypass normal iframes, so N OVERLAPPING
              // zones used to deal N× damage in the same instant — late floors blanket the
              // ground in elite/siege zones and stacked ticks one-shot even tank builds
              // (observed: a 621-HP player taking a 700+ burst). Zones still tick fast, but
              // only one zone can bill the player per window.
              if (this.time.now - (this._lastHazardHit || 0) >= 250) {
                this._lastHazardHit = this.time.now;
                this.reactToHit(this.player.takeDamage(damage, this.time.now, { bypassIframes: true, ranged: true }));
              }
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

  // Make status effects OBVIOUS on enemies: recolour a mob by its dominant active status
  // and float "stun stars" over its head. stun (Genghis's cleave etc.) = dazed yellow
  // flicker + gold sparks; fear = purple; slow = cyan. Render-only; restores the elite/clear
  // tint when the status ends. A brief white hit-flash still overrides it for ~50ms.
  applyStatusTint(e, now, delta) {
    if (e.isBoss) return;
    const stunned = e.stunUntil && now < e.stunUntil;
    const feared = !stunned && e.fearUntil && now < e.fearUntil;
    const slowed = e.slowUntil && now < e.slowUntil;
    let tint = null;
    if (stunned) tint = (((now / 90) | 0) % 2) ? 0xffe98a : 0xfff7d0; // dazed flicker
    else if (feared) tint = 0xc070ff; // purple — fleeing
    else if (slowed) tint = 0x66ccff; // cyan — chilled
    if (tint != null) { e.setTint(tint); e._statusTinted = true; }
    else if (e._statusTinted) {
      e._statusTinted = false;
      if (e.isElite) e.setTint(e.eliteTint || 0xffd54a); else e.clearTint();
    }
    if (stunned) { // gold spark "stars" puff above the head
      e._stunAcc = (e._stunAcc || 0) + delta;
      if (e._stunAcc >= 240) {
        e._stunAcc = 0;
        this.fx.impact(e.x + (Math.random() * 16 - 8), e.y - (e.displayHeight || 30) * 0.5, 0xfff2a0);
      }
    }
  }

  // Attack animation for RANGED enemies (catapults / ballistae / gunners / etc): a muzzle
  // flash at the barrel + a recoil scale-jolt of the sprite, so single-frame shooters read
  // as firing instead of standing inert. Render-only (flash fx + a yoyo scale tween that
  // resets to the sprite's base scale); never touches the physics body.
  enemyFireFx(e, ang) {
    if (!e || !e.active) return;
    const off = (e.displayWidth || 40) * 0.42;
    const mx = e.x + Math.cos(ang) * off, my = e.y + Math.sin(ang) * off;
    // muzzle flash (additive) + a small spark burst at the barrel
    const flash = this.add.circle(mx, my, Math.max(6, off * 0.32), 0xfff1b0, 0.95).setDepth(9).setBlendMode('ADD');
    this.tweens.add({ targets: flash, scale: 2.4, alpha: 0, duration: 150, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
    if (this.fx && this.fx.impact) this.fx.impact(mx, my, 0xffd27a);
    // recoil jolt — one at a time (rapid fire just gets the flashes), reset to base scale
    if (e._recoilT) return;
    if (e._baseSX == null) { e._baseSX = e.scaleX; e._baseSY = e.scaleY; }
    e._recoilT = this.tweens.add({
      targets: e, scaleX: e._baseSX * 1.16, scaleY: e._baseSY * 0.86,
      duration: 70, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { if (e.active) e.setScale(e._baseSX, e._baseSY); e._recoilT = null; },
    });
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
      // budget shift: non-swing melee minions at 80% passive contact (matches SpawnSystem)
      e.contactDamage = Math.max(1, Math.round(e.damage * 0.80));
      e._baseContactDamage = e.contactDamage;
    }
  }

  canAct() {
    return !this.gameOver && !this.levelingUp && !this.lootOpen && !this.tipOpen && !this.stageCleared;
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

    // play 'resonance' SFX + banner only the FIRST time each synergy name is unlocked
    if (!this._unlockedResonances) this._unlockedResonances = new Set();
    for (const name of names) {
      if (!this._unlockedResonances.has(name)) {
        this._unlockedResonances.add(name);
        Audio.sfx('resonance');
        this.showBanner(`⟡ Resonance: ${name}`, '#8fe6ff', 'normal');
      }
    }

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
      * 2.21                             // boss HP buff (was 2.6 — eased ~15%)
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
    // Enrage Protocol mandate: inject a 50% HP phase threshold if none exists below 0.6
    if (this.contract && this.contract.bossEnrageAt > 0) {
      const thresh = this.contract.bossEnrageAt;
      if (!boss.phaseThresholds.some((t) => t <= thresh + 0.05)) {
        boss.phaseThresholds = [...boss.phaseThresholds, thresh].sort((a, b) => b - a);
      }
    }
    this.enemies.add(boss);
    this.activeBoss = boss;
    const tag = isLocalFinal ? '⚔  ' : '⚔  General  ';
    this.showBanner(`${tag}${def.name}`, '#ff5252', 'critical');
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
    // Boss Memory: record that the player slew this boss
    if (boss.bossId && !this.duelTest) {
      Legacy.recordBossSlain(boss.bossId);
    }

    // Boss dying line banner (before the fall banner below)
    const bossDlg = boss.bossId && BOSS_DIALOGUE[boss.bossId];
    if (bossDlg && bossDlg.death) {
      const line = pickRandom(bossDlg.death);
      if (line) this.showBanner(`"${line}"`, '#ff8c8c', 'normal');
    }

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
      this.showBanner('⚔  Duel cleared — back to fighter select', '#ffd700', 'critical');
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
    this.showBanner(`${boss.bossName} falls!`, '#9ef58b', 'critical');
    this.drops.spawnChest(boss.x, boss.y);
    this.drops.spawnPowerup(boss.x + 30, boss.y);
    this.drops.spawnCoins(boss.x, boss.y, 25); // boss gold: 25 coins
    if (wasDuel && clean) { this.drops.spawnChest(boss.x - 40, boss.y); this.drops.spawnPowerup(boss.x - 70, boss.y); } // flawless bonus
    this.player.heal(Math.round(this.player.maxHp * (clean ? 0.2 : 0.12)));
    if (this.dungeonMode) {
      this.floorSys.unlockStairs(); // the boss gate opens — descend to continue
      this.showBanner('↓  The stairs open', '#ffd700', 'normal');
    } else {
      this.bossPhase += 1; // open-world: the next boss arrives on the time schedule
    }
    Audio.setIntensity(0);
  }

  // Save a weapon/secondary's invested points as an ARRAY indexed by axis POSITION. Points
  // are keyed internally by axis id, but axis ids get renamed across builds (e.g. balance
  // tweaks), which orphaned the saved points by id and wiped skill levels on every deploy.
  // Position is stable, so a renamed axis keeps its slot. (Legacy weapons with no axes fall
  // back to the raw points object.)
  packPointsByPosition(ws) {
    const axes = ws.def && ws.def().axes;
    if (!axes) return { ...ws.points };
    return axes.map((a) => ws.points[a.id] || 0);
  }

  // Restore points saved by packPointsByPosition. Accepts the new position ARRAY or, for
  // pre-existing saves, the legacy { axisId: n } OBJECT (matched by id where ids still line up).
  applyPointsByPosition(ws, saved) {
    if (!saved) return;
    const axes = ws.def && ws.def().axes;
    if (!axes) { Object.assign(ws.points, saved); return; }
    axes.forEach((a, i) => {
      ws.points[a.id] = Array.isArray(saved) ? (saved[i] || 0) : (saved[a.id] || 0);
    });
  }

  // ── Floor-mod helpers ────────────────────────────────────────────────────────

  // VAULT: spawn 3 elites and a cluster of 2 chests near the middle of the floor.
  _applyVaultMod() {
    const fs = this.floorSys;
    if (!fs) return;
    const start = fs.startWorld();
    // Find an anchor point in the middle-ish area of the cavern (not right at start).
    let anchor = null;
    for (let i = 0; i < 24; i++) {
      const cand = fs.randomWalkableNear(start.x, start.y, 600);
      const dx = cand.x - start.x, dy = cand.y - start.y;
      if (dx * dx + dy * dy > 200 * 200) { anchor = cand; break; }
    }
    if (!anchor) anchor = start;

    // 2 guaranteed chests clustered at the anchor
    this.drops.spawnChest(anchor.x - 24, anchor.y);
    this.drops.spawnChest(anchor.x + 24, anchor.y);

    // 3 forced elites near the anchor (override spawn point temporarily)
    const origFn = this.spawner.spawnPointOnFloor.bind(this.spawner);
    let useAnchor = true;
    this.spawner.spawnPointOnFloor = () => {
      if (!useAnchor) return origFn();
      const a = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 120;
      return { x: anchor.x + Math.cos(a) * r, y: anchor.y + Math.sin(a) * r };
    };
    for (let i = 0; i < 3; i++) this.spawner.spawnOne(true);
    useAnchor = false;
    this.spawner.spawnPointOnFloor = origFn;
  }

  // SHRINE: scatter 2 extra shrine objects and 1 extra treasure encounter.
  _applyShrineModExtras() {
    const fs = this.floorSys;
    if (!fs) return;
    const start = fs.startWorld();
    const civ = (this.theme && this.theme.id) || 'default';
    const shrineKey = this.textures.exists(`shrine_${civ}`) ? `shrine_${civ}` : 'shrine';
    // Place 2 extra shrines at walkable locations
    for (let i = 0; i < 2; i++) {
      const pt = fs.randomWalkableNear(start.x, start.y, 700);
      const sh = this.shrines.create(pt.x, pt.y, shrineKey);
      if (sh) {
        sh.setDepth(4);
        sh.used = false;
        // shrines group is STATIC — StaticBody has no setImmovable (it threw and aborted
        // enterFloor on SHRINE-door floors); static bodies are immovable by definition
        if (sh.body && sh.body.setImmovable) sh.body.setImmovable(true);
      }
    }
    // +1 bonus treasure encounter: inject directly into the floor data so the proximity
    // trigger in update() picks it up just like a procedurally generated encounter.
    const d = fs.data;
    if (d && d.encounters) {
      const pt = fs.randomWalkableNear(start.x, start.y, 600);
      const tc = fs.worldToTile(pt.x, pt.y);
      d.encounters.push({ col: tc.col, row: tc.row, kind: 'treasure', triggered: false });
    }
  }

  // CURSED: apply the floor-long player debuff and show the curse banner.
  _applyCursedMod(mod) {
    if (!mod.curseId) return;
    // Apply the debuff to the player
    switch (mod.curseId) {
      case 'fast_enemies':
        // Tracked on activeFloorMod; SpawnSystem reads it in spawnOne via scene.activeFloorMod.
        break; // Applied in SpawnSystem.spawnOne via the scene flag — no direct player change needed.
      case 'small_pickup':
        this._cursedPickupMult = 0.80;
        break;
      case 'tight_fog':
        this._cursedFogRadius = -30; // px reduction in fog reveal radius
        break;
      case 'cursed_prices':
        this._cursedPriceMult = 1.30; // merchant prices +30%
        break;
      default: break;
    }
    // Curse notice (red, prominent)
    this.time.delayedCall(600, () => {
      if (!this.gameOver) this.showBanner(`✦ Curse: ${mod.curseLabel} — ${mod.curseDesc}`, '#b05aff', 'normal');
    });
  }

  // ── War-camp merchant ────────────────────────────────────────────────────────
  // Spawn a static robed-trader NPC near the start room on merchant floors.
  _spawnMerchant() {
    if (!this.floorSys) return;
    const start = this.floorSys.startWorld();
    // Place the merchant ~80-120px from the start, offset to a random direction
    const ang = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(80, 140);
    let mx = start.x + Math.cos(ang) * dist;
    let my = start.y + Math.sin(ang) * dist;
    // Snap to walkable
    const snapped = this.drops._snap(mx, my);
    mx = snapped.x; my = snapped.y;

    // The NPC is a static image (no physics body needed — we do a manual distance check).
    const tex = this.textures.exists('merchant_npc') ? 'merchant_npc' : 'char_lubu';
    this._merchantNpc = this.add.image(mx, my, tex).setDepth(6).setScale(0.9);
    // Tent backdrop: a slightly larger tinted rect drawn behind the NPC.
    this._merchantTent = this.add.rectangle(mx, my + 4, 48, 52, 0x3a2a1a, 0.6).setDepth(5);

    // Gentle bob animation so the NPC feels alive.
    this.tweens.add({
      targets: this._merchantNpc,
      y: my - 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this._merchantPos = { x: mx, y: my };
    this._merchantOpen = false;

    // First-time tutorial toast
    if (this.tutorial) this.events.emit('tut', 'merchant');
  }

  // Update the merchant [E] prompt and handle interaction (called from update).
  _updateMerchant() {
    if (!this._merchantNpc || !this._merchantNpc.active) return;
    const { x, y } = this._merchantPos;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
    const inRange = dist < 60;

    if (inRange && !this._merchantPrompt) {
      const kLabel = Settings.binds.interact || 'E';
      this._merchantPrompt = this.add.text(x, y - 38, `[${kLabel}] Trade`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(52);
    } else if (!inRange && this._merchantPrompt) {
      this._merchantPrompt.destroy();
      this._merchantPrompt = null;
    }

    // Keep prompt following merchant (it bobs)
    if (this._merchantPrompt && this._merchantNpc) {
      this._merchantPrompt.setPosition(this._merchantNpc.x, this._merchantNpc.y - 38);
    }

    // Interact key: open the merchant shop modal
    if (inRange && !this._merchantOpen && this.canAct()) {
      const bk = this.bindKeys;
      if (bk && Phaser.Input.Keyboard.JustDown(bk.interact)) {
        this._openMerchant();
      }
    }
  }

  _openMerchant() {
    if (this._merchantOpen || this.lootOpen || this.levelingUp) return;
    this._merchantOpen = true;
    this.scene.pause();
    this.scene.launch('MerchantScene', { gameScene: this });
    this.scene.get('MerchantScene').events.once('shutdown', () => {
      this._merchantOpen = false;
      this.scene.resume('GameScene');
    });
  }

  _despawnMerchant() {
    if (this._merchantNpc) {
      this.tweens.killTweensOf(this._merchantNpc);
      this._merchantNpc.destroy();
      this._merchantNpc = null;
    }
    if (this._merchantTent) { this._merchantTent.destroy(); this._merchantTent = null; }
    if (this._merchantPrompt) { this._merchantPrompt.destroy(); this._merchantPrompt = null; }
    this._merchantPos = null;
    this._merchantOpen = false;
  }

  // ── Risk/reward events ────────────────────────────────────────────────────────
  // Three rare interactables that spawn ~1 per 2–3 floors (never on boss floors).
  // Each uses the same [E]-interact pattern as the merchant.
  // State: this._riskEvent = { kind, npc, tent, prompt, pos, used, pulseAcc }

  _spawnRiskEvent() {
    if (!this.floorSys) return;
    const start = this.floorSys.startWorld();
    // Pick a random event kind
    const kinds = ['blood_shrine', 'cursed_chest', 'war_gambler'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];

    // Place the event ~150–260px from the start in a random direction
    const ang = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(150, 260);
    let ex = start.x + Math.cos(ang) * dist;
    let ey = start.y + Math.sin(ang) * dist;
    const snapped = this.drops._snap(ex, ey);
    ex = snapped.x; ey = snapped.y;

    // Choose texture + accent color
    const TEXTURES = {
      blood_shrine: this.textures.exists('shrine') ? 'shrine' : 'pickup_heart',
      cursed_chest:  this.textures.exists('chest')  ? 'chest'  : 'chest',
      war_gambler:   this.textures.exists('merchant_npc') ? 'merchant_npc' : 'char_lubu',
    };
    const TINTS = {
      blood_shrine: 0xff4444,
      cursed_chest:  0xb05aff,
      war_gambler:   0xe8c840,
    };

    const npc = this.add.image(ex, ey, TEXTURES[kind])
      .setDepth(6).setScale(0.9).setTint(TINTS[kind]);

    // Backdrop rect for visual presence
    const tent = this.add.rectangle(ex, ey + 4, 48, 52, 0x120a22, 0.65).setDepth(5);

    // Pulsing ring: a persistent arc drawn at the NPC position
    const ring = this.add.arc(ex, ey, 28, 0, 360, false, TINTS[kind], 0)
      .setDepth(5).setStrokeStyle(2, TINTS[kind], 0.7);

    // Bob animation
    this.tweens.add({
      targets: npc,
      y: ey - 4,
      duration: 1000 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this._riskEvent = {
      kind,
      npc,
      tent,
      ring,
      pos: { x: ex, y: ey },
      prompt: null,
      used: false,
      pulseAcc: 0,
    };

    // Banner hint on floor entry (delayed slightly so the floor banner shows first)
    const HINTS = {
      blood_shrine: 'A blood altar hums somewhere on this floor.',
      cursed_chest:  'An ominous chest radiates dark power here.',
      war_gambler:   'A dice-bearing figure lurks on this floor.',
    };
    this.time.delayedCall(1400, () => {
      if (!this.gameOver) this.showBanner(HINTS[kind], '#9a6abf', 'low');
    });

    // Tutorial toast on first event encounter
    if (this.tutorial) this.events.emit('tut', 'risk_event');
  }

  _updateRiskEvents(time) {
    const ev = this._riskEvent;
    if (!ev || ev.used) return;
    const { pos, kind, npc, ring } = ev;

    // Pulse the ring radius and alpha over time
    ev.pulseAcc = (ev.pulseAcc || 0) + (1 / 60);
    const pulseFrac = (Math.sin(ev.pulseAcc * 2.5) + 1) * 0.5; // 0→1
    if (ring) {
      ring.setAlpha(0.35 + pulseFrac * 0.55);
      ring.setRadius(24 + pulseFrac * 8);
    }

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pos.x, pos.y);
    const inRange = dist < 65;

    const LABELS = {
      blood_shrine: 'Sacrifice',
      cursed_chest:  'Open',
      war_gambler:   'Gamble',
    };

    if (inRange && !ev.prompt) {
      const kLabel = Settings.binds.interact || 'E';
      ev.prompt = this.add.text(pos.x, pos.y - 42, `[${kLabel}] ${LABELS[kind]}`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#e0b0ff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(52);
    } else if (!inRange && ev.prompt) {
      ev.prompt.destroy();
      ev.prompt = null;
    }

    if (ev.prompt && npc) {
      ev.prompt.setPosition(npc.x, npc.y - 42);
    }

    if (inRange && !ev.used && this.canAct()) {
      const bk = this.bindKeys;
      if (bk && Phaser.Input.Keyboard.JustDown(bk.interact)) {
        this._triggerRiskEvent(ev);
      }
    }
  }

  _triggerRiskEvent(ev) {
    if (!ev || ev.used) return;
    ev.used = true;
    // Destroy prompt
    if (ev.prompt) { ev.prompt.destroy(); ev.prompt = null; }

    const p = this.player;

    switch (ev.kind) {
      case 'blood_shrine': {
        // Refuse if HP below 30%
        if (p.hp / p.maxHp < 0.30) {
          this.showBanner('The altar rejects you — too wounded to offer.', '#ff6060', 'normal');
          ev.used = false; // let player try again when healed
          break;
        }
        // Check if already used this run
        if (this.run._bloodShrineUsed) {
          this.showBanner('This power has already been given.', '#9a6abf', 'normal');
          break;
        }
        const sacrifice = Math.floor(p.hp * 0.25);
        p.hp = Math.max(1, p.hp - sacrifice);
        // Permanent +6% damage this run
        this.run._bloodShrineUsed = true;
        p.levelMods.damageMult = (p.levelMods.damageMult || 0) + 0.06;
        p.recompute();
        this.fx.shockwave(ev.pos.x, ev.pos.y, 0xff4444, 80);
        this.fx._flash(p.x, p.y, 24, 0xff4444, 0.75, 400);
        Audio.sfx('execution');
        this.showBanner('Blood Offering — +6% Damage (permanent this run)', '#ff4444', 'normal');
        break;
      }

      case 'cursed_chest': {
        // Roll a relic-tier item (luck +15 bonus) AND apply a 2-floor debuff
        const depth = this.conquestDepth;
        const powerMult = 1 + depth * 0.012;
        const luck = depth * 0.3 + (p.luck || 0) + 15;
        const item = rollItem(luck, null, powerMult);

        // Apply the 2-floor curse (reuse the CURSED_MODS table)
        const CURSED_MODS = [
          { id: 'fast_enemies',  label: 'Bloodlust',   desc: 'Enemies move 15% faster.' },
          { id: 'small_pickup',  label: 'Shrouded',    desc: 'Pickup radius −20%.' },
          { id: 'tight_fog',     label: 'Blind March', desc: 'Fog of war tighter (−30 px).' },
          { id: 'cursed_prices', label: 'Blood Price', desc: 'Merchant prices +30%.' },
        ];
        const curse = CURSED_MODS[Math.floor(Math.random() * CURSED_MODS.length)];
        this._cursedBargainFloorsLeft = 2;
        // Store which bargain debuffs are active so the 2-floor re-apply loop can persist them.
        this._cursedBargainPickupMult = null;
        this._cursedBargainFogRadius  = null;
        this._cursedBargainPriceMult  = null;
        // Apply the curse effect immediately (like _applyCursedMod)
        switch (curse.id) {
          case 'small_pickup': this._cursedPickupMult = 0.80; this._cursedBargainPickupMult = 0.80; break;
          case 'tight_fog': this._cursedFogRadius = -30; this._cursedBargainFogRadius = -30; break;
          case 'cursed_prices': this._cursedPriceMult = 1.30; this._cursedBargainPriceMult = 1.30; break;
          default: break;
        }

        Audio.sfx('equip');
        this.fx.shockwave(ev.pos.x, ev.pos.y, 0xb05aff, 70);

        // Show loot modal (pauses scene + launches LootScene)
        this.lootOpen = true;
        this.scene.pause();
        this.scene.launch('LootScene', { gameScene: this, item });
        this.scene.get('LootScene').events.once('shutdown', () => {
          this.lootOpen = false;
          this.scene.resume('GameScene');
        });

        this.showBanner(`Cursed Chest — ${curse.label}: ${curse.desc}`, '#b05aff', 'normal');
        break;
      }

      case 'war_gambler': {
        // Check if already used this floor
        if (ev._gamblerUsedThisFloor) {
          this.showBanner('The gambler smiles — once per floor.', '#e8c840', 'normal');
          ev.used = false;
          break;
        }
        const gold = this.run.gold || 0;
        if (gold <= 0) {
          this.showBanner('The gambler raises an eyebrow — no gold to stake.', '#e8c840', 'normal');
          ev.used = false;
          break;
        }
        const stake = Math.floor(gold * 0.40);
        if (stake <= 0) {
          this.showBanner('Your purse is too thin to tempt fate.', '#e8c840', 'normal');
          ev.used = false;
          break;
        }
        ev._gamblerUsedThisFloor = true;
        const won = Math.random() < 0.50;
        if (won) {
          this.run.gold = gold + stake; // double the stake back
          Audio.sfx('levelup');
          this.fx.shockwave(ev.pos.x, ev.pos.y, 0xffd700, 80);
          this.showBanner(`Fortune favours you — +${stake} gold! (${this.run.gold} total)`, '#ffd700', 'normal');
        } else {
          this.run.gold = gold - stake;
          Audio.sfx('hit');
          this.fx.shockwave(ev.pos.x, ev.pos.y, 0xff5252, 60);
          this.showBanner(`Fate is cruel — lost ${stake} gold. (${this.run.gold} total)`, '#ff5252', 'normal');
        }
        this.captureRunState();
        break;
      }

      default:
        break;
    }
  }

  _despawnRiskEvents() {
    const ev = this._riskEvent;
    if (!ev) return;
    if (ev.npc) { this.tweens.killTweensOf(ev.npc); ev.npc.destroy(); ev.npc = null; }
    if (ev.tent) { ev.tent.destroy(); ev.tent = null; }
    if (ev.ring) { ev.ring.destroy(); ev.ring = null; }
    if (ev.prompt) { ev.prompt.destroy(); ev.prompt = null; }
    this._riskEvent = null;
  }

  // ── War Omens ─────────────────────────────────────────────────────────────────
  // Show the omen picker at the very start of a fresh run (stage 1, floor 1 only).
  _showOmenScene() {
    const omens = rollOmens(3);
    this.scene.pause();
    this.scene.launch('OmenScene', { gameScene: this, omens });
    this.scene.get('OmenScene').events.once('shutdown', () => {
      this.scene.resume('GameScene');
    });
  }

  // CURSED stairs reward: powerup + big gold drop near the stairs.
  _cursedStairsReward() {
    const st = this.floorSys && this.floorSys.stairs;
    const x = st ? st.x : this.player.x;
    const y = st ? st.y : this.player.y;
    this.drops.spawnPowerup(x + 30, y);
    // 8 big-value gems as the "big gold" reward
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.drops.spawnGem(x + Math.cos(a) * 40, y + Math.sin(a) * 40, 4);
    }
    this.showBanner('Curse lifted — the stairs yield their bounty', '#b05aff', 'normal');
  }

  // Write current live progression back into the run object.
  captureRunState() {
    const r = this.run;
    r.level = this.player.level;
    r.xp = this.player.xp;
    r.weaponPoints = this.packPointsByPosition(this.weapons);
    r.secondaryPoints = this.packPointsByPosition(this.secondary);
    r.abilityPoints = { ...this.ability.points };
    r.levelMods = { ...this.player.levelMods };
    r.mutations = { ...(this.player.mutations || {}) }; // mutation flags survive stage transitions
    r.ownedMutations = [...(this.run.ownedMutations || [])]; // owned set (no re-offer)
    r.swarmElapsed = this.spawner.elapsed; // carry swarm difficulty into the next stage
    r.equipment = {};
    for (const [slot, item] of Object.entries(this.player.equipment)) if (item) r.equipment[slot] = item;
    r.kills = this.player.kills;
    r.stageTime = this.runTime; // legacy; floor is the resume point in dungeon mode
    r.floor = this.floor; // resume on the same floor (same floorSeed → same layout)
    r.spawnedThisFloor = this.spawner.spawnedThisFloor; // a cleared floor stays cleared on resume
    r.bossPhase = this.bossPhase;
    // Persist evolution booleans — earned across the whole run, survive stage transitions.
    r.weaponEvolved = this.weapons.evolved;
    r.secondaryEvolved = this.secondary.evolved;
    // Accumulate total run time across stages for the WinScene recap display
    r.runTimeTotal = (r._stageTimeBase || 0) + this.runTime;
    // Persist the floor mod so save/continue restores it correctly.
    // nextFloorMod is already set on r by DoorScene._pick() before captureRunState.
    // activeFloorMod: if we're mid-floor, persist it too so a resume re-applies it.
    if (this.activeFloorMod) r.activeFloorMod = { ...this.activeFloorMod };
    // Gold economy
    r.gold = this.run.gold || 0;
    r.merchantRerolls = this.run.merchantRerolls || 0;
    r.banishesUsed = this.run.banishesUsed || 0;
    // Mandate of Heaven — persist heat fields across stage transitions
    if (this.run.mandateHeat) r.mandateHeat = this.run.mandateHeat;
    if (this.run.mandateLootLuck) r.mandateLootLuck = this.run.mandateLootLuck;
    if (this.run.mandateGoldMult) r.mandateGoldMult = this.run.mandateGoldMult;
    // War Omen (chosen once at run start; persisted for all stages)
    if (this.run.omen) r.omen = this.run.omen;
    // Omen-derived run flags (persisted so they survive stage transitions)
    const omenFlags = [
      '_omenMerchantDiscount', '_omenChestGoldPenalty', '_omenDashBonus', '_omenMaxHpMult',
      '_omenGoldMult', '_omenEliteHpMult', '_omenOldWounds', '_omenBeastReduction',
      '_omenHumanoidBoost', '_omenFloorGoldTax', '_omenIronSpine', '_omenBloodDebtKillInterval',
      '_omenBloodDebtHeal', '_omenBloodDebtKillCount', '_omenXpPenalty', '_omenUltCdMult',
      '_omenMutationId', '_bloodShrineUsed', '_omenShatteredSkyApplied',
    ];
    for (const f of omenFlags) {
      if (this.run[f] !== undefined) r[f] = this.run[f];
    }
    this.registry.set('run', r);
  }

  // Called by UpgradeScene when a mutation is picked. Purple shockwave + banner.
  // Safe to call while UpgradeScene is active (FX-only, no game-logic side effects).
  onMutationPicked(mutId) {
    this.fx.shockwave(this.player.x, this.player.y, 0xb05aff, 80);
    const names = {
      ricochet_shots: 'Ricochet', echo_ultimate: 'Echo', reverse_knockback: 'Gravitic Pull',
      gem_detonator: 'Gem Detonator', fire_on_hit: 'Searing Wounds', secondary_autocast: 'Tactical Reflex',
      homing_shots: 'Seeking', kill_nova: 'Deathburst', speed_on_kill: 'Bloodrush',
      proj_split_on_expire: 'Fragmentation', lifesteal_on_ult: 'Bloodthrone', knockback_chain: 'Billiards',
    };
    this.showBanner(`✦ Mutation: ${names[mutId] || mutId}`, '#cc88ff', 'normal');
  }

  // Called by UpgradeScene when a skill evolves. Fires the golden burst FX on the
  // player and shows an evolution banner — safe to call while UpgradeScene is active
  // because this only emits particles + tweens (no game logic).
  onSkillEvolved(sys) {
    const evo = sys.def().evolution;
    if (!evo) return;
    this.fx.goldenBurst(this.player.x, this.player.y, 20);
    this.showBanner(`✦ ${evo.name}`, '#ffd700', 'normal');
  }

  conquerStage() {
    if (this.stageCleared) return;
    this.stageCleared = true;
    this.physics.pause();
    const civName = this.isFinal ? 'the World' : CIV_NAME[this.run.currentCiv];
    this.showBanner(`${civName} Conquered!`, '#9ef58b', 'critical');
    this.captureRunState();
    if (!this.isFinal) this.run.conquered.push(this.run.currentCiv);
    // carry forward the total time so the next stage adds on top of it
    this.run._stageTimeBase = this.run.runTimeTotal || 0;
    // clear stage-resume state so Continue routes to the next conquest, not a replay
    this.run.currentCiv = null;
    this.run.stageTime = 0;
    this.run.bossPhase = 0;

    // Mandate of Heaven: on a FINAL stage win, mark first win and record hero best heat.
    if (this.isFinal) {
      const heat = this.run.mandateHeat || 0;
      Legacy.markWonRun();
      Legacy.recordHeroHeat(this.run.characterId, heat);
      // Apply heat-scaled legacy coins for a win
      const heatCoinMult = 1 + heat * 0.15;
      Legacy.awardCoins(
        this.player.kills,
        Math.max(0, (this.floor || 1) - 1),
        this.run.conquered ? this.run.conquered.length : 0,
        heatCoinMult,
      );
      // Dynasty Chronicle: record a world conquest
      Legacy.appendChronicleEntry({
        heroId: this.run.characterId,
        outcome: 'conquered',
        stage: 'final',
        floor: this.floor || 1,
        killedBy: null,
        kills: this.player.kills || 0,
        heat: heat,
        omen: this.run.omen || null,
        civsConquered: (this.run.conquered || []).length,
      });
    }

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

  // Short floating speech text above the player — used for ult-cast lines.
  // Throttled: will not show if called less than 3s after the last speech.
  showSpeechText(text) {
    const now = this.time.now;
    if (now < this._ultSpeechUntil) return;
    this._ultSpeechUntil = now + 3000;
    const t = this.add.text(this.player.x, this.player.y - 46, text, {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(52).setScrollFactor(1);
    this.tweens.add({
      targets: t,
      y: t.y - 28,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  // Item B: 2.5s cinematic title card overlay on stage entry. Letterbox bars, big
  // civ name, tagline, year. Fades in + out; does NOT pause gameplay.
  // While it's on screen normal/low banners are suppressed (see BannerQueue).
  _showStageIntroCard(intro) {
    const W = this.scale.width;
    const H = this.scale.height;
    const DEPTH = 80;
    const FADE = 420;
    const HOLD = 1660;

    // Tell the banner queue to hold normal/low items until the card fades.
    if (this.bannerQueue) this.bannerQueue.setIntroActive(true);

    const barH = Math.round(H * 0.18);
    const topBar = this.add.rectangle(0, 0, W, barH, 0x000000, 1)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
    const botBar = this.add.rectangle(0, H - barH, W, barH, 0x000000, 1)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setAlpha(0);

    const titleTxt = this.add.text(W / 2, H / 2 - 22, intro.title, {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    const tagTxt = this.add.text(W / 2, H / 2 + 18, intro.tagline, {
      fontFamily: 'monospace', fontSize: '13px', color: '#d8d3ee',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    const yearTxt = this.add.text(W / 2, H / 2 + 42, intro.year, {
      fontFamily: 'monospace', fontSize: '11px', color: '#8a8a9a',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    const objs = [topBar, botBar, titleTxt, tagTxt, yearTxt];
    // Fade in
    for (const o of objs) this.tweens.add({ targets: o, alpha: (o === topBar || o === botBar) ? 0.92 : 1, duration: FADE });
    // Fade out after hold; then release the banner queue
    this.time.delayedCall(FADE + HOLD, () => {
      for (const o of objs) {
        this.tweens.add({ targets: o, alpha: 0, duration: FADE, onComplete: () => { if (o && o.active) o.destroy(); } });
      }
      this.time.delayedCall(FADE, () => {
        if (this.bannerQueue) this.bannerQueue.setIntroActive(false);
      });
    });
  }

  // showBanner — routes through BannerQueue so only ONE banner is visible at a
  // time in the centre-top lane.  All callers should pass a priority:
  //   'critical' — boss challenge/duel/death text (bypasses queue, clears it)
  //   'normal'   — floor, dialogue, flawless, resonance, mutation, boss defeat
  //   'low'      — tutorial toasts, hazard warning, treasure/trap/ambush notices
  // (default = 'normal' for backwards-compat with any caller that omits it)
  showBanner(text, color, priority = 'normal') {
    if (this.bannerQueue) {
      this.bannerQueue.push(text, color, priority);
    }
  }

  // ITEM D: create (or recreate) the per-civ ambient particle layer for this floor.
  // ONE slow-drifting emitter using the 'spark' texture, tinted per civ.
  // Depth -5 (above dungeon floor at -10 but below entities at 5).
  // Skipped entirely during duel sequences.
  _startAmbienceEmitter() {
    this._stopAmbienceEmitter(); // destroy any previous
    if (!this.dungeonMode || this.dueling) return;
    const civId = this.isFinal ? 'final' : this.stageCiv;
    const cfg = CIV_AMBIENCE[civId] || CIV_AMBIENCE.china;
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    // Particles drift diagonally down-left at low speed; emitZone covers the screen.
    // We follow the camera by emitting in world-space relative to the camera scroll.
    this._ambienceEmitter = this.add.particles(0, 0, 'spark', {
      tint: cfg.tint,
      alpha: { start: 0.35, end: 0 },
      scale: { start: 0.7, end: 0.3 },
      lifespan: { min: 2400, max: 4000 },
      speedX: { min: -22, max: -8 },
      speedY: { min: 14, max: 28 },
      quantity: 1,
      frequency: 380,
      maxParticles: 0, // unlimited (throttled by quantity+frequency)
      gravityY: 0,
      blendMode: 'NORMAL',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2),
      },
    }).setDepth(-5).setScrollFactor(0);
  }

  _stopAmbienceEmitter() {
    if (this._ambienceEmitter) {
      this._ambienceEmitter.stop();
      this._ambienceEmitter.destroy();
      this._ambienceEmitter = null;
    }
  }

  // ── Elite overhead nameplate: slim title + HP bar drawn world-space above the sprite.
  // Called from updateEnemies each frame (mirrors sprite visibility for fog of war).
  // The plate is created lazily in spawnOne (after elite setup) and destroyed on deactivate.
  _updateElitePlate(e) {
    if (!e.isElite || !e._plate) return;
    const plate = e._plate;
    const spriteH = (e.displayHeight || 36) * 0.5 + 4;
    plate.setPosition(e.x, e.y - spriteH - 14);
    plate.setVisible(e.visible);
    // update bar fill width proportional to hp
    const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
    const barW = Math.round(34 * ratio);
    if (plate._lastRatio !== ratio) {
      plate._lastRatio = ratio;
      plate._bar.clear();
      // dark background
      plate._bar.fillStyle(0x1a1a1a, 0.85);
      plate._bar.fillRect(-17, 2, 34, 4);
      // red HP fill
      if (barW > 0) {
        plate._bar.fillStyle(0xdd2222, 1);
        plate._bar.fillRect(-17, 2, barW, 4);
      }
    }

    // ELITE EXECUTION: show skull marker when elite drops below threshold
    const shouldMark = !e.isBoss && e.hp > 0 && e.hp / e.maxHp <= EXECUTION_HP_THRESH;
    if (shouldMark && !e._executionMarked) {
      e._executionMarked = true;
      const skull = this.add.text(0, -20, '☠', {
        fontFamily: 'monospace', fontSize: '11px', color: '#ff4444',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1);
      skull.setName('skull');
      plate.add(skull);
      this.tweens.add({ targets: skull, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      if (this.tutorial && !this._executionTutShown) {
        this._executionTutShown = true;
        this.events.emit('tut', 'execution');
      }
    } else if (!shouldMark && e._executionMarked) {
      e._executionMarked = false;
      const skullObj = plate.getByName('skull');
      if (skullObj) skullObj.destroy();
    }
  }

  // Tear down and null a stale elite plate (called on deactivate + reuse).
  _destroyElitePlate(e) {
    if (e._plate) {
      e._plate.destroy();
      e._plate = null;
    }
  }

  // Create the overhead nameplate container for an elite (called from spawnOne after elite setup).
  _createElitePlate(e) {
    this._destroyElitePlate(e); // guard: clear any stale plate from a previous life
    const container = this.add.container(e.x, e.y).setDepth(12);
    // title text — tiny gold monospace
    const label = this.add.text(0, -8, e.eliteTitle || e.eliteName || '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffd54a',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    // HP bar graphics object
    const bar = this.add.graphics();
    bar.fillStyle(0x1a1a1a, 0.85);
    bar.fillRect(-17, 2, 34, 4);
    bar.fillStyle(0xdd2222, 1);
    bar.fillRect(-17, 2, 34, 4);
    container.add([label, bar]);
    container._bar = bar;
    container._lastRatio = 1;
    e._plate = container;
  }

  // Elite-spawn notice — goes to the compact side lane (right edge) so it never
  // pollutes the main centre-top lane.  Throttled: at most 1 side notice per 4s.
  showEliteBanner(title) {
    if (!title) return;
    const now = this.time.now;
    if ((this._lastEliteBannerAt || 0) + 4000 > now) return;
    this._lastEliteBannerAt = now;
    if (this.bannerQueue) this.bannerQueue.pushSide(title, '#ffd54a');
  }

  // First time the player stands in a damaging zone (map hazard or boss flame
  // pool), explain it once so the orange/spiked patches aren't a mystery.
  warnHazardOnce() {
    if (this._hazardWarned) return;
    this._hazardWarned = true;
    this.showBanner('⚠  Damage zone — step out!', '#ff7b3a', 'low');
  }

  // --- damage / death ---
  damageEnemy(enemy, amount, opts = {}) {
    if (!enemy.active) return;
    if (enemy.rageInvuln) { this.fx.impact(enemy.x, enemy.y); return; } // boss RAGE musou: untouchable
    let dmg = amount;
    let counterHit = false;
    // ── COUNTER-HIT: player attack lands during the enemy's telegraph window ────
    // ×1.5 damage, cancel the windup + 300ms stun, gold flash + ring.
    // Only fires on player-sourced hits (opts.fromPlayer = true), not on DoT, hazards,
    // ally damage, or bleed ticks. Not applied to bosses' phase-transition states
    // (they have their own duel parry; isTelegraphing already excludes isBoss).
    if (opts.fromPlayer && isTelegraphing(enemy) && this._counterArmed) {
      counterHit = true;
      dmg *= 1.5;
      // Cancel the windup and apply a brief stun so the attack is genuinely interrupted
      if (enemy.swingState === 'wind') {
        releaseAttackToken(this, enemy);
        enemy.swingState = null;
        enemy.swingCd = enemy.swingCooldown; // normal cooldown before it can swing again
      }
      if (enemy.winding) {
        releaseAttackToken(this, enemy);
        enemy.winding = false;
        enemy.fireTimer = enemy.fireCooldown;
      }
      if (enemy.dashWindTimer > 0) {
        releaseAttackToken(this, enemy);
        enemy.dashWindTimer = 0;
        enemy.dashTimer = enemy.dashCooldown;
      }
      if (enemy.lungeWindTimer > 0) {
        releaseAttackToken(this, enemy);
        enemy.lungeWindTimer = 0;
        enemy.lungeTimer = enemy.lungeCooldown;
      }
      if (enemy.flyPhase === 'windup') {
        releaseAttackToken(this, enemy);
        enemy.flyPhase = 'approach';
        enemy.flyWindRemain = 0;
      }
      enemy.stunUntil = this.time.now + 300; // brief freeze so the player sees the interrupt
    }
    // crawler attack-softening: weaken all player damage to non-boss enemies (bosses
    // keep their own playerPower-tracked tuning, so duels stay balanced).
    if (this.playerDmgScale !== 1 && !enemy.isBoss) dmg *= this.playerDmgScale;
    // duel guard: a blocking boss soaks most of any attack until you break it
    if (enemy.blocking) dmg *= 0.2;
    // Ironclad elite: an armored shell (top 60% HP) resists, then turns brittle
    if (enemy.ironclad) dmg *= enemy.hp > enemy.maxHp * 0.6 ? 0.35 : 1.3;
    if (enemy.armor && !opts.armorPierce) dmg *= 1 - enemy.armor; // armored types; Armor-Piercing ignores it
    // Bulwark aura: nearby allies (marked each frame) take 40% less damage
    if (enemy._bulwarkShield) dmg *= 0.6;
    // ── Signature-unit damage modifiers ───────────────────────────────────────
    // Testudo / Skjaldborg: frontal arc blocks 95% of damage (1 flat min guaranteed)
    if (enemy.testudo && !opts.armorPierce) {
      const faceAng = enemy.swingAng || enemy._moveAng || 0;
      const hitAng  = Math.atan2(
        (opts._hitY != null ? opts._hitY : this.player.y) - enemy.y,
        (opts._hitX != null ? opts._hitX : this.player.x) - enemy.x
      );
      const diff = Math.abs(Phaser.Math.Angle.Wrap(hitAng - faceAng));
      if (diff < (enemy.testudoArc || 1.4) / 2) {
        dmg = Math.max(1, Math.round(dmg * 0.05)); // 95% DR — nearly immune from front
      }
    }
    // TWEAK 3: Stone Golem two-phase armor (ironcladArmor flag on base type)
    // Hard phase (above threshold): 70% DR + silver ring pulse; brittle below
    if (enemy.ironcladArmor && !opts.armorPierce) {
      const thresh = enemy.ironcladThreshold || 0.60;
      const hard   = enemy.ironcladHardArmor  || 0.70;
      const soft   = enemy.ironcladSoftArmor  || 0.15;
      dmg *= (enemy.hp > enemy.maxHp * thresh) ? (1 - hard) : (1 - soft);
      // Silver ring pulse in the hard phase (reuses existing ring tween pattern)
      if (enemy.hp > enemy.maxHp * thresh) {
        enemy._ironcladRingAcc = (enemy._ironcladRingAcc || 0) + 1;
        if (enemy._ironcladRingAcc >= 60) {
          enemy._ironcladRingAcc = 0;
          const ir = this.add.circle(enemy.x, enemy.y, (enemy.displayWidth || 56) * 0.65, 0x9aa6c0, 0)
            .setDepth(3).setStrokeStyle(3, 0x9aa6c0, 0.9);
          this.tweens.add({ targets: ir, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => ir.destroy() });
        }
      }
    }
    // TWEAK 6: Spreader windup block — 60% DR from front during telegraph
    if (enemy.windupBlock && enemy.winding && !opts.armorPierce) {
      const faceAng = Math.atan2(
        this.player.y - enemy.y,   // faces the player during windup
        this.player.x - enemy.x
      );
      const hitAng = Math.atan2(
        (opts._hitY != null ? opts._hitY : this.player.y) - enemy.y,
        (opts._hitX != null ? opts._hitX : this.player.x) - enemy.x
      );
      const diff = Math.abs(Phaser.Math.Angle.Wrap(hitAng - faceAng));
      if (diff < (enemy.windupBlockArc || 1.4) / 2) {
        dmg = Math.round(dmg * (1 - (enemy.windupBlockDR || 0.60)));
      }
    }
    // Sumer — Phalanx Solidarity: adjacent melee allies grant up to 30% DR
    if (this.stageCiv === 'sumer' && enemy.attack === 'melee') {
      let allies = 0;
      for (const a of this.enemies.getChildren()) {
        if (!a.active || a === enemy || a.attack !== 'melee') continue;
        const dx = a.x - enemy.x, dy = a.y - enemy.y;
        if (dx * dx + dy * dy < 10000) { allies++; if (allies >= 2) break; }
      }
      if (allies > 0) dmg = Math.round(dmg * (1 - Math.min(0.30, allies * 0.15)));
    }
    // Ashipu buff: if this enemy has an active ashipu buff, apply its damage boost to
    // its own attacks (recorded as a multiplier on the enemy, not here — the ashipu buff
    // actually boosts outgoing damage; for incoming damage on the buffed enemy there's no
    // additional change, the DR only comes from phalanx solidarity above).
    // CRUMPLE: landing a HEAVY shot on a stunned enemy extends stun + bonus damage.
    // Runs BEFORE dmg is rounded so the multiplier applies to the pre-rounded value.
    // Only player-sourced hits, not on the same hit as a counter, not on bosses.
    if (opts.fromPlayer && !counterHit && !enemy.isBoss
        && enemy.stunUntil && this.time.now < enemy.stunUntil
        && opts.isHeavy) {
      dmg = Math.round(dmg * CRUMPLE_DMG_BONUS);
      enemy.stunUntil = Math.max(enemy.stunUntil, this.time.now + CRUMPLE_STUN_EXTEND);
      // Purple flash — distinct from counter-hit gold
      this.fx._flash(enemy.x, enemy.y, 16, 0xcc44ff, 0.85, 240);
      this.fx._ring(enemy.x, enemy.y, 44, 0xcc44ff, 300, 4);
      this.fx._tint(this.fx.spark, 0xcc44ff);
      this.fx.spark.emitParticleAt(enemy.x, enemy.y, 6);
      if (this.tutorial && !this._crumpleTutShown) {
        this._crumpleTutShown = true;
        this.events.emit('tut', 'crumple');
      }
    }

    // ── TUMBLE bonus: +30% damage against a launched enemy ────────────────────
    if (enemy.tumbleUntil && this.time.now < enemy.tumbleUntil) {
      dmg = dmg * 1.30;
    }

    // ── FODDER bonus: string-step taps deal +50% damage to light grunts ──────
    // _stringStepActive is set by the string state machine before fireStringStep fires,
    // cleared immediately after; ensures only primary string taps trigger the mow bonus.
    if (this._stringStepActive && opts.fromPlayer && !enemy.isElite && !enemy.isBoss
        && (enemy.maxHp || 999) <= FODDER_HP_THRESHOLD) {
      dmg = dmg * 1.50;
    }

    // ── LAUNCHER: apply TUMBLE status from a launcher step/finisher ──────────
    // _stringLauncherActive is set by the state machine before firing a launcher step.
    if (opts.fromPlayer && this._stringLauncherActive && !enemy.isBoss) {
      this._applyTumble(enemy, 900);
    }

    dmg = Math.round(dmg);
    enemy.hp -= dmg;

    // OVERKILL CARRY: excess damage from a lethal player hit carries to the nearest enemy.
    // Fires AFTER hp is decremented (so we know the overshoot), BEFORE death is processed.
    if (opts.fromPlayer && !opts._overkill && enemy.hp < 0 && !enemy.isBoss) {
      const excess = -enemy.hp;
      const carry  = Math.round(excess * OVERKILL_CARRY_FRAC);
      if (carry >= 1) {
        let oTarget = null, oBestD = OVERKILL_CARRY_RANGE * OVERKILL_CARRY_RANGE;
        for (const oe of this.enemies.getChildren()) {
          if (!oe.active || oe === enemy || oe.isBoss) continue;
          const odx = oe.x - enemy.x, ody = oe.y - enemy.y;
          const od = odx * odx + ody * ody;
          if (od < oBestD) { oBestD = od; oTarget = oe; }
        }
        if (oTarget) {
          this.fx.chainArc(enemy.x, enemy.y, oTarget.x, oTarget.y, 0xffd700);
          this.fx._flash(oTarget.x, oTarget.y, 10, 0xffd700, 0.75, 180);
          this.damageEnemy(oTarget, carry, { fromPlayer: true, _overkill: true });
          if (this.tutorial && !this._overkillTutShown) {
            this._overkillTutShown = true;
            this.events.emit('tut', 'overkill');
          }
        }
      }
    }

    // ── Light-enemy interrupt: small foes (≤JUICE.lightEnemyHpThreshold) get their
    // windup cancelled when hit, once per JUICE.interruptCooldownMs to avoid stunlocking.
    if (opts.fromPlayer && !enemy.isBoss && !counterHit) {
      const isLight = (enemy.maxHp || 999) <= JUICE.lightEnemyHpThreshold;
      const nowI = this.time.now;
      const lastInterrupt = enemy._lastInterruptAt || 0;
      if (isLight && (nowI - lastInterrupt) >= JUICE.interruptCooldownMs) {
        if (enemy.swingState === 'wind') {
          releaseAttackToken(this, enemy);
          enemy.swingState = null;
          enemy.swingCd = enemy.swingCooldown || 1200;
          enemy._lastInterruptAt = nowI;
        } else if (enemy.winding) {
          releaseAttackToken(this, enemy);
          enemy.winding = false;
          enemy.fireTimer = enemy.fireCooldown || 1200;
          enemy._lastInterruptAt = nowI;
        }
      }
    }

    this.fx.damageNumber(enemy.x, enemy.y - enemy.displayHeight * 0.4, dmg,
      enemy.isBoss ? { color: this.theme.accentCss, big: true, fromPlayer: true }
                   : { color: counterHit ? '#ffd700' : '#ffffff', fromPlayer: true });
    if (counterHit) {
      // Distinctive counter-hit FX: gold flash + outward ring to signal the interrupt
      this.fx._flash(enemy.x, enemy.y, 18, 0xffd700, 0.9, 220);
      this.fx._ring(enemy.x, enemy.y, 60, 0xffd700, 320, 4);
      this.fx._ring(enemy.x, enemy.y, 32, 0xffffff, 180, 2);
      this.fx._tint(this.fx.spark, 0xffd700);
      this.fx.spark.emitParticleAt(enemy.x, enemy.y, 8);
      // Hit-stop + budgeted camera kick toward the enemy on counter hits
      this.hitStop(40, 8);
      const kickA2 = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
      this.screenKick(kickA2, 4.0);
      if (this.tutorial) this.events.emit('tut', 'counter'); // tut: step (d)
    } else {
      // Directional impact sparks along the hit vector
      const impactAng = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
      this.fx.impact(enemy.x, enemy.y, counterHit ? 0xffd700 : 0xffe08a, impactAng);
    }
    // Layered SFX: counter gets its own clash sound; heavy hits get the heavier thud
    if (counterHit) {
      Audio.sfx('counter');
    } else {
      Audio.sfx(opts.isHeavy ? 'hit_heavy' : 'hit');
    }
    // Hit-rate ducking: track player hits to duck SFX in crowds
    if (opts.fromPlayer && !counterHit) Audio._trackHitRate(performance.now());
    this.player.lifestealFrom(dmg);
    // Vampiric elite: heals back a fraction of the damage it just took
    if (enemy.active && enemy.vampiric && enemy.vampiricRate) {
      const heal = Math.round(dmg * enemy.vampiricRate);
      if (heal > 0) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        this.fx.impact(enemy.x, enemy.y - (enemy.displayHeight || 30) * 0.5, 0xff44aa);
      }
    }
    if (!enemy.winding && !counterHit) {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(50, () => {
        if (!enemy.active) return;
        if (enemy.isElite) enemy.setTint(enemy.eliteTint || 0xffd54a);
        else enemy.clearTint();
      });
    } else if (counterHit) {
      // Counter-hit: gold tintFill flash; the stun tint (blue) will be applied by
      // applyStatusTint on the very next frame since stunUntil is now set.
      enemy.setTintFill(0xffd700);
      this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });
    }

    // ── Heavy hit floor dust ──────────────────────────────────────────────────
    if (opts.isHeavy && opts.fromPlayer) {
      this.fx._tint(this.fx.dustEmitter, 0xb0a890);
      this.fx.dustEmitter.emitParticleAt(enemy.x, enemy.y + (enemy.displayHeight || 30) * 0.4, 4);
    }

    // ── Directional flinch (render-only sprite nudge, budget-capped) ─────────
    if (!enemy.isBoss && opts.fromPlayer) {
      const flinchAng = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
      const flinchPx = Phaser.Math.Clamp(dmg / 4, 3, 6);
      const ex0 = enemy.scaleX, ey0 = enemy.scaleY;
      const perpRot = flinchAng + Math.PI / 2;
      if ((this._flinchTweenCount || 0) < JUICE.flinchBudget) {
        this._flinchTweenCount = (this._flinchTweenCount || 0) + 1;
        const ox = enemy.x, oy = enemy.y;
        // Nudge sprite position (render-only — physics body position unchanged)
        enemy.x += Math.cos(flinchAng) * flinchPx;
        enemy.y += Math.sin(flinchAng) * flinchPx;
        this.tweens.add({
          targets: enemy,
          scaleX: ex0 * (1 - 0.15 * Math.abs(Math.cos(perpRot))),
          scaleY: ey0 * (1 - 0.15 * Math.abs(Math.sin(perpRot))),
          duration: 30, ease: 'Quad.easeOut',
          onComplete: () => {
            if (!enemy.active) { this._flinchTweenCount = Math.max(0, (this._flinchTweenCount||1)-1); return; }
            this.tweens.add({
              targets: enemy,
              x: ox, y: oy, scaleX: ex0, scaleY: ey0,
              duration: 60, ease: 'Back.easeOut',
              onComplete: () => { this._flinchTweenCount = Math.max(0, (this._flinchTweenCount||1)-1); },
            });
          },
        });
      }
    }

    // ── Camera kick on player hits ────────────────────────────────────────────
    if (opts.fromPlayer) {
      if (enemy.isBoss) {
        const bossAng = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        this.screenKick(bossAng, JUICE_CAM.bossPower);
      } else if (!counterHit) {
        const hitAng = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        const power = Phaser.Math.Clamp(dmg / 20, JUICE_CAM.hitPowerMin, JUICE_CAM.hitPowerMax);
        this.screenKick(hitAng, power);
      }
    }
    if (opts.isHeavy && opts.fromPlayer && !enemy.isBoss) {
      const hitAng = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
      this.screenKick(hitAng, JUICE_CAM.heavyPower);
    }

    // Store last damage for juicyDeath to read
    enemy._lastDmg = dmg;

    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (enemy.isBoss) {
      this.defeatBoss(enemy);
      return;
    }
    this.player.kills += 1;
    this.player.streak += 1; // MOMENTUM: one more kill without taking damage
    this.player.addMomentum(); // builds/extends the musou window if active
    if (this.tutorial) {
      this.events.emit('tut', 'attack'); // tut: step (b) — first kill
      if (this.player.streak >= 10) this.events.emit('tut', 'momentum'); // tut: momentum toast
    }
    // Deathburst mutation: release an energy nova on each kill.
    if (this.player.mutations && this.player.mutations.kill_nova) {
      this.abilityNova(enemy.x, enemy.y, 80, Math.round(8 * this.player.damageMult), 0xffd700, 0);
    }
    // Bloodrush mutation: +40% move speed for 2 s (stacks reset the timer).
    if (this.player.mutations && this.player.mutations.speed_on_kill) {
      this.player.addBuff('speed', 1.4, 2000, this.time.now);
    }
    Audio.sfx('kill'); // distinct kill SFX (sub-thud + saw descend)

    // BLOOD DEBT omen: every Nth kill heals the player
    if (this.run._omenBloodDebtKillInterval) {
      this.run._omenBloodDebtKillCount = (this.run._omenBloodDebtKillCount || 0) + 1;
      if (this.run._omenBloodDebtKillCount >= this.run._omenBloodDebtKillInterval) {
        this.run._omenBloodDebtKillCount = 0;
        this.player.heal(this.run._omenBloodDebtHeal || 12);
        this.fx._flash(this.player.x, this.player.y, 16, 0xff6060, 0.6, 300);
      }
    }

    // juicyDeath: directional corpse-fling + debris tint + overkill variants
    this.juicyDeath(enemy, enemy._lastDmg || 0);
    // Volatile elite: detonate a telegraphed AoE where it died (back off when it's low!)
    if (enemy.volatile) {
      this.fx.shockwave(enemy.x, enemy.y, enemy.eliteTint || 0xff7a2a, enemy.blastRadius || 120);
      this.spawnHazardZone(enemy.x, enemy.y, enemy.blastRadius || 120, enemy.blastDmgElite || 30, 320, 320, 320, 'fire');
    }
    // HORDE mod: gems worth 2× on horde floors
    const gemMult = (this.activeFloorMod && this.activeFloorMod.type === 'HORDE') ? 2 : 1;
    this.drops.spawnGem(enemy.x, enemy.y, Math.round(enemy.xpValue * gemMult));
    // GILDED PATH omen: base gold multiplier on all enemy drops
    const omenGoldMult = this.run._omenGoldMult || 1;
    if (enemy.isElite) {
      // gear/powerups from elites were flooding in and over-powering the build — halve them
      if (Math.random() < 0.5) this.drops.spawnChest(enemy.x, enemy.y);
      if (Math.random() < 0.3) this.drops.spawnPowerup(enemy.x + 30, enemy.y);
      // Elite gold drop: 4-6 coins (scaled by omen + floor mod)
      const eliteCoins = Phaser.Math.Between(4, 6);
      const goldMult = ((this.activeFloorMod && this.activeFloorMod.type === 'HORDE') ? 2 : 1) * omenGoldMult;
      this.drops.spawnCoins(enemy.x, enemy.y, Math.round(eliteCoins * goldMult));
    } else if (Math.random() < 0.04) {
      this.drops.spawnHeart(enemy.x, enemy.y); // rare health drop
    } else if (Math.random() < 0.18) {
      // Regular enemy ~18% chance to drop 1 coin; HORDE doubles it + omen scales it
      const goldMult2 = ((this.activeFloorMod && this.activeFloorMod.type === 'HORDE') ? 2 : 1) * omenGoldMult;
      this.drops.spawnCoins(enemy.x, enemy.y, Math.max(1, Math.round(goldMult2)));
    }
    this.deactivate(enemy);
  }

  deactivate(obj) {
    obj.setActive(false).setVisible(false);
    if (obj.body) {
      obj.body.stop();
      obj.body.enable = false;
    }
    // release any held attack token so the cap never leaks on death / pool recycle
    releaseAttackToken(this, obj);
    // tear down any elite nameplate so it doesn't linger after the sprite is pooled
    if (obj._plate) this._destroyElitePlate(obj);
    // Drummer death: clear drum buff from all allies so speed returns immediately
    if (obj.drumAura) {
      for (const e of this.enemies.getChildren()) {
        if (e.active && e._drumBuffed) {
          if (e._baseSpeed != null) e.speed = e._baseSpeed;
          e._drumBuffed = false;
        }
      }
    }
    // Tier-3 mechanic state reset on pool recycle
    obj._burnTag         = 0;
    obj._panicFireAcc    = 0;
    obj._executionMarked = false;
    obj.bleedStacks      = 0;
    obj.bleedDps         = 0;
    obj.bleedUntil       = 0;
    // TUMBLE cleanup
    if (obj.tumbleUntil) {
      obj.tumbleUntil = 0;
      if (obj.tumbleScaleBase) obj.setScale(obj.tumbleScaleBase);
      if (obj._tumbleShadow) { obj._tumbleShadow.destroy(); obj._tumbleShadow = null; }
      if (this._tumbleEnemies) this._tumbleEnemies.delete(obj);
      // Restore tint on pool reuse (was set to 0xa0d0ff on tumble entry)
      if (obj.isElite) { if (obj.eliteTint) obj.setTint(obj.eliteTint); } else obj.clearTint();
    }
  }

  // delegators so external systems keep their stable `scene.X` entry points
  spawnChest(x, y) { this.drops.spawnChest(x, y); } // SpawnSystem field chests
  damageBreakable(b, amount) { this.drops.damageBreakable(b, amount); } // WeaponSystem melee sweep

  // Compute omen-driven damage multiplier at player intake sites.
  // beast_tongue: beasts+spirits deal -15%, humanoids deal +8% (constructs unaffected).
  // old_wounds:   stage-1 foes deal +10% (expires naturally on stage advance).
  // Hazard ticks and boss contact use this too — but boss contact has no typeId so
  // kindClass will be null and only old_wounds may apply (stage 1 boss is intentional).
  _omenIntakeMult(kindClass) {
    let mult = 1;
    const run = this.run;
    if (run._omenBeastReduction && (kindClass === 'beast' || kindClass === 'spirit')) {
      mult *= run._omenBeastReduction; // 0.85
    } else if (run._omenHumanoidBoost && kindClass === 'humanoid') {
      mult *= run._omenHumanoidBoost; // 1.08
    }
    if (run._omenOldWounds && stageIndex(run) === 0) {
      mult *= 1.10;
    }
    return mult;
  }

  // --- overlap callbacks ---
  onPlayerHit(player, enemy) {
    if (!enemy.active) return;
    if (enemy.stunUntil && this.time.now < enemy.stunUntil) return; // stunned foes can't hit
    const kindClass = (enemy.typeId && KIND_CLASS[enemy.typeId]) || null;
    const omenMult = this._omenIntakeMult(kindClass);
    const dmg = omenMult !== 1 ? Math.round(enemy.contactDamage * omenMult) : enemy.contactDamage;
    // Track last enemy that hit the player for the chronicle killedBy field
    if (enemy.localName || (enemy.typeId && ENEMIES[enemy.typeId])) {
      this._lastEnemyHitName = enemy.localName || (ENEMIES[enemy.typeId] && ENEMIES[enemy.typeId].name) || enemy.typeId;
    }
    this.reactToHit(player.takeDamage(dmg, this.time.now));
  }

  onEnemyProjectileHit(player, proj) {
    if (!proj.active) return;
    const omenMult = this._omenIntakeMult(proj.kindClass || null);
    // Scorpio piercing bolt: deal damage but do NOT deactivate — let lifespan expire.
    // Use a per-projectile hit gate (250ms) so a slow-moving player doesn't eat it every tick.
    if (proj.piercing) {
      if (this.time.now - (proj._lastPierceHit || 0) < 250) return;
      proj._lastPierceHit = this.time.now;
      const bypassIframes2 = !player.isDashInvuln(this.time.now);
      const dmg2 = omenMult !== 1 ? Math.round(proj.damage * omenMult) : proj.damage;
      // Track last projectile source for chronicle
      if (proj.sourceTypeId && ENEMIES[proj.sourceTypeId]) this._lastEnemyHitName = ENEMIES[proj.sourceTypeId].name;
      this.reactToHit(player.takeDamage(dmg2, this.time.now, { bypassIframes: bypassIframes2, ranged: true }));
      return;
    }
    this.deactivate(proj);
    // Respect dash i-frames so a perfect-dodge through a volley fires the counter window.
    // Regular hurt i-frames are bypassed as before (enemy projectiles always land after the
    // initial hit window), but if the player is currently dash-invuln the projectile is
    // "caught" by the dodge — bypassIframes:false lets takeDamage check the invuln timestamp.
    const bypassIframes = !player.isDashInvuln(this.time.now);
    const dmg = omenMult !== 1 ? Math.round(proj.damage * omenMult) : proj.damage;
    // Track last projectile source for chronicle
    if (proj.sourceTypeId && ENEMIES[proj.sourceTypeId]) this._lastEnemyHitName = ENEMIES[proj.sourceTypeId].name;
    this.reactToHit(player.takeDamage(dmg, this.time.now, { bypassIframes, ranged: true }));
    // China — Gunpowder Discipline: successful projectile hit grants all active china
    // ranged enemies a 4s fire-rate streak bonus (represents disciplined volley training).
    if (this.stageCiv === 'china') {
      const now2 = this.time.now;
      for (const e of this.enemies.getChildren()) {
        if (e.active && e.attack === 'ranged') e._chinaStreakUntil = now2 + 4000;
      }
    }
  }

  reactToHit(result) {
    if (result === 'dodge') Audio.sfx('dodge');
    else if (result === 'perfect_dodge') this.triggerPerfectDodge();
    else if (result === 'hit') {
      Audio.sfx('hurt');
      // NOTE: getting hit does NOT reset the combo string — in a horde game chip damage
      // is constant exactly where strings matter most, and resetting on every graze made
      // strings unbuildable in crowds (playtest). Momentum already punishes getting hit;
      // the string resets on window timeout, finisher fire, and duel entry only.
      // FLAWLESS FLOOR: a real hit breaks the untouched run on this floor
      this._flawlessFloor = false;
      // Searing Wounds mutation: drop a fire patch at the player's feet on each hit.
      // A brief delay prevents it registering before the player moves off (80ms).
      if (this.player.mutations && this.player.mutations.fire_on_hit) {
        this.spawnHazardZone(this.player.x, this.player.y, 48, 6, 80, 280, 1400, 'fire', 'enemies');
      }
    } else if (result === 'dead') this.endRun();
  }

  // Called when an attack is soaked by dash i-frames — triggers the counter window
  // (once per 3s): instant secondary cooldown reset + 25% damage buff + visual feedback.
  triggerPerfectDodge() {
    const now = this.time.now;
    if (now < this.player.perfectDodgeCooldownUntil) return; // still on cooldown
    this.player.perfectDodgeCooldownUntil = now + 3000;

    // Reset secondary cooldown immediately so the counter is usable at once.
    this.secondary.timer = 0;

    // 25% damage buff for 1.2 s.
    this.player.addBuff('damage', 1.25, 1200, now);

    // Gold flash on the player.
    this.player.setTint(0xffd700);
    this.time.delayedCall(120, () => { if (this.player.active) this.player.clearTint(); });

    // Scale pop: a punchy grow-shrink tween on the sprite (render-only; body unchanged).
    this.tweens.add({
      targets: this.player, scaleX: 1.4, scaleY: 1.4, duration: 60, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { if (this.player.active) this.player.setScale(1); },
    });

    // "PERFECT" floating text above the player (same style as showSpeechText but unthrottled).
    const t = this.add.text(this.player.x, this.player.y - 48, 'PERFECT', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(52);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => t.destroy() });

    // Shockwave ring on the player position.
    this.fx.shockwave(this.player.x, this.player.y, 0xffd700, 80);

    Audio.sfx('parry'); // the existing 'parry' sfx is a sharp metallic clash — fits perfectly
    if (this.tutorial) this.events.emit('tut', 'perfect'); // tut: step (e)

    // DEFLECT: reflect nearby enemy projectiles back as player projectiles
    {
      const s = this.weapons.computeStats();
      const reflectDmg = Math.round(s.damage);
      let reflected = 0;
      for (const p of this.enemyProjectiles.getChildren()) {
        if (!p.active || reflected >= DEFLECT_MAX_REFLECT) break;
        const dx = p.x - this.player.x, dy = p.y - this.player.y;
        if (dx * dx + dy * dy > DEFLECT_RADIUS * DEFLECT_RADIUS) continue;
        // Reverse heading
        const spd = Math.hypot(p.body.velocity.x, p.body.velocity.y) || 200;
        const revAng = Math.atan2(-p.body.velocity.y, -p.body.velocity.x);
        // Save position before deactivate moves it
        const px = p.x, py = p.y;
        this.deactivate(p);
        // Spawn a player-side projectile from the same position travelling the reversed heading
        const fp = this.projectiles.get(px, py, `proj_${s.def.id}`);
        if (!fp) continue;
        fp.setActive(true).setVisible(true);
        fp.body.reset(px, py);
        fp.body.enable = true;
        fp.setRotation(revAng).setDepth(8).clearTint().setTint(0x00e5ff); // cyan tint = deflected
        this.physics.velocityFromRotation(revAng, spd * DEFLECT_SPEED_MULT, fp.body.velocity);
        fp.damage = reflectDmg;
        fp.pierceLeft = 1;
        fp.hitSet = new Set();
        fp.lifespan = 1800;
        fp.trailColor = 0x00e5ff;
        fp.bleed = null; fp.knockback = 0; fp.slow = null; fp.stunMs = 0;
        fp.ricochet = false; fp.homing = false; fp.boomerang = false;
        fp.armorPierce = false; fp.fearMs = 0; fp.weaponLifesteal = 0;
        fp.leaveBurn = null; fp.leaveTramp = null; fp.spin = 0;
        reflected++;
      }
      if (reflected > 0) {
        this.fx._flash(this.player.x, this.player.y, 22, 0x00e5ff, 0.85, 200);
        this.fx._ring(this.player.x, this.player.y, 52, 0x00e5ff, 320, 4);
        this.fx._tint(this.fx.spark, 0x00e5ff);
        this.fx.spark.emitParticleAt(this.player.x, this.player.y, reflected * 2);
        if (this.tutorial) this.events.emit('tut', 'deflect');
      }
    }
  }

  onProjectileHit(projectile, enemy) {
    if (!projectile.active || !enemy.active) return;
    if (projectile.hitSet && projectile.hitSet.has(enemy)) return;
    this.damageEnemy(enemy, projectile.damage, { armorPierce: projectile.armorPierce, fromPlayer: true, isHeavy: !!projectile._isHeavy });
    if (projectile.bleed) this.applyBleed(enemy, projectile.bleed);
    if (projectile.knockback && enemy.active && !enemy.isBoss) { // shove-on-hit
      const ka = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
      this.knockbackEnemy(enemy, ka, projectile.knockback, { _sourceDmg: projectile.damage });
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
    // Legion's Thunder (pilum_volley evolution): each javelin plants a trample zone on impact
    if (projectile.leaveTramp && this.fx) {
      const lt = projectile.leaveTramp;
      this.spawnHazardZone(projectile.x, projectile.y, lt.radius, lt.dmg, 80, 350, lt.linger, 'trample', 'enemies');
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
    // Ricochet mutation: any non-bouncing projectile gets one free bounce on first impact.
    // We arm it here (bouncesLeft=1, ricochet=true) and return so the first-hit redirects
    // rather than consuming a pierce — the redirect IS the hit, not a free pierce.
    else if (this.player.mutations && this.player.mutations.ricochet_shots
      && !projectile.ricochet && projectile.bouncesLeft == null) {
      projectile.bouncesLeft = 1;
      projectile.ricochet = true;
      projectile.bounceRange = 280;
      projectile.bounceSpeed = Math.hypot(projectile.body.velocity.x, projectile.body.velocity.y);
      this.fx.chainArc(projectile.x, projectile.y, enemy.x, enemy.y, projectile.trailColor || 0xffe08a);
      return; // skip pierce decrement — first hit redirects
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
    if (!ally.active || !enemy.active) return;
    if (ally.allyHurtCd > 0) return;
    ally.allyHurtCd = 450;
    // Bosses now hurt the legion too (it was invincible free DPS against them). Their hit
    // is player-tuned and would one-shot a legionary, so cap it to ~half max HP — the legion
    // is a brief meatshield (a couple of hits) at a boss, not vaporised and not invulnerable.
    const dmg = enemy.isBoss
      ? Math.min(enemy.contactDamage || 30, Math.round((ally.allyMaxHp || 40) * 0.5))
      : (enemy.contactDamage || enemy.damage || 8);
    ally.allyHp -= dmg;
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
    const field = this.add.image(x, y, key).setDepth(3).setScale((radius * 2) / 48).setAlpha(0.95);
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
    // Testudo Immortalis: tag the ally with its slow-aura config (applied in updateAllies)
    a.slowAura = opts.slowAura || null;
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
        // try ±50° slide rotations if the direct path is blocked. NOT during a duel —
        // the arena lives outside the floor grid, where isWalkable reads false everywhere
        // and would freeze the legion instead of letting it close on the boss.
        if (this.dungeonMode && this.floorSys && !this.dueling) {
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
      // Testudo Immortalis slow aura: slow every enemy within the aura radius
      if (a.slowAura) {
        const aura = a.slowAura;
        const r2 = aura.radius * aura.radius;
        for (const en of this.enemies.getChildren()) {
          if (!en.active) continue;
          const dx = en.x - a.x, dy = en.y - a.y;
          if (dx * dx + dy * dy <= r2) {
            en.slowUntil = this.time.now + aura.dur;
            en.slowFactor = aura.factor;
          }
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
      dash: kb.addKey(b.dash),
      pause: kb.addKey(b.pause),
      focus: kb.addKey(b.focus),
      interact: kb.addKey(b.interact || 'E'),
    };
  }

  // Poll the rebindable combat keys each frame. Primary = HELD (fire at cadence);
  // secondary/ultimate/dash/pause = tap (JustDown). Duels route the same keys to the
  // duel state machine (primary becomes a single swing per press).
  handleCombatInput(delta) {
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

    // Dash: allowed outside duels AND inside (makes duels more expressive), but NOT when
    // rooted to an attack-commitment frame — rooted = full body commitment, can't cancel.
    // In a duel, `rooted` is set by the attack state machine; standing/moving = not rooted,
    // so the player can dash freely between swings. No dash while the overall game is paused.
    if (JustDown(bk.dash) && !this.player.rooted && !this.gameOver) {
      const k = this.keys;
      let dx = 0;
      let dy = 0;
      if (k.A.isDown || k.LEFT.isDown) dx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) dx += 1;
      if (k.W.isDown || k.UP.isDown) dy -= 1;
      if (k.S.isDown || k.DOWN.isDown) dy += 1;
      const consumed = this.player.startDash(dx, dy, this._lastMoveDir, this.time.now);
      if (consumed) {
        Audio.sfx('whoosh');
        this._dashAfterimageAcc = 0; // reset ghost timer so first ghost fires immediately
        this._dashStrikeHit = new Set(); // fresh hit set for this dash
        if (this.tutorial) this.events.emit('tut', 'dash'); // tut: step (c)
      }
    }

    if (this.dueling) {
      if (JustDown(bk.primary)) this.duel.primary();
      if (JustDown(bk.secondary)) this.duel.secondary();
      if (JustDown(bk.ultimate)) this.duel.ultimate();
      return;
    }

    if (!this.canAct()) return;

    // ── DW string window tick (runs every frame, before input) ───────────────
    // Decrement the chain window; reset depth on expiry.
    if (this._stringWindowMs > 0) {
      this._stringWindowMs -= delta;
      if (this._stringWindowMs <= 0) {
        this._stringDepth   = 0;
        this._stringWindowMs = 0;
      }
    }

    // ── CHARGE + STRING STATE MACHINE ────────────────────────────────────────
    // J-tap: advance the DW string (fire the next S-step).
    //   The hold path accumulates charge for a mid-string finisher.
    //   K: if a string is active → instant finisher (C2/C3/C4, never gated by
    //   secondary CD).  K from neutral → secondary skill (unchanged).
    // Duels are exempted entirely (return earlier).  Open-field only.
    {
      const primaryDown     = bk.primary.isDown;
      const primaryJustDown = Phaser.Input.Keyboard.JustDown(bk.primary);
      const primaryJustUp   = Phaser.Input.Keyboard.JustUp(bk.primary);

      // ── J just-pressed: slam-combo OR string step ─────────────────────────
      if (primaryJustDown && this.weapons.ready()) {
        const _slamNow = this.time.now;

        // SLAM COMBO: primary within 180ms of a dash landing
        if (_slamNow < this._slamWindowUntil && _slamNow >= this._slamCdUntil && !this.player.dashing) {
          this._slamWindowUntil = 0;
          this._slamCdUntil = _slamNow + SLAM_COOLDOWN_MS;
          this._triggerSlamCombo();
          this._tapFiredThisPress = true;
          // Slam counts as S1 for string depth accounting (so a hold afterwards can fire C2)
          this._stringDepth    = 1;
          this._stringWindowMs = STRING_WINDOW_MS * (this.player.empowered ? 0.70 : 1);
        } else {
          // ── STRING ADVANCE ──────────────────────────────────────────────────
          const stringDef = this.weapons.def && this.weapons.def().string;
          if (stringDef) {
            // Determine which step to fire (0-based index)
            const stepIdx = Math.min(this._stringDepth, 5); // depth 0→S1, 1→S2, ... 5→S6
            const stepDef = resolveStringDef(this.weapons, stepIdx);
            if (stepDef) {
              const baseS = this.weapons.computeStats();
              // Tag as NOT heavy for CRUMPLE; step fires via fireStringStep
              this.weapons._isHeavyShot = false;
              // Flags consumed by damageEnemy during this fire call
              this._stringStepActive    = true;
              this._stringLauncherActive = !!stepDef.launcher;
              this.weapons.fireStringStep(stepDef, baseS);
              this._stringStepActive    = false;
              this._stringLauncherActive = false;
              this.weapons._isHeavyShot = false;
              this.weapons.timer = baseS.cooldown * CHARGE_TAP_CD;
              // Ascending pitch per step
              Audio.sfxPitch(stepDef.sfxPitchMult || 1.0);
              this._lastPrimaryFireAt = _slamNow;
              this._counterArmed = false;
              if (this._counterGlintFx) { this._counterGlintFx.destroy(); this._counterGlintFx = null; }
            }
            // Advance depth (cap at 6)
            this._stringDepth    = Math.min(this._stringDepth + 1, 6);
            // Musou empowered: tighter chain window (×0.70) + finisher depth upgraded (+1 in _fireFinisher)
            this._stringWindowMs = STRING_WINDOW_MS * (this.player.empowered ? 0.70 : 1);
            // First time player builds a string (reaches S2) — show the combo tip card
            if (this._stringDepth === 2 && this.tutorial) this.events.emit('tut', 'combo');
            this._tapFiredThisPress = true;
            this._chargeMs = 0;
          } else {
            // Fallback: weapon has no string def (shouldn't happen post-impl)
            this._chargeMs = 0;
            this._tapFiredThisPress = true;
            this._fireCharged('tap');
          }
        }
      } else {
        this._tapFiredThisPress = false;
      }

      // hold-compat: _chargeFired cleared so a keep-hold starts a new cycle immediately
      if (primaryDown && this._chargeFired && this._chargeMs === 0) {
        this._chargeFired = false;
      }

      if (primaryDown && !this._chargeFired) {
        this._chargeMs += delta;

        // Mid-string charge shortens to 450ms; depth-0 stays at CHARGE_FULL_MS
        const effectiveChargeFull = (this._stringDepth > 0) ? 450 : CHARGE_FULL_MS;

        // Charge ring — color reflects current depth (C1=gold, C2=cyan, C3=orange,
        // C4=red, C5=deep-orange crowd-eraser, C6=white-hot apex)
        const CHARGE_RING_COLORS = [0xffd700, 0x00ccff, 0xff8800, 0xff2222, 0xff5500, 0xffffff];
        const ringColor = CHARGE_RING_COLORS[Math.max(0, Math.min(5, this._stringDepth))];
        const frac = Math.min(1, this._chargeMs / effectiveChargeFull);

        if (!this._chargeFx) {
          this._chargeFx = this.add.arc(
            this.player.x, this.player.y, 18, 0, 0, false, ringColor, 0.0,
          ).setDepth(11).setStrokeStyle(2, ringColor, 0.9);
          Audio.startChargeHum();
        }
        this._chargeFx.setPosition(this.player.x, this.player.y);
        this._chargeFx.setStartAngle(270).setEndAngle(270 + 360 * frac);
        this._chargeFx.setAlpha(0.4 + frac * 0.55);
        // Update ring color in case depth changed mid-hold
        this._chargeFx.setStrokeStyle(2, ringColor, 0.9);
        Audio.updateChargeHum(frac);

        // Finisher-ready flash ring at 80% of charge
        if (frac >= 0.80 && this._stringDepth >= 1 && !this._finisherFlashed) {
          this._finisherFlashed = true;
          this.fx._ring(this.player.x, this.player.y, 24, ringColor, 160, 2);
        }

        if (this._chargeMs >= effectiveChargeFull && !this._chargeArmed) {
          this._chargeArmed = true;
        }
        // Auto-release when armed: mid-string → fire finisher; depth-0 → normal heavy
        if (this._chargeArmed) {
          if (this.tutorial) this.events.emit('tut', 'charge');
          Audio.stopChargeHum();
          const depth = this._stringDepth;
          const now   = this.time.now;
          if (depth >= 1 && now >= this._finisherCdUntil) {
            // Mid-string hold-to-full: fire the depth's finisher (accessibility fallback)
            this._finisherCdUntil = now + FINISHER_CD_MS;
            this._fireFinisher(depth);
            this._stringDepth    = 0;
            this._stringWindowMs = 0;
          } else if (depth >= 1 && now < this._finisherCdUntil) {
            // Finisher on CD → fall back to normal heavy
            this._fireCharged('heavy');
            this._stringDepth    = 0;
            this._stringWindowMs = 0;
          } else {
            // depth == 0: regular C1 heavy
            this._fireCharged('heavy');
          }
          this._chargeArmed  = false;
          this._chargeFired  = true;
          this._chargeMs     = 0;
          this._finisherFlashed = false;
          if (this._chargeFx) { this._chargeFx.destroy(); this._chargeFx = null; }
        }
      }

      if (!primaryDown) this._finisherFlashed = false;

      if (primaryJustUp || (!primaryDown && this._chargeMs > 0 && !this._chargeFired)) {
        Audio.stopChargeHum();
        if (!this._chargeFired) {
          const effectiveChargeFull = (this._stringDepth > 0) ? 450 : CHARGE_FULL_MS;
          const frac = this._chargeMs / effectiveChargeFull;
          if (this._tapFiredThisPress || this._chargeMs < CHARGE_TAP_MS) {
            // string step already fired on press — skip the second fire
          } else if (frac >= CHARGE_MANUAL_PCT) {
            this._fireCharged('heavy_manual');
          } else {
            this._fireCharged('normal');
          }
        }
        this._chargeMs     = 0;
        this._chargeArmed  = false;
        this._chargeFired  = false;
        this._tapFiredThisPress = false;
        this._finisherFlashed = false;
        if (this._chargeFx) { this._chargeFx.destroy(); this._chargeFx = null; }
      }

      if (!primaryDown && !primaryJustUp) {
        if (this._chargeMs > 0) Audio.stopChargeHum();
        this._chargeMs     = 0;
        this._chargeFired  = false;
        this._chargeArmed  = false;
        this._tapFiredThisPress = false;
        this._finisherFlashed = false;
        if (this._chargeFx) { this._chargeFx.destroy(); this._chargeFx = null; }
      }
    }

    // ── K press context split ─────────────────────────────────────────────────
    // String active + K → instant charge finisher (own 1.2s CD, not secondary CD).
    // Neutral + K → secondary skill (unchanged).
    {
      const now = this.time.now;
      const kJustDown = Phaser.Input.Keyboard.JustDown(bk.secondary);
      if (kJustDown) {
        if (this._stringDepth >= 1 && this._stringWindowMs > 0) {
          // ── FINISHER BRANCH ─────────────────────────────────────────────────
          if (now >= this._finisherCdUntil) {
            this._finisherCdUntil = now + FINISHER_CD_MS;
            this._fireFinisher(this._stringDepth);
            this._stringDepth    = 0;
            this._stringWindowMs = 0;
          }
          // else: finisher on CD — absorb the input silently (no secondary fire)
        } else if (this.secondary.ready()) {
          // ── SECONDARY SKILL (neutral K — unchanged) ─────────────────────────
          this.secondary.castManual(this.aimDir);
        }
      }
    }

    // Tactical Reflex mutation: auto-fire secondary when 4+ enemies are within 220 px.
    if (this.player.mutations && this.player.mutations.secondary_autocast && this.secondary.ready() && !this.dueling) {
      let nearCount = 0;
      const pr2 = 220 * 220;
      for (const e of this.enemies.getChildren()) {
        if (e.active) {
          const dx = e.x - this.player.x, dy = e.y - this.player.y;
          if (dx * dx + dy * dy <= pr2) nearCount++;
        }
      }
      if (nearCount >= 4) this.secondary.castManual(this.aimDir);
    }
    // NOTE: secondary K was handled above in the K context split; no fallthrough here.
    if (JustDown(bk.ultimate)) {
      const fired = this.ability.tryCast(this.time.now);
      if (fired) {
        const heroId = this.characterDef && this.characterDef.id;
        const heroLines = heroId && HERO_DIALOGUE[heroId];
        if (heroLines && heroLines.ultCast) {
          const line = pickRandom(heroLines.ultCast);
          if (line) this.showSpeechText(line);
        }
      }
    }
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
        this.showBanner('⚠ Ambush!', '#ff5252', 'normal');
        Audio.setIntensity(1);
        break;
      }
      case 'treasure': {
        // Treasure cache: chest + powerup at the zone (powerup nudged to open floor).
        this.drops.spawnChest(w.x, w.y);
        const pu = walkableNear(w.x, w.y, 40);
        this.drops.spawnPowerup(pu.x, pu.y);
        this.showBanner('✦ Treasure Cache', '#ffd700', 'low');
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
        this.showBanner('⚠ Trap Field', '#ff8a3a', 'low');
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

    // HEMORRHAGE BURST: 5th stack detonates all bleed for instant damage, resets to 2
    if (e.bleedStacks >= HEMORRHAGE_BURST_AT && !e.isBoss) {
      const burstDmg = Math.round(e.bleedDps * 3); // 3s worth of bleed DPS at current rate
      e.bleedStacks = HEMORRHAGE_RESET_TO;
      e.bleedDps    = e.bleedStacks * (b.dps || 1);
      e.bleedUntil  = this.time.now + b.duration;
      this.damageEnemy(e, burstDmg, { fromPlayer: true });
      if (e.active) {
        this.fx._flash(e.x, e.y, 20, 0xcc1830, 0.95, 280);
        this.fx._ring(e.x, e.y, 52, 0xcc1830, 380, 5);
        this.fx._ring(e.x, e.y, 30, 0xff4466, 220, 2);
        this.fx._tint(this.fx.spark, 0xcc1830);
        this.fx.spark.emitParticleAt(e.x, e.y, 10);
        if (this.tutorial && !this._hemorrhageTutShown) {
          this._hemorrhageTutShown = true;
          this.events.emit('tut', 'hemorrhage');
        }
      }
    }
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
      this.damageEnemy(e, damage, { fromPlayer: true });
      if (knockback && e.active && !e.isBoss) {
        this.knockbackEnemy(e, Math.atan2(dy, dx), knockback, { _sourceDmg: damage });
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
        if (dx * dx + dy * dy <= radius * radius) this.damageEnemy(e, damage, { fromPlayer: true });
      }
    };
    if (telegraph) {
      const warn = this.add.image(x, y, 'soft_circle').setScale(scale).setTint(color).setAlpha(0.25).setDepth(3);
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

  // ── CHARGE ATTACK helpers ─────────────────────────────────────────────────

  // SLAM COMBO: AoE ground slam triggered within 180ms of a dash landing.
  _triggerSlamCombo() {
    const s    = this.weapons.computeStats();
    const dmg  = Math.round(s.damage * SLAM_DMG_MULT);
    const r    = SLAM_RADIUS;
    const r2   = r * r;
    const px   = this.player.x, py = this.player.y;
    // Visual: ground shockwave + dust
    this.fx.explosion(px, py, 0xffe08a, r * 0.8);
    this.fx.shockwave(px, py, 0xffd700, r);
    this.fx.dustEmitter.emitParticleAt(px, py, 12);
    Audio.sfx('hit');
    // Budgeted downward camera kick via screenKick
    this.screenKick(Math.PI / 2, JUICE_CAM.slamExtra + JUICE_CAM.heavyPower);
    // Hit all enemies in radius
    for (const e of this.enemies.getChildren()) {
      if (!e.active || e.isBoss) continue;
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy > r2) continue;
      this.damageEnemy(e, dmg, { fromPlayer: true });
      if (e.active) {
        // Knockback radially outward — synergizes with WALL CRUNCH
        this.knockbackEnemy(e, Math.atan2(dy, dx), 60, { _sourceDmg: dmg });
      }
    }
    this.weapons.timer = s.cooldown; // normal cooldown after slam
    if (this.tutorial && !this._slamTutShown) {
      this._slamTutShown = true;
      this.events.emit('tut', 'slam');
    }
  }

  // Fire the primary weapon with the given charge mode ('tap' | 'normal' | 'heavy').
  // Reads the weapon's ready state, computes stats with charge mods, then fires.
  _fireCharged(mode) {
    if (!this.weapons.ready()) return;
    // Orbital weapons don't enter the normal fire path — cosmetic flare instead.
    const def = this.weapons.def();
    if (def.kind === 'orbital') {
      // Orbital charge flare: gold radial burst from each orbiter position
      for (const orb of this.weapons._orbiters) {
        if (orb.sprite && orb.sprite.active) {
          this.fx.goldenBurst(orb.sprite.x, orb.sprite.y, 5);
        }
      }
      const s = this.weapons.computeStats();
      this.fx._ring(this.player.x, this.player.y, s.orbitRadius || 62, 0xffd700, 300, 3);
      Audio.sfx('parry');
      this.weapons.timer = 800; // brief cooldown so the flare isn't spammable
      return; // do NOT call fire() — orbiters are passive
    }

    // Record the fire timestamp and disarm the counter window.
    this._lastPrimaryFireAt = this.time.now;
    this._counterArmed = false;
    if (this._counterGlintFx) { this._counterGlintFx.destroy(); this._counterGlintFx = null; }

    const s = this.weapons.computeStats();
    this.weapons.lastCooldown = s.cooldown;
    this.weapons._aimOverride = this.aimDir != null ? this.aimDir : null;

    const chargedS = this._applyChargeToStats(s, mode);

    // Tag as heavy so CRUMPLE can fire: set BEFORE fire(), clear after
    const isHeavyShot = (mode === 'heavy' || mode === 'heavy_manual');
    this.weapons._isHeavyShot = isHeavyShot;
    // Override attack-motion kind for charge modes so the heavier squash fires,
    // overriding whatever the weapon kind would produce.
    if (mode === 'tap') {
      // force motion before fire() runs (fire() also calls playerAttackMotion but
      // _attackMotionActive guard means first caller wins)
      this.playerAttackMotion('charge_tap', this.aimDir != null ? this.aimDir : 0);
    } else if (mode === 'heavy' || mode === 'heavy_manual') {
      this.playerAttackMotion('charge_heavy', this.aimDir != null ? this.aimDir : 0);
    }
    this.weapons.fire(chargedS);
    this.weapons._isHeavyShot = false;

    // Set the cooldown: tap fires faster, heavy fires at normal cadence.
    let cdMult = 1.0;
    if (mode === 'tap') cdMult = CHARGE_TAP_CD;
    this.weapons.timer = s.cooldown * cdMult;

    this.weapons._aimOverride = null;

    // Heavy / perfect-manual FX: chunkier impact + hit-stop + camera kick
    const isHeavy = (mode === 'heavy' || mode === 'heavy_manual');
    if (isHeavy) {
      // Chunkier visual — larger flash + double ring so heavies feel distinct
      this.fx._flash(this.player.x, this.player.y, 26, 0xffd700, 0.85, 200);
      this.fx._ring(this.player.x, this.player.y, 40, 0xffd700, 280, 4);
      this.fx._ring(this.player.x, this.player.y, 22, 0xffffff, 160, 2);
      // Hit-stop: ~40ms physics + velocity freeze via a short timeScale dip on physics
      // (safe: Phaser Arcade Physics respects world.timeScale; no tween side-effects)
      this.hitStop(40, 8);
      // Budgeted camera kick via screenKick (replaces raw setScroll pair)
      const kickAngle = this.aimDir != null ? this.aimDir : 0;
      this.screenKick(kickAngle, JUICE_CAM.heavyPower);
      Audio.sfx('parry'); // sharp metallic hit
    }

    // Perfect manual release: extra tick + 'PERFECT RELEASE' text
    if (mode === 'heavy_manual') {
      const t = this.add.text(this.player.x, this.player.y - 48, 'PERFECT RELEASE', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(52).setScrollFactor(1);
      this.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 800, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
    }
  }

  // Apply charge-mode modifiers to a stats object (does NOT mutate the original).
  _applyChargeToStats(s, mode) {
    if (mode === 'normal') return s; // unchanged
    const out = Object.assign({}, s);
    if (mode === 'tap') {
      out.damage = s.damage * CHARGE_TAP_DMG;
      return out;
    }
    // mode === 'heavy' or 'heavy_manual'
    out.damage = s.damage * (mode === 'heavy_manual' ? CHARGE_HEAVY_MANUAL_DMG : CHARGE_HEAVY_DMG);
    switch (s.def.kind) {
      case 'melee_arc':
        // wider finisher sweep: arc + 50° (capped 360), radius + 20%
        out.arc = Math.min(360, (s.arc || 200) + 50);
        out.radius = s.radius * 1.20;
        break;
      case 'projectile_aimed':
      case 'burst_aimed':
        // +2 pierce, speed unchanged
        out.pierce = (s.pierce || 0) + 2;
        break;
      case 'projectile_radial':
        // +15% projectile speed
        out.speed = (s.speed || 300) * 1.15;
        break;
      case 'lob_aoe':
        // +30% pool radius, +25% duration
        out.radius = s.radius * 1.30;
        out.duration = (s.duration || 1600) * 1.25;
        break;
      case 'orbital':
        // EXEMPT — handled before this method is called
        return s;
      case 'summon':
        // deploy 2 units instead of 1
        out.count = (s.count || 1) + 1;
        break;
      case 'line_thrust':
        // +40% length, +20% width
        out.length = s.length * 1.40;
        out.width = (s.width || 46) * 1.20;
        break;
      case 'ricochet':
        // +2 bounces
        out.bounces = (s.bounces || 0) + 2;
        break;
      case 'trail':
        // +60% duration on each caltrop patch
        out.duration = (s.duration || 2500) * 1.60;
        break;
      case 'boomerang':
        // +40% throw range
        out.range = s.range * 1.40;
        break;
      case 'pike_wall':
        // +30% span, +25% duration
        out.span = (s.span || 160) * 1.30;
        out.duration = (s.duration || 2500) * 1.25;
        break;
      default:
        break;
    }
    return out;
  }

  // ── DW String Finisher helpers ────────────────────────────────────────────────

  // Fire the depth-specific charge finisher (C2…C6).
  // depth: 1→C2, 2→C3, 3→C4, 4→C5, 5→C6, 6→C6 (string depth at K-press time).
  // Called from both: K-press instant-branch AND hold-J auto-release fallback.
  // MUSOU empowered: depth upgraded one step (caps at C6).
  _fireFinisher(rawDepth) {
    // NOT gated by the primary's tap cooldown: a DW charge attack branches out of the
    // string INSTANTLY (J,K with no pause) — the finisher's own CD prevents spam.
    if (rawDepth < 1) return;

    // Musou empowerment: bump finisher one step deeper + shorten next chain window (caps at C6)
    const empowered = this.player.empowered;
    const depth = empowered ? Math.min(rawDepth + 1, 6) : rawDepth;

    const def = this.weapons.def();
    const s   = this.weapons.computeStats();

    // Orbital weapons skip the string system entirely (orbiters are passive)
    if (def.kind === 'orbital') {
      // Cosmetic flare only for orbitals
      for (const orb of this.weapons._orbiters) {
        if (orb.sprite && orb.sprite.active) this.fx.goldenBurst(orb.sprite.x, orb.sprite.y, 5);
      }
      this.fx._ring(this.player.x, this.player.y, s.orbitRadius || 62, 0xffd700, 300, 3);
      Audio.sfx('parry');
      this.weapons.timer = 800;
      return;
    }

    // Map string depth to finisher key (depth 1 fired 1 step, so we're branching on K after that)
    // depth = _stringDepth at the time K is pressed:
    //   depth=1 (S1 fired, pressing K) → C2
    //   depth=2 (S2 fired) → C3
    //   depth=3 (S3 fired) → C4
    //   depth=4 (S4 fired) → C5
    //   depth=5 (S5 fired) → C6
    //   depth=6 (S6 fired) → C6 (capped — reaching deep IS the skill)
    const finisherKeys = ['C2', 'C3', 'C4', 'C5', 'C6', 'C6'];
    const fKey = finisherKeys[Math.min(depth - 1, 5)];
    const fd = def.chargeFinishers && def.chargeFinishers[fKey];

    const finS = fd ? this._applyFinisherToStats(s, fd) : this._applyChargeToStats(s, 'heavy');

    // Record fire + disarm counter window
    this._lastPrimaryFireAt = this.time.now;
    this._counterArmed = false;
    if (this._counterGlintFx) { this._counterGlintFx.destroy(); this._counterGlintFx = null; }

    this.weapons._aimOverride = this.aimDir != null ? this.aimDir : null;
    // C3+ count as heavy shots for CRUMPLE; C2 does not (per spec)
    this.weapons._isHeavyShot = depth >= 2;

    if (fd) {
      // Fire through the appropriate path via fireStringStep (respects kind override)
      this._stringLauncherActive = !!fd.launcher;
      this.weapons.fireStringStep(fd, finS);
      this._stringLauncherActive = false;
    } else {
      // No finisher def? Fall back to normal heavy fire
      const motionKind = fd ? (fd.motionKind || 'charge_heavy') : 'charge_heavy';
      this.playerAttackMotion(motionKind, this.aimDir != null ? this.aimDir : 0);
      this.weapons.fire(finS);
    }
    this.weapons._isHeavyShot = false;

    // Finisher FX — scale with depth
    const ringColor = fd ? (fd.ringColor || 0xffd700) : 0xffd700;
    this.fx._flash(this.player.x, this.player.y, 14 + depth * 4, ringColor, 0.85, 200);
    this.fx._ring(this.player.x, this.player.y, 30 + depth * 10, ringColor, 280, 3 + depth);
    if (depth >= 2) this.hitStop(40 + (depth - 1) * 20, 8);
    if (depth >= 2) this.screenKick(this.aimDir != null ? this.aimDir : 0, JUICE_CAM.heavyPower);

    // Grand finisher bonus effect (C4+)
    if (fd && fd.grandFinisher) this._triggerGrandFinisherFx(finS, fd);
    // C5 CROWD ERASER + C6 APEX signature mechanics (hero-flavoured)
    if (fd && fd.crowdEraser) this._triggerCrowdEraser(finS, fd);
    if (fd && fd.apex) this._triggerApexCinematic(finS, fd, ringColor);

    // Finisher label float
    if (fd && fd.label) this._showFinisherLabel(fd.label, ringColor, depth);

    // Depth float text ("C2"…"C6")
    const depthLabel = ['', 'C2', 'C3', 'C4', 'C5', 'C6', 'C6'][Math.min(depth, 6)];
    const col = depth >= 5 ? '#ffffff' : depth >= 3 ? '#ff8a3a' : '#ffd700';
    const ft = this.add.text(this.player.x, this.player.y - 48, depthLabel, {
      fontFamily: 'monospace', fontSize: depth >= 5 ? '18px' : '14px', color: col, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(52).setScrollFactor(1);
    this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 600, ease: 'Quad.easeIn', onComplete: () => ft.destroy() });

    // C6 APEX carries a longer cooldown so the apex can't be spammed (~2s vs ~1.2s).
    if (fKey === 'C6') this._finisherCdUntil = this.time.now + FINISHER_CD_APEX_MS;

    this.weapons.timer = s.cooldown;
    this.weapons._aimOverride = null;
  }

  // Apply finisher-def overrides to a stats object (same role as _applyChargeToStats
  // but reads from the data-driven chargeFinishers def rather than mode constants).
  _applyFinisherToStats(s, fd) {
    const out = Object.assign({}, s);
    out.damage = s.damage * (fd.dmgMult || 1.8) * (this.player.empowered ? 1.5 : 1);
    if (fd.arcOverride    != null) out.arc      = fd.arcOverride;
    if (fd.radiusMult     != null) out.radius   = s.radius * fd.radiusMult;
    if (fd.lengthMult     != null) out.length   = (s.length || 150) * fd.lengthMult;
    if (fd.widthMult      != null) out.width    = (s.width  || 46)  * fd.widthMult;
    if (fd.countAdd       != null) out.count    = (s.count  || 1)   + fd.countAdd;
    if (fd.spreadOverride != null) out.spread   = fd.spreadOverride;
    if (fd.knockbackOverride != null) out.knockback = fd.knockbackOverride;
    if (fd.pierceMod      != null) out.pierce   = (s.pierce || 0) + fd.pierceMod;
    if (fd.launcher) out._launcher = true;
    // Carry behaviour flags the fire-path reads (Alexander quad-lane, Nobunaga armour pierce)
    if (fd.quadLane) out.quadLane = true;
    if (fd.armorPierce) out.armorPierce = true;
    return out;
  }

  // Grand finisher bonus FX for C4 (hero-specific flair reusing existing hazard/burst calls).
  _triggerGrandFinisherFx(s, fd = null) {
    const px = this.player.x, py = this.player.y;
    // Generic: golden burst ring at the player
    this.fx.goldenBurst(px, py, 14);
    this.fx._ring(px, py, 80, 0xff2222, 400, 6);
    if (fd && fd.noFireZone) {
      // Fire-free grand finisher (Nobunaga's precision identity — fire belongs to
      // Belisarius): a concussive shock nova that hurls the pack outward instead.
      this.fx._ring(px, py, 110, 0xffffff, 320, 3);
      const R2 = 110 * 110;
      for (const e of this.enemies.getChildren()) {
        if (!e.active || e.isBoss) continue;
        const dx = e.x - px, dy = e.y - py;
        if (dx * dx + dy * dy > R2) continue;
        this.knockbackEnemy(e, Math.atan2(dy, dx), 70, { _sourceDmg: Math.round(s.damage * 0.3) });
      }
    } else {
      // Default: a brief fire hazard zone at the player (Lü Bu "Wrath Nova" feel)
      const r = s.radius ? s.radius * 0.6 : 70;
      this.spawnHazardZone(px, py, r, Math.round(s.damage * 0.3), 80, 300, 1200, 'fire', 'enemies');
    }
    Audio.sfx('hit_heavy');
  }

  // C5 CROWD ERASER — each hero's signature mass-clear status, layered on top of the
  // grandFinisher FX. Flags come off the finisher def (data-driven, graceful no-ops).
  _triggerCrowdEraser(s, fd) {
    const px = this.player.x, py = this.player.y;
    const ringColor = fd.ringColor || 0xff5500;
    // Shared wide eraser shockwave + a brief screen freeze for weight
    this.fx._ring(px, py, 140, ringColor, 420, 5);
    this.hitStop(60, 8);
    this.screenKick(this.aimDir != null ? this.aimDir : 0, JUICE_CAM.heavyPower);

    // Lü Bu / Caesar / Ragnar mass-launcher: pop every non-boss grunt in a wide radius airborne.
    if (fd.launcher) {
      const R2 = 170 * 170;
      for (const e of this.enemies.getChildren()) {
        if (!e.active || e.isBoss) continue;
        const dx = e.x - px, dy = e.y - py;
        if (dx * dx + dy * dy > R2) continue;
        this._applyTumble(e, 900);
      }
    }
    // Caesar's LEGION RALLY — summon veteran legionaries mid-finisher.
    if (fd.summonAllies && this.spawnLegionary) {
      const cs = this.weapons.computeStats();
      for (let i = 0; i < fd.summonAllies; i++) {
        const a = (i / fd.summonAllies) * Math.PI * 2 + Math.random();
        this.spawnLegionary(px + Math.cos(a) * 26, py + Math.sin(a) * 26, {
          damage: Math.round((cs.damage || 18) * (cs.allyDmgMult || 1) * 1.2),
          hp: (cs.allyHp || 40) * 1.5, life: cs.allyLife || 7000,
          speed: cs.allySpeed || 150, range: cs.allyRange || 30, color: s.def.color,
        });
      }
      this.fx.goldenBurst(px, py, 16);
    }
    // Genghis ARROW HURRICANE — bloom a ring of caltrops around the player.
    if (fd.caltropRing && this.spawnCaltropField) {
      this.spawnCaltropField(px, py, 150, Math.round((s.damage || 20) * 0.25), 3000, 300);
    }
    // Ragnar QUAD-AXE TEMPEST / RAGNAROK — churn a trample wake under the whirl.
    if (fd.trampleWake) {
      this.spawnHazardZone(px, py, (s.radius || 90) * 0.9, Math.round((s.damage || 20) * 0.25), 60, 300, 1600, 'trample', 'enemies');
    }
    // Gilgamesh GATE OF BABYLON — scatter golden judgment zones around the blade storm.
    if (fd.goldenZones) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const zx = px + Math.cos(a) * 90, zy = py + Math.sin(a) * 90;
        this.spawnHazardZone(zx, zy, 46, Math.round((s.damage || 20) * 0.2), 100, 280, 1300, 'fire', 'enemies');
      }
      this.fx.goldenBurst(px, py, 18);
    }
    Audio.sfx('hit_heavy');
  }

  // C6 APEX — the cinematic peak: hard hit-stop, heavy screen kick, a unique three-beat
  // fx burst, and (for launcher heroes) a final mass pop. ~3× damage is already baked
  // into the finisher dmgMult; this is the showstopper presentation + reinforced clear.
  _triggerApexCinematic(s, fd, ringColor) {
    const px = this.player.x, py = this.player.y;
    // Beat 1 — frozen impact: deep hit-stop + a white flash + a hard directional kick
    this.hitStop(140, 10);
    this.cameras.main.flash(110, 255, 245, 220, false);
    this.screenKick(this.aimDir != null ? this.aimDir : 0, JUICE_CAM.bossPower);
    this.fx._flash(px, py, 60, 0xffffff, 0.9, 220);
    // Beat 2/3 — expanding twin novas (delayed) for a layered shockwave read
    this.fx._ring(px, py, 110, ringColor, 320, 6);
    this.fx._ring(px, py, 170, 0xffffff, 420, 4);
    if (this.fx.explosion) this.fx.explosion(px, py, ringColor, 120);
    this.time.delayedCall(120, () => {
      if (!this.player.active) return;
      this.fx._ring(this.player.x, this.player.y, 220, ringColor, 380, 5);
      if (this.fx.goldenBurst) this.fx.goldenBurst(this.player.x, this.player.y, 22);
    });
    // APEX clear: a wide pop of every non-boss grunt so the cinematic actually erases the crowd
    const R2 = 220 * 220;
    for (const e of this.enemies.getChildren()) {
      if (!e.active || e.isBoss) continue;
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy > R2) continue;
      if (fd.launcher) this._applyTumble(e, 1000);
      else this.knockbackEnemy(e, Math.atan2(dy, dx), 80, { _sourceDmg: Math.round((s.damage || 20) * 0.25) });
    }
    Audio.sfx('hit_heavy');
  }

  // Show the finisher label as a floating banner (e.g. "HEAVEN LAUNCHER").
  _showFinisherLabel(label, color, depth) {
    const t = this.add.text(this.player.x, this.player.y - 64, label, {
      fontFamily: 'monospace', fontSize: '12px',
      color: `#${(color || 0xffd700).toString(16).padStart(6, '0')}`,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(52).setScrollFactor(1);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 800, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  // Apply TUMBLE status to an enemy (non-boss grunts only; elites get brief stagger).
  _applyTumble(enemy, duration) {
    if (!enemy || !enemy.active) return;
    const dur = duration || 900;
    if (enemy.isElite || enemy.isBoss) {
      // Resistance: 250ms stagger instead of full tumble
      enemy.stunUntil = Math.max(enemy.stunUntil || 0, this.time.now + 250);
      return;
    }
    // Release any held attack token so the cap doesn't leak while the enemy is airborne
    releaseAttackToken(this, enemy);
    enemy.tumbleUntil     = this.time.now + dur;
    enemy.tumbleScaleBase = enemy.scaleX;
    enemy.setScale(enemy.scaleX * 1.25, enemy.scaleY * 1.25); // pop up 1.25×
    // Shadow ellipse at feet (pooled-safe: create if absent, destroy on cleanup)
    if (!enemy._tumbleShadow) {
      enemy._tumbleShadow = this.add.ellipse(enemy.x, enemy.y, 28, 14, 0x000000, 0.38)
        .setDepth(enemy.depth - 1);
    }
    this._tumbleEnemies.add(enemy);
    enemy.setTint(0xa0d0ff); // pale aerial tint (distinct from stun blue-purple)
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
    Audio.stopChargeHum(); // safety: kill any stuck oscillator on death
    Audio.setIntensity(0);
    Audio.sfx('death');
    if (this.duelTest) { // test mode: back to the duel-test picker (real save untouched)
      this.registry.set('reopenDuelPanel', true);
      this.cameras.main.flash(300, 120, 0, 0);
      this.time.delayedCall(700, () => { this.scene.stop('UIScene'); this.scene.start('MenuScene'); });
      return;
    }
    // Boss Memory: if player dies while dueling, record it against that boss
    if (this.dueling && this.activeBoss && this.activeBoss.bossId) {
      Legacy.recordBossFell(this.activeBoss.bossId);
    }
    // Dynasty Chronicle: append a fell entry
    {
      // Determine killedBy: prefer boss name if dueling, otherwise last-hit enemy name
      let killedBy = null;
      if (this.dueling && this.activeBoss) {
        killedBy = this.activeBoss.bossName || this.activeBoss.bossId || null;
      } else if (this._lastEnemyHitName) {
        killedBy = this._lastEnemyHitName;
      }
      Legacy.appendChronicleEntry({
        heroId: this.characterDef.id,
        outcome: 'fell',
        stage: this.run.currentCiv || 'unknown',
        floor: this.floor || 1,
        killedBy,
        kills: this.player.kills || 0,
        heat: this.run.mandateHeat || 0,
        omen: this.run.omen || null,
        civsConquered: (this.run.conquered || []).length,
      });
    }
    // award legacy coins before clearing the save
    // Mandate heat multiplies legacy coin earnings on death too (1 + heat*0.15)
    const floorsDescended = Math.max(0, (this.floor || 1) - 1);
    const mandateHeat = this.run.mandateHeat || 0;
    const heatCoinMult = 1 + mandateHeat * 0.15;
    const coinsEarned = Legacy.awardCoins(
      this.player.kills,
      floorsDescended,
      this.run.conquered ? this.run.conquered.length : 0,
      heatCoinMult,
    );
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
        coinsEarned,
      });
    });
  }
}
