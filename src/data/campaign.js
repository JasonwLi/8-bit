import { getCharacter } from './characters.js';
import { CIV_LIEUTENANTS } from './bosses.js';
import { DUNGEON } from '../config.js';

// Campaign structure: a champion conquers the OTHER civilizations (not their own),
// then faces a final stage. Each civ stage's boss is that civ's champion.
export const CIV_ORDER = ['china', 'japan', 'byzantium', 'sumer', 'rome', 'macedon', 'mongolia', 'norse'];

export const CIV_BOSS = {
  china: 'caocao',
  japan: 'hideyoshi',
  byzantium: 'justinian',
  sumer: 'enkidu',
  rome: 'pompey',
  macedon: 'philip',
  mongolia: 'subutai',
  norse: 'hardrada',
};

export const CIV_NAME = {
  china: 'Three Kingdoms China',
  japan: 'Sengoku Japan',
  byzantium: 'Byzantine Empire',
  sumer: 'Sumer / Uruk',
  rome: 'Rome',
  macedon: 'Macedon',
  mongolia: 'Mongol Empire',
  norse: 'Norse Scandinavia',
};

// A fresh run for a chosen champion. Progression is carried across stages.
export function newRun(characterId) {
  const c = getCharacter(characterId);
  return {
    characterId,
    ownCiv: c.civId,
    conquered: [], // civIds defeated
    artifacts: [], // artifact ids carried forward
    level: 1,
    xp: 0,
    weaponPoints: { damage: 0, reach: 0, speed: 0, effect: 0 },
    abilityPoints: { power: 0, haste: 0, area: 0, amount: 0 },
    equipment: {}, // slotId -> item
    currentCiv: null, // the civ currently being invaded
    final: false, // currently on the final stage
    contracts: [], // active difficulty contracts for the upcoming stage
    artifactBonus: 0, // extra artifact choices granted by contracts
    stageTime: 0, // (legacy) ms elapsed in the current stage — superseded by `floor` for resume
    floor: 1, // current floor within the stage (1-based) — the dungeon descent
    floorSeed: (Math.random() * 1e9) | 0, // base seed; per-floor seed = floorSeed + floor
    bossPhase: 0, // which boss in the stage sequence is next
    kills: 0,
    runTimeTotal: 0,
  };
}

// How many floors this stage has (final stage is deeper).
export function floorsForStage(run) {
  return run.final ? DUNGEON.floorsFinal : DUNGEON.floorsPerStage;
}

// Map the boss SEQUENCE onto floor numbers so the last boss sits on the last floor.
// floor for boss i of N over F floors: round(F·(i+1)/N).
//   civ stage:   N=3 (2 lieutenants + champion), F=15 → {5:0, 10:1, 15:2}
//   final stage: N=9 (8 civ champions + Xerxes), F=30 → {3,7,10,13,17,20,23,27,30}
export function bossFloorsFor(run) {
  const seq = bossSequence(run);
  const F = floorsForStage(run);
  const N = seq.length;
  const map = {}; // floorNumber -> bossIndex
  seq.forEach((_, i) => { map[Math.round((F * (i + 1)) / N)] = i; });
  return map;
}

// Civilizations still left to conquer (excludes own civ + already conquered).
export function remainingCivs(run) {
  return CIV_ORDER.filter((c) => c !== run.ownCiv && !run.conquered.includes(c));
}

// How many stages have been cleared (drives scaling).
export function stageIndex(run) {
  return run.conquered.length + (run.final ? 1 : 0);
}

// Number of lieutenant "generals" before a civ stage's champion.
export const LIEUTENANTS = 2;

// The ordered bosses for a stage: lieutenant generals first, then the stage's
// "local final boss". Civ stages = N rival champions + that civ's champion.
// Final stage = a gauntlet of all four champions, then the world-conqueror.
export function bossSequence(run) {
  if (run.final) {
    return [...CIV_ORDER.map((c) => CIV_BOSS[c]), 'finalboss'];
  }
  const local = CIV_BOSS[run.currentCiv];
  // the invaded civilization's own named generals lead up to its champion
  const lieutenants = (CIV_LIEUTENANTS[run.currentCiv] || []).slice(0, LIEUTENANTS);
  return [...lieutenants, local];
}
