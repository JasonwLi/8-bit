---
name: add-civ
description: Add a new civilization / map / campaign stage to 8-Bit Dynasties so it is 100% on par with the 4 existing civs (Three Kingdoms China, Sengoku Japan, Byzantine Empire, Sumer/Uruk). Use when the user asks to add/create a new civilization, map, region, stage, or themed battlefield. Covers campaign wiring, theme + palette, map mods, music, civ trait, the bosses (2 lieutenants + 1 champion with rich attack patterns), the boss arena kit, procedural placeholder art, the map-select preview, and the AI sprite pipeline. Does NOT add a playable hero (use /add-hero — a civ can ship with or without its own hero).
---

# Add a Civilization

A civ is a campaign stage with: a **theme/palette**, a **map** (terrain + mods), **music**, a **civ trait**, **3 bosses** (2 lieutenants + 1 champion), a themed **boss arena kit**, a procedural ground/motif fallback, a **map-select preview**, and AI art (decor, gameplay objects, bosses, backgrounds). Enemies are GLOBAL — no per-civ enemy work needed.

`npx vite build` after data edits to catch typos. Live browser only when visual or asked.

## ID contract — the civ slug appears in MANY files
Pick a lowercase slug `<civ>` (e.g. `rome`, `persia`). It must be identical in **every** file below. Pick boss ids `<lt1>`, `<lt2>`, `<champ>`.

| File | Where the `<civ>` id goes |
|---|---|
| `src/data/campaign.js` | `CIV_ORDER`, `CIV_BOSS`, `CIV_NAME` |
| `src/data/bosses.js` | `CIV_LIEUTENANTS`, `BOSS_ORDER`; boss defs' `civ:` string |
| `src/data/themes.js` | `THEMES['<civ>']` key + inner `id:` |
| `src/data/maps.js` | a `MAPS` entry `id:` |
| `src/data/music.js` | `THEME_MUSIC['<civ>']` |
| `src/data/traits.js` | `CIV_TRAITS['<civ>']` key + inner `id:` |
| `src/art/placeholders.js` | `GROUND_PAL['<civ>']` + `drawMotif` switch case |
| `src/art/ui.js` | `PREVIEW_PROPS['<civ>']` |
| `src/systems/MapSystem.js` | `DECOR_ROLES['<civ>']` |
| `src/systems/BossArena.js` | `ARENA_KITS['<civ>']` |
| `scripts/sprite-manifest.mjs` | `CIV_CULTURE`, `BOSS_TRAITS`, `DECOR`, `GAMEPLAY`, `BG_GROUND`, `BG_SCENERY` (the `bg_ground_/bg_motif_/ui_frame_` keys auto-loop over `THEMES`) |

## Ordered checklist

