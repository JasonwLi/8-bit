// Per-civilization chiptune themes. Each civ's melody is an original 8-bit
// arrangement of a PUBLIC-DOMAIN source tune tied to that culture, so the music
// is safe to ship in a monetized build with no licensing or attribution owed:
//   china     -> "Mo Li Hua" (Jasmine Flower), trad. Chinese folk, ~18th c.
//   japan     -> "Sakura Sakura", trad. Edo-period folk song
//   byzantium -> "Epitaph of Seikilos", oldest complete surviving song (~1st c. AD)
//   sumer     -> "Hurrian Hymn No. 6", oldest known notated melody (~1400 BCE)
//   default   -> original heroic loop used in menus (not derived from any source)
//
// Each theme is a multi-voice arrangement played live by AudioManager:
//   lead   - the melody (leadNotes)
//   bass   - root motion under the harmony (bassNotes)
//   arp    - fast arpeggio of the current chord (chiptune "chord" shimmer)
//   pad    - sustained chord bed for warmth/depth
//   drums  - light groove (only if drumsNormal) — always heavy in boss mode
// The arp and pad are derived from `chords` (one chord per 8-step bar). The boss
// arrangement is derived from the same data at play time (see AudioManager): the
// same notes, faster, with heavier voicing and driving percussion.
//
// Melodies/chords use note names ('A4', 'C#5', ...); 0 is a rest. Lead and bass
// loop independently by their own length; chords loop by bar.

const R = 0; // rest

const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

