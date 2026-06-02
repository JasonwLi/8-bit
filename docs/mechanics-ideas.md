# 8-Bit Dynasties — New Gameplay Mechanics Proposals

> Research grounded in: Vampire Survivors, Brotato, Halls of Torment, 20 Minutes Till Dawn, Hades, Slay the Spire, PokeRogue, Dynasty Warriors. Written against the live codebase (Phaser 3, `src/data/`, `src/systems/`, `src/scenes/`).

---

## Table of Contents

1. [Mechanic 1 — Mandate Seals (Build Depth)](#1-mandate-seals-build-depth)
2. [Mechanic 2 — Conquest Curses (In-Run Variety)](#2-conquest-curses-in-run-variety)
3. [Mechanic 3 — Musou Momentum (Combat Depth)](#3-musou-momentum-combat-depth)
4. [Mechanic 4 — Formation Stances (Build Depth)](#4-formation-stances-build-depth)
5. [Mechanic 5 — Tribute Chest (In-Run Variety)](#5-tribute-chest-in-run-variety)
6. [Mechanic 6 — Elite Tactics — Modifier Enemies (Combat Depth)](#6-elite-tactics--modifier-enemies-combat-depth)
7. [Mechanic 7 — Dynastic Legacy (Meta-Progression)](#7-dynastic-legacy-meta-progression)
8. [Mechanic 8 — Terrain Conquest Markers (Campaign / Theme Flavor)](#8-terrain-conquest-markers-campaign--theme-flavor)
9. [Mechanic 9 — Weapon Resonance Synergies (Build Depth)](#9-weapon-resonance-synergies-build-depth)
10. [Mechanic 10 — Ally Vanguard (In-Run Variety / Theme Flavor)](#10-ally-vanguard-in-run-variety--theme-flavor)
11. [Mechanic 11 — Heat of Conquest — Difficulty Contracts (Replayability)](#11-heat-of-conquest--difficulty-contracts-replayability)
12. [Mechanic 12 — Broken Relic Gambit (Build Depth / Risk-Reward)](#12-broken-relic-gambit-build-depth--risk-reward)
13. [Ranked Shortlist — Top 5](#ranked-shortlist--top-5)

---

## 1. Mandate Seals (Build Depth)

**One-line pitch:** Artifact-powered build archetypes that unlock a third upgrade axis — letting players double-down on a specific play-style identity mid-run.

### What It Is

After conquering the first enemy civ (i.e., after the player has at least one artifact), a **Mandate Seal** becomes selectable in the normal level-up screen as a rare option (weight ~4, so it appears roughly once every 5–7 levels). Each Seal represents a thematic archetype:

| Seal | Effect when held |
|---|---|
| **Seal of Heaven's Fury** | Each musou window lasts 1 s longer; musou attack damage +25% |
| **Seal of Iron Dominion** | Defense and rangedDefense both count at double value vs. contact hits only |
| **Seal of the Unbroken Line** | Killing a Tier-3 (machine/ballista) enemy instantly refunds 8% of the ability cooldown |
| **Seal of the Silk Road** | XP gems within pickup range are auto-collected and grant +1% damageMult stacking up to ×8 |
| **Seal of the Annihilator** | Every 10th weapon fire triggers a free mini-nova at 40% damage around the player |

A player can hold only **one Seal at a time**. Selecting a second Seal replaces the first (the choice screen shows the current Seal so the tradeoff is clear). Seals are not saved between stages — they reset with each new run segment.

### Why It Fits

The game's current level-up pool (7 generic upgrades + dynamic weapon/ability upgrades) gives no strong build *identity* signal. Seals draw directly on Slay the Spire's lesson that "about 75 cards is the right pool size" — a small, legible set of archetypes forces meaningful tradeoffs (the Fury Seal rewards ability investment, the Iron Dominion Seal rewards the already-sparse defensive equipment). The thematic names tie directly to the conquest-empire flavor.

### Synergies / Interactions

- **Seal of Heaven's Fury** stacks with the `effectMult` line and the Battle Drum artifact — making a Gilgamesh musou-focused run explosively powerful but fragile.
- **Seal of the Silk Road** combos with Silk Road Compass artifact's +45% XP to produce a snowball XP run.
- **Seal of Iron Dominion** is the one defense-focused build enabler that counters the game's intentionally scarce healing — Belisarius with Conqueror's Pauldron becomes a true tank build.
- Seals surface through the existing `UpgradeScene` / `UPGRADES` array — no new UI required.

### Implementation Complexity: Medium

Touches `data/upgrades.js` (add ~5 entries), `entities/Player.js` (2–3 new modifier slots, reset on stage clear), and `scenes/UpgradeScene.js` (one-Seal-at-a-time replacement logic). No new systems needed.

### Risk / Tradeoff

Seals must not outshine artifacts or the 5-option upgrade picks will always feel "wait for a Seal." Weight tuning and the "replace, don't stack" rule are essential guardrails. The Annihilator Seal's proc-on-every-10th-shot needs a per-weapon counter that could be fiddly to track across weapon cooldowns.

---

## 2. Conquest Curses (In-Run Variety)

**One-line pitch:** When a wave clears, a random negative modifier is applied to the next wave — players can spend gold (from breakable crates) to buy it off or accept it for a loot bonus.

### What It Is

At each **wave-end** (when the on-screen enemy count hits zero), a modal pops with a **Curse** drawn from a small themed pool. Two choices are presented:

- **Accept the Curse** — next wave spawns under the debuff; on clearing it, the player receives +1 extra equipment item roll.
- **Spend Gold** — pay a crate-loot-derived currency to dismiss the curse. Gold is only earned from breakable crates and the defeated Tribute Chest (mechanic #5), keeping it rare.

Curse examples:

| Curse | Effect |
|---|---|
| *Fog of War* | Camera zoom reduced by 20% for the wave |
| *Shieldwall Formation* | All soldiers gain +40% defense; ranged units untouched |
| *Cursed Terrain* | The map hazard count doubles for the wave |
| *Iron Rations* | Healing pickups drop at ×0 this wave |
| *Flanked* | Enemies spawn from two sides simultaneously |

### Why It Fits

This addresses the game's current linear wave loop — Vampire Survivors and Halls of Torment both get replayability from varied wave conditions. Brotato's shop risk-reward philosophy (spend now vs. save for later) maps perfectly to the gold buy-off system. The **scarce healing** design intent is preserved — the *Iron Rations* curse is a brutal but fair choice the player consciously accepts. The loot bonus incentivizes the risk without forcing it.

### Synergies / Interactions

- The gold currency creates a new use for breakable crates (currently just cosmetic loot sources), making Sumer's crate-rich map (`breakables: 1.5`) a strategic pick for players who want curse flexibility.
- *Shieldwall Formation* directly synergizes with the Philosopher's Crown artifact (`+30% effectMult`) — AoE/effect builds cut through shields faster, rewarding those builds situationally.
- Adds a reason to hover near crates instead of pure kiting, improving positional play.

### Implementation Complexity: Medium

Needs a new `CurseSystem` (small), a new modal in `scenes/` (similar in scope to `LootScene`), gold tracking in the run object (`data/campaign.js` / `SaveSystem`), and a pool of ~10 curse data objects. The wave-end trigger exists implicitly in the enemy-clear logic in `GameScene`.

### Risk / Tradeoff

The modal interrupts flow — it must be fast (auto-accept after ~4 seconds if no input to avoid annoyance). Gold economy needs calibration: too much gold → players always buy off curses (removes the tension); too little → curses feel mandatory punishment. The "Camera zoom out" curse may cause readability issues on small screens.

---

## 3. Musou Momentum (Combat Depth)

**One-line pitch:** Killing enemies during the musou window builds a "Momentum" stack that extends the window and scales the final hit of the empowered burst.

### What It Is

When the player activates the secondary ability (Spacebar), the existing 3.5-second empowered window begins as normal. A new **Momentum counter** (displayed as a stack count on the empowerAura UI) increments by 1 for each enemy killed during the window. On window expiry:

- Each Momentum stack adds **+0.2 s** to the remaining duration (up to a hard cap of 3 extra seconds).
- On final window expiry, the champion deals a **finishing surge** — a scaled nova (15% of base ability damage × stacks) centered on the player, 0 extra cooldown.

Momentum resets to 0 when the window closes. If the player dies during musou, the finishing surge does not fire.

### Why It Fits

Dynasty Warriors' musou loop rewards continuous combat — the attack surge is meant to feel like an offensive window, not just a cooldown dump. Currently the 3.5-second window passes whether the player fights aggressively or just kites. Momentum creates an internal mini-game: do you push into the horde to rack stacks (risking HP) or play it safe and let the window expire? This directly honors the game's **scarce healing** philosophy — the reward for aggression is a stronger burst, but the risk is meaningful because healing is limited. Halls of Torment's debuff-stacking combos inspired this layered-reward structure.

### Synergies / Interactions

- **Seal of Heaven's Fury** (mechanic #1) makes the window longer, granting more time to build stacks — the two mechanics compose naturally.
- Nobunaga's `barrage` (artillery kind, random targeting) becomes riskier to stack because his projectiles don't require melee range; Lü Bu's `warcry` (nova) naturally forces close-quarters stack-building — differentiation between champions happens organically.
- Battle Drum artifact (`+25% attack speed`) means more weapon procs per second during the window, making momentum stacks easier to hit on fast enemies.
- Momentum counter could be tracked in `player.momentumStacks` and the finishing nova reuses the existing `scene.abilityNova()` call — no new rendering needed.

### Implementation Complexity: Low

Touches `systems/AbilitySystem.js` (window timer + stack counter), `entities/Player.js` (new `momentumStacks` field), and `scenes/UIScene.js` (small stack-count label over the empowerAura). No new assets required; the finishing nova reuses existing `abilityNova`.

### Risk / Tradeoff

The hard cap on extension is critical — without it, skilled players can trivially extend musou indefinitely in dense waves, breaking the cooldown economy. The `+0.2 s per kill` value needs playtesting against horde density (spawnInterval scales down over time, so late-game waves provide many kills). The finishing surge must not produce extreme spike damage that invalidates the regular attack loop.

---

## 4. Formation Stances (Build Depth)

**One-line pitch:** Each champion can toggle between two **combat stances** (hotkey F), each shifting their civ trait in a different direction — offense vs. defense — forcing moment-to-moment positioning decisions.

### What It Is

Each champion has two stances derived from their civilization's historical fighting doctrine. Toggling stance (key F, or D-pad down on gamepad) has a **2-second switchover delay** (brief animation, not a true cooldown) to prevent abuse.

| Champion | Stance A (Aggressive) | Stance B (Defensive) |
|---|---|---|
| **Lü Bu** | *Rampage*: +20% damageMult, −15% defense | *Fortified Line*: +15% defense, −10% damageMult |
| **Nobunaga** | *Iron Curtain Volley*: +20% cooldownMult bonus, −12% rangedDefense | *Entrenchment*: +15% rangedDefense, weapon reach +10%, −8% attack speed |
| **Belisarius** | *Cataphract Assault*: +18% speedMult, −8% defense | *Phalanx*: +20% damageReduction, −10% speedMult |
| **Gilgamesh** | *Divine Wrath*: +20% effectMult, −10% maxHpMult | *King's Shield*: +12% maxHpMult, +8% lifesteal, −15% effectMult |

Stances are **run-persistent** but not saved between stages. The player always starts in Stance A.

### Why It Fits

Brotato's character system creates replayability through stat extremes — this gives each champion a second axis of personality. The **2-second delay** prevents stance-dancing (a real risk without it) while still enabling situational switching: swap to Phalanx when a boss spawns, back to Cataphract Assault for wave-clearing. This creates *active* decision-making without adding a new input burden (F is unused). Historicaly, this echoes Roman *orbis* defensive formations vs. attacking *acies* lines — thematically clean.

### Synergies / Interactions

- Stances interact with civ traits (additive modifier bag in `traits.js`) — Stance B for Belisarius stacks with the already-generous `Theodosian Resolve` damageReduction civ trait to create a near-impervious defensive build.
- Stances interact with artifacts: Vanguard Banner's `+22% speedMult` pushes Cataphract Assault Belisarius to extreme mobility.
- Conqueror's Pauldron + Phalanx stance + `Theodosian Resolve` is a clearly identifiable "tank build" that finally gives defense-focused players a coherent identity.
- Implemented as two additional `mods` objects on each character entry in `data/characters.js` + a `currentStance` flag on `entities/Player.js`.

### Implementation Complexity: Medium

Touches `data/characters.js` (add `stances` array), `entities/Player.js` (`currentStance`, `recompute()` picks the right mod bag), `scenes/GameScene.js` (F-key handler + 2s debounce), and `scenes/UIScene.js` (small stance indicator icon). No new systems.

### Risk / Tradeoff

The 2-second delay needs to feel responsive, not punishing. If players find stance-switching annoying mid-combat they'll just pick one and ignore the feature — at which point it's invisible complexity. An explicit UI prompt/tutorial is needed to surface the mechanic. The modifiers must be balanced so neither stance is strictly superior for all builds.

---

## 5. Tribute Chest (In-Run Variety)

**One-line pitch:** A rare, heavily armored chest spawns mid-wave; it takes sustained damage to break and drops a Legendary-tier item guaranteed — but enemies also target it, racing the player.

### What It Is

Roughly once per stage (timer-gated at ~90 s into a run, similar to the elite timer in `SpawnSystem`), a **Tribute Chest** spawns at a random map location visible to the player via a gold icon on the minimap (or a subtle screen-edge arrow). It has ~300 HP (scaled by `stageScale`). Enemies are coded to also path toward it and chip it (slowly, ~2 HP per contact, but the horde can whittle it down). If enemies destroy it, it drops nothing. If the player destroys it first, it drops:

- 1 guaranteed **Legendary equipment item** (via `rollItem(luckShift=3)` which biases to legendary in the existing `pickRarity` function)
- +20 gold (for the Conquest Curses system, mechanic #2)

Because the chest has its own HP bar and enemies target it, the player faces a dilemma: push through the enemy horde toward the chest vs. clear enemies first (which takes time and lets enemies chip the chest).

### Why It Fits

Vampire Survivors' XP gem-rush and Halls of Torment's elite-kill rewards both use rare high-value targets to create local density spikes. The Tribute Chest adds a **positional objective** to what is otherwise pure kiting. It also distributes a Legendary item reliably once per stage — reducing the perception that good gear is pure RNG — while keeping it contested. The gold tie-in to Conquest Curses (#2) means players who prioritize the chest have more curse-dismissal flexibility later.

### Synergies / Interactions

- Silk Road Compass artifact (`+40% pickup range`) doesn't help here directly, but players with strong AOE output (Greek Fire pools, Gilgamesh radial blades) can control the area around the chest better, making it synergize with offensive builds.
- The chest incentivizes **map traversal** — currently players can optimally kite in a loop without ever crossing the map. The Tribute Chest punishes pure-kite builds.
- Uses the existing `chests` physics group in `GameScene` and the existing `rollItem()` function — minimal new code.

### Implementation Complexity: Low-Medium

Needs a Tribute Chest entity class (~50 lines, borrowing from Boss entity's HP logic), a new timer in `SpawnSystem`, minimal enemy pathfinding tweak (enemies already have a target destination; add a secondary target priority when the chest is live), and the existing `LootScene` handles the Legendary drop. The enemy-targeting-chest logic is the main novel piece.

### Risk / Tradeoff

If the chest has too much HP, players feel it's impossible to contest, and the mechanic becomes background noise. Too little HP, and it's always killed by the player trivially, removing tension. Enemy targeting the chest can feel unfair if a player just cleared a dense wave and enemies immediately destroy the chest before they can reach it — add a 4-second "grace period" after the chest spawns before enemies can target it.

---

## 6. Elite Tactics — Modifier Enemies (Combat Depth)

**One-line pitch:** Elites can roll one of five tactical modifiers that change *how* they fight, not just how tanky they are — demanding different responses and preventing autopilot horde-farming.

### What It Is

When `SpawnSystem.spawnOne(forceElite = true)` fires, in addition to the existing ×4 HP and gold-tint treatment, the elite rolls one modifier from a small pool:

| Modifier | Effect |
|---|---|
| **Shielded** | Immune to weapon damage from the front (90° arc); must be flanked or hit by AoE |
| **Berserker** | Damage and speed +50% but HP halved vs. the elite baseline |
| **Warlord** | Spawns 4 normal soldiers every 6 s; soldiers from this warlord are linked — killing the warlord kills all linked soldiers |
| **Armored Core** | First 40% of HP is immune to all damage; once broken, takes +30% damage |
| **Cursed** | Emits a 100-px radius aura that applies a stacking slow (−8% speed per stack, max 4) to the player on contact |

The modifier is visualized via a small badge/icon above the elite's head (reusing the existing tint system — a second tint ring or a sprite overlay).

### Why It Fits

Hades' Extreme Measures modifiers add new boss phases/attacks, forcing adaptation. Current elites are just stat-bloated versions of normal enemies — the only response is "deal enough damage." Modifier enemies reward **positioning and build awareness**: a Shielded elite forces Gilgamesh (radial) or Belisarius (AoE pools) to shine where Nobunaga's single-direction volley struggles. The Cursed aura interacts directly with the game's scarce-healing design (slowed player = more sustained chip damage = pressure). This is low-cost diversity that scales with the existing spawn system.

### Synergies / Interactions

- **Warlord** modifier makes the Lü Bu warcry nova (hits everything around the player) and Belisarius Greek Fire pools (linger) particularly effective — rewards those kits without nerfing others.
- **Shielded** modifier is a direct counter to matchlock_volley's `projectile_aimed` (single direction), nudging Nobunaga toward his `barrage` ability instead of pure weapon reliance.
- Modifier elites naturally become prioritization decisions: kill the Warlord first to remove his spawn? Or pick off his soldiers to reduce pressure first?
- Leverages existing `SpawnSystem` and `entities/Boss.js` patterns — modifiers are just a data bag applied at spawn time.

### Implementation Complexity: Low

Modifier data goes in `data/enemies.js` (new `ELITE_MODIFIERS` array). The `spawnOne()` method in `SpawnSystem` rolls the modifier and sets flags on the entity. `GameScene`'s damage processing checks flags (`if (e.isShielded && angleToEnemy < 45°) skip`). The Cursed aura uses existing overlap physics. Total: ~80 lines of new code.

### Risk / Tradeoff

**Shielded** requires angle calculation per projectile which could be performance-costly at high horde density — use approximate grid sectors rather than true angles. **Warlord** linked-death is gratifying but the "4 spawned soldiers per 6 s" could spike enemy count above playable density late-game — cap at 8 linked soldiers total. The badge icon must be immediately readable at 8-bit scale.

---

## 7. Dynastic Legacy (Meta-Progression)

**One-line pitch:** A cross-run unlock tree (coins earned from kills/stage clears) that permanently unlocks new starting conditions — a second artifact slot, extra item rerolls, and character-specific passives — without power-inflating the base game.

### What It Is

A new **Dynastic Legacy** screen (accessible from the main menu, separate from the campaign screen) shows a small unlock tree per champion. Nodes are purchased with **Dynasty Coins** — a meta-currency earned at a low rate (~1 per 100 kills, +5 per stage clear, +20 for a full campaign clear). No coins carry over from runs that end in game-over below stage 2.

Example tree (Lü Bu branch):

```
[Starter] Unlock Lü Bu
    └── [10 coins] Halberd Mastery: Start with 1 free Damage point in weapon
        └── [25 coins] Sky Piercer Lore: Halberd arc starts 15° wider
            └── [50 coins] Blood Oath: Start each run with Bloodpact Ring equipped (no other ring)
    └── [15 coins] Peerless Reflex: Reduce Peerless trait HP penalty from −10% to −6%
```

Global (non-champion) nodes:
- **[30 coins] Cartographer**: Reveals shrine locations on the minimap from run start
- **[40 coins] Second Seal Slot**: Can carry two Mandate Seals simultaneously (mechanic #1)
- **[60 coins] Heirloom Chest**: Start each run with 1 Common item pre-equipped in a random slot

### Why It Fits

Hades' boon unlocks and Deep Rock Galactic: Survivor's permanent upgrades show that light meta-progression extends replayability without homogenizing runs. The key design constraint here is **unlocks shape starting conditions, not raw power** — consistent with Enter the Gungeon's philosophy (unlock guns to discover, not stat inflation). Dynasty Coins drip slowly enough that players make meaningful choices about which champion to invest in. Thematically, "building a dynasty" between runs perfectly matches the historical-conquest narrative.

### Synergies / Interactions

- **Second Seal Slot** (unlockable) interacts with mechanic #1 (Mandate Seals) — a late-game reward for invested players that creates genuinely new build combinations.
- **Blood Oath** node forces a build tradeoff (ring slot locked = no other ring drops matter) — a Slay the Spire-style "relics that constrain your choices" design lesson.
- Uses existing `SaveSystem` (`browser-local save`) for coin storage; `MenuScene` or `ConquestScene` can host the tree UI.
- The tree is entirely additive — base game is unchanged for new players. Veterans unlock qualifiers that make runs start with more identity.

### Implementation Complexity: High

Needs a new `LegacyScene` with tree rendering, a `legacy.js` data file, a Dynasty Coin ledger in `SaveSystem`, and hooks into `GameScene.init()` to apply legacy mods at run start. The tree UI is the main cost (Phaser 3 container/button layout). Estimated ~400 lines new code spread across 3–4 files.

### Risk / Tradeoff

The biggest risk is coin grind feeling mandatory before the "real" game is accessible. Rate must be calibrated so a new player completes 1–2 runs before the first unlock is reachable (not 10). The tree must never gate content that makes the base game feel incomplete — all nodes should feel like "nice to have" rather than "need to progress."

---

## 8. Terrain Conquest Markers (Campaign / Theme Flavor)

**One-line pitch:** At the start of each map, the player can "claim" up to three terrain zones by standing in them for 2 seconds — claimed zones are permanently cleared of hazards and grant a small passive bonus for the rest of the stage.

### What It Is

Each civ map has themed terrain zones already (mud slows, thorns chip). On map spawn, **3 Conquest Markers** appear as glowing flag icons inside specific terrain zones (always the same positions per map for consistency — not random, so they're learnable). Standing on a Marker for 2 uninterrupted seconds "claims" it:

- The terrain modifier for that zone is **disabled** (mud no longer slows, thorns no longer chip).
- A **small passive boon** is granted from a per-map pool (e.g., "Silk Road Oasis" on Sumer desert grants +8% XP for the stage; "Castle Rampart" on Japan grants +6% rangedDefense).

Claimed markers are visible to enemies as strategic chokepoints — some enemies will patrol toward unclaimed markers and "contest" them (the marker flashes if an enemy stands on it for 5 s, requiring the player to return to maintain it or lose the boon).

### Why It Fits

Dynasty Warriors' objectives on the battlefield (capture bases, hold positions) give the franchise its strategic layer. This mechanic translates that directly into the survivors-roguelike format without requiring explicit RTS controls. The 2-second claim time requires a brief moment of stillness — meaningful tension in a game where movement is survival. The hazard-removal reward is thematically "pacifying conquered territory" and has concrete value given existing terrain hazard design.

### Synergies / Interactions

- Players with high `speedMult` (Nobunaga, Vanguard Banner artifact) can claim markers quickly and return to defend them — mobility builds gain a new reward dimension.
- Belisarius' Greek Fire pools can permanently zone-deny a marker from enemy contest without requiring the player to stay present.
- Thematically, different maps reward claiming different markers: the Byzantine Hippodrome's hazard-heavy map (`hazards: 1.8`) has the highest claiming payoff — removing hazards is a strong reward there.
- Marker data lives in `data/maps.js`; the 2-second capture timer uses Phaser overlap + a simple timer. No new systems.

### Implementation Complexity: Medium

Needs marker spawn logic in `MapSystem`, player proximity detection (overlap), a 2-second timer per marker, enemy "patrol target" assignment when unclaimed (small tweak to enemy AI in `GameScene`), and passive boon application via the existing mod bag on `Player`. Terrain-disable logic needs a flag check in `MapSystem.update()`. Estimated ~200 lines.

### Risk / Tradeoff

"Stand still for 2 seconds" can feel punishing if enemies approach from all sides. Playtesting must confirm the 2-second window is achievable in the first 60 seconds when enemy density is low. The enemy-contesting-markers sub-system can feel micromanagement-heavy if poorly tuned — if contesting enemies are too fast, the player is on permanent marker defense instead of fighting. Consider making markers **unconstestable** on the first playthrough of each stage until players are experienced.

---

## 9. Weapon Resonance Synergies (Build Depth)

**One-line pitch:** Investing equally across weapon and ability upgrade axes (e.g., 4+ points in weapon damage AND 4+ ability power) unlocks a passive "Resonance" bonus that couldn't be obtained by specializing in one.

### What It Is

The `WeaponSystem` and `AbilitySystem` both track invested points (`weaponPoints` and `abilityPoints` on the run object). A new `ResonanceSystem` evaluates point totals at each level-up and flags which **Resonances** have been unlocked. There are 4 Resonances, one per thematic pairing:

| Resonance | Requirement | Passive Bonus |
|---|---|---|
| **Blade & Breath** | weapon.damage ≥ 4 AND ability.power ≥ 4 | +12% damageMult to both weapon and ability |
| **Range & Reach** | weapon.reach ≥ 4 AND ability.area ≥ 4 | +18% reachMult to both weapon and ability |
| **Storm & Haste** | weapon.speed ≥ 4 AND ability.haste ≥ 4 | Ability cooldown −10%; weapon cooldown −10% (additive on top of existing reductions) |
| **Arsenal & Multitude** | weapon.effect ≥ 4 AND ability.amount ≥ 4 | +1 to weapon projectile count AND +1 to ability count |

Resonances stack — a player who spreads points across all axes could eventually hold all 4, but the early-game cost is severe (spreading 8 points equally means no axis dominates).

### Why It Fits

20 Minutes Till Dawn's "any character can upgrade any weapon" philosophy produces emergent synergies between passive choices. Currently weapon and ability upgrade tracks are entirely siloed — you invest in one or the other at level-up, with no reward for cross-track thinking. Resonances reward **specific cross-track investment patterns** without prescribing a single correct build. The 4-point threshold is reachable around level 8–12, which is roughly mid-stage — timing that coincides with the game's natural difficulty ramp.

### Synergies / Interactions

- **Arsenal & Multitude** is particularly potent for Gilgamesh (divine_arsenal already starts with count 6; +1 more is a large percentage gain) and Nobunaga's barrage (adding a shell).
- Resonances are visible in the `UIScene` alongside existing weapon/ability point displays — a small icon lights up when unlocked, providing positive feedback.
- The Philosopher's Crown artifact (`+30% effectMult, +35% reachMult`) synergizes heavily with Range & Reach Resonance, creating a distinct "wide-field controller" build.
- No new data files needed — Resonance logic lives in a small `ResonanceSystem` class or is computed inside `Player.recompute()`.

### Implementation Complexity: Low

`Player.recompute()` already aggregates all mods. Add a `computeResonances()` helper that checks `run.weaponPoints` and `run.abilityPoints` and returns extra modifier values. This is ~40 lines of logic. The UIScene indicator is ~20 lines. No new scenes or assets required.

### Risk / Tradeoff

Resonances may create "trap builds" — players who naturally spread points just happen to meet the threshold without understanding why they got a bonus. The UI indicator must clearly explain what triggered the resonance. The `Storm & Haste` resonance stacks with existing cooldown reductions multiplicatively — needs a hard floor to prevent near-zero cooldowns at high investment.

---

## 10. Ally Vanguard (In-Run Variety / Theme Flavor)

**One-line pitch:** Once per stage, the player can call a historical "ally champion" to fight alongside them for 15 seconds — drawn from the civs already conquered, the ally uses a simplified version of their weapon.

### What It Is

After the player conquers their first civ, a new **Vanguard Horn** cooldown (300-second base, shown in UI alongside the ability cooldown) becomes available via a second hotkey (V). When activated, one of the **previously conquered civs' champions** (randomly selected if multiple) spawns as a friendly unit near the player and auto-fights for 15 seconds using a simplified version of their starting weapon:

- **Lü Bu** (if conquered): sweeps a melee arc every 1.2 s dealing 30% of the player's current damageMult
- **Nobunaga** (if conquered): fires 2 matchlock bolts at nearest enemies every 0.9 s
- **Belisarius** (if conquered): lobs 1 Greek Fire pool every 2 s at nearest enemy cluster
- **Gilgamesh** (if conquered): fires 4 radial blades every 1.4 s

The ally has no HP bar (they are "legendary commanders, not killable"), expires after 15 seconds with a dramatic exit animation, and the Vanguard Horn cools down. The ally cannot interact with shrines, chests, or terrain — they are purely a combat multiplier.

### Why It Fits

Dynasty Warriors consistently uses "allied generals" as strategic assets on the battlefield. PokeRogue's passive abilities and switching mechanics show that "a second fighter" adds tactical texture without complexity cost. The 300-second cooldown (5 minutes) means this fires roughly once per stage — a big moment, not a crutch. The ally being locked to already-conquered civs is a direct narrative reward for campaign progress ("Your conquered enemies now fight for you"), integrating with the existing `run.conquered[]` array.

### Synergies / Interactions

- Conquering more civs = more possible ally types = more variety per stage call. Gilgamesh runs that conquered China get Lü Bu as a potential ally — melee+radial is a satisfying combo.
- The Mandate Seal of Heaven's Fury (mechanic #1) could have an optional upgrade node that reduces the Vanguard Horn cooldown by 30 s as a secondary effect.
- Ally summon during musou window = a "dynasty-warrior moment" of spectacle that the game's tone demands.
- Allies use the existing enemy sprite system (just friendly-tinted) and the existing weapon fire logic — no new rendering pipeline.

### Implementation Complexity: Medium

Needs an `AllySystem` class (~100 lines) that tracks the cooldown and spawns/manages the ally entity, ally behavior AI (~60 lines, simplified from enemy AI in `GameScene`), and a new UI indicator. The ally combat logic borrows directly from existing weapon fire code. The main complexity is ensuring friendly-fire doesn't occur (allies need to be in a separate non-colliding group).

### Risk / Tradeoff

Ally AI must be "good enough to feel helpful" without being a dominant balance factor. If the ally outputs too much damage, players wait for the horn before every hard encounter; too little and it's ignored as decoration. The ally cannot interact with pickups — this must be clearly communicated so players don't feel the ally "steals" gems. Screen-reading clarity (distinguishing the ally from enemies) requires a clear color tint (green halo or heavy gold outline).

---

## 11. Heat of Conquest — Difficulty Contracts (Replayability)

**One-line pitch:** Before each stage, the player may optionally bind 1–3 Contracts that apply run-wide penalties in exchange for multiplied artifact reward choice count and quality.

### What It Is

After `ArtifactScene` (when a stage is beaten) but before the next `GameScene` starts, a **Contract Screen** appears. Players may activate 0–3 Contracts:

| Contract | Penalty | Reward |
|---|---|---|
| *Martial Law* | Enemies deal +20% damage all stage | +1 artifact choice at next stage clear |
| *Scorched Earth* | No shrines on map | Artifact pool biases toward top 5 rarest artifacts |
| *Iron Discipline* | Healing from equipment capped at 50% of face value | +15% XP all stage (accelerates leveling) |
| *Enemy Siege* | Boss HP +30% | Bosses drop an extra equipment item on death |
| *Broken Supply Lines* | No breakable crates on map | Gain 40 Dynasty Coins (meta-currency from mechanic #7) |

Contracts stack — 3 active Contracts makes the stage very hard but yields exceptional rewards. Contracts reset each stage (don't carry forward). There is no penalty for enabling 0 Contracts.

### Why It Fits

Hades' Pact of Punishment is the canonical proof that player-chosen difficulty modifiers with meaningful rewards are the most elegant long-term replayability system in roguelikes — they "personalize difficulty" without gatekeeping content. The game's per-stage structure already creates natural Contract attachment points (between `ArtifactScene` and `GameScene`). The existing per-stage `stageScale` already adjusts base difficulty — Contracts layer on top without breaking that calibration. "No shrines" is a surgical penalty targeting the already-scarce healing system without making it feel random.

### Synergies / Interactions

- *Iron Discipline* + Ancient Relic Core artifact (regen build) = Contracts can reinforce a player's existing build identity rather than being purely punitive.
- *Scorched Earth* is uniquely punishing for Belisarius (who has the lowest base HP at 110 and the most regen reliance) — different champions naturally engage different Contracts.
- The `ConquestScene` already sequences scene transitions; the Contract screen inserts cleanly between `ArtifactScene` → (Contract screen) → `MapSelectScene` → `GameScene`.
- Dynasty Coins earned via *Broken Supply Lines* feeds mechanic #7 — creating a deliberate currency sink for players who want to fast-track Legacy unlocks.

### Implementation Complexity: Medium

Needs `data/contracts.js` (~30 lines), a `ContractScene` (~100 lines, similar to `ArtifactScene`), and application of contract mods in `GameScene.init()` (stored temporarily on the run object, cleared after the stage). The reward side (extra artifact choices, biased pool) touches `ArtifactScene.js` and `data/artifacts.js`'s `rollArtifacts()` function minimally.

### Risk / Tradeoff

Contracts must never feel mandatory to keep up with difficulty scaling. If standard-difficulty play feels underpowered without Contract XP bonuses, the base game's tuning needs adjusting instead. Players who ignore Contracts must be able to complete the campaign. The "Scorched Earth / no shrines" contract is the most dangerous — it must be tested specifically against champions with low regen (Lü Bu, Nobunaga) to ensure the stage remains winnable without a healing safety net.

---

## 12. Broken Relic Gambit (Build Depth / Risk-Reward)

**One-line pitch:** Any equipped item can be "shattered" in the LootScene — destroying it permanently to absorb just its best stat as a permanent run-wide bonus, scaled up by 50%.

### What It Is

In `LootScene` (the equipment compare/equip screen), every equipped non-weapon item has a new **Shatter** button alongside the existing equip/discard options. Shattering an item:

1. Removes the item from the equipment slot (slot becomes empty).
2. Extracts the item's **primary stat only** (the dominant mod, e.g., `damageMult` from a Ring).
3. Applies that stat as a permanent mod to the run at **×1.5 multiplier** (so a Rare Ring with `damageMult: 0.10` → grants `damageMult: 0.15` permanently as a run bonus, not re-equipable).
4. The slot cannot be re-equipped until a new item drops for it.

Shatter is irreversible. The permanent bonus is tracked in `run.shatterMods` and applied in `Player.recompute()` the same way equipment mods are.

### Why It Fits

Slay the Spire's design lesson is that "relics that constrain your choices" create identity. Brotato's multi-weapon system shows players love build-defining sacrifice moments. Shattering a Legendary item for a raw stat boost is a high-stakes, high-information decision — it rewards players who understand the mod system deeply. It also addresses a common Survivors-genre pain point: late-game equipment feel "low impact" because base stat values on individual items are small. Shattering amplifies that impact at the cost of slot diversity, creating genuine tradeoffs.

### Synergies / Interactions

- Shattering an Epic Ring (`damageMult: 0.24 × 1.5 = +36% damage permanently`) opens the ring slot for something else — but also removes the slot's defensive coverage, directly pressuring the scarce-healing design.
- Mandate Seals (mechanic #1) interact: the **Seal of the Annihilator** fires a nova on every 10th shot — Shattering a gloves item to extract raw attack speed synergizes with this proc rate without requiring the gloves slot.
- The Silk Road Compass artifact (`+45% XP`) enables faster leveling; pairing with a Shattered pendant (XP stat retained at ×1.5) creates a distinct "XP funnel then late-game power spike" build.
- Implementation is almost entirely in `LootScene.js` (new button) and `entities/Player.js` (accumulate `shatterMods`). The `recompute()` function already handles arbitrary mod bags.

### Implementation Complexity: Low-Medium

The `LootScene` UI needs a new button and confirmation prompt. `entities/Player.js` needs a `shatterMods` accumulator and `recompute()` must include it. The run-save in `SaveSystem` needs to persist `shatterMods`. Estimated ~100 lines total across 3 files.

### Risk / Tradeoff

Shattering a Legendary item must not be trivially optimal every time — the ×1.5 bonus needs to be calibrated so the "keep it equipped" baseline is usually competitive. The biggest risk is that Shattering becomes mandatory for optimal play, effectively turning the entire equipment system into a "stat extraction layer" that players min-max rather than enjoy as varied items. Hard-capping the number of Shatters to 2–3 per run (displayed as a "Shatter Charges" counter) prevents runaway optimization while preserving the mechanic's drama.

---

## Ranked Shortlist — Top 5

*Best bang-for-buck first: highest fun/depth per implementation hour, lowest balance risk, tightest fit to existing systems.*

| Rank | Mechanic | One-Line Reason |
|---|---|---|
| **1** | **Musou Momentum (#3)** | Lowest effort (~80 new lines), directly deepens the most distinctive system in the game (the musou window), and immediately rewards aggressive play in a way that honors the scarce-healing design without touching any data files. |
| **2** | **Elite Tactics — Modifier Enemies (#6)** | ~80 new lines, zero new UI, transforms existing elites from "tank with gold tint" into genuinely different encounter types — the single highest-impact change to combat feel per line of code. |
| **3** | **Weapon Resonance Synergies (#9)** | ~60 new lines, purely additive to existing upgrade systems, rewards cross-track investment to create legible build identities that players will naturally discover and theorize about. |
| **4** | **Conquest Curses (#2)** | Medium effort but adds the genre's most underused mechanic (player-accepted negative modifiers mid-run), directly extends wave loop variety, and double-duties the breakable crates into a real economy without new asset needs. |
| **5** | **Heat of Conquest — Difficulty Contracts (#11)** | The proven replayability anchor from Hades, slots cleanly between existing scenes, requires no in-run systems changes, and gives veterans infinite reason to return to stages they have already beaten. |

---

*Sources consulted during research:*
- [Vampire Survivors Design Analysis — KokuTech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors)
- [Brotato Review — Rogue Ranker](https://rogueranker.com/brotato-review/)
- [Hades Pact of Punishment Guide — RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
- [Slay the Spire Design Principles — LifelessGame](https://lifelessgame.com/slay-the-spire-deckbuilding-mechanics-strategy-elements-and-replay-value/)
- [20 Minutes Till Dawn Weapon Evolutions — Screen Rant](https://screenrant.com/every-weapon-evolution-20-minutes-till-dawn/)
- [Dynasty Warriors Origins Gameplay Mechanics — dtgre.com](https://www.dtgre.com/2025/01/dynasty-warriors-origins-gameplay.html)
- [Halls of Torment Complete Guide — Splintertalk](https://www.splintertalk.io/@felipejoys/complete-guide-to-halls-of)
- [PokéRogue Mechanics Wiki](https://wiki.pokerogue.net/gameplay:mechanics)
