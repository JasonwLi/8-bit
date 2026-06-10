import Phaser from 'phaser';
import { getWeapon, AXIS_INFO } from '../data/weapons.js';
import { getSecondary } from '../data/secondaries.js';
import { getAbility, ABILITY_AXIS_INFO } from '../data/abilities.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';
import { GAME } from '../config.js';

// Map an axis kind (or legacy axis name) to one of the 8 procedural `axis_*` emblem
// icons. Flavored kinds reuse a thematically-close emblem.
const AXIS_ICON = {
  damage: 'damage', dmg: 'damage', allydmg: 'damage', power: 'power', lifesteal: 'power', bleed: 'power',
  speed: 'speed', cadence: 'speed', haste: 'haste', spin: 'haste',
  reach: 'reach', size: 'reach', slow: 'reach', evasion: 'reach',
  area: 'area', arc: 'area', knockback: 'area',
  amount: 'amount', count: 'amount', allyhp: 'amount',
  effect: 'effect', pierce: 'effect', stun: 'effect', fear: 'effect', armorpierce: 'effect', burnpatch: 'effect', burn: 'effect', buff: 'effect', multishot: 'amount',
};

// MUTATION CARDS — rare behavior-changing modifiers (purple/rare, weight ~35% per
// draft, at most one per draft, only offered at level 10+, pickable ONCE per run).
// Flags are stored on player.mutations and restored from run.mutations on resume.
// Each card is picked at most once per run (owned list: run.ownedMutations).
export const MUTATION_CARDS = [
  {
    id: 'ricochet_shots', name: 'Ricochet',
    desc: 'Your projectiles bounce once to the nearest un-hit enemy on impact.',
    color: 0xb05aff, icon: 'axis_effect',
  },
  {
    id: 'echo_ultimate', name: 'Echo',
    desc: 'Your ultimate echoes a second cast at 40% power 1 s later.',
    color: 0xb05aff, icon: 'axis_power',
  },
  {
    id: 'reverse_knockback', name: 'Gravitic Pull',
    desc: 'Knockback now PULLS enemies toward you instead of pushing them away.',
    color: 0xb05aff, icon: 'axis_area',
  },
  {
    id: 'gem_detonator', name: 'Gem Detonator',
    desc: 'Collecting a gem triggers a small shrapnel burst that damages nearby enemies.',
    color: 0xb05aff, icon: 'axis_effect',
  },
  {
    id: 'fire_on_hit', name: 'Searing Wounds',
    desc: 'Taking a hit drops a burning fire patch at your feet.',
    color: 0xb05aff, icon: 'axis_damage',
  },
  {
    id: 'secondary_autocast', name: 'Tactical Reflex',
    desc: 'Your secondary auto-fires when 4 or more enemies are within 220 px.',
    color: 0xb05aff, icon: 'axis_speed',
  },
  {
    id: 'homing_shots', name: 'Seeking',
    desc: 'All your projectiles gain a gentle homing curve toward nearby enemies.',
    color: 0xb05aff, icon: 'axis_haste',
  },
  {
    id: 'kill_nova', name: 'Deathburst',
    desc: 'Each enemy kill releases a small energy nova that damages adjacent foes.',
    color: 0xb05aff, icon: 'axis_area',
  },
  {
    id: 'speed_on_kill', name: 'Bloodrush',
    desc: 'Killing an enemy gives +40% move speed for 2 s (stacks reset the timer).',
    color: 0xb05aff, icon: 'axis_haste',
  },
  {
    id: 'proj_split_on_expire', name: 'Fragmentation',
    desc: 'Projectiles that expire without a hit split into 3 short-range shards.',
    color: 0xb05aff, icon: 'axis_amount',
  },
  {
    id: 'lifesteal_on_ult', name: 'Bloodthrone',
    desc: 'Casting your ultimate heals you for 3% of max HP for each enemy in its radius.',
    color: 0xb05aff, icon: 'axis_power',
  },
  {
    id: 'knockback_chain', name: 'Billiards',
    desc: 'A knocked-back enemy that collides with another enemy knocks it back too.',
    color: 0xb05aff, icon: 'axis_area',
  },
];

