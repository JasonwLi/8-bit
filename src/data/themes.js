// Per-civilization visual theme: a UI accent color plus background palette and
// a decorative motif key. Selected from the chosen character's civId and read
// by GameScene (background), UIScene, and the modal scenes (accent).
export const THEMES = {
  china: {
    id: 'china',
    accent: 0xe0563f,
    accentCss: '#e0563f',
    ground: 0x1c1318,
    grid: 0x301f26,
    motif: 0x3a1f24, // faint banner/pagoda silhouettes
    fog: 0x2a141a,
  },
  japan: {
    id: 'japan',
    accent: 0x7c8cff,
    accentCss: '#7c8cff',
    ground: 0x12141f,
    grid: 0x222a3c,
    motif: 0x1f2740, // torii silhouettes
    fog: 0x161d33,
  },
  byzantium: {
    id: 'byzantium',
    accent: 0xc074e0,
    accentCss: '#c074e0',
    ground: 0x171120,
    grid: 0x2c2140,
    motif: 0x2a1c40, // columns / arches
    fog: 0x21163a,
  },
  sumer: {
    id: 'sumer',
    accent: 0x33b8d6,
    accentCss: '#33b8d6',
    ground: 0x121622,
    grid: 0x1f3340,
    motif: 0x1c3340, // ziggurat steps
    fog: 0x142a36,
  },
  rome: {
    id: 'rome',
    accent: 0xd23b3b,
    accentCss: '#d23b3b',
    ground: 0x1a1414,
    grid: 0x2a1e1e,
    motif: 0x3a2424, // temple columns / aquila silhouettes
    fog: 0x140e0e,
  },
  macedon: {
    id: 'macedon',
    accent: 0x3a7bd5,
    accentCss: '#3a7bd5',
    ground: 0x121620,
    grid: 0x1e2636,
    motif: 0x24304a, // phalanx sarissas / Vergina sunburst
    fog: 0x0e1420,
  },
  mongolia: {
    id: 'mongolia',
    accent: 0xc9a13a,
    accentCss: '#c9a13a',
    ground: 0x16160f,
    grid: 0x24241a,
    motif: 0x32301f, // yurt / tug banner silhouettes
    fog: 0x12120c,
  },
  norse: {
    id: 'norse',
    accent: 0x4f9fd6,
    accentCss: '#4f9fd6',
    ground: 0x121a1f,
    grid: 0x1e2e38,
    motif: 0x24384a, // longship / runestone silhouettes
    fog: 0x0e161e,
  },
};

export const DEFAULT_THEME = {
  id: 'default',
  accent: 0xffd700,
  accentCss: '#ffd700',
  ground: 0x1b1828,
  grid: 0x2a2740,
  motif: 0x232038,
  fog: 0x1a1626,
};

export function getTheme(civId) {
  return THEMES[civId] || DEFAULT_THEME;
}
