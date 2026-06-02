# 8-Bit Dynasties

An 8-bit roguelike *survivors* game (à la Vampire Survivors) starring historical
figures. Move, dodge, and let your auto-firing weapon thin the endless swarm
while you level up and stack upgrades.

Built with **Phaser 3 + Vite**. Pixel-art rendering; engine-first with
procedural placeholder sprites and a documented pipeline for swapping in real
AI-generated art.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build for production: `npm run build` (output in `dist/`).

## How to play

- **Move:** WASD or arrow keys
- **Weapon auto-fires** — you never aim
- **Spacebar:** fire your **secondary ability** (when its cooldown bar is full)
- **Esc:** pause — view full stats / equipment / artifacts, resume, or save & exit
- **M** — toggle mute

## Campaign

You conquer the world one civilization at a time:

1. Pick a champion, then **choose which land to invade** (the 3 civs that aren't yours).
2. Each stage is a long, escalating siege — **~15 minutes** (the final stage
   **~30**). Difficulty ramps continuously within the stage *and* steps up each
   stage. That civilization's **named generals** arrive at intervals, then its
   **champion** lands near the end as the climax. Bosses scale with stage + your
   level, so they stay genuinely dangerous.
3. **Boss fights are skill-based 1v1 duels** (Dynasty-Warriors style). The boss
   *challenges* you — **[Y] accept** for a cinematic one-on-one (swarm clears,
   camera zooms into a bounded **arena ring**) or **[N] decline** to fight them in
   the open amid the horde (no finisher reward). In a duel your auto-weapon turns
   off and you fight **manually**: **arrow keys move**, **J = basic attack**,
   **K = charge attack**. Chaining hits builds a **combo**; the boss **blocks** —
   light attacks (J) bounce off its guard, so you must land a **charge (K) to
   break the guard** and stagger it for a punish window. Higher stages block more
   often. Defeat the boss for a **finisher** (slow-mo + zoom punch + shockwave),
   plus a **Flawless** bonus (extra loot + bigger heal) if you never dropped below
   half HP. Win the champion's duel to **conquer** the land.
3. Beating the champion **conquers** the land; **claim one permanent artifact** to
   carry forward, then choose your next conquest.
4. After all three lands fall, the **final stage** is a gauntlet of all four
   champions, then the world-conqueror **Xerxes the Undying**. Win to rule the world.

Difficulty scales each stage (and boss HP scales with your level), so later
champions are genuinely tanky. Before each stage you may bind **Heat of Conquest
contracts** (Hades-style): up to 3 optional penalties (enemy damage, boss HP,
no shrines, −max HP…) each granting +1 artifact choice at the conquest.
**Death ends the run.**

## Depth mechanics

- **Musou Momentum:** kills *during* the musou window bank stacks that extend it
  (capped) and detonate a scaling finishing nova when it ends — rewards pushing
  into the horde. (`AbilitySystem` + `Player.addMomentum`.)
- **Weapon Resonance:** investing 4+ points in matching weapon & ability axes
  unlocks passive synergies (Blade & Breath, Range & Reach, Storm & Haste,
  Arsenal & Multitude). (`GameScene.updateResonances`.)
- **Elite Tactics:** elites roll a tactical modifier — Berserker, Ironclad
  (armored shell), Warlord (summons), Hex (slow aura), Swift — changing *how*
  they fight, not just their HP. (`data/enemies.js` `ELITE_MODIFIERS`.)
- **Difficulty Contracts:** the optional pre-stage risk/reward layer above.
  (`data/contracts.js`, `src/scenes/ContractScene.js`.)

Further proposed mechanics (researched, not yet built) live in
`docs/mechanics-ideas.md`.

### Saving (browser-local, PokeRogue-style)

The run **autosaves every ~10s** (and at stage boundaries / on exit), persisting
your **full state** — level, weapon & ability points, equipment, artifacts,
kills, and your position within the current stage. Closing the tab and hitting
**Continue** resumes mid-stage with everything intact. The save is JSON,
base64-encoded, and cleared on death or victory. Your **held artifacts** show in
the HUD (top-right); press **Esc** for the full inventory with each artifact's
exact stats. (Same idea as
PokeRogue's local session save — straightforward to later sync to a server.)
See `src/systems/SaveSystem.js` and the run model in `src/data/campaign.js`.
- Walk over **XP gems** (blue diamonds) dropped by slain enemies
- On **level up**, choose **1 of 5 random options** that each upgrade either your
  **primary attack** (Damage / Reach / Attack Speed / Effect) or your **secondary
  ability** (Power / Frequency / Area / Multitude). Press 1–5 or click.
- Your **secondary ability** (Spacebar, unique per champion: War Cry, Cannon
  Barrage, Cataphract Charge, Heaven's Fall) fires on a visible cooldown. Casting
  also opens a brief **"musou" window** where your *regular attack* surges —
  harder, faster, and bigger (Dynasty-Warriors-style fusion).
- After picking a champion, **choose your battlefield** — each map has its own
  look and feature mix (cover, hazards, loot).
- Grab **power-ups** (from shrines, elites, bosses): 2× Attack, 2× Defense,
  2× Speed, or 10s Invulnerability — shown with timers in the HUD.
- Open **chests** (from elites/bosses and the field) to pick up **equipment** —
  compare against your current item and Equip or Skip
- **Dodge** ranged attacks: enemies telegraph (flash red) before firing slow orbs
- **Work the map:** smash crates for loot, touch shrines for a buff/heal, avoid
  mud (slows), thorns, and hazard spikes; use rocks and pillars as cover. Your
  weapon also breaks crates.
- **Healing** is slow and caps at ~50% HP — push past it sparingly with gear
  (regen / lifesteal), health hearts, and shrines.
- Survive as long as you can; the run ends when your HP hits 0

## Systems

- **Traits (two layers, both minor, stacking):** every character has a
  *civilization* trait (shared by their civ) and a *personal* trait (a buff
  paired with a debuff). Defined in `src/data/traits.js`.
- **Weapon customization:** one weapon per character, leveled along four axes
  instead of fixed tiers. Tuning in `src/data/weapons.js`; math in
  `src/systems/WeaponSystem.js` (`computeStats`).
- **Secondary abilities:** each champion has a unique auto-casting ability with
  its OWN upgrade axes (power / haste / area / amount), distinct from the weapon.
  War Cry (knockback nova), Cannon Barrage (artillery), Cataphract Charge
  (trampling lance), Heaven's Fall (meteors). Data in `src/data/abilities.js`,
  behavior in `src/systems/AbilitySystem.js`. Level-ups offer 5 random options
  spanning weapon + ability upgrades. Abilities are **Spacebar-triggered** with a
  cooldown, and casting opens a **musou window** that surges the regular attack.
- **Maps:** pick a battlefield at the start (`src/data/maps.js`,
  `src/scenes/MapSelectScene.js`); it sets the theme and scales feature counts.
- **Power-ups:** 2× Attack / 2× Defense / 2× Speed / Invulnerability (10s) from
  shrines, elites, and bosses, with HUD timers (`Player.addBuff`).
- **Equipment:** MapleStory-style slots, one item each (Hat, Armor, Gloves,
  Boots, Cape, Shield, Ring, Pendant). Items roll a rarity (Common→Legendary)
  and carry stat mods aggregated in `Player.recompute()`. See
  `src/data/equipment.js`.
- **Enemies:** a diverse roster (`src/data/enemies.js`) with differentiated
  **movement patterns** — chase, zigzag, circle/flank, charger (telegraphed dash),
  lunger (leap) — and **attack styles** for ranged units — single, spread (fan),
  rapid (burst), lob (slow heavy shell). Per-mob AI lives in
  `src/systems/EnemyAI.js`; new types auto-get placeholder art.
- **Bosses:** each stage runs a boss *sequence* — two of the civ's **named
  generals** (e.g. Xiahou Dun & Zhang Liao, Takeda Shingen & Date Masamune,
  Narses & Heraclius, Sargon & Hammurabi), each with its own attack, then the
  civ's **champion** (Cao Cao / Hideyoshi / Justinian / Enkidu). Bosses can
  carry a single `attack` or an `attacks` array they cycle, plus
  `phaseThresholds` for HP-based enrage. Each **champion** wields two attacks and
  enrages at 50% HP; the final **Xerxes the Undying** wields all four patterns and
  escalates at 66%/33%. Lieutenants are lighter (~0.42× HP); champion/boss HP
  scales with stage + player level. Data in `src/data/bosses.js` (+ `CIV_LIEUTENANTS`), behavior in
  `src/entities/Boss.js`, sequencing in `src/data/campaign.js`.
- **Theming:** each champion's civilization sets a visual theme — battlefield
  palette, parallax motif (Chinese pagodas, Japanese torii, Byzantine columns,
  Sumerian ziggurats), and a UI accent color. See `src/data/themes.js`.
- **Audio:** fully procedural (Web Audio) — a chiptune loop that intensifies in
  boss fights, plus synthesized SFX. No asset files. See
  `src/systems/AudioManager.js`. Press **M** to mute.
- **Effects:** floating damage numbers, impact sparks, muzzle flashes, death
  poofs, and boss shockwaves — all per-frame budgeted in `src/systems/Fx.js`.
- **Character stats:** each champion has Attack, Health, Move Speed, Defense
  (melee DR), Ranged Defense, Lifesteal, and passive Regen. Gear and traits
  modify these via `Player.recompute()`. Defense and Ranged Defense are split so
  ranged-vs-melee builds matter.
- **Healing (deliberately scarce):** a very slow passive regen that only refills
  to ~50% HP (the cap). More healing is opt-in via gear (`regen`, `lifesteal`,
  `regenCapBonus` mods), rare **health hearts**, and shrines. Healing is tuned
  low — survival is mostly about defense, dodge, and positioning.
- **Equipment stats:** items roll a primary + secondary stats from a rich pool
  (attack, defense, ranged defense, dodge, lifesteal, regen, attack speed, etc.),
  scaling in count and magnitude with rarity. See `src/data/equipment.js`.
- **Opinionated map** (`src/systems/MapSystem.js`): scattered **terrain zones**
  (mud slows, thorns chip + slow), solid **obstacles** that block
  player and enemies, **breakable crates** (smash for loot), one-time **shrines**
  (buff or heal), and **hazards** that damage anything standing in them —
  including enemies, so they're tactical.

## Roster

| Champion    | Civilization        | Signature weapon                          |
|-------------|---------------------|-------------------------------------------|
| Lü Bu       | Three Kingdoms China| Sky Piercer Sweep — melee arc around you  |
| Oda Nobunaga| Sengoku Japan       | Tanegashima Volley — piercing bullets     |
| Belisarius  | Byzantine Empire    | Greek Fire — lobbed flame pools           |
| Gilgamesh   | Sumer / Uruk        | Divine Arsenal — blades in all directions |

## Project layout

```
src/
  main.js              Phaser game config + scene registration
  config.js            Tuning knobs (world size, XP curve, sprite sizes)
  scenes/
    BootScene.js       Generates placeholder art; load real art here
    MenuScene.js       Character select + Continue
    ConquestScene.js   Choose the next land to invade
    ContractScene.js   Bind optional difficulty contracts before a stage
    ArtifactScene.js   Claim a permanent artifact after a conquest
    PauseScene.js      Esc pause: stats / inventory / artifacts
    WinScene.js        Victory (world conquered)
    GameScene.js       Core gameplay loop + damage/death helpers
    UIScene.js         HUD overlay (HP, XP, timer, level, kills)
    UpgradeScene.js    Level-up modal (weapon customization: 4 axes)
    LootScene.js       Chest modal (equip / skip with comparison)
    GameOverScene.js   Run summary + retry
  entities/
    Player.js          Avatar + run-scoped stats; recompute() aggregates mods
    Boss.js            Boss state machine (telegraph -> execute -> cast/charge)
  systems/
    WeaponSystem.js    Single weapon; computeStats() + auto-fire behaviors
    AbilitySystem.js   Unique auto-casting secondary ability per character
    SpawnSystem.js     Time-scaled spawner; elites + chest drops
    AudioManager.js    Procedural Web Audio chiptune + SFX (shared instance)
    Fx.js              Frame-budgeted visual effects
    MapSystem.js       Terrain zones, obstacles, breakables, shrines, hazards
  data/                Data-driven content (characters, weapons, abilities,
                       enemies, traits, equipment, bosses, themes, maps,
                       campaign, artifacts)
  systems/SaveSystem.js  localStorage run persistence
  art/placeholders.js  Procedural placeholder textures
art/                   Sprite generation prompts + spritesheet spec
tools/                 process-spritesheet.mjs (raw image -> game sprite)
```

## Adding real art

Everything references textures by key, so art is fully decoupled from gameplay.
See `art/PROMPTS.md` (per-figure generation prompts) and
`art/SPRITESHEET-SPEC.md` (the key list + the BootScene swap point).

## Tuning & extending

- **Balance:** `src/config.js` (XP curve), `src/data/*` (stats, weapon scaling, spawn table, rarity weights)
- **New character:** add an entry to `src/data/characters.js` (set `civId` +
  `startingWeapon`) and a personal trait in `src/data/traits.js`
- **New weapon:** add to `src/data/weapons.js` (`base` + `perPoint` + `effect`);
  if it needs new behavior, add a `kind` case in `src/systems/WeaponSystem.js`
- **New enemy:** add to `src/data/enemies.js` (`attack: 'melee'|'ranged'`) and
  the `SPAWN_TABLE`
- **New boss:** add to `src/data/bosses.js` + `BOSS_ORDER`; if it needs a new
  attack `kind`, add a case in `Boss.executeAttack()`
- **New equipment slot/stat:** extend `SLOTS` + `SLOT_BASE` in `src/data/equipment.js`

Note: `src/data/upgrades.js` is from the v1 random-upgrade pool and is no longer
wired in (level-ups now customize the weapon); kept for reference.

## Roadmap

- ✅ Traits, weapon customization, equipment/loot, ranged enemies, boss waves
- ✅ Procedural audio, per-civ themes/backgrounds, combat FX, balance pass
- ✅ Full stat model (def / ranged def / lifesteal / regen), healing, diversified
  item stats, opinionated map (terrain / obstacles / breakables / shrines / hazards)
- ✅ Unique secondary abilities per character + 5-random-option level-up (weapon
  or ability), tighter economy (rarer/richer chests, scarcer healing)
- ✅ Skill-based fighting-game duels (J/K combos + arrow movement, boss blocking
  & guard-break) with accept/decline challenge and finisher + flawless bonus
- ✅ Diversified enemy roster (10+ types, 5 movement patterns, 4 ranged styles)
  via `EnemyAI.js`
- ✅ Long escalating stages (~15 min / 30 min final) with scheduled boss waves,
  per-stage + per-level difficulty scaling, full-state autosave + mid-stage
  resume, and an in-HUD artifact readout
- ✅ Depth pass: Musou Momentum, Weapon Resonance, Elite Tactics modifiers,
  Heat-of-Conquest difficulty contracts (more ideas in `docs/mechanics-ideas.md`)
- ✅ Spacebar abilities w/ cooldown + musou attack-fusion, power-ups
  (2× atk/def/spd, invuln), playtest-tuned boss HP + swarm ramp
- ✅ Campaign: conquer-the-world stages, multi-boss sequences (generals → champion
  → final gauntlet → Xerxes), permanent artifacts, Esc pause/inventory, and
  browser-local save/continue
- Real AI-generated sprites (pipeline ready — see `art/`)
- Walk/idle sprite animation (spec in `art/SPRITESHEET-SPEC.md`)
- Boss attack-pattern variety (multi-phase, second attacks)
- Meta-progression / persistent unlocks between runs