### 1. `src/data/campaign.js` (MANUAL)
- Append `<civ>` to `CIV_ORDER` (drives conquest order, final gauntlet, and `remainingCivs`/`stageIndex` automatically).
- `CIV_BOSS['<civ>'] = '<champ>'` (the stage-final champion; must be a key in `BOSSES`).
- `CIV_NAME['<civ>'] = 'Full Display Name'`.
`LIEUTENANTS = 2` is shared (don't change). `bossSequence()` and `stageIndex()` are data-driven — no edits.

### 2. `src/data/bosses.js` (MANUAL) — author 3 ON-PAR bosses
Add 2 lieutenant defs + 1 champion def to `BOSSES`, then:
- `CIV_LIEUTENANTS['<civ>'] = ['<lt1>', '<lt2>']`
- append `<champ>` to `BOSS_ORDER`.

Boss def shape: `{ id, name, civ:'Full Display Name', size, hp, speed, contactDamage, xp, palette:{skin,primary,secondary,accent,plume}, opts:{cape?/horns?/weapon?}, attacks:[…], phaseThresholds:[0.5], phaseAttacks:[[…]], summon?:{cooldown,count} }`.

**On-par requirement:** lieutenants need **3–4 attacks + `phaseThresholds:[0.5]` + a `phaseAttacks` unlock** (a bare 2-attack lieutenant feels boring — this was a real complaint). Champions get 4–6 attacks + multiple thresholds. Bands: lieutenant hp 420–560 / xp 45; champion hp 780–900 / xp 60–90 / size 78–82.

Available attack `kind`s (all implemented in `Boss.js` — pure data, no new code): `radial_burst{count,speed,damage}`, `aimed_volley{speed,damage}`, `spiral{duration,interval,speed,damage,arms,rotSpeed,counterArms?}`, `flame_zones{zones,radius,damage,spread,tick,linger}`, `charge{chargeSpeed,dashMs,damage}`, `wall{count,spacing,speed,damage}`, `aimed_repeat{duration,interval,spread,speed,damage}`, `converging{count,ringRadius,speed,damage,gap?}`, `nova_rings{count,duration,interval,speed,damage}`, `spread_cone{count,arc,speed,damage}`, `cross_walls{dirs,reach,count,spacing,speed,damage}`. Give each boss a distinct mix so duels feel unique. Boss damage is scaled at runtime by stage × player offense (`GameScene.spawnBoss`) — author the base values in the same range as existing bosses (damage ~6–10 ranged, ~28–30 charge).

### 3. `src/data/themes.js` (MANUAL — fallback exists but looks wrong without it)
`THEMES['<civ>'] = { id:'<civ>', accent, accentCss:'#…', ground, grid, motif, fog }`. `accent` drives HUD/card/banner color; `ground/grid/motif/fog` are dark background tones.

### 4. `src/data/maps.js` (MANUAL) — `{ id:'<civ>', name, civ, blurb, mods:{obstacles,hazards,breakables} }`
`mods` are multipliers (1.0 baseline) on the 130 obstacles / 16 hazards / 90 breakables. Map-select keyboard shortcut auto-becomes the next number.

### 5. `src/data/music.js` (MANUAL — fallback `default` exists)
`THEME_MUSIC['<civ>']` with a chiptune arrangement. Per project memory: monetized release planned → use **public-domain / CC0** melodies only (original arrangements of PD tunes from the civ's culture), no CC-BY.

### 6. `src/data/traits.js` (MANUAL) — `CIV_TRAITS['<civ>'] = { id:'<civ>', name, desc, mods }`
Required if any hero uses this `civId` (else `MenuScene` crashes). Use one valid `Player.recompute` mod key.

### 7. `src/art/placeholders.js` (SEMI — keep game runnable pre-AI)
- `GROUND_PAL['<civ>'] = { base, tones:[…], specks:[…] }` — drives the procedural seamless ground tile (the AI `bg_ground_*` is intentionally NOT loaded; ground is ALWAYS procedural).
- Add a `case '<civ>':` in `drawMotif()` (else it falls through to sumer's motif). `bg_ground_<civ>` / `bg_motif_<civ>` bake automatically once `THEMES` has the civ.

### 8. `src/art/ui.js` (MANUAL) — `PREVIEW_PROPS['<civ>'] = ['decor_<civ>_a','decor_<civ>_b','decor_<civ>_c']`
Drives the mini-battlefield preview on the map-select / conquest cards. Missing-texture props are guarded (won't crash) but an empty preview looks bad.

> Stage-select UI is N-proof, no layout change needed: **ConquestScene and MapSelectScene are paged carousels** (`perPage` from width; ◀/▶ + Left/Right keys; number keys select globally; `buildCard` returns its objects and inlines the preview so old pages tear down with no leftover artifacts). The duel-test OPPONENT grid (`MenuScene.unlockDuels`) wraps civ-blocks ≤4/row. Adding a civ just adds a page/column — verify it paginates, don't hand-place cards.

> Sprite gallery is AUTOMATIC: `gallery.html` enumerates every texture key by prefix, so `boss_<id>`, `decor_<civ>_*`, `rock/block/crate/shrine_<civ>`, and `bg_motif_<civ>` appear on their own (placeholder, then AI art). Just open it to confirm the new keys render.

### 9. `src/systems/MapSystem.js` (MANUAL) — `DECOR_ROLES['<civ>'] = { veg:[…], struct:[…] }`
`veg` = trees/plants clustered into groves; `struct` = landmarks as compound centrepieces. Themed gameplay objects auto-detect: if `rock_<civ>`/`block_<civ>`/`crate_<civ>`/`shrine_<civ>` textures exist they're used, else generic fallbacks. No code change for those.

### 10. `src/systems/BossArena.js` (MANUAL) — `ARENA_KITS['<civ>'] = { dressing:[…], cover:'block_<civ>', stone, wall, hazardTint }`
`dressing` = 2–3 decor keys placed around the ring rim; `cover` = destructible pillar texture (falls back to `'pillar'`); `stone` = floor color; `wall` = perimeter ring (use the theme accent); `hazardTint` = flame-pool tint.

> **Gotcha (immovable cover):** `addCover` registers the pillar in the `breakables` group; `Group.add()` resets body flags, so cover re-asserts `body.immovable = true; body.pushable = false` AFTER the add. If you touch that path, keep the re-assertion after `breakables.add` or the player shoves pillars around.

### 11. `scripts/sprite-manifest.mjs` (MANUAL) — AI art entries
- `CIV_CULTURE['<civ>'] = 'culture description'` (drives `ui_frame_<civ>` prompt).
- `BOSS_TRAITS` entries for `<lt1>`, `<lt2>`, `<champ>` (`{archetype,colors,hat,clothing,weapon}`) → `boss_<id>` portraits.
- `DECOR` rows for every `decor_<civ>_*` used in `DECOR_ROLES`/`PREVIEW_PROPS`/`ARENA_KITS.dressing`: `['decor_<civ>_x', w, h, 'desc']`.
- `GAMEPLAY` rows: `rock_<civ>`, `block_<civ>`, `crate_<civ>`, `shrine_<civ>`.
- `BG_GROUND['<civ>']` + `BG_SCENERY['<civ>']` strings.
`bg_ground_/bg_motif_/ui_frame_` keys are produced by a loop over `THEMES` — automatic once step 3 is done. `index.json` is a disk scan — never hand-edit.

### 12. Generate art (needs FAL_KEY in `.env.local`)
```bash
node scripts/gen-sprites.mjs prop background      # decor + gameplay objects + bg_motif/ui_frame
node scripts/gen-sprites.mjs --key boss_<champ> --key boss_<lt1> --key boss_<lt2>   # or one at a time
node scripts/gen-sprites.mjs --approve block_<civ> shrine_<civ> boss_<champ>        # bless good ones
node scripts/gen-sprites.mjs --refine block_<civ> "show full pillar, not cropped" --strength 0.45
```
Transparent (decor/gameplay/bosses) → Ideogram v3; opaque backgrounds → Recraft v3.

### 13. Build + verify
```bash
npx vite build                       # must pass clean
npx vite preview --port 4173         # /gallery.html → check Bosses / Decorations / Gameplay objects / Backgrounds
```
In game: new civ appears on map-select with theme accent + preview props; ground tile + motif render; obstacles/decor/shrines themed; first lieutenant duel shows the themed arena (dressing, cover, hazard tint); champion duel escalates at the phase threshold; conquest UI shows the new card.

## Gotchas recap
- The `<civ>` slug must be byte-identical across all files in the ID-contract table — one mismatch silently falls back (default theme/map/china preview) or crashes (`CIV_TRAITS`).
- `drawMotif` missing a case → falls through to sumer's motif (wrong, not a crash).
- `bg_ground_<civ>` is never loaded — ground is always the procedural `GROUND_PAL` tile.
- Arena lives at `ARENA_ORIGIN {24000,24000}`, outside the toroidal world; cover bodies must stay `immovable`.
- Adding a civ to `CIV_ORDER` lengthens every campaign by a stage (a hero conquers everyone except their home civ, so the target count is `CIV_ORDER.length - 1`). Several UI strings hardcode the OLD count `/3` — update them all (make dynamic): `MenuScene.js:48` (`/3 conquered`), `ConquestScene.js:39` (`of 3 lands conquered`), `ConquestScene.js:57` (`Press 1–3 …`), `MapSelectScene.js:37` (`Press 1–4 …`), `PauseScene.js:31` (`/3 conquered`).
- Enemies are global — do NOT add per-civ enemies for a new civ.
