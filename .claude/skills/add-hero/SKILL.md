---
name: add-hero
description: Add a new playable hero/character to 8-Bit Dynasties so it is 100% on par with the 4 existing heroes (Lü Bu, Nobunaga, Belisarius, Gilgamesh). Use when the user asks to add/create a new hero, character, or playable fighter — covers the character def, civ + personal traits, primary weapon, secondary (F) and ultimate (SPACE) abilities, procedural placeholder art, the AI sprite pipeline, and verification. Does NOT add a civilization/map (use /add-civ for that; a hero may reuse an existing civId or pair with a new civ added separately).
---

# Add a Hero

A hero in 8-Bit Dynasties is a character tied to: a civilization (`civId`), a **civ trait** + **personal trait**, a **primary weapon** (auto/J), a **secondary** ability (key **F**), an **ultimate** ability (key **SPACE**), and a set of sprites (portrait, ability icons, projectiles). Most UI is data-driven, so the work is mostly data + art.

`npx vite build` after the data edits — it catches missing imports/typos fast. Only do a live browser run if the user asks or for a genuinely visual check.

## ⚠ Core principle: every hero must be MECHANICALLY DISTINCT (no overlap)

A hero is its KIT, not its stats. Two heroes must **never** share a signature mechanic — a new hero that is "existing-hero-A's primary + existing-hero-B's ultimate" is a FAIL (e.g. the rejected first pass: "Alexander = Lü Bu's melee arc + Belisarius's charge"). Before authoring weapon/secondary/ultimate, check this **identity matrix** and pick a mechanic NOT already claimed. If every existing `kind` is taken, **add a NEW `kind`** to `WeaponSystem.computeStats()`+`fire()` (or a new ultimate cast in `AbilitySystem`) — do not reuse one.

| Hero | Primary mechanic (`kind`) | Secondary (+ unique effect) | Ultimate (cast — differentiator) |
|------|---------------------------|-----------|-----------------|
| Lü Bu | `melee_arc` — radial sweep | lance thrust + **bleed** | warcry — `nova`, offensive empower |
| Nobunaga | `projectile_aimed` — piercing single shot | scattershot **burst** | barrage — `artillery` |
| Belisarius | `lob_aoe` — fire pools | fire **nova** (radial) | cataphract — `charge`, single lance |
| Gilgamesh | `orbital` — circling blades | gate spear **volley** | heaven's fall — `meteor`, few big |
| Caesar | `summon` — legionary allies | pilum volley + **knockback** | testudo — `nova` + **defense self-buff** |
| Alexander | `line_thrust` — forward lane skewer | companion javelin + **slow** | **Wrath of Ra** — `solar_beam`, a sweeping sunfire beam (Egyptian; replaced the cavalry charge that clashed with Belisarius) |
| Genghis | `trail` — lure-and-trap: rakes **caltrop ground-hazard fields** into his wake as he rides (denser while moving); you herd the horde across them, NOT aim at it | Parthian storm (radial) + **self speed-burst** | sky-arrows — `meteor`, **many small (arrow variant)** |
| Ragnar | `boomerang` — returning axes | shield bash + **self block** | berserker — `nova` + **rage self-buff** |

