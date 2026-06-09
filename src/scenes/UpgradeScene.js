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

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.8).setOrigin(0).setDepth(0);
    this.add.text(width / 2, height / 2 - 190, 'LEVEL UP!', {
      fontFamily: 'monospace', fontSize: '38px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);
    // which level this choice is for (handles multi-level-ups: lowest pending first)
    this.choiceLevel = gs.player.level - gs.pendingLevels + 1;
    this.ultimateLevel = this.choiceLevel % 5 === 0;

    const choices = this.rollChoices();
    const allStats = choices.every((c) => c.kind === 'stat');
    const subtitle = allStats
      ? 'Hero stat upgrade — choose one'
      : (this.ultimateLevel ? `★ Lv ${this.choiceLevel} — ULTIMATE upgrade (every 5 levels)` : 'Upgrade your attacks — choose one');
    this.add.text(width / 2, height / 2 - 152, subtitle, {
      fontFamily: 'monospace', fontSize: '15px', color: this.ultimateLevel && !allStats ? '#ffd700' : '#c9c4e0',
    }).setOrigin(0.5).setDepth(1);

    const cardW = 168;
    const cardH = 212;
    const gap = 12;
    const total = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (width - total) / 2 + cardW / 2;
    const cy = height / 2 + 24;
    choices.forEach((c, i) => this.buildCard(startX + i * (cardW + gap), cy, cardW, cardH, c, i + 1));

    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length) this.pick(choices[n - 1]);
    });
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

  rollChoices() {
    const gs = this.gs;
    const CAP = GAME.upgradeCap;

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
    const pool = [];
    const addAttack = (sys, def, tag) => {
      if (sys.totalLevel() >= CAP) return; // this ability is maxed → no more upgrade cards
      const wIcon = this.textures.exists(`abil_icon_${def.id}`) ? `abil_icon_${def.id}` : `proj_${def.id}`;
      const color = tag === 'PRIMARY' ? gs.theme.accent : def.color;
      const kind = tag === 'PRIMARY' ? 'weapon' : 'secondary';
      // data-driven flavored axes if the skill declares them, else the legacy 4
      const axes = def.axes
        ? def.axes.map((a) => ({ axis: a.id, label: a.label, desc: a.desc, iconAxis: a.kind }))
        : ['damage', 'reach', 'speed', 'effect'].map((axis) => ({ axis, label: AXIS_INFO[axis].label, desc: axis === 'effect' ? def.effectLabel : AXIS_INFO[axis].desc, iconAxis: axis }));
      for (const a of axes) {
        pool.push({
          kind, axis: a.axis, group: def.name, tag, label: a.label, desc: a.desc,
          level: sys.points[a.axis], color, icon: `axis_${AXIS_ICON[a.iconAxis] || 'effect'}`, weaponIcon: wIcon,
        });
      }
    };
    addAttack(gs.weapons, getWeapon(gs.weapons.weaponId), 'PRIMARY');
    addAttack(gs.secondary, getSecondary(gs.secondary.weaponId), 'SECONDARY');

    Phaser.Utils.Array.Shuffle(pool);
    return this.fillWithStats(pool.slice(0, 5));
  }

  buildCard(cx, cy, w, h, c, num) {
    const top = cy - h / 2;
    const g = this.add.graphics().setDepth(1);
    drawPanel(g, cx - w / 2, top, w, h, c.color, { header: 30 });

    const tagColor = c.kind === 'ability' ? Phaser.Display.Color.IntegerToColor(c.color).rgba : '#ffd27a';
    this.add.text(cx, top + 16, `${num}. ${c.tag}`, {
      fontFamily: 'monospace', fontSize: '12px', color: tagColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(cx, top + 34, c.group, {
      fontFamily: 'monospace', fontSize: '10px', color: '#9a93c0',
      align: 'center', wordWrap: { width: w - 16 },
    }).setOrigin(0.5, 0).setDepth(2);

    // Make the ABILITY obvious: its emblem is the large centred icon, so the player
    // sees WHICH ability this card upgrades at a glance. The axis (the stat being
    // raised) reads from its smaller emblem badge + the bold label text below.
    const bigIcon = (c.weaponIcon && this.textures.exists(c.weaponIcon)) ? c.weaponIcon : c.icon;
    if (bigIcon && this.textures.exists(bigIcon)) {
      this.add.image(cx, top + 86, bigIcon).setDepth(2);
    }
    // axis emblem badge (which STAT) — top-left of the ability icon
    if (this.textures.exists(c.icon) && c.icon !== bigIcon) {
      this.add.image(cx - 30, top + 70, c.icon).setScale(0.6).setDepth(3);
    }

    this.add.text(cx, top + 124, c.label, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(cx, top + 146, c.desc, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: w - 22 },
    }).setOrigin(0.5, 0).setDepth(2);
    this.add.text(cx, cy + h / 2 - 22, `Lv ${c.level} ▸ ${c.level + 1}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd27a',
    }).setOrigin(0.5).setDepth(2);

    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(3);
    zone.on('pointerover', () => g.setAlpha(0.82));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', () => this.pick(c));
  }

  pick(c) {
    const gs = this.gs;
    if (c.kind === 'weapon') gs.weapons.customize(c.axis);
    else if (c.kind === 'secondary') gs.secondary.customize(c.axis);
    else if (c.kind === 'ability') gs.ability.upgrade(c.axis);
    else if (c.kind === 'stat') gs.player.addLevelMod(c.modKey, c.amount); // permanent hero boost
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
}
