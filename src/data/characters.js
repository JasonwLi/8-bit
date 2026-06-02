// Playable historical figures. `palette` drives the procedural placeholder art
// (and documents the intended color identity for real sprites later).
// Each character has three attack tiers: `startingWeapon` (primary, auto-fires;
// data/weapons.js), `secondary` (complementary manual attack, ~3s CD;
// data/secondaries.js), and `ultimate` (manual SPACE, ~10s CD; data/abilities.js).
export const CHARACTERS = [
  {
    id: 'lubu',
    name: 'Lü Bu',
    civ: 'Three Kingdoms China',
    civId: 'china',
    blurb: 'Peerless warrior. Sweeps all before him with Sky Piercer.',
    startingWeapon: 'halberd_sweep',
    secondary: 'thrust_sky',
    ultimate: 'warcry',
    // attack = damage mult; defense/rangedDefense = damage reduction; regen = HP/sec
    stats: { maxHp: 130, speed: 210, attack: 1.15, defense: 0.08, rangedDefense: 0.0, lifesteal: 0.04, regen: 0.025, pickup: 105, luck: 0 },
    palette: {
      skin: 0xe2b0a0,
      primary: 0x8a1c1c, // crimson armor
      secondary: 0xd4af37, // gold trim
      accent: 0x2b2b2b, // dark lacquer
      plume: 0x2e7d32, // green pheasant-tail plume
    },
  },
  {
    id: 'nobunaga',
    name: 'Oda Nobunaga',
    civ: 'Sengoku Japan',
    civId: 'japan',
    blurb: 'The Demon King. Piercing Tanegashima shots pick off foes at extreme range.',
    startingWeapon: 'matchlock_volley',
    secondary: 'scattershot',
    ultimate: 'barrage',
    stats: { maxHp: 90, speed: 230, attack: 1.0, defense: 0.0, rangedDefense: 0.06, lifesteal: 0, regen: 0.025, pickup: 115, luck: 1 },
    palette: {
      skin: 0xe2b0a0,
      primary: 0x1b1b2f, // dark nanban armor
      secondary: 0xb8002e, // red cape
      accent: 0xd4af37,
      plume: 0xf5f5f5,
    },
  },
  {
    id: 'belisarius',
    name: 'Belisarius',
    civ: 'Byzantine Empire',
    civId: 'byzantium',
    blurb: 'Last of the Romans. Hurls Greek fire across the field.',
    startingWeapon: 'greek_fire',
    secondary: 'fireburst',
    ultimate: 'cataphract',
    stats: { maxHp: 110, speed: 200, attack: 1.0, defense: 0.1, rangedDefense: 0.06, lifesteal: 0, regen: 0.03, pickup: 108, luck: 0 },
    palette: {
      skin: 0xddae93,
      primary: 0x6a3fb0, // imperial purple
      secondary: 0xd4af37, // gold lamellar
      accent: 0xeaeaea,
      plume: 0xb8002e,
    },
  },
  {
    id: 'gilgamesh',
    name: 'Gilgamesh',
    civ: 'Sumer / Uruk',
    civId: 'sumer',
    blurb: 'Two-thirds god. Golden blades orbit from his treasury, shredding the swarm.',
    startingWeapon: 'divine_arsenal',
    secondary: 'gate_spear',
    ultimate: 'meteors',
    stats: { maxHp: 140, speed: 195, attack: 1.12, defense: 0.06, rangedDefense: 0.0, lifesteal: 0.03, regen: 0.03, pickup: 105, luck: 2 },
    palette: {
      skin: 0xc99a6a,
      primary: 0x14506e, // lapis blue
      secondary: 0xd4af37, // gold
      accent: 0x0e3346,
      plume: 0xffd700,
    },
  },
  {
    id: 'caesar',
    name: 'Julius Caesar',
    civ: 'Rome',
    civId: 'rome',
    blurb: 'Dictator of Rome. Disciplined gladius work and a legion shield-wall.',
    startingWeapon: 'gladius',
    secondary: 'pilum_volley',
    ultimate: 'testudo',
    stats: { maxHp: 120, speed: 205, attack: 1.1, defense: 0.10, rangedDefense: 0.04, lifesteal: 0.02, regen: 0.028, pickup: 108, luck: 0 },
    palette: {
      skin: 0xe2b0a0,
      primary: 0xb02a2a, // crimson armor
      secondary: 0xd4af37, // gold trim
      accent: 0xcfd6e0, // steel
      plume: 0xb02a2a,
    },
  },
  {
    id: 'alexander',
    name: 'Alexander the Great',
    civ: 'Macedon',
    civId: 'macedon',
    blurb: 'Undefeated conqueror, hailed son of Amun-Ra in Egypt. Long sarissa reach and the sweeping Wrath of Ra.',
    startingWeapon: 'sarissa',
    secondary: 'companion_javelin',
    ultimate: 'wrath_of_ra',
    stats: { maxHp: 110, speed: 220, attack: 1.08, defense: 0.06, rangedDefense: 0.05, lifesteal: 0.03, regen: 0.027, pickup: 110, luck: 1 },
    palette: {
      skin: 0xe2b0a0,
      primary: 0x2a4d8f, // Macedonian blue
      secondary: 0xd4af37, // gold trim
      accent: 0xcfd6e0, // steel
      plume: 0xffffff,
    },
  },
  {
    id: 'genghis',
    name: 'Genghis Khan',
    civ: 'Mongolia',
    civId: 'mongolia',
    blurb: 'The Great Khan. Lure the horde — ride hard and leave a trail of caltrop fields that shred whatever chases you.',
    startingWeapon: 'composite_bow',
    secondary: 'arrow_storm',
    ultimate: 'sky_arrows',
    stats: { maxHp: 100, speed: 230, attack: 1.05, defense: 0.02, rangedDefense: 0.06, lifesteal: 0, regen: 0.026, pickup: 114, luck: 2 },
    palette: {
      skin: 0xd9a878,
      primary: 0x4a3a28, // dark leather
      secondary: 0xb8860b, // dark gold
      accent: 0x2a2018,
      plume: 0xd2a04a,
    },
  },
  {
    id: 'ragnar',
    name: 'Ragnar Lothbrok',
    civ: 'Norse',
    civId: 'norse',
    blurb: 'Terror of the northern seas. Spinning axes and a berserker rage.',
    startingWeapon: 'axe_throw',
    secondary: 'shield_bash',
    ultimate: 'berserker',
    stats: { maxHp: 135, speed: 210, attack: 1.12, defense: 0.05, rangedDefense: 0.0, lifesteal: 0.04, regen: 0.03, pickup: 106, luck: 0 },
    palette: {
      skin: 0xe0b080,
      primary: 0x5a3c28, // dark brown furs
      secondary: 0xb0b0c0, // iron-grey
      accent: 0x8a6030,
      plume: 0xffd700,
    },
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