Rules: (1) **Primary `kind` is unique per hero** — the strongest identity signal; all 8 above differ. (2) **Ultimate cast must not duplicate mechanically** — `nova` is shared by 3 heroes but each differs via `selfBuffs`/knockback (offense empower vs defense wall vs rage); `charge`/`meteor` differ via `count`/`chargeStyle`/`variant`. Reuse a cast ONLY with a real mechanical twist, never a recolor. (3) Each secondary carries a **unique status effect** (bleed/knockback/slow/self-speed/self-block/burst). (4) Each skill needs a UNIQUE VISUAL (step 6/7) — never render the same `'sweep'`/muzzle/charge-sprite as another hero (e.g. `chargeStyle:'spears'` gives Alexander a distinct visual from Belisarius's cataphract sprite). Mechanism knobs that buy distinctiveness without a new kind: `selfBuffs[]`, `knockback`, `slow{factor,dur}`, `variant`, `chargeStyle`, `spin`, `count`.

## ID contract

Pick a lowercase slug `<hero>` (e.g. `viking`). Pick ids for the weapon `<weap>`, secondary `<sec>`, ultimate `<ult>`. These become texture keys: `char_<hero>`, `proj_<weap>`, `proj_<sec>`, `abil_<ult>`, `abil_icon_<weap>`, `abil_icon_<sec>`, `abil_icon_<ult>`. The hero's `civId` must match a civ that exists in `themes.js` / `traits.js` / `campaign.js` (reuse one, or run **/add-civ** first).

## Ordered checklist

### 1. `src/data/characters.js` — the hero object (MANUAL)
Add to the `CHARACTERS` array. **Exact field names** (verified against existing heroes — note `startingWeapon`/`secondary`/`ultimate`, NOT `*Id`):
```js
{
  id: '<hero>', name: 'Display Name',
  civ: 'Full Civ Display Name',     // human-readable, shown on the card
  civId: '<civId>',                 // slug; must exist in themes.js / traits.js / campaign.js
  blurb: 'One-line flavor + what the kit does.',
  startingWeapon: '<weap>',         // key in weapons.js (primary, auto-fires)
  secondary: '<sec>',               // key in secondaries.js (F)
  ultimate: '<ult>',                // key in abilities.js (SPACE)
  // attack = damage mult; defense/rangedDefense = damage reduction; regen = HP/sec
  stats: { maxHp, speed, attack, defense, rangedDefense, lifesteal, regen, pickup, luck },
  palette: { skin, primary, secondary, accent, plume },
}
```
Balance bands across existing heroes: HP 90–140, speed 195–230, attack 1.0–1.15, defense 0–0.10, rangedDefense 0–0.06, lifesteal 0–0.04, regen 0.025–0.03, pickup 105–115, luck 0–2. Base luck is intentionally LOW (0–2) — high luck trivializes loot rarity.

### 2. `src/data/traits.js` — civ trait (if civ is new) + personal trait (MANUAL)
- `CIV_TRAITS['<civId>']` — only if the civ is new (else reuse). `{ id, name, desc, mods }`.
- `PERSONAL_TRAITS['<hero>']` — **keyed by the hero id**. All 4 heroes pair a buff with a small debuff (e.g. `{ speedMult: 0.12, maxHpMult: -0.08 }`).

`mods` keys that `Player.recompute()` actually reads: `damageMult, cooldownMult, speedMult, speedFlat, maxHpMult, maxHpFlat, reachMult, effectMult, defense, rangedDefense, damageReduction, dodge, lifesteal, regen, regenCapBonus, xpMult, pickupMult, luck`. Ceilings: meleeDR/rangedDR cap 0.55, dodge 0.5, lifesteal 0.3, cooldownMult floor 0.25.

> Gotcha: `MenuScene.buildCard` calls `getCivTrait(c.civId).name` directly — a missing `CIV_TRAITS` entry CRASHES the title screen. Always add it before the hero is playable.

### 3. `src/data/weapons.js` — primary weapon (MANUAL)
Add to `WEAPONS`. **Pick a `kind` no other hero's PRIMARY uses** (see the identity matrix above). The existing kinds in `WeaponSystem.computeStats()` are `melee_arc`, `projectile_aimed`, `burst_aimed`, `projectile_radial`, `lob_aoe`, `orbital`, plus the signature kinds added for the Great-Conquerors heroes (`summon`, `line_thrust`, `ricochet`, `boomerang`). If all are claimed, **author a NEW kind**: add a `case` in `computeStats()` (resolve its params) and in `fire()` (a `fire<Kind>()` behavior with its own visual). Shape: `{ id, name, kind, color, base:{...}, perPoint:{damage,reach,speed}, effect:{...}, effectLabel }`.

The `effect` sub-keys must match the kind (e.g. aimed → `countPerPoint`/`piercePerPoint`; melee → `arcPerPoint`/`damagePerPoint`; orbital → `countPerPoint`/`radiusPerPoint`).

> **Gotcha (countPerPoint Math.floor):** `WeaponSystem` does `Math.floor(countPerPoint * fx)`. A value < 1.0 (e.g. 0.34) means the first effect upgrade(s) add **nothing** visible — this was a real bug. Use `1` if each effect point should add a projectile/blade, `0.5` for every-other-point.

### 4. `src/data/secondaries.js` — secondary (F) (MANUAL)
Add to `SECONDARIES`, same kind system. Cooldown band 3000–3400ms. Optional `projScale` (default 1; lances use 1.7) and `bleed:{dps,duration,stackMax}` (Lü Bu's thrust applies 1 HP/s for 10s).

### 5. `src/data/abilities.js` — ultimate (SPACE) (MANUAL)
Add to `ABILITIES`. Cast `kind` must be one of the 4 already handled in `AbilitySystem.js`: `nova`, `artillery`, `charge`, `meteor` (reuse — no new cast handler needed unless inventing a 5th). Shape: `{ id, name, kind, color, desc, base:{cooldown:10000, damage, radius/width/length, knockback, count, speed, delay}, amountLabel }`. All ultimates share `cooldown: 10000`; the ultimate is offered every 5 levels.

### 5b. Per-skill VISUALS — make the animation match the weapon (no generic orbs / no shared sweep)
A skill must not just *be* distinct mechanically, it must *look* it:
- **Projectiles** auto-use `proj_<weaponId>`. If your weapon's `kind`/`id` isn't special-cased in `placeholders.js`, it falls back to a **generic glowing energy orb** — wrong for an arrow/axe/javelin. Add a procedural shape (see the `composite_bow`/`axe_throw`/`pilum_volley` blocks) AND/OR generate an AI `proj_<id>` sprite (BootScene loads it over the procedural). Author proj sprites **pointing RIGHT** (rotated to travel dir at runtime).
- **Thrusts/stabs** should drive a real weapon sprite, not a flying bolt: call `Fx.weaponLunge('weapon_<x>', x, y, angle, reach, color)` — it lunges the weapon sprite forward and snaps back (Lü Bu `thrust_sky` → `weapon_halberd`, Alexander `line_thrust` → `weapon_sarissa`). Add a `weapon_<x>` sprite (procedural + AI), drawn horizontal, blade to the RIGHT.
- **Summons/allies** need their own sprite (not a recolored enemy): Caesar's legionaries use `ally_legionary`. Add a procedural placeholder + an AI sprite (`category: 'character'`).
- **Melee arcs**: never let two heroes render the same `'sweep'`; tint by weapon color and/or use a distinct motion.
- **Shared-`kind` ultimates**: give a distinct cast visual (e.g. `chargeStyle:'spears'` → spear-streaks vs the `cataphract` horseman sprite; `variant:'arrows'` → arrow rain vs meteor crater).
- **Polish bar = the original 4.** Each ability should have a bespoke `Fx` method for its muzzle/cast AND its impact — not the generic `muzzle()`/`sweep`. Pattern: add a method to `Fx.js` (reuse the emitters `spark`/`embers`/`dustEmitter`/`goldEmitter` + helpers `_flash`/`_ring`/`_tint`), then call it from `WeaponSystem.fire()` (per-`id` muzzle branch), `fire<Kind>()`, `onProjectileHit` (chain/impact), or `AbilitySystem.cast<Kind>()` (per-`id` flourish). Examples added for the new heroes: `legionRally`/`legionDeploy`/`pilaStreak`/`shieldWall` (Caesar), `bowLoose`/`chainArc` (Genghis), `shieldBash`/`rageBurst` (Ragnar), `weaponLunge` (thrusts). A skill that uses only the generic muzzle/sweep is under-animated — give it its own.

### 6. `src/art/placeholders.js` — procedural fallbacks (SEMI; keep the game runnable pre-AI)
The game must run with NO AI art. Auto-generated from data loops: `char_<hero>`, `proj_<weap>`, `proj_<sec>`, `abil_<ult>`, and `boss_<id>` all get procedural placeholders just by existing in their data files. Add/adjust:
- **Character silhouette opt** — in `generatePlaceholders()` the per-character loop branches on id for extras (`opts.cape`, `opts.horns`). Add an `if (c.id === '<hero>')` line if you want a distinct silhouette (optional).
- **`abil_icon_<weap|sec|ult>`** — the 12 existing ability emblem icons are hand-baked. New ids fall back (Menu/Upgrade/UIScene all fall back to `proj_<id>` / `abil_<id>`), so the game works — but to be on par, add `bake(scene, 'abil_icon_<id>', 48, 48, …)` blocks mirroring an existing one, OR rely on the AI icons from step 7.

### 7. `scripts/sprite-manifest.mjs` — AI art entries (MANUAL)
Add so the fal.ai pipeline can generate real art:
- `CHARACTER_TRAITS['<hero>'] = { archetype, colors, hat, clothing, weapon }` — drives the portrait prompt (`char_<hero>`). Missing → generic fallback prompt.
- `ABILITY_ICONS` array — three `['<weap>', 'desc'], ['<sec>', 'desc'], ['<ult>', 'desc']` entries → `abil_icon_*` (transparent, Ideogram v3).
- `ABIL_ICON['<ult>'] = 'desc'` → the `abil_<ult>` musou-buff icon.
- Optionally a `proj_<weap>` description if you want custom projectile art (else the procedural one is fine).

Generators: transparent sprites (character, icons, projectiles) → Ideogram v3; opaque backgrounds → Recraft v3. `public/sprites/index.json` is a **disk scan** rewritten after each gen — never edit it by hand.

### 8. Generate + approve art (run when the user wants real art; needs FAL_KEY in `.env.local`)
```bash
node scripts/gen-sprites.mjs --key char_<hero>
node scripts/gen-sprites.mjs --key abil_icon_<weap> --key abil_icon_<sec> --key abil_icon_<ult>   # or one at a time
node scripts/gen-sprites.mjs --key abil_<ult>
node scripts/gen-sprites.mjs character ability_icon     # or whole categories
node scripts/gen-sprites.mjs --approve char_<hero> abil_icon_<weap> abil_icon_<sec> abil_icon_<ult>
# refine in place without a full re-roll:
node scripts/gen-sprites.mjs --refine char_<hero> "show full legs and feet, same pixel style" --strength 0.45
```

### 9. UI surfaces — AUTOMATIC + N-proof, verify only
`MenuScene` iterates `CHARACTERS`, so the new hero appears with no code change. The layout already SCALES to any hero count:
- **Character select is a paged carousel** (`MenuScene.create`): `perPage` is computed from screen width; ◀/▶ arrows + Left/Right keys flip pages; number keys 1–N still select any hero globally. `buildCard` returns its objects so a page tears down cleanly. Adding heroes just adds pages — **do not hand-place cards**.
- **Duel-test panel** (`unlockDuels`): the FIGHTER row and OPPONENT list are wrapping grids (≤5 fighters/row, ≤4 civ-blocks/row) — also N-proof.
- `UIScene` / `UpgradeScene` read from the running systems and fall back on icons.
Confirm the title stat cards show the SAME stat categories for the new hero as the others (consistency was a prior complaint), and that the carousel paginates (the new hero may be on page 2).

### 9b. Sprite gallery — AUTOMATIC, verify only
`gallery.html` (`src/gallery-main.js`) enumerates EVERY texture key and groups by prefix, so `char_<hero>`, `abil_icon_<weap|sec|ult>`, `abil_<ult>`, and `proj_<weap|sec>` show up automatically (procedural placeholder until AI art exists, then the real sprite). No gallery code change — just open it to confirm the new keys render.

### 10. Build + verify
```bash
npx vite build              # must pass clean
npx vite preview --port 4173   # then open /gallery.html to eyeball char_/proj_/abil_icon_ sprites
```
In game: hero appears as a new card; primary fires; F secondary + SPACE ultimate work; XP bar uses the civ accent; level-up cards show correct icons. Duel test: title screen → type `iseedeadpeople` → new hero appears in fighter select with a tier-appropriate loadout.

## Gotchas recap
- `CIV_TRAITS` missing → title screen crash (step 2).
- `countPerPoint < 1` → early effect upgrades do nothing (step 3).
- `orbital` kind forces cooldown 99999 (no auto-fire; proximity tick + duel radial only).
- Keep base luck low (0–2); high luck makes high-rarity loot too easy.
- Each ability caps at 20 upgrades (`GAME.upgradeCap`); past that, level-ups offer hero-stat boosts — this is automatic.
- Recycled projectiles need `body.reset()` + `body.enable = true` (handled in `WeaponSystem.spawnProjectile`); replicate if you write custom spawn code.