// HERO STAT upgrades — offered once an ability hits the upgrade cap (and to fill the
// pool). Each adds a permanent mod to the player (Brotato / Halls-of-Torment style).
// [modKey, amount] feeds Player.recompute via the levelMods bag.
const STAT_UPGRADES = [
  { id: 'might', label: 'Might', desc: '+5% damage', mod: ['damageMult', 0.05], color: 0xff5252, icon: 'axis_damage' },
  { id: 'haste', label: 'Haste', desc: '−4% all cooldowns', mod: ['cooldownMult', -0.04], color: 0xffe030, icon: 'axis_speed' },
  { id: 'vitality', label: 'Vitality', desc: '+35 max HP', mod: ['maxHpFlat', 35], color: 0x66dd88, icon: 'axis_amount' },
  { id: 'swiftness', label: 'Swiftness', desc: '+5% move speed', mod: ['speedMult', 0.05], color: 0x64c8ff, icon: 'axis_haste' },
  { id: 'armor', label: 'Armor', desc: '+3% damage reduction', mod: ['damageReduction', 0.03], color: 0x9aa6c0, icon: 'axis_area' },
  { id: 'evasion', label: 'Evasion', desc: '+3% dodge', mod: ['dodge', 0.03], color: 0x33d6d6, icon: 'axis_reach' },
  { id: 'regen', label: 'Regeneration', desc: '+0.02 HP/sec', mod: ['regen', 0.02], color: 0x88ddaa, icon: 'axis_amount' },
  { id: 'fortune', label: 'Fortune', desc: '+1 luck', mod: ['luck', 1], color: 0xffd27a, icon: 'axis_effect' },
  { id: 'vampirism', label: 'Vampirism', desc: '+2% lifesteal', mod: ['lifesteal', 0.02], color: 0xb05a3a, icon: 'axis_power' },
  { id: 'magnet', label: 'Magnetism', desc: '+10% pickup range', mod: ['pickupMult', 0.1], color: 0xb15bff, icon: 'axis_area' },
];

