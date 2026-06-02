# Sprite Generation Prompts

Per-figure prompts for generating the real art with an image model (Midjourney,
DALL·E, SDXL, Stable Diffusion + a pixel-art LoRA, etc.). The engine consumes
plain PNGs by texture key, so the *source* of the art doesn't matter — once you
process a generation into `public/sprites/<key>.png`, swap it in (see
`SPRITESHEET-SPEC.md`).

## Global style guide (prepend to every prompt)

> 8-bit / 16-bit pixel art, single character sprite, front-facing 3/4 view,
> centered, full body, chunky readable pixels, limited but rich palette, bold
> dark outline, transparent background, no text, no border, game asset,
> orthographic, even flat lighting. Target ~48×48 to 64×64 effective resolution.

Keep silhouettes distinct: each figure should be recognizable by **shape +
two signature accessories** even at small size.

---

## Playable characters

### Lü Bu — Three Kingdoms China
> Chinese general Lü Bu, crimson lamellar armor with gold trim, tall helmet with
> long green pheasant-tail plumes, holding the Sky Piercer halberd (ji) upright
> at his side, fierce stance.
- Palette anchors: crimson `#8a1c1c`, gold `#d4af37`, dark lacquer `#2b2b2b`, green plume `#2e7d32`
- Texture key: `char_lubu`

### Oda Nobunaga — Sengoku Japan
> Japanese warlord Oda Nobunaga, dark nanban-style armor, flowing red cape, white
> war-fan crest, holding a tanegashima matchlock rifle, commanding pose.
- Palette anchors: dark indigo `#1b1b2f`, red cape `#b8002e`, gold `#d4af37`, white plume `#f5f5f5`
- Texture key: `char_nobunaga`

### Belisarius — Byzantine Empire
> Byzantine general Belisarius, imperial purple tunic over gold lamellar cuirass,
> Roman cavalry helmet with red crest, round shield, holding a clay pot of Greek
> fire, noble bearing.
- Palette anchors: imperial purple `#6a3fb0`, gold `#d4af37`, white `#eaeaea`, red crest `#b8002e`
- Texture key: `char_belisarius`

### Gilgamesh — Sumer / Uruk
> Sumerian king Gilgamesh, two-thirds divine, lapis-blue and gold royal garb,
> horned crown of divinity, long braided beard, surrounded by floating golden
> blades, mythic aura.
- Palette anchors: lapis blue `#14506e`, gold `#d4af37`, deep teal `#0e3346`, bright gold `#ffd700`
- Texture key: `char_gilgamesh`

---

## Enemies

### Levy Soldier (`enemy_soldier`)
> Generic medieval foot soldier, gray iron armor, small round shield, hunched
> aggressive walk, plain and disposable.

### Skirmisher (`enemy_archer`)
> Light green-cloaked skirmisher, leather armor, short bow, nimble crouching pose.

### War Engine (`enemy_machine`)
> Boxy bronze-and-wood siege automaton, two large wheels, a hammer/ram arm,
> menacing mechanical bulk (NOT humanoid).

---

## Bosses (roster for the next phase — civilization champions)

Each boss is a famous figure from one of the four civilizations, ~2× sprite
scale, more ornate palette, glowing accents:
- `boss_caocao` — Cao Cao (Three Kingdoms): black-and-gold imperial robes, command banner.
- `boss_hideyoshi` — Toyotomi Hideyoshi (Sengoku): golden sunburst helmet, war fan.
- `boss_justinian` — Emperor Justinian (Byzantine): jeweled crown, purple-and-gold regalia.
- `boss_enkidu` — Enkidu (Sumer): wild-man warrior, beast pelts, twin clubs.

---

## Animation note

The engine currently uses a single static frame per entity. When you're ready
for animation, generate a horizontal strip (e.g. 4 frames: idle/walk) at
uniform cell size and load it as a spritesheet — see `SPRITESHEET-SPEC.md` for
the cell dimensions and the BootScene hook.