// Note name -> frequency (Hz), equal temperament, A4 = 440. Rests return 0.
export function noteToFreq(n) {
  if (!n || n === '-') return 0;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  if (!m) return 0;
  const midi = SEMI[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const THEME_MUSIC = {
  // Original triumphant march for the title/menu/loadout screens.
  default: {
    name: 'Dynasties (theme)',
    bpm: 134,
    bossBpm: 180,
    lead: { type: 'square', vol: 0.055, detune: 8 },
    bass: { type: 'triangle', vol: 0.08 },
    arp: { type: 'square', vol: 0.02 },
    pad: { type: 'triangle', vol: 0.03 },
    drumsNormal: true,
    leadNotes: [
      'G4', R, 'B4', R, 'D5', R, 'B4', 'D5',
      'E5', R, 'D5', 'B4', 'A4', R, 'G4', R,
      'G4', R, 'A4', 'B4', 'D5', R, 'E5', R,
      'D5', 'B4', 'A4', 'G4', 'A4', R, R, R,
    ],
    bassNotes: ['G2', R, 'D3', R, 'G2', R, 'D3', R, 'C3', R, 'G2', R, 'D3', R, 'D3', R],
    // bars: G D Em C
    chords: [
      ['G3', 'B3', 'D4'], ['D3', 'F#3', 'A3'], ['E3', 'G3', 'B3'], ['C3', 'E3', 'G3'],
    ],
  },

  // China — "Mo Li Hua" (G-major pentatonic melody, full diatonic harmony).
  china: {
    name: 'Mo Li Hua',
    source: 'Jasmine Flower (trad. Chinese folk, public domain)',
    bpm: 125,
    bossBpm: 168,
    lead: { type: 'square', vol: 0.055, detune: 7 },
    bass: { type: 'triangle', vol: 0.08 },
    arp: { type: 'square', vol: 0.02 },
    pad: { type: 'triangle', vol: 0.03 },
    drumsNormal: true,
    leadNotes: [
      'B4', 'B4', 'D5', 'E5', 'D5', 'B4', 'D5', 'E5',
      'D5', 'B4', 'A4', 'B4', 'A4', 'G4', R, R,
      'D5', 'D5', 'B4', 'D5', 'E5', R, 'E5', 'D5',
      'B4', 'A4', 'B4', 'D5', 'A4', 'G4', R, R,
      'E5', R, 'E5', 'G5', 'E5', 'D5', 'B4', 'D5',
      'E5', R, 'D5', 'B4', 'A4', 'B4', 'A4', 'G4',
      'B4', 'A4', 'G4', 'A4', 'G4', 'D4', 'G4', R,
      'A4', 'G4', 'E4', 'G4', 'G4', R, R, R,
    ],
    bassNotes: ['G2', R, R, 'D3', 'G2', R, 'D3', R, 'E2', R, R, 'D3', 'G2', R, 'D3', R],
    // bars: G C G D Em C D G
    chords: [
      ['G3', 'B3', 'D4'], ['C3', 'E3', 'G3'], ['G3', 'B3', 'D4'], ['D3', 'F#3', 'A3'],
      ['E3', 'G3', 'B3'], ['C3', 'E3', 'G3'], ['D3', 'F#3', 'A3'], ['G3', 'B3', 'D4'],
    ],
  },

  // Japan — "Sakura Sakura" (the "in" scale). Mellow koto/triangle timbre.
  japan: {
    name: 'Sakura Sakura',
    source: 'Sakura Sakura (trad. Japanese folk, public domain)',
    bpm: 120,
    bossBpm: 162,
    lead: { type: 'triangle', vol: 0.078, detune: 6 },
    bass: { type: 'triangle', vol: 0.07 },
    arp: { type: 'triangle', vol: 0.022 },
    pad: { type: 'triangle', vol: 0.03 },
    drumsNormal: true,
    leadNotes: [
      'A4', 'A4', 'B4', R, 'A4', 'A4', 'B4', R,
      'A4', 'B4', 'C5', 'C5', 'B4', 'A4', 'B4', 'A4',
      'A4', 'B4', 'C5', 'C5', 'B4', 'A4', 'B4', 'A4',
      'E5', 'E5', 'F5', 'E5', 'C5', 'B4', 'A4', R,
      'E5', 'E5', 'F5', 'E5', 'C5', 'B4', 'A4', R,
      'A4', 'B4', 'C5', 'B4', 'A4', 'F4', 'E4', R,
    ],
    bassNotes: ['A2', R, 'E3', R, 'A2', R, 'E3', R, 'A2', R, 'E3', R, 'E2', R, 'A2', R],
    // bars: Am F Am Dm Am E5
    chords: [
      ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'], ['A2', 'C3', 'E3'],
      ['D3', 'F3', 'A3'], ['A2', 'C3', 'E3'], ['E2', 'B2', 'E3'],
    ],
  },

  // Byzantium — "Epitaph of Seikilos" (D major, modal). Reedy lead + ison drone.
  byzantium: {
    name: 'Epitaph of Seikilos',
    source: 'Seikilos epitaph (~1st c. AD, public domain)',
    bpm: 116,
    bossBpm: 158,
    lead: { type: 'sawtooth', vol: 0.044, detune: 5 },
    bass: { type: 'triangle', vol: 0.085 },
    arp: { type: 'square', vol: 0.018 },
    pad: { type: 'triangle', vol: 0.034 },
    drumsNormal: false, // stately hymn stays drumless until the boss
    leadNotes: [
      'A4', 'E4', 'E4', 'C#5', 'D5', 'E5', 'D5', 'C#5',
      'D5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'B4', 'G4',
      'A4', 'C#5', 'E5', 'D5', 'C#5', 'D5', 'C#5', 'A4',
      'B4', 'G4', 'A4', 'C#5', 'B4', 'D5', 'E5', 'C#5',
      'A4', 'A4', 'A4', 'F#4', 'E4', R, R, R,
    ],
    bassNotes: ['D3', R, R, R, 'A2', R, R, R, 'G2', R, R, R, 'D3', R, R, R],
    // bars: D G A D G
    chords: [
      ['D3', 'F#3', 'A3'], ['G2', 'B2', 'D3'], ['A2', 'C#3', 'E3'],
      ['D3', 'F#3', 'A3'], ['G2', 'B2', 'D3'],
    ],
  },

  // Rome — original martial brass-y march in C major. Steady, disciplined, legionary.
  rome: {
    name: 'Legion March',
    source: 'Original composition (public domain)',
    bpm: 132,
    bossBpm: 176,
    lead: { type: 'square', vol: 0.055, detune: 6 },
    bass: { type: 'triangle', vol: 0.085 },
    arp: { type: 'square', vol: 0.02 },
    pad: { type: 'triangle', vol: 0.03 },
    drumsNormal: true,
    leadNotes: [
      'C5', R, 'C5', R, 'E5', R, 'G5', R,
      'F5', R, 'E5', 'D5', 'C5', R, R, R,
      'G4', R, 'G4', R, 'B4', R, 'D5', R,
      'C5', R, 'B4', 'A4', 'G4', R, R, R,
      'E5', R, 'D5', 'C5', 'D5', R, 'E5', R,
      'F5', 'E5', 'D5', 'C5', 'D5', R, R, R,
      'C5', 'E5', 'G5', 'E5', 'C5', 'G4', 'E4', R,
      'G4', 'B4', 'D5', 'B4', 'G4', R, R, R,
    ],
    bassNotes: ['C3', R, 'G2', R, 'C3', R, 'G2', R, 'F2', R, 'C3', R, 'G2', R, 'C3', R],
    // bars: C G F C Am F G C
    chords: [
      ['C3', 'E3', 'G3'], ['G2', 'B2', 'D3'], ['F2', 'A2', 'C3'], ['C3', 'E3', 'G3'],
      ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'], ['G2', 'B2', 'D3'], ['C3', 'E3', 'G3'],
    ],
  },

  // Macedon — original heroic Hellenic march in D major. Bold, triumphant, Alexandrine.
  macedon: {
    name: 'Hellenic Glory',
    source: 'Original composition (public domain)',
    bpm: 126,
    bossBpm: 168,
    lead: { type: 'sawtooth', vol: 0.048, detune: 5 },
    bass: { type: 'triangle', vol: 0.08 },
    arp: { type: 'square', vol: 0.02 },
    pad: { type: 'triangle', vol: 0.03 },
    drumsNormal: true,
    leadNotes: [
      'D5', R, 'F#5', R, 'A5', R, 'F#5', 'D5',
      'E5', R, 'D5', 'C#5', 'B4', R, R, R,
      'A4', R, 'B4', 'C#5', 'D5', R, 'E5', R,
      'F#5', 'E5', 'D5', 'C#5', 'D5', R, R, R,
      'B4', R, 'D5', 'F#5', 'E5', R, 'D5', 'C#5',
      'B4', 'A4', 'B4', 'C#5', 'D5', R, R, R,
      'D5', 'F#5', 'A5', 'F#5', 'D5', 'A4', 'F#4', R,
      'A4', 'C#5', 'E5', 'C#5', 'A4', R, R, R,
    ],
    bassNotes: ['D3', R, 'A2', R, 'D3', R, 'A2', R, 'G2', R, 'D3', R, 'A2', R, 'D3', R],
    // bars: D A G D Bm G A D
    chords: [
      ['D3', 'F#3', 'A3'], ['A2', 'C#3', 'E3'], ['G2', 'B2', 'D3'], ['D3', 'F#3', 'A3'],
      ['B2', 'D3', 'F#3'], ['G2', 'B2', 'D3'], ['A2', 'C#3', 'E3'], ['D3', 'F#3', 'A3'],
    ],
  },

  // Mongolia — original open modal/pentatonic steppe theme in E minor pentatonic.
  mongolia: {
    name: 'Steppe Wind',
    source: 'Original composition (public domain)',
    bpm: 118,
    bossBpm: 160,
    lead: { type: 'triangle', vol: 0.07, detune: 8 },
    bass: { type: 'triangle', vol: 0.075 },
    arp: { type: 'triangle', vol: 0.018 },
    pad: { type: 'triangle', vol: 0.032 },
    drumsNormal: true,
    leadNotes: [
      'E5', R, 'G5', R, 'B5', R, 'G5', 'E5',
      'D5', R, 'E5', R, 'G5', R, R, R,
      'B4', R, 'D5', 'E5', 'G5', R, 'E5', R,
      'D5', 'B4', 'G4', 'B4', 'D5', R, R, R,
      'G5', R, 'E5', 'D5', 'E5', R, 'G5', R,
      'B5', 'G5', 'E5', 'D5', 'E5', R, R, R,
      'E5', 'G5', 'B5', 'G5', 'E5', 'D5', 'B4', R,
      'D5', 'B4', 'G4', 'B4', 'E5', R, R, R,
    ],
    bassNotes: ['E2', R, 'B2', R, 'G2', R, 'D3', R, 'E2', R, 'B2', R, 'G2', R, 'E2', R],
    // bars: Em G D Em Bm G D Em (pentatonic modal)
    chords: [
      ['E3', 'G3', 'B3'], ['G2', 'B2', 'D3'], ['D3', 'F#3', 'A3'], ['E3', 'G3', 'B3'],
      ['B2', 'D3', 'F#3'], ['G2', 'B2', 'D3'], ['D3', 'F#3', 'A3'], ['E3', 'G3', 'B3'],
    ],
  },

  // Norse — original cold minor drone theme in A minor. Stark, icy, Viking dread.
  norse: {
    name: 'Frozen North',
    source: 'Original composition (public domain)',
    bpm: 112,
    bossBpm: 155,
    lead: { type: 'sawtooth', vol: 0.046, detune: 7 },
    bass: { type: 'triangle', vol: 0.09 },
    arp: { type: 'square', vol: 0.016 },
    pad: { type: 'triangle', vol: 0.035 },
    drumsNormal: false, // cold minor drone stays drumless until the boss
    leadNotes: [
      'A4', R, 'C5', R, 'E5', R, 'C5', 'A4',
      'G4', R, 'A4', 'B4', 'C5', R, R, R,
      'E5', R, 'D5', 'C5', 'B4', R, 'A4', R,
      'G4', 'F4', 'G4', 'A4', 'B4', R, R, R,
      'C5', R, 'B4', 'A4', 'G4', R, 'A4', 'B4',
      'C5', 'B4', 'A4', 'G4', 'F4', R, R, R,
      'A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'E4', R,
      'G4', 'A4', 'B4', 'A4', 'A4', R, R, R,
    ],
    bassNotes: ['A2', R, 'E3', R, 'A2', R, 'E3', R, 'F2', R, 'C3', R, 'G2', R, 'A2', R],
    // bars: Am E Am F C G Am
    chords: [
      ['A2', 'C3', 'E3'], ['E2', 'B2', 'E3'], ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'],
      ['C3', 'E3', 'G3'], ['G2', 'B2', 'D3'], ['A2', 'C3', 'E3'], ['A2', 'C3', 'E3'],
    ],
  },

  // Sumer — "Hurrian Hymn No. 6" (reconstructed diatonic). Lyre/harp pluck.
  sumer: {
    name: 'Hurrian Hymn No. 6',
    source: 'Hurrian Hymn to Nikkal (~1400 BCE, public-domain reconstruction)',
    bpm: 110,
    bossBpm: 152,
    lead: { type: 'triangle', vol: 0.072, detune: 6 },
    bass: { type: 'triangle', vol: 0.08 },
    arp: { type: 'triangle', vol: 0.02 },
    pad: { type: 'triangle', vol: 0.032 },
    drumsNormal: false, // ancient hymn stays drumless until the boss
    leadNotes: [
      'D5', 'B4', 'D5', 'B4', 'C5', 'A4', 'C5', 'A4',
      'B4', 'G4', 'B4', 'D5', 'C5', 'A4', 'G4', R,
      'E5', 'C5', 'E5', 'C5', 'D5', 'B4', 'D5', 'B4',
      'C5', 'A4', 'B4', 'G4', 'A4', 'G4', R, R,
      'G4', 'B4', 'D5', 'B4', 'C5', 'A4', 'C5', 'E5',
      'D5', 'B4', 'C5', 'A4', 'G4', R, R, R,
    ],
    bassNotes: ['G2', R, 'D3', R, 'G2', R, 'D3', R, 'C3', R, 'G2', R, 'D3', R, 'G2', R],
    // bars: G C G Em C D
    chords: [
      ['G2', 'B2', 'D3'], ['C3', 'E3', 'G3'], ['G2', 'B2', 'D3'],
      ['E3', 'G3', 'B3'], ['C3', 'E3', 'G3'], ['D3', 'F#3', 'A3'],
    ],
  },
};

export function getThemeMusic(id) {
  return THEME_MUSIC[id] || THEME_MUSIC.default;
}