// Level-up. Most levels: 5 options drawn from the combined PRIMARY + SECONDARY
// pool (both use damage/reach/speed/effect). Every 5th level instead offers an
// ULTIMATE upgrade (power/haste/area/amount) — so the ultimate scales on a
// milestone cadence and the per-level pool stays focused (keeps scaling sane).
export default class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
  }

  init(data) {
    this.gs = data.gameScene;
  }

  create() {
    const { width, height } = this.scale;
    const gs = this.gs;
    Audio.sfx('levelup');
    // tut: first UpgradeScene visit → draft-hint toast
    gs.events.emit('tut', 'draftHint');

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.8).setOrigin(0).setDepth(0);
    this.add.text(width / 2, height / 2 - 190, 'LEVEL UP!', {
      fontFamily: 'monospace', fontSize: '38px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);
    // which level this choice is for (handles multi-level-ups: lowest pending first)
    this.choiceLevel = gs.player.level - gs.pendingLevels + 1;
    this.ultimateLevel = this.choiceLevel % 5 === 0;

    // one reroll per level-up presentation
    this._rerolled = false;
    // banish mode: player presses B to enter; clicking a card removes that axis from
    // future drafts for this run. 2 charges per run, persisted on run.banishedIds.
    this._banishMode = false;
    this._choices = this.rollChoices();
    this._buildCards(width, height);

    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this._choices.length) {
        if (this._banishMode) { this.banishCard(this._choices[n - 1]); return; }
        this.pick(this._choices[n - 1]);
      }
      if (e.key === 'r' || e.key === 'R') this.reroll(width, height);
      if (e.key === 'b' || e.key === 'B') this.toggleBanishMode(width, height);
      if (e.key === 'l' || e.key === 'L') this.cycleLock(width, height);
    });
  }

  // Build (or rebuild after a reroll) the subtitle + cards and reroll button.
  _buildCards(width, height) {
    // destroy any previously rendered card objects so reroll doesn't leave ghosts
    if (this._cardObjs) this._cardObjs.forEach((o) => o.destroy());
    this._cardObjs = [];
    const reg = (o) => { this._cardObjs.push(o); return o; };

    const choices = this._choices;
    const allStats = choices.every((c) => c.kind === 'stat');
    const subtitle = allStats
      ? 'Hero stat upgrade — choose one'
      : (this.ultimateLevel ? `★ Lv ${this.choiceLevel} — ULTIMATE upgrade (every 5 levels)` : 'Upgrade your attacks — choose one');
    reg(this.add.text(width / 2, height / 2 - 152, subtitle, {
      fontFamily: 'monospace', fontSize: '15px', color: this.ultimateLevel && !allStats ? '#ffd700' : '#c9c4e0',
    }).setOrigin(0.5).setDepth(1));

    const cardW = 168;
    const cardH = 212;
    const gap = 12;
    const total = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (width - total) / 2 + cardW / 2;
    const cy = height / 2 + 24;
    choices.forEach((c, i) => this.buildCard(startX + i * (cardW + gap), cy, cardW, cardH, c, i + 1, reg));

    // ── Footer controls row: reroll | banish (B) | lock (L) ──────────────────
    // Laid out evenly across the width so the row reads as a coherent control strip.
    const footerY = height / 2 + cardH / 2 + 38;
    const gs = this.gs;
    const run = gs.run;

    // --- reroll ---
    const rerollColor = this._rerolled ? '#555566' : '#9a93c0';
    const rerollLabel = this._rerolled ? '↻ rerolled' : '↻ reroll  [R]';
    const rb = reg(this.add.text(width / 2 - 180, footerY, rerollLabel, {
      fontFamily: 'monospace', fontSize: '13px', color: rerollColor,
    }).setOrigin(0.5).setDepth(2));
    if (!this._rerolled) {
      rb.setInteractive({ useHandCursor: true });
      rb.on('pointerover', () => rb.setColor('#ffffff'));
      rb.on('pointerout', () => rb.setColor(rerollColor));
      rb.on('pointerdown', () => this.reroll(width, height));
    }

    // --- banish (2 charges per run) ---
    const banishCharges = 2 - ((run.banishesUsed || 0));
    const banishActive = this._banishMode;
    const banishAvail = banishCharges > 0;
    const banishColor = banishActive ? '#ff5252' : (banishAvail ? '#e8a040' : '#555566');
    const banishLabel = banishActive
      ? '✕ click card to banish'
      : `⊘ banish  [B]  ×${banishCharges}`;
    const bb = reg(this.add.text(width / 2, footerY, banishLabel, {
      fontFamily: 'monospace', fontSize: '13px', color: banishColor,
    }).setOrigin(0.5).setDepth(2));
    this._banishBtn = bb; // store for mode-toggle refresh
    if (banishAvail || banishActive) {
      bb.setInteractive({ useHandCursor: true });
      bb.on('pointerover', () => bb.setColor('#ffffff'));
      bb.on('pointerout', () => bb.setColor(banishColor));
      bb.on('pointerdown', () => this.toggleBanishMode(width, height));
    }

    // --- lock (one card, cleared after next draft) ---
    const lockedId = run.lockedCardId || null;
    const lockColor = lockedId ? '#7eddff' : '#9a93c0';
    const lockLabel = lockedId ? `🔒 locked: ${lockedId}` : '🔒 lock card  [L]';
    const lb = reg(this.add.text(width / 2 + 180, footerY, lockLabel, {
      fontFamily: 'monospace', fontSize: '13px', color: lockColor,
    }).setOrigin(0.5).setDepth(2));
    lb.setInteractive({ useHandCursor: true });
    lb.on('pointerover', () => lb.setColor('#ffffff'));
    lb.on('pointerout', () => lb.setColor(lockColor));
    lb.on('pointerdown', () => this.cycleLock(width, height));
  }

  reroll(width, height) {
    if (this._rerolled) return;
    this._rerolled = true;
    this._choices = this.rollChoices(); // re-roll a fresh hand
    this._buildCards(width, height);
  }

  // Toggle banish-mode. While active, clicking a card banishes that axis from
  // future drafts this run (stored in run.banishedIds as 'weapon:axis' / 'secondary:axis').
  // Cancels on a second B press or after a banish is used. Max 2 banishes per run.
  toggleBanishMode(width, height) {
    const run = this.gs.run;
    const charges = 2 - (run.banishesUsed || 0);
    if (charges <= 0 && !this._banishMode) return; // no charges and not already in mode
    this._banishMode = !this._banishMode;
    this._buildCards(width, height); // rebuild to update button color + label
  }

  banishCard(c) {
    // stat cards and ability (ultimate) cards cannot be banished — only weapon/secondary axes.
    if (c.kind !== 'weapon' && c.kind !== 'secondary') {
      this._banishMode = false;
      this._buildCards(this.scale.width, this.scale.height);
      return;
    }
    const run = this.gs.run;
    if (!run.banishedIds) run.banishedIds = [];
    const key = `${c.kind}:${c.axis}`;
    if (!run.banishedIds.includes(key)) run.banishedIds.push(key);
    run.banishesUsed = (run.banishesUsed || 0) + 1;
    this._banishMode = false;
    this._choices = this.rollChoices(); // re-draw without the banished card
    this._buildCards(this.scale.width, this.scale.height);
  }

  // Cycle lock: if no card is locked, lock the first available card; if one is already
  // locked, clear it. The locked card is guaranteed to appear in the NEXT draft and is
  // cleared once it has been offered. Stored as run.lockedCardId ('kind:axis').
  cycleLock(width, height) {
    const run = this.gs.run;
    if (run.lockedCardId) {
      // unlock
      run.lockedCardId = null;
    } else {
      // lock the first non-stat card in the current draft (stats have no stable axis key)
      const lockable = this._choices.find((c) => c.kind === 'weapon' || c.kind === 'secondary' || c.kind === 'ability');
      if (!lockable) return;
      run.lockedCardId = `${lockable.kind}:${lockable.axis}`;
    }
    this._buildCards(width, height);
  }

  // A hero-stat card (offered when abilities are capped / to fill the pool).
  statCard(st) {
    const taken = Math.max(0, Math.round((this.gs.player.levelMods[st.mod[0]] || 0) / st.mod[1]));
    return {
      kind: 'stat', modKey: st.mod[0], amount: st.mod[1], group: 'Hero', tag: 'STAT',
      label: st.label, desc: st.desc, level: taken, color: st.color, icon: st.icon, weaponIcon: null,
    };
  }

  // Top a list of ability cards up to 5 with random hero-stat cards (so once abilities
  // max out and drop off, the level-up smoothly becomes a hero-stat choice).
  fillWithStats(cards) {
    if (cards.length >= 5) return cards.slice(0, 5);
    const stats = STAT_UPGRADES.map((st) => this.statCard(st));
    Phaser.Utils.Array.Shuffle(stats);
    return cards.concat(stats).slice(0, 5);
  }

  // Build an EVOLVE card for a weapon system (weapon or secondary).
  // This replaces all normal axis cards for that skill in the draft.
  _evolveCard(sys, kind) {
    const def = sys.def();
    const evo = def.evolution;
    const wIcon = this.textures.exists(`abil_icon_${def.id}`) ? `abil_icon_${def.id}` : `proj_${def.id}`;
    return {
      kind: 'evolve', evolveTarget: kind, // 'weapon' | 'secondary'
      group: def.name, tag: 'EVOLVE',
      label: evo.name, desc: evo.desc,
      level: sys.totalLevel(),
      color: 0xffd700, // golden
      icon: 'axis_effect', weaponIcon: wIcon,
    };
  }

  // Build a mutation card object for the draft (level/kind/etc. for buildCard).
  _mutationCard(m) {
    return {
      kind: 'mutation', mutId: m.id,
      group: 'Mutation', tag: 'MUTATION',
      label: m.name, desc: m.desc,
      level: 0, // mutations don't have levels; we show "✓ new" in buildCard instead
      color: m.color, icon: m.icon, weaponIcon: null,
    };
  }

  // Try to inject one mutation card into the draft (at most one, ~35% chance,
  // level ≥ 10 only, skips already-owned mutations). Returns the card or null.
  _rollMutation() {
    const gs = this.gs;
    const run = gs.run;
    // Only available from level 10 onwards
    if (gs.player.level < 10) return null;
    // ~35% chance a given draft contains one
    if (Math.random() > 0.35) return null;
    const owned = new Set(run.ownedMutations || []);
    const available = MUTATION_CARDS.filter((m) => !owned.has(m.id));
    if (!available.length) return null;
    const picked = available[Math.floor(Math.random() * available.length)];
    return this._mutationCard(picked);
  }

  rollChoices() {
    const gs = this.gs;
    const run = gs.run;
    const CAP = GAME.upgradeCap;
    const banished = new Set(run.banishedIds || []);

    // milestone level: ULTIMATE axes — unless the ultimate is maxed → hero stats
    if (this.ultimateLevel) {
      if (gs.ability.totalLevel() >= CAP) return this.fillWithStats([]);
      const aDef = getAbility(gs.ability.abilityId);
      const aIcon = this.textures.exists(`abil_icon_${aDef.id}`) ? `abil_icon_${aDef.id}` : `abil_${aDef.id}`;
      // data-driven flavored axes if the ability declares them, else the legacy 4
      if (aDef.axes) {
        return aDef.axes.map((a) => ({
          kind: 'ability', axis: a.slot, group: aDef.name, tag: 'ULTIMATE',
          label: a.label, desc: a.desc, level: gs.ability.points[a.slot],
          color: aDef.color, icon: `axis_${a.slot}`, weaponIcon: aIcon,
        }));
      }
      return ['power', 'haste', 'area', 'amount'].map((axis) => ({
        kind: 'ability', axis, group: aDef.name, tag: 'ULTIMATE',
        label: ABILITY_AXIS_INFO[axis].label,
        desc: axis === 'amount' ? aDef.amountLabel : ABILITY_AXIS_INFO[axis].desc,
        level: gs.ability.points[axis],
        color: aDef.color,
        icon: `axis_${axis}`,
        weaponIcon: aIcon,
      }));
    }

    // normal level: PRIMARY + SECONDARY axes — but only from abilities BELOW the cap.
    // Maxed weapons drop out; their slots fill with hero-stat upgrades.
    // Exception: a maxed skill that CAN evolve (cap + artifact) replaces its cards
    // with exactly ONE golden EVOLVE card in the pool.
    const pool = [];
    const evolveCards = []; // collected separately so they always make it into the draft

    const addAttack = (sys, def, tag) => {
      const kind = tag === 'PRIMARY' ? 'weapon' : 'secondary';
      // Check evolution eligibility FIRST: a maxed, evolvable skill shows only the evolve card.
      if (sys.canEvolve(run)) {
        evolveCards.push(this._evolveCard(sys, kind));
        return;
      }
      if (sys.totalLevel() >= CAP) return; // maxed, no evolution → no cards, fill with stats
      const wIcon = this.textures.exists(`abil_icon_${def.id}`) ? `abil_icon_${def.id}` : `proj_${def.id}`;
      const color = tag === 'PRIMARY' ? gs.theme.accent : def.color;
      // data-driven flavored axes if the skill declares them, else the legacy 4
      const axes = def.axes
        ? def.axes.map((a) => ({ axis: a.id, label: a.label, desc: a.desc, iconAxis: a.kind }))
        : ['damage', 'reach', 'speed', 'effect'].map((axis) => ({ axis, label: AXIS_INFO[axis].label, desc: axis === 'effect' ? def.effectLabel : AXIS_INFO[axis].desc, iconAxis: axis }));
      for (const a of axes) {
        if (banished.has(`${kind}:${a.axis}`)) continue; // player banished this axis
        pool.push({
          kind, axis: a.axis, group: def.name, tag, label: a.label, desc: a.desc,
          level: sys.points[a.axis], color, icon: `axis_${AXIS_ICON[a.iconAxis] || 'effect'}`, weaponIcon: wIcon,
        });
      }
    };
    addAttack(gs.weapons, getWeapon(gs.weapons.weaponId), 'PRIMARY');
    addAttack(gs.secondary, getSecondary(gs.secondary.weaponId), 'SECONDARY');

    Phaser.Utils.Array.Shuffle(pool);
    let chosen = pool.slice(0, 5);

    // Inject the locked card at the front if one is set (ensures it appears).
    // Cleared from run after the draft regardless of whether the player picks it.
    if (run.lockedCardId) {
      const [lockKind, lockAxis] = run.lockedCardId.split(':');
      // Check if it's already in the chosen set
      const alreadyThere = chosen.some((c) => c.kind === lockKind && c.axis === lockAxis);
      if (!alreadyThere) {
        // Find the card in the full pool (which may have been sliced off) or rebuild it
        const fromPool = pool.find((c) => c.kind === lockKind && c.axis === lockAxis);
        if (fromPool) {
          chosen = [fromPool, ...chosen.slice(0, 4)];
        }
      }
      // Clear the lock now that this draft has been offered
      run.lockedCardId = null;
    }

    // Prepend any evolution cards so they always appear (they're very rare and important).
    // They count toward the 5-card slot limit, pushing stat filler out.
    let final = [...evolveCards, ...chosen].slice(0, 5);
    final = this.fillWithStats(final);

    // Try to inject one mutation card (at most one per draft, ~35% at level 10+,
    // replaces the last card in the hand so total stays at 5).
    const mut = this._rollMutation();
    if (mut) {
      final[final.length - 1] = mut; // swap the last slot for the purple rarity card
      gs.events.emit('tut', 'mutation'); // tut: first mutation card offered
    }
    // tut: first evolve card offered
    if (final.some((c) => c.kind === 'evolve')) gs.events.emit('tut', 'evolve');
    return final;
  }

  buildCard(cx, cy, w, h, c, num, reg = (o) => o) {
    const top = cy - h / 2;
    const isEvolve = c.kind === 'evolve';
    const g = reg(this.add.graphics().setDepth(1));
    drawPanel(g, cx - w / 2, top, w, h, c.color, { header: 30 });

    const isMutation = c.kind === 'mutation';

    // Evolve cards get an extra golden border ring for immediate visual distinction.
    if (isEvolve) {
      const eg = reg(this.add.graphics().setDepth(1));
      eg.lineStyle(3, 0xffd700, 0.85);
      eg.strokeRect(cx - w / 2 + 2, top + 2, w - 4, h - 4);
    }
    // Mutation cards get a purple pulsing border so they immediately read as rare/exotic.
    if (isMutation) {
      const mg = reg(this.add.graphics().setDepth(1));
      mg.lineStyle(3, 0xb05aff, 0.9);
      mg.strokeRect(cx - w / 2 + 2, top + 2, w - 4, h - 4);
    }

    const tagColor = isEvolve ? '#ffd700'
      : isMutation ? '#cc88ff'
      : (c.kind === 'ability' ? Phaser.Display.Color.IntegerToColor(c.color).rgba : '#ffd27a');
    reg(this.add.text(cx, top + 16, `${num}. ${c.tag}`, {
      fontFamily: 'monospace', fontSize: '12px', color: tagColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2));
    reg(this.add.text(cx, top + 34, c.group, {
      fontFamily: 'monospace', fontSize: '10px', color: '#9a93c0',
      align: 'center', wordWrap: { width: w - 16 },
    }).setOrigin(0.5, 0).setDepth(2));

    // Make the ABILITY obvious: its emblem is the large centred icon, so the player
    // sees WHICH ability this card upgrades at a glance. The axis (the stat being
    // raised) reads from its smaller emblem badge + the bold label text below.
    const bigIcon = (c.weaponIcon && this.textures.exists(c.weaponIcon)) ? c.weaponIcon : c.icon;
    if (bigIcon && this.textures.exists(bigIcon)) {
      reg(this.add.image(cx, top + 86, bigIcon).setDepth(2));
    }
    // axis emblem badge (which STAT) — top-left of the ability icon
    if (this.textures.exists(c.icon) && c.icon !== bigIcon) {
      reg(this.add.image(cx - 30, top + 70, c.icon).setScale(0.6).setDepth(3));
    }

    reg(this.add.text(cx, top + 124, c.label, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2));
    reg(this.add.text(cx, top + 146, c.desc, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: w - 22 },
    }).setOrigin(0.5, 0).setDepth(2));
    // Mutation cards don't have levels — show a "once per run" badge instead.
    const footLabel = isMutation ? '✦ once per run' : `Lv ${c.level} ▸ ${c.level + 1}`;
    const footColor = isMutation ? '#cc88ff' : '#ffd27a';
    reg(this.add.text(cx, cy + h / 2 - 22, footLabel, {
      fontFamily: 'monospace', fontSize: '12px', color: footColor,
    }).setOrigin(0.5).setDepth(2));

    const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(3));
    zone.on('pointerover', () => g.setAlpha(0.82));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', () => this.pick(c));
  }

  pick(c) {
    // If banish mode is active, route card clicks to banishCard instead.
    if (this._banishMode) {
      this.banishCard(c);
      return;
    }
    const gs = this.gs;
    if (c.kind === 'weapon') gs.weapons.customize(c.axis);
    else if (c.kind === 'secondary') gs.secondary.customize(c.axis);
    else if (c.kind === 'ability') gs.ability.upgrade(c.axis);
    else if (c.kind === 'stat') gs.player.addLevelMod(c.modKey, c.amount); // permanent hero boost
    else if (c.kind === 'evolve') this._applyEvolve(c, gs);
    else if (c.kind === 'mutation') this._applyMutation(c, gs);

    gs.updateResonances(); // matching investments may unlock a resonance

    gs.pendingLevels = Math.max(0, gs.pendingLevels - 1);
    if (gs.pendingLevels > 0) {
      this.scene.restart({ gameScene: gs });
    } else {
      gs.levelingUp = false;
      this.scene.stop();
      this.scene.resume('GameScene');
    }
  }

  // Apply an EVOLVE pick: set the weapon system's evolved flag, play the fanfare,
  // show a banner, and emit a brief golden burst on the player.
  _applyEvolve(c, gs) {
    const sys = c.evolveTarget === 'weapon' ? gs.weapons : gs.secondary;
    sys.evolved = true;
    Audio.sfx('evolve');
    // Resume the game scene momentarily to fire the visual FX on the player sprite,
    // then immediately re-pause (the upgrade scene is still open; we only need one frame
    // of FX, not full game logic). We delegate to gs.onSkillEvolved() which is safe.
    if (typeof gs.onSkillEvolved === 'function') {
      gs.onSkillEvolved(sys);
    }
  }

  // Apply a MUTATION pick: set the flag on player.mutations and track in run.ownedMutations
  // so the same card can't appear again. A purple burst on the player marks the pickup.
  _applyMutation(c, gs) {
    if (!gs.player.mutations) gs.player.mutations = {};
    gs.player.mutations[c.mutId] = true;
    if (!gs.run.ownedMutations) gs.run.ownedMutations = [];
    if (!gs.run.ownedMutations.includes(c.mutId)) gs.run.ownedMutations.push(c.mutId);
    Audio.sfx('levelup');
    // Violet shockwave so the pick stands out from normal ability upgrades.
    if (typeof gs.onMutationPicked === 'function') gs.onMutationPicked(c.mutId);
  }
}
