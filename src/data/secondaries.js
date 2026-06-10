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
    // EVOLVE — Sky Rend: the lance SLAMS down as a pillar of lightning at the target,
    // erupting into a radial shockwave that bleed-infects all nearby foes (100px radius).
    // No projectile — purely local AOE burst.
    evolution: {
      name: 'Sky Rend',
      desc: 'The lance slams down from above — divine shockwave (100px) bleed-infects all nearby foes.',
      overlay: {
        // skyRend: true switches castManual from projectile to shockwave path
        skyRend: true,
        skyRendRadius: 100,
        skyRendBleed: { dps: 3, duration: 10000, stackMax: 12 },
        skyRendKnockback: 28,
        damage: 96,        // ×1.6 vs maxed base
      },
    },
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
    // EVOLVE — Iron Rain: burst doubles, shots gain homing, spread widens to 40°.
    // The blossoming fan curves inward — nearly impossible to dodge in a crowd.
    evolution: {
      name: 'Iron Rain',
      desc: 'Burst ×2, homing shots, 40° wide spread — the fan blossoms then curves into targets.',
      overlay: {
        damage: 29,        // ×1.65 vs base (axes scale further)
        count: 6,          // base count ×2 (3→6; axis points add on top)
        spread: 40,
        armorPierce: true,
        homing: { range: 340, turn: 0.11 },
      },
    },
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
    // EVOLVE — Hellfire Crown: nova bolts gain homing + each leaves a lasting fire zone.
    // Defensive burst becomes an aggressive seeking firestorm flooding the arena.
    evolution: {
      name: 'Hellfire Crown',
      desc: 'Nova bolts home onto enemies. Each hit spawns a fire zone (52px, 2.2s). +4 bolts, ×1.6 dmg.',
      overlay: {
        damage: 25,        // ×1.6 vs base (axes scale further)
        count: 16,         // 12+4 unconditionally on evolution base
        homing: { range: 320, turn: 0.10 },
        leaveBurn: { radius: 52, dmg: 10, dur: 2200 },
      },
    },
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
    // EVOLVE — Vault of Eternity: spear count ×2, each leaves a 3s golden fire zone.
    // Map-control tool — the Gate permanently threatens wherever spears land.
    evolution: {
      name: 'Vault of Eternity',
      desc: 'Spear count ×2 (8→16). Every impact spawns a golden fire zone (58px, 3s). ×1.7 dmg.',
      overlay: {
        damage: 44,        // ×1.7 vs base
        count: 16,         // 8*2 (axes add on top)
        knockback: 21,     // ×1.5
        leaveBurn: { radius: 58, dmg: 12, dur: 3000 },
        homing: { range: 420, turn: 0.13 },
      },
    },
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
    // EVOLVE — Legion's Thunder: count ×3 (3→9), each javelin leaves a trample zone.
    // Massed throw creates a wall of churned-earth zones — a zone-denial barrage.
    evolution: {
      name: "Legion's Thunder",
      desc: 'Pilum count ×3 (3→9). Each javelin plants a trample zone (55px, 2s) on impact.',
      overlay: {
        damage: 79,        // ×1.65 vs base
        count: 9,          // ×3 (axes add on top)
        spread: 21,        // ×1.5 spread for wider fan
        // leaveTramp flag: checked in onProjectileHit alongside leaveBurn
        leaveTramp: { radius: 55, dmg: 18, linger: 2000 },
      },
    },
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
    // EVOLVE — Companion Charge: javelins gain homing + freeze (1200ms stun) on first hit.
    // Cavalry lances arc and pin warriors in place — hard lock-down finisher.
    evolution: {
      name: 'Companion Charge',
      desc: 'Javelins home onto targets. First hit stuns for 1.2 s. +2 javelins, ×1.7 dmg.',
      overlay: {
        damage: 51,        // ×1.7 vs base
        count: 6,          // 4+2
        burstDelay: 60,    // tighter stagger
        homing: { range: 380, turn: 0.12 },
        stunMs: 1200,      // full freeze on non-boss targets
        slow: { factor: 0.3, dur: 800 }, // also slow (non-stun targets / bosses)
      },
    },
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
    // EVOLVE — Thunderous Cleave: arc radius ×2 (96→192), 2s stun, then a caltrop field
    // covers the entire arc zone. Stunned enemies stand helpless in caltrops.
    evolution: {
      name: 'Thunderous Cleave',
      desc: 'Arc ×2 radius (192px), 2 s stun — then a caltrop field blankets the arc. Ultimate setup combo.',
      overlay: {
        damage: 46,        // ×1.65 vs base
        radius: 192,       // ×2
        stunMs: 2000,      // override axis scaling
        // afterCleaveCaltrops flag: fireMeleeArc spawns a caltrop field when this is set
        afterCleaveCaltrops: true,
      },
    },
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
    // EVOLVE — Mjolnir's Echo: after the bash, fires 3 homing radial shield-echo
    // projectiles that chase the scattered survivors. Bash → shields pursue.
    evolution: {
      name: "Mjolnir's Echo",
      desc: 'After the bash, 3 homing shield echoes chase knocked-back foes. ×1.7 bash dmg.',
      overlay: {
        damage: 93,        // ×1.7 vs base
        // mjolnirEcho flag: fireMeleeArc spawns 3 homing projectiles after the arc
        mjolnirEcho: true,
        mjolnirEchoDmgMult: 0.7, // each echo deals 70% of the bash damage
      },
    },
  },
};

export function getSecondary(id) {
  return SECONDARIES[id];
}
