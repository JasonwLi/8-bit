// Selectable battlefields. The map's `id` matches a theme key (data/themes.js)
// and drives the background/terrain look + UI accent. `mods` scale how many of
// each map feature MapSystem scatters, giving each map a distinct feel.
export const MAPS = [
  {
    id: 'china',
    name: 'Central Plains',
    civ: 'Three Kingdoms',
    blurb: 'Open battlefield. Balanced terrain and threats.',
    mods: { obstacles: 1, hazards: 1, breakables: 1 },
  },
  {
    id: 'japan',
    name: 'Sengoku Castle',
    civ: 'Japan',
    blurb: 'Dense cover, fewer traps. Kite around the walls.',
    mods: { obstacles: 1.7, hazards: 0.6, breakables: 1 },
  },
  {
    id: 'byzantium',
    name: 'Ruined Hippodrome',
    civ: 'Byzantium',
    blurb: 'Treacherous ground — many hazards to bait foes into.',
    mods: { obstacles: 1.1, hazards: 1.8, breakables: 1.1 },
  },
  {
    id: 'sumer',
    name: 'Desert of Uruk',
    civ: 'Sumer',
    blurb: 'Open sands, light cover, rich in crates.',
    mods: { obstacles: 0.5, hazards: 1, breakables: 1.5 },
  },
  {
    id: 'rome',
    name: 'Roman Forum',
    civ: 'Rome',
    blurb: 'Marble ruins and tight colonnades — cover everywhere.',
    mods: { obstacles: 1.4, hazards: 1.0, breakables: 1.1 },
  },
  {
    id: 'macedon',
    name: 'Macedonian Plain',
    civ: 'Macedon',
    blurb: 'Open phalanx ground with scattered olive groves.',
    mods: { obstacles: 0.8, hazards: 1.1, breakables: 1.0 },
  },
  {
    id: 'mongolia',
    name: 'Mongolian Steppe',
    civ: 'Mongolia',
    blurb: 'Wide-open grassland — nowhere to hide from the horde.',
    mods: { obstacles: 0.6, hazards: 1.2, breakables: 0.9 },
  },
  {
    id: 'norse',
    name: 'Frozen Fjords',
    civ: 'Norse',
    blurb: 'Icy crags and treacherous frozen pools.',
    mods: { obstacles: 1.3, hazards: 1.3, breakables: 1.0 },
  },
];

export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}
