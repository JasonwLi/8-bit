// The character's SECONDARY attack — a complementary partner to the primary
// weapon (same damage type: melee pairs with melee, ranged with ranged). Fired
// manually (K) on a ~3s cooldown, and exhaust-gated in duels. Reuses the weapon
// `kind`s so WeaponSystem can drive both the primary and the secondary; it scales
// along its own flavored axes declared below.
export const SECONDARIES = {
  // Lü Bu — a straight-line LANCE THRUST: a fast spear that flies forward, pierces
  // a whole line of enemies, and reaches far. Complements the wide close sweep with
  // long single-line poke.
  thrust_sky: {
    id: 'thrust_sky',
    name: 'Sky Piercer Thrust',
    kind: 'projectile_aimed',
    color: 0xffe08a,
    base: {
      damage: 60, cooldown: 2200, count: 1, pierce: 6, speed: 820, spread: 0,
      pierceAll: true,
      knockback: 18,
      // BLEED: each skewer leaves a wound — 1 HP/sec for 10s, STACKING up to 8
      bleed: { dps: 1, duration: 10000, stackMax: 8 },
    },
    projScale: 1.7, // a big bold lance, not a dinky arrow
    axes: [
      { id: 'dmg',      kind: 'dmg',       label: 'Heavy Lance',  desc: '+16% lance damage per point' },
      { id: 'size',     kind: 'size',       label: 'Long Reach',   desc: '+12% throw range per point' },
      { id: 'blood',    kind: 'bleed',      label: 'Hemorrhage',   desc: '+1.2 bleed dps & +1 stack cap per point', per: 1.2 },
      { id: 'impale',   kind: 'knockback',  label: 'Impale',       desc: '+16px knockback per point' },
    ],
  },

  // Nobunaga — a RAPID BURST: fires 3 fast precise shots in quick succession toward
  // the target, with only a tiny spread. The marksman's follow-up — reinforces the
  // kiting identity (rapid aimed shots) vs the wide scattershot it replaced.
  scattershot: {
    id: 'scattershot',
    name: 'Rapid Burst',
    kind: 'burst_aimed',
    color: 0xffe08a,
    base: { damage: 18, cooldown: 2400, count: 3, pierce: 2, speed: 700, spread: 6, burstDelay: 100 },
    axes: [
      { id: 'dmg',    kind: 'dmg',         label: 'Heavy Shot',      desc: '+16% shot damage per point' },
      { id: 'count',  kind: 'count',        label: 'Longer Burst',    desc: '+1 shot per point', per: 1 },
      { id: 'cd',     kind: 'cadence',      label: 'Quickload',       desc: '−7% cooldown per point' },
      { id: 'armor',  kind: 'armorpierce',  label: 'Armor-Piercing',  desc: 'Any point enables armor-pierce' },
    ],
  },

  // Belisarius — a 360° GREEK FIRE NOVA that erupts around you (anti-swarm when
  // surrounded). Shape-distinct from BOTH the lobbed primary pools and the
  // forward-charging Cataphract ultimate (radial burst vs lob vs charge).
  fireburst: {
    id: 'fireburst',
    name: 'Greek Fire Nova',
    kind: 'projectile_radial',
    color: 0xff7b1c,
    base: {
      damage: 16, cooldown: 2200, count: 12, pierce: 1, speed: 380,
      leaveBurn: { radius: 36, dmg: 5, dur: 1100 },
    },
    axes: [
      { id: 'dmg',    kind: 'dmg',        label: 'Hotter',           desc: '+16% flame damage per point' },
      { id: 'count',  kind: 'count',      label: 'More Flames',      desc: '+1 fire bolt per point', per: 1 },
      { id: 'burn',   kind: 'burnpatch',  label: 'Lingering Embers', desc: 'Bolts leave fire patches; more points extend them' },
      { id: 'cd',     kind: 'cadence',    label: 'Cadence',          desc: '−7% cooldown per point' },
    ],
  },

  // Gilgamesh — GATE OF BABYLON: the king's treasury yawns open and looses a volley of
  // golden spears that HOME — each curves through the air to hunt down the nearest foe
  // (fire-and-forget while he tanks in his orbital blades). The roster's only seeking
  // weapon: not a forward fan (Caesar) and not a radial nova (Belisarius).
  gate_spear: {
    id: 'gate_spear',
    name: 'Gate of Babylon',
    kind: 'projectile_aimed',
    color: 0xffd700,
    base: {
      damage: 26, cooldown: 2600, count: 8, pierce: 2, speed: 540, spread: 110,
      knockback: 14,
      homing: { range: 420, turn: 0.13 }, // seek + curve toward the nearest un-hit enemy
    },
    projScale: 1.2,
    axes: [
      { id: 'dmg',      kind: 'dmg',       label: 'Gilded Edge',    desc: '+16% spear damage per point' },
      { id: 'count',    kind: 'count',      label: 'Open the Gate',  desc: '+1 seeking spear per point', per: 1 },
      { id: 'treasury', kind: 'knockback',  label: 'Treasury Force', desc: '+16px knockback per point' },
      { id: 'hunt',     kind: 'pierce',     label: 'Relentless',     desc: '+1 foe each spear hunts down per point' },
    ],
  },

  // Caesar — PILUM VOLLEY: three heavy javelins hurled toward the target, each
  // piercing through a column of enemies. Complements the close gladius sweep.
  pilum_volley: {
    id: 'pilum_volley',
    name: 'Pilum Volley',
    kind: 'projectile_aimed',
    color: 0xc0a060,
    base: {
      damage: 48, cooldown: 2400, count: 3, pierce: 3, speed: 680, spread: 14,
      pierceAll: true,
      knockback: 40,
    },
    axes: [
      { id: 'dmg',    kind: 'dmg',       label: 'Damage',       desc: '+16% pilum damage per point' },
      { id: 'count',  kind: 'count',     label: 'More Pila',    desc: '+1 pilum per point', per: 1 },
      { id: 'heavy',  kind: 'knockback', label: 'Heavier Pila', desc: '+16px knockback per point' },
      { id: 'cd',     kind: 'cadence',   label: 'Cadence',      desc: '−7% cooldown per point' },
    ],
  },

  // Alexander — COMPANION JAVELINS: a staggered burst of cavalry javelins, distinct
  // from the forward sarissa sweep. Reinforces the combined-arms identity.
  companion_javelin: {
    id: 'companion_javelin',
    name: 'Companion Javelins',
    kind: 'burst_aimed',
    color: 0x4a90d9,
    base: {
      damage: 30, cooldown: 2200, count: 4, pierce: 2, speed: 720, spread: 10, burstDelay: 80,
      slow: { factor: 0.5, dur: 1600 },
    },
    axes: [
      { id: 'dmg',    kind: 'dmg',     label: 'Damage',         desc: '+16% javelin damage per point' },
      { id: 'count',  kind: 'count',   label: 'More Javelins',  desc: '+1 javelin per point', per: 1 },
      { id: 'pin',    kind: 'slow',    label: 'Pinning',        desc: 'Stronger + longer slow per point' },
      { id: 'cd',     kind: 'cadence', label: 'Cadence',        desc: '−7% cooldown per point' },
    ],
  },

  // Genghis — KHAN'S CLEAVE: a heavy saber slash in a frontal arc that STUNS every foe
  // it hits for 1s (frozen — no move, no attack). His control tool: peel a melee swarm
  // off you / lock a pack in place, then stream arrows into them. Distinct from his
  // rapid-arrow primary (damage) and the Encirclement ult.
  arrow_storm: {
    id: 'arrow_storm',
    name: "Khan's Cleave",
    kind: 'melee_arc',
    color: 0xd2a04a,
    base: { damage: 28, cooldown: 2200, radius: 96, arc: 160, stun: 1000 },
    sweepTex: 'fx_cleave', // distinct saber-slash visual (not the generic gold crescent)
    axes: [
      { id: 'dmg',   kind: 'dmg',      label: 'Damage',      desc: '+16% cleave damage per point' },
      { id: 'arc',   kind: 'arc',      label: 'Wider Arc',   desc: '+24° arc per point' },
      { id: 'stun',  kind: 'stun',     label: 'Concussion',  desc: '+250ms stun duration per point' },
      { id: 'cd',    kind: 'cadence',  label: 'Cadence',     desc: '−7% cooldown per point' },
    ],
  },

  // Ragnar — SHIELD BASH: a wide arc slam with the round shield, knocking foes back.
  // Melee complement to the axe throws — up-close crowd control.
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    kind: 'melee_arc',
    color: 0xb0b0c0,
    base: { damage: 55, cooldown: 2200, radius: 90, arc: 180, knockback: 58, stun: 500 },
    selfBuffs: [{ kind: 'defense', mult: 0.5, dur: 1800 }], // raise the shield — brief block (unique)
    bashFx: true, // render the shield-slam visual instead of the shared melee 'sweep'
    axes: [
      { id: 'dmg',    kind: 'dmg',       label: 'Damage',       desc: '+16% bash damage per point' },
      { id: 'kb',     kind: 'knockback',  label: 'Mighty Bash',  desc: '+16px knockback per point' },
      { id: 'stun',   kind: 'stun',       label: 'Stagger',      desc: '+250ms stun duration per point' },
      { id: 'arc',    kind: 'arc',        label: 'Wider Bash',   desc: '+24° bash arc per point' },
    ],
  },
};

export function getSecondary(id) {
  return SECONDARIES[id];
}
