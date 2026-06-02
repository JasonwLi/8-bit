// The character's SECONDARY attack — a complementary partner to the primary
// weapon (same damage type: melee pairs with melee, ranged with ranged). Fired
// manually (K) on a ~3s cooldown, and exhaust-gated in duels. Reuses the weapon
// `kind`s so WeaponSystem can drive both the primary and the secondary; it scales
// along the SAME axes as weapons (damage / reach / speed / effect) so it slots
// straight into the level-up pool alongside the primary.
export const SECONDARIES = {
  // Lü Bu — a straight-line LANCE THRUST: a fast spear that flies forward, pierces
  // a whole line of enemies, and reaches far. Complements the wide close sweep with
  // long single-line poke.
  thrust_sky: {
    id: 'thrust_sky',
    name: 'Sky Piercer Thrust',
    kind: 'projectile_aimed',
    color: 0xffe08a,
    base: { damage: 60, cooldown: 3000, count: 1, pierce: 6, speed: 820, spread: 0 }, // a HEAVY piercing lance thrust — hits hard, skewers a whole line
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 0.34, piercePerPoint: 0.6 },
    effectLabel: '+pierce / reach',
    projScale: 1.7, // a big bold lance, not a dinky arrow
    // BLEED: each skewer leaves a wound — 1 HP/sec for 10s, STACKING up to 8 (re-hit
    // refreshes the timer), so sustained pressure on a tanky target really adds up.
    bleed: { dps: 1, duration: 10000, stackMax: 8 },
  },

  // Nobunaga — a RAPID BURST: fires 3 fast precise shots in quick succession toward
  // the target, with only a tiny spread. The marksman's follow-up — reinforces the
  // kiting identity (rapid aimed shots) vs the wide scattershot it replaced.
  scattershot: {
    id: 'scattershot',
    name: 'Rapid Burst',
    kind: 'burst_aimed',
    color: 0xffe08a,
    base: { damage: 18, cooldown: 3200, count: 3, pierce: 2, speed: 700, spread: 6, burstDelay: 100 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 0.34, piercePerPoint: 0.5 },
    effectLabel: '+shots / pierce',
  },

  // Belisarius — a 360° GREEK FIRE NOVA that erupts around you (anti-swarm when
  // surrounded). Shape-distinct from BOTH the lobbed primary pools and the
  // forward-charging Cataphract ultimate (radial burst vs lob vs charge).
  fireburst: {
    id: 'fireburst',
    name: 'Greek Fire Nova',
    kind: 'projectile_radial',
    color: 0xff7b1c,
    base: { damage: 16, cooldown: 3000, count: 12, pierce: 1, speed: 380 }, // ring of fire bolts
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 1, piercePerPoint: 0.34 },
    effectLabel: '+flames / pierce',
  },

  // Gilgamesh — GATE OF BABYLON: unleashes a wide forward FAN of golden piercing
  // spears (the king's treasures), distinct from his 360° radial primary.
  gate_spear: {
    id: 'gate_spear',
    name: 'Gate of Babylon',
    kind: 'projectile_aimed',
    color: 0xffd700,
    base: { damage: 22, cooldown: 3400, count: 7, pierce: 8, speed: 720, spread: 58 }, // a fan of golden spears
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 0.5, piercePerPoint: 0.5 },
    effectLabel: '+spears / pierce',
  },

  // Caesar — PILUM VOLLEY: three heavy javelins hurled toward the target, each
  // piercing through a column of enemies. Complements the close gladius sweep.
  pilum_volley: {
    id: 'pilum_volley',
    name: 'Pilum Volley',
    kind: 'projectile_aimed',
    color: 0xc0a060,
    base: { damage: 48, cooldown: 3200, count: 3, pierce: 3, speed: 680, spread: 14 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 1, piercePerPoint: 0.75 }, // +pila / pierce
    effectLabel: '+pila / pierce',
    knockback: 40, // heavy pila SHOVE foes back on hit (unique among secondaries)
  },

  // Alexander — COMPANION JAVELINS: a staggered burst of cavalry javelins, distinct
  // from the forward sarissa sweep. Reinforces the combined-arms identity.
  companion_javelin: {
    id: 'companion_javelin',
    name: 'Companion Javelins',
    kind: 'burst_aimed',
    color: 0x4a90d9,
    base: { damage: 30, cooldown: 3000, count: 4, pierce: 2, speed: 720, spread: 10, burstDelay: 80 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 1, piercePerPoint: 0.75 }, // +javelins / pierce
    effectLabel: '+javelins / pierce',
    slow: { factor: 0.5, dur: 1600 }, // pinning javelins SLOW struck foes (unique)
  },

  // Genghis — PARTHIAN STORM: a full 360° hail of arrows from horseback PLUS a burst
  // of speed (selfBuffs below) — the feigned-retreat kite. The speed surge also feeds
  // his Mounted Volley primary (which fires faster the faster he rides). Anti-swarm.
  arrow_storm: {
    id: 'arrow_storm',
    name: 'Parthian Storm',
    kind: 'projectile_radial',
    color: 0xd2a04a,
    base: { damage: 24, cooldown: 3200, count: 10, pierce: 1, speed: 560 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { countPerPoint: 1, piercePerPoint: 0.5 }, // +arrows
    effectLabel: '+arrows',
    selfBuffs: [{ kind: 'speed', mult: 1.35, dur: 2500 }], // Parthian kiting burst (unique)
  },

  // Ragnar — SHIELD BASH: a wide arc slam with the round shield, knocking foes back.
  // Melee complement to the axe throws — up-close crowd control.
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    kind: 'melee_arc',
    color: 0xb0b0c0,
    base: { damage: 55, cooldown: 3000, radius: 90, arc: 180 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { arcPerPoint: 20, damagePerPoint: 0.08 }, // wider bash / damage
    effectLabel: 'wider bash / damage',
    knockback: 58, // shoves foes back on the bash
    selfBuffs: [{ kind: 'defense', mult: 0.5, dur: 1800 }], // raise the shield — brief block (unique)
    bashFx: true, // render the shield-slam visual instead of the shared melee 'sweep'
  },
};

export function getSecondary(id) {
  return SECONDARIES[id];
}
