# Dungeon Floors — Architecture

> **Doc currency:** updated 2026-06-01 to match the current codebase — the
> **8-civ roster** (final gauntlet is now 9 bosses, not 5), **player-power**
> difficulty scaling, **boss HP+damage** scaling and boss XP grants, **Caesar's
> allied legionaries**, and the **toroidal** world wrap. Stale numbers from the
> original 4-civ draft have been corrected throughout (look for ⚠ notes).

## 1. Problem statement

Today a "stage" is **one enormous open arena** — the playfield is a **torus**
(`config.GAME.worldSize = 4096`, so a ±4096 ≈ 8192² field that **wraps** at the
edges via `GameScene.wrapEntity`). `SpawnSystem` produces an **endless swarm**
scaled by **player offense × elapsed time × stage** (`difficulty =
playerPower() × (1 + elapsed/240) × stageScale`), and bosses arrive on a
*timestamp schedule* (`GameScene.bossTimes`, derived from `stageDuration` =
15 min civ / 30 min final). You win by surviving the stage duration.

We are replacing the open arena with a **Pokémon-Mystery-Dungeon-style descent**:

- Each civ stage is now **15 floors**; the **final stage is 30 floors**.
- Each floor is a **bounded, procedurally generated dungeon** of rooms connected
  by corridors, enclosed by walls, with a **down-stairs** somewhere inside.
- Combat stays **exactly as it is** — real-time auto-fire weapons (incl. the new
  `summon`/`line_thrust`/`ricochet`/`boomerang` kinds), dodging, the 1v1 duel
  system, and the survivors swarm. **Only the map changes** — but two existing
  systems now interact with walls and must be handled (see ⚠ below): the
  **toroidal wrap** (disable it — floors have hard walls) and **Caesar's allied
  legionaries** (they seek the nearest *enemy*, so they need wall-aware steering
  too, not just the player-anchored flow field).
- **Floor goal = "survive + escape down":** the swarm keeps pressuring you; you
  reach the stairs to drop to the next floor and shed the current swarm.
- **Boss placement:** the civ's two lieutenant generals gate **floors 5 and 10**;
  the **champion** is the **bottom-floor (15)** climax. ⚠ The **final stage** is
  now a gauntlet of **all eight civ champions + Xerxes = 9 bosses** (the roster
  grew from 4 civs to 8), spread across the 30 floors with **Xerxes on floor 30**.
  9 bosses over 30 floors is dense (≈ one every 3 floors) — consider bumping
  `floorsFinal` (see §5).

### What this rewires (and what it does not)

| Concern | Before | After |
|---|---|---|
| Playfield | One ±4096 **toroidal** open world | Per-floor generated dungeon (~1600²) |
| World edges | **wrap** (`wrapEntity`), `setCollideWorldBounds(false)` | hard walls; ⚠ **disable the wrap** in floor mode |
| Difficulty driver | `playerPower() × (1+elapsed/240) × stageScale` | `playerPower() × (1 + floorTerm + dwell) × stageScale` — **keep playerPower** |
| Enemy damage / XP | scale with `elapsed` & `stageScale` (`dmgScale`, `xp×difficulty^0.62`) | swap the `elapsed` term for a **floor** term (same shape) |
| Boss trigger | `runTime >= bossTimes[i]` | Reaching a **boss floor** |
| Boss scaling | `hpScale` + `bossDmgScale` (stage × playerPower) | same, optionally × a mild **floor** factor |
| Stage end | survive `stageDuration` | defeat champion on the **last floor** |
| Enemy navigation | straight-line steer (open) | **flow-field pathfinding** (walls!) |
| Allied units (Caesar) | seek nearest enemy, straight-line | ⚠ need wall-aware steer or "phase through" like chargers |
| Save resume | `stageTime` (ms) + `swarmElapsed` carry-over | `floor` + `floorSeed` |
| Combat / weapons / duels / loot | — | **unchanged** |

The single hardest new requirement is **enemy navigation**: the existing AI steers
straight at the player, which breaks against walls. A floor-grid **flow field**
(BFS distance map from the player) gives every chaser a wall-aware direction.
⚠ Two existing systems also touch terrain and must be handled: (1) **`wrapEntity`**
(the toroidal loop) must be **disabled** on floors — hard walls replace wrapping;
(2) **Caesar's legionaries** (`GameScene.allies` / `updateAllies`) chase the
nearest *enemy* in a straight line, so on a walled floor they'll press into walls
— either give them the same flow-field treatment (toward their target) or let them
"phase" briefly like charger dashes. (Bonus: projectile↔obstacle blocking is
**already wired**, so ranged shots correctly stop at dungeon walls — no new work.)

---

## 2. Folder structure

```
src/
  config.js                 (+ DUNGEON tuning block)
  data/
    campaign.js             (+ run.floor / run.floorSeed, bossFloorsFor())
    dungeon.js              NEW — pure floor generator (seeded, headless-testable)
  systems/
    FloorSystem.js          NEW — builds tilemap/walls/stairs/loot; descend()
    FlowField.js            NEW — BFS distance field for enemy pathfinding
    SpawnSystem.js          (floor-based difficulty; spawn on walkable tiles)
    EnemyAI.js              (chase movement samples the flow field)
    MapSystem.js            (terrain/hazard zones placed inside rooms, not scattered)
    SaveSystem.js           (unchanged API; persists run.floor/floorSeed via run)
  scenes/
    GameScene.js            (floor lifecycle replaces the stage timer + boss schedule)
    UIScene.js              (Floor X/Y indicator + "↓ descend" prompt replace timer)
    BootScene.js            (load new dungeon textures)
  art/
    placeholders.js         (+ dungeon_wall / dungeon_floor / stairs_down textures)
tools/
  test-dungeon.mjs          NEW — headless tests for dungeon.js + FlowField.js
docs/dungeon-floors/
  dungeon-floors-architecture.md   (this file — source of truth)
  ArchitectureDoc.jsx              (interactive visualization)
```

---

## 3. Domain responsibilities

- **`data/dungeon.js` (generation):** pure, seeded. Input = seed + size knobs;
  output = a `FloorData` record (grid, rooms, start, stairs, loot anchors). No
  Phaser, no rendering — fully unit-testable in node.
- **`systems/FloorSystem.js` (realization):** turns one `FloorData` into the live
  floor — wall colliders (greedy-meshed rectangles into `scene.obstacles`), the
  themed floor backdrop, the stairs object, and loot/terrain anchors. Owns
  tile↔world conversion and "is this point walkable / give me a walkable point
  near X" queries used by spawning. Owns `descend()` teardown+rebuild.
- **`systems/FlowField.js` (navigation):** a BFS distance field over floor cells,
  recomputed from the player's cell a few times per second. `dirAt(col,row)`
  returns the unit step toward the player along open tiles. Chaser enemies use it.
- **`systems/SpawnSystem.js`:** difficulty now scales with **floor** (plus a mild
  dwell-time term so loitering is punished). Spawns land on **walkable** ring
  tiles around the camera.
- **`scenes/GameScene.js`:** orchestrates the **floor lifecycle** — build → play →
  detect stairs → `descendFloor()` → rebuild; gates boss floors; calls
  `conquerStage()` when the champion on the last floor dies.
- **`data/campaign.js`:** run model gains `floor` + `floorSeed`; `bossFloorsFor()`
  maps the existing `bossSequence` onto floor numbers.
- **`scenes/UIScene.js`:** shows **Floor N / Total**, marks boss floors, and shows
  a **descend prompt** when the player is on the stairs.

---

## 4. Core flow (ASCII)

```
                       ┌──────────────────────────────────────────┐
                       │  GameScene.init()                          │
                       │   floor      = run.floor   || 1            │
                       │   floorsTotal= isFinal?30:15               │
                       │   bossFloors = bossFloorsFor(run)          │
                       └───────────────────┬──────────────────────┘
                                           │
                                           ▼
        ┌────────────────────────  enterFloor(floor)  ───────────────────────┐
        │  seed = floorSeed + floor                                           │
        │  data = generateFloor(seed, DUNGEON)        (data/dungeon.js)        │
        │  floorSys.build(data)                       walls→obstacles, render  │
        │      ├─ place player at data.start                                  │
        │      ├─ place stairs at data.stairs   (locked if boss floor)        │
        │      ├─ MapSystem.scatterInRooms(data.lootCells)                    │
        │      └─ camera+world bounds = floor rect                            │
        │  spawner.onFloorStart(floor)                                        │
        │  nav = new FlowField(cols,rows,grid)                                │
        └───────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
   ┌─────────────────────────────  update(dt)  ─────────────────────────────┐
   │  player.move()                                                          │
   │  nav.recompute(playerCell)  every ~200ms / on cell change               │
   │  EnemyAI.updateMob() → uses nav.dirAt() for chasers                     │
   │  spawner.update()  (floor-scaled swarm, walkable ring spawns)           │
   │                                                                         │
   │  IF floor is a boss floor AND player in stairs room AND boss not begun: │
   │        duel.promptChallenge()        (existing duel flow, unchanged)    │
   │  IF stairs UNLOCKED AND overlap(player, stairs):                        │
   │        descendFloor()                                                   │
   └───────────────────────────────┬─────────────────────────────────────────┘
                                    │
              defeatBoss(boss) ◄────┘ (boss floors)
                    │
        ┌───────────┴───────────────────────────────────────────┐
        │ boss.isLocalFinal (last floor champion / Xerxes)?       │
        │    yes → conquerStage()  (→ Artifact / Win)             │
        │    no  → unlock stairs   (mini-boss gate opened)        │
        └─────────────────────────────────────────────────────────┘

   descendFloor():  floor++  →  clear enemies/projectiles  →  enterFloor(floor)
                    (floor never exceeds floorsTotal; the champion lives on the
                     last floor, so the last "descent" is the conquest instead)
```

---

## 5. Data model

```ts
// config.js — DUNGEON tuning
interface DungeonConfig {
  tile: number;        // px per tile (32)
  cols: number;        // grid width in tiles (50 → 1600px)
  rows: number;        // grid height in tiles (50)
  minRooms: number; maxRooms: number;
  roomMin: number;  roomMax: number;   // room edge length in tiles
  floorsPerStage: number;              // 15
  floorsFinal: number;                 // 30
}

// data/dungeon.js — output of generateFloor()
const WALL = 0, FLOOR = 1;             // grid cell codes
interface Cell { col: number; row: number; }
interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number; } // tile coords
interface FloorData {
  cols: number; rows: number; tile: number;
  grid: Int8Array;        // length rows*cols; WALL|FLOOR; index = row*cols + col
  rooms: Room[];
  start: Cell;            // player spawn (room[0] center)
  stairs: Cell;          // down-stairs (room farthest from start, by room-graph)
  lootCells: Cell[];      // candidate anchors for crates/chests/shrines/terrain
}

// data/campaign.js — run model additions
interface Run {
  /* ...existing fields... */
  floor: number;          // current floor within the stage (1-based)
  floorSeed: number;      // base seed; per-floor seed = floorSeed + floor
  // SUPERSEDED for resume by `floor`: the current run still carries
  //   stageTime: number      // ms elapsed in the stage (newRun seeds it to 0)
  //   swarmElapsed: number    // carried into the next stage so difficulty persists
  // In floor mode these stop driving the timer/boss-schedule; keep them only if
  // anything else still reads them, else they become inert.
}
```

`bossFloorsFor(run)` maps `bossSequence(run)` onto floors so the last boss sits on
the last floor. The formula is N-agnostic, but ⚠ **N is now larger** because the
roster grew to 8 civs:

```js
// floor for boss i of N over F floors:  round(F * (i+1) / N)
// civ stage:   N = 3 (2 lieutenants + champion), F = 15 → [5, 10, 15]   (unchanged)
// final stage: N = 9 (8 civ champions + Xerxes),  F = 30
//   → [round(30·1/9 … 9/9)] = [3, 7, 10, 13, 17, 20, 23, 27, 30]
```

⚠ `bossSequence(run)` for the final stage returns `[...CIV_ORDER.map(CIV_BOSS),
'finalboss']` — that's **9 ids** now (`CIV_ORDER` has 8 entries), so the final
gauntlet drops a champion roughly every **3 floors**. Two design options if that's
too punishing: (a) bump `DUNGEON.floorsFinal` to ~36–45 to space them out, or
(b) have only a subset of champions be floor-bosses. Civ stages are unaffected
(still 2 lieutenants + 1 champion → floors 5/10/15).

---

## 6. Implementation tasks

> **Test reality:** the repo has no test framework (only `dev`/`build`/`preview`).
> Pure modules (`dungeon.js`, `FlowField.js`) get a headless node harness
> (`tools/test-dungeon.mjs`, run with `node tools/test-dungeon.mjs`). Integration
> is verified with `npm run build` + manual browser play. Each task lists the
> realistic check.

### Phase 1: `data/` + `art/` domain — generation & textures

#### Task 1: `src/config.js` — add the `DUNGEON` tuning block

```js
// append to config.js
export const DUNGEON = {
  tile: 32,            // px per tile
  cols: 50,            // grid width  (50 * 32 = 1600px floor)
  rows: 50,            // grid height
  minRooms: 7,
  maxRooms: 11,
  roomMin: 6,          // room edge (tiles)
  roomMax: 13,
  floorsPerStage: 15,
  floorsFinal: 30,
};
```

**Acceptance criteria:**
- [ ] `DUNGEON` exported; `tile*cols` ≈ 1600 (traversable in ~30–60s).
- [ ] `worldSize` in `GAME` left intact (still imported elsewhere) but no longer
      used for the playfield; add a comment that floors define bounds now.

**Test command:** `npm run build`

---

#### Task 2: `src/data/dungeon.js` — seeded floor generator (pure)

```js
// Pure, seeded dungeon-floor generator. No Phaser. Returns a FloorData record
// (grid + rooms + start/stairs/loot anchors) that FloorSystem realizes into a
// live floor. Deterministic for a given seed so saves can resume the same floor.
export const WALL = 0;
export const FLOOR = 1;

// mulberry32: tiny deterministic PRNG (seed -> [0,1) generator)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive int

function carveRoom(grid, cols, room) {
  for (let y = room.y; y < room.y + room.h; y++)
    for (let x = room.x; x < room.x + room.w; x++) grid[y * cols + x] = FLOOR;
}

// L-shaped corridor between two tile points (1-tile wide, randomized elbow).
function carveCorridor(grid, cols, ax, ay, bx, by, rand) {
  const hFirst = rand() < 0.5;
  const hRun = (y, x0, x1) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) grid[y * cols + x] = FLOOR; };
  const vRun = (x, y0, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) grid[y * cols + x] = FLOOR; };
  if (hFirst) { hRun(ay, ax, bx); vRun(bx, ay, by); }
  else { vRun(ax, ay, by); hRun(by, ax, bx); }
}

function overlaps(a, b, pad = 1) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x &&
         a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function generateFloor(seed, cfg) {
  const { cols, rows, tile, minRooms, maxRooms, roomMin, roomMax } = cfg;
  const rand = rng(seed);
  const grid = new Int8Array(cols * rows); // all WALL (0)
  const rooms = [];

  const target = ri(rand, minRooms, maxRooms);
  let attempts = 0;
  while (rooms.length < target && attempts < target * 12) {
    attempts++;
    const w = ri(rand, roomMin, roomMax);
    const h = ri(rand, roomMin, roomMax);
    const x = ri(rand, 1, cols - w - 2);
    const y = ri(rand, 1, rows - h - 2);
    const room = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
    if (rooms.some((r) => overlaps(r, room))) continue;
    carveRoom(grid, cols, room);
    rooms.push(room);
  }

  // connect each room to the previous one (guarantees a fully connected floor)
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    carveCorridor(grid, cols, a.cx, a.cy, b.cx, b.cy, rand);
  }

  // start = room 0; stairs = room whose center is farthest (Manhattan) from start
  const start = { col: rooms[0].cx, row: rooms[0].cy };
  let far = rooms[0], best = -1;
  for (const r of rooms) {
    const d = Math.abs(r.cx - start.col) + Math.abs(r.cy - start.row);
    if (d > best) { best = d; far = r; }
  }
  const stairs = { col: far.cx, row: far.cy };

  // loot anchors: a couple of random floor cells per room (excluding start/stairs)
  const lootCells = [];
  for (const r of rooms) {
    if (r === rooms[0] || r === far) continue;
    const n = ri(rand, 1, 3);
    for (let k = 0; k < n; k++) {
      lootCells.push({ col: ri(rand, r.x, r.x + r.w - 1), row: ri(rand, r.y, r.y + r.h - 1) });
    }
  }

  return { cols, rows, tile, grid, rooms, start, stairs, lootCells };
}
```

**Acceptance criteria:**
- [ ] `generateFloor(seed, DUNGEON)` is deterministic: same seed → identical grid.
- [ ] Every room is reachable from `start` (corridors connect the chain).
- [ ] `start` and `stairs` are `FLOOR` cells and are in *different* rooms.
- [ ] No room touches the outer border (1-tile wall margin all around).

**Test command:** `node tools/test-dungeon.mjs` (Task 12)

---

#### Task 3: `src/art/placeholders.js` — dungeon textures

```js
// add inside generatePlaceholders(scene), reusing the existing bake() helper:
bake(scene, 'dungeon_floor', 32, 32, (g) => {
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 32, 32);              // tinted per-theme at sprite level
  g.fillStyle(0x000000, 0.06).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32); // faint grid seam
});
bake(scene, 'dungeon_wall', 32, 32, (g) => {
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 32, 32);
  g.fillStyle(0x000000, 0.22).fillRect(0, 24, 32, 8);          // bevel/shadow lip
  g.fillStyle(0xffffff, 0.10).fillRect(0, 0, 32, 4);           // top highlight
});
bake(scene, 'stairs_down', 32, 32, (g) => {
  g.fillStyle(0x0a0a12, 1).fillRect(2, 2, 28, 28);
  for (let i = 0; i < 4; i++) g.fillStyle(0xffffff, 0.10 + i * 0.06).fillRect(4, 6 + i * 6, 24 - i * 5, 4);
});
```

`dungeon_floor` and `dungeon_wall` are drawn white so `FloorSystem` can `setTint`
them with the civ theme (`theme.ground`, `theme.grid`). `stairs_down` is a dark
recessed staircase.

**Acceptance criteria:**
- [ ] Three texture keys exist after Boot; render correctly when tinted.

**Test command:** `npm run build` + visual check in browser.

---

### Phase 2: `systems/` — realization & navigation

#### Task 4: `src/systems/FlowField.js` — BFS pathfinding field

```js
// A breadth-first distance field over floor cells, recomputed from the player's
// cell. dirAt(col,row) returns the unit step toward the player along open tiles.
// Uniform step cost → BFS gives shortest-path distance; cheap enough to refresh
// several times a second on a 50x50 grid.
export default class FlowField {
  constructor(cols, rows, grid) {
    this.cols = cols; this.rows = rows; this.grid = grid;
    this.dist = new Int32Array(cols * rows).fill(-1);
    this._queue = new Int32Array(cols * rows); // reused BFS ring buffer
    this.target = { col: -1, row: -1 };
  }

  // 0 = WALL. Walkable if in-bounds and grid cell is FLOOR (non-zero).
  _walk(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.grid[r * this.cols + c]; }

  recompute(tc, tr) {
    if (tc === this.target.col && tr === this.target.row) return; // player hasn't changed cell
    this.target.col = tc; this.target.row = tr;
    const { cols, rows, dist, grid } = this;
    dist.fill(-1);
    if (!this._walk(tc, tr)) return;
    const q = this._queue; let head = 0, tail = 0;
    const startIdx = tr * cols + tc;
    dist[startIdx] = 0; q[tail++] = startIdx;
    while (head < tail) {
      const idx = q[head++];
      const c = idx % cols, r = (idx / cols) | 0, d = dist[idx];
      // 4-neighbourhood (corridors are 1-wide; diagonals would clip wall corners)
      const nb = [idx - 1, idx + 1, idx - cols, idx + cols];
      const cc = [c - 1, c + 1, c, c];
      const rr = [r, r, r - 1, r + 1];
      for (let k = 0; k < 4; k++) {
        const nc = cc[k], nr = rr[k];
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nb[k];
        if (dist[ni] !== -1 || !grid[ni]) continue;
        dist[ni] = d + 1; q[tail++] = ni;
      }
    }
  }

  // Unit direction from (col,row) toward the lowest-distance neighbour (= toward
  // the player). Returns null if no gradient (enemy not on a connected cell).
  dirAt(c, r) {
    const { cols, dist } = this;
    if (!this._walk(c, r)) return null;
    const here = dist[r * cols + c];
    if (here <= 0) return here === 0 ? { x: 0, y: 0 } : null;
    let best = here, bc = 0, br = 0;
    const opt = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dc, dr] of opt) {
      const nc = c + dc, nr = r + dr;
      if (!this._walk(nc, nr)) continue;
      const nd = dist[nr * cols + nc];
      if (nd !== -1 && nd < best) { best = nd; bc = dc; br = dr; }
    }
    if (bc === 0 && br === 0) return null;
    return { x: bc, y: br };
  }
}
```

**Acceptance criteria:**
- [ ] On a hand-built grid (room + corridor + room), `dirAt` from the far room
      points *through the corridor*, not into a wall.
- [ ] `recompute` early-returns when the target cell is unchanged.
- [ ] No allocations inside `recompute`'s loop (reused queue buffer).

**Test command:** `node tools/test-dungeon.mjs`

---

#### Task 5: `src/systems/FloorSystem.js` — realize a floor

```js
import Phaser from 'phaser';
import { DUNGEON } from '../config.js';
import { generateFloor, WALL } from '../data/dungeon.js';

// Realizes one FloorData into the live scene: themed floor backdrop, greedy-meshed
// wall colliders (added to scene.obstacles), the stairs object, and tile<->world
// helpers used by spawning/navigation. Rebuilds itself on descend().
export default class FloorSystem {
  constructor(scene) {
    this.scene = scene;
    this.tile = DUNGEON.tile;
    this.data = null;          // current FloorData
    this._visuals = [];        // sprites to destroy on rebuild
    this.stairs = null;        // {x,y,sprite,locked}
  }

  worldToTile(x, y) { return { col: Math.floor(x / this.tile), row: Math.floor(y / this.tile) }; }
  tileToWorld(col, row) { return { x: col * this.tile + this.tile / 2, y: row * this.tile + this.tile / 2 }; }
  pixelW() { return this.data.cols * this.tile; }
  pixelH() { return this.data.rows * this.tile; }

  isWalkable(x, y) {
    const { col, row } = this.worldToTile(x, y);
    const d = this.data;
    if (col < 0 || row < 0 || col >= d.cols || row >= d.rows) return false;
    return d.grid[row * d.cols + col] !== WALL;
  }

  // A walkable world point within `radius` px of (x,y); falls back to room 0.
  randomWalkableNear(x, y, radius = 520) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 180 + Math.random() * radius;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (this.isWalkable(px, py)) return { x: px, y: py };
    }
    const s = this.tileToWorld(this.data.start.col, this.data.start.row);
    return s;
  }

  // Build the floor: render backdrop, mesh walls into obstacle bodies, drop stairs.
  build(seed, opts = {}) {
    this.destroy();
    const theme = this.scene.theme;
    this.data = generateFloor(seed, DUNGEON);
    const d = this.data, t = this.tile;

    // world + camera bounds = this floor
    this.scene.physics.world.setBounds(0, 0, this.pixelW(), this.pixelH());
    this.scene.cameras.main.setBounds(0, 0, this.pixelW(), this.pixelH());

    // floor backdrop (one tiled sprite, tinted to the civ ground colour)
    const floorImg = this.scene.add.tileSprite(0, 0, this.pixelW(), this.pixelH(), 'dungeon_floor')
      .setOrigin(0).setDepth(-10).setTint(theme.ground);
    this._visuals.push(floorImg);

    // greedy-mesh wall cells into horizontal strips → fewer static bodies
    for (let row = 0; row < d.rows; row++) {
      let runStart = -1;
      for (let col = 0; col <= d.cols; col++) {
        const isWall = col < d.cols && d.grid[row * d.cols + col] === WALL;
        if (isWall && runStart === -1) runStart = col;
        if (!isWall && runStart !== -1) {
          this._wallStrip(runStart, row, col - runStart, theme);
          runStart = -1;
        }
      }
    }

    // stairs (the escape) at the far room
    const sp = this.tileToWorld(d.stairs.col, d.stairs.row);
    const sprite = this.scene.add.image(sp.x, sp.y, 'stairs_down').setDepth(3).setScale(1.4);
    this.stairs = { x: sp.x, y: sp.y, sprite, locked: !!opts.lockStairs };
    if (this.stairs.locked) sprite.setAlpha(0.25).setTint(0x884444); // dim while a boss gates it

    return d;
  }

  // one merged wall rectangle of `len` tiles starting at (col,row)
  _wallStrip(col, row, len, theme) {
    const t = this.tile;
    const img = this.scene.obstacles.create(col * t + (len * t) / 2, row * t + t / 2, 'dungeon_wall');
    img.setDisplaySize(len * t, t).setTint(theme.grid).setDepth(4);
    img.body.setSize(len * t, t);
    img.refreshBody();
    this._visuals.push(img);
  }

  unlockStairs() {
    if (!this.stairs) return;
    this.stairs.locked = false;
    this.stairs.sprite.setAlpha(1).clearTint();
    this.scene.fx.shockwave(this.stairs.x, this.stairs.y, this.scene.theme.accent, 220);
  }

  atStairs(x, y, pad = 26) {
    if (!this.stairs || this.stairs.locked) return false;
    return Math.hypot(x - this.stairs.x, y - this.stairs.y) <= pad;
  }

  startWorld() { return this.tileToWorld(this.data.start.col, this.data.start.row); }
  stairsRoomCenter() { return { x: this.stairs.x, y: this.stairs.y }; }

  destroy() {
    for (const v of this._visuals) v.destroy();
    this._visuals.length = 0;
    if (this.scene.obstacles) this.scene.obstacles.clear(true, true);
    this.stairs = null;
  }
}
```

**Acceptance criteria:**
- [ ] After `build`, `scene.obstacles` contains merged wall strips; player and
      enemies collide with them (existing colliders already wired).
- [ ] Camera/world bounds equal the floor rect; you cannot leave the dungeon.
- [ ] `isWalkable`/`randomWalkableNear` only return floor (non-wall) points.
- [ ] `destroy()` removes all wall/visual sprites with no leak across descents.

**Test command:** `npm run build` + browser (walk into walls; confirm collision).

---

#### Task 6: `src/systems/SpawnSystem.js` — floor-based difficulty & walkable spawns

⚠ **Keep the `playerPower()` factor** — the current `difficulty` getter is
`playerPower() × (1 + elapsed/240) × stageScale`, and enemy **HP** (`def.hp ×
difficulty`), **XP** (`def.xp × difficulty^0.62`), and **damage** (a separate
`dmgScale`) all derive from it. The floor port must swap only the *time* term for
a *floor* term and **preserve `playerPower`** (else a stacked build trivializes
the dungeon — the exact bug the power-scaling fixed).

```js
// difficulty: floor is the primary driver; a mild dwell-time term keeps pressure
// rising the longer you linger (reinforces "escape down"). playerPower + stageScale
// kept so a geared build stays challenged and later civs stay harder.
get difficulty() {
  const floor = this.scene.floor || 1;
  const power = this.scene.playerPower ? this.scene.playerPower() : 1;
  return power * (1 + (floor - 1) * 0.14 + this.dwell / 200) * (this.scene.stageScale || 1);
}
get spawnInterval() { return Math.max(255, 920 - (this.scene.floor || 1) * 22 - this.dwell * 0.4); }

onFloorStart(/* floor */) { this.dwell = 0; this.accum = 0; } // reset per floor

// ALSO port the enemy-DAMAGE scale in spawnOne() — today it reads `this.elapsed`:
//   const dmgScale = Math.min(10, (1 + this.elapsed/130) * stageScale * (1 + (power-1)*0.06));
// → replace the (1 + elapsed/130) term with a floor term, e.g. (1 + (floor-1)*0.12):
//   const dmgScale = Math.min(10, (1 + (floor-1)*0.12 + this.dwell/160) * stageScale * (1 + (power-1)*0.06));
// (the GameScene.summonMinions path uses `this.spawner.elapsed/120` — port it too.)

// replace spawnPointAroundCamera(): keep the ring, but reject wall tiles
spawnPointOnFloor() {
  for (let i = 0; i < 10; i++) {
    const p = this.spawnPointAroundCamera();        // existing ring-around-camera logic
    if (this.scene.floorSys.isWalkable(p.x, p.y)) return p;
  }
  return this.scene.floorSys.randomWalkableNear(this.player.x, this.player.y);
}
```

`update()` increments `this.dwell += delta/1000`, and `spawnOne()` uses
`spawnPointOnFloor()`. The `elapsed`-based formulas (difficulty, spawnInterval,
dmgScale, burst density, and the `SPAWN_TABLE` `from` time-gates) are replaced by
floor-based ones; `elapsed` can be kept only if still needed for display.

**Acceptance criteria:**
- [ ] Enemies only ever appear on walkable tiles (never inside walls).
- [ ] Floor 1 is gentle; difficulty climbs each floor; lingering ramps spawns.
- [ ] `playerPower()` still folds into HP/XP/damage scaling (geared ≠ trivial).
- [ ] `onFloorStart` fully resets per-floor spawn accumulators.

**Test command:** `npm run build` + browser (count enemies, watch wall spawns).

---

#### Task 7: `src/systems/EnemyAI.js` — chasers follow the flow field

The chase/approach branch replaces its straight-line angle with the flow-field
direction; special states (charger dash, lunger leap, flyer dive) keep their
existing straight-line behavior (they're meant to ignore terrain briefly).

```js
// helper at top of EnemyAI.js
export function navDir(scene, e) {
  const nav = scene.nav;
  if (!nav) return null;
  const { col, row } = scene.floorSys.worldToTile(e.x, e.y);
  return nav.dirAt(col, row);            // {x,y} unit step or null
}

// inside updateMob(), in the default 'chase' movement (and as the base for
// zigzag/circle which currently steer toward the player):
const nd = navDir(scene, e);
let ax, ay;
if (nd) { ax = nd.x; ay = nd.y; }        // wall-aware path toward player
else { ax = Math.cos(ang); ay = Math.sin(ang); } // open-room / fallback: straight
// then apply existing speed/weave/orbit modifiers to (ax,ay) instead of (cos,sin)
e.setVelocity(ax * spd, ay * spd);
```

⚠ **Allied legionaries (Caesar's `summon`).** `GameScene.updateAllies` steers each
legionary straight at the **nearest enemy** (`Math.atan2`), which will jam them
into walls on a floor. Options: (a) cheapest — let them "phase" (keep straight-line
toward target; they're short-lived and few, ≤4 in duels), accepting occasional
wall-hugging; (b) better — a **second flow field rooted at the player** isn't
enough (allies target enemies, not the player), so steer them along the *player's*
flow gradient when far and straight-line only within line of sight; (c) simplest
robust — clamp their motion to walkable tiles (sample `floorSys.isWalkable` ahead;
if blocked, slide along the wall). Pick (a) for v1, note (c) as the follow-up. The
flow field also doesn't exist during a **duel** (separate arena) — allies are
already capped at 4 and dismissed on duel start, so no change needed there.

**Acceptance criteria:**
- [ ] Chasers route through corridors instead of pressing into walls.
- [ ] Chargers/flyers still dash/dive in straight lines (unchanged).
- [ ] When a mob shares the player's room (line of sight), motion is direct.
- [ ] Caesar's legionaries don't get permanently stuck on a wall (v1: phase OK).

**Test command:** `npm run build` + browser (lure mobs around a wall; deploy a
legion and watch them path).

---

### Phase 3: scenes — floor lifecycle & progression

#### Task 8: `src/data/campaign.js` — run model + boss-floor mapping

```js
import { DUNGEON } from '../config.js';

// in newRun(): add
floor: 1,
floorSeed: (Math.random() * 1e9) | 0,
// (stageTime is no longer used for resume; floor replaces it)

export function floorsForStage(run) {
  return run.final ? DUNGEON.floorsFinal : DUNGEON.floorsPerStage;
}

// Map the boss sequence onto floor numbers; the last boss sits on the last floor.
export function bossFloorsFor(run) {
  const seq = bossSequence(run);
  const F = floorsForStage(run), N = seq.length;
  const map = {};                              // floorNumber -> bossIndex
  seq.forEach((_, i) => { map[Math.round((F * (i + 1)) / N)] = i; });
  return map;                                  // civ: {5:0,10:1,15:2}; final: {6:0,...,30:4}
}
```

**Acceptance criteria:**
- [ ] Civ stage (N=3) → boss floors `{5,10,15}`.
- [ ] ⚠ Final stage (N=9: 8 champions + Xerxes) → `{3,7,10,13,17,20,23,27,30}`
      (or whatever `round(F·(i+1)/N)` yields if `floorsFinal` is changed).
- [ ] The last boss always maps to the last floor.
- [ ] `newRun` seeds `floor=1` and a stable `floorSeed`.

**Test command:** `node tools/test-dungeon.mjs` (asserts the maps).

---

#### Task 9: `src/scenes/GameScene.js` — replace stage timer with floor lifecycle

`init()` — remove `stageDuration`/`bossTimes`; add floor state:

```js
this.floor = this.run.floor || 1;
this.floorsTotal = floorsForStage(this.run);
this.bossFloors = bossFloorsFor(this.run);     // floor -> bossIndex
this.bossActiveThisFloor = false;
```

`create()` — after systems exist, build the first floor instead of scattering an
open map:

```js
this.floorSys = new FloorSystem(this);
this.dungeonMode = true;          // gate the toroidal wrap off (see below)
this.enterFloor(this.floor);
```

⚠ **Disable the toroidal wrap.** Today the world is a torus: `GameScene.wrapEntity`
loops the player and every mob to the far side at the `worldSize` edge, and the
player has `setCollideWorldBounds(false)`. Floors have **hard walls**, so the wrap
must not run — guard every `wrapEntity(...)` call (player + `updateEnemies`) with
`if (!this.dungeonMode) this.wrapEntity(e)`. `FloorSystem.build` already sets the
physics/camera bounds to the floor rect, and the wall obstacles enclose the room,
so the player is contained without wrapping. (The duel arena still teleports out to
`ARENA_ORIGIN` as before — unaffected.)

New methods:

```js
enterFloor(floor) {
  this.floor = floor;
  this.stageCleared = false;
  this.bossActiveThisFloor = false;
  const isBossFloor = this.bossFloors[floor] !== undefined;

  // generate + realize (deterministic per floor for save-resume)
  this.floorSys.build(this.run.floorSeed + floor, { lockStairs: isBossFloor });
  const s = this.floorSys.startWorld();
  this.player.setPosition(s.x, s.y);
  this.cameras.main.centerOn(s.x, s.y);

  // navigation field for this floor's grid
  this.nav = new FlowField(this.floorSys.data.cols, this.floorSys.data.rows, this.floorSys.data.grid);
  this._navAcc = 0;

  // loot / terrain anchored in rooms (Task 10)
  this.map.scatterInRooms(this.floorSys.data.lootCells);

  // reset swarm scaling for this floor
  this.spawner.onFloorStart(floor);
  this.bossPhase = isBossFloor ? this.bossFloors[floor] : this.bossPhase;

  this.showBanner(`Floor ${floor} / ${this.floorsTotal}`, '#ffd700');
  Audio.setIntensity(0);
  this.captureRunState();
}

descendFloor() {
  if (this.floor >= this.floorsTotal) return;     // last floor ends via conquerStage
  this.clearField();                              // deactivate enemies/projectiles/gems
  Audio.sfx('levelup');
  this.enterFloor(this.floor + 1);
}
```

`update()` — replace the timestamp boss-scheduler and add stairs/boss-floor logic:

```js
// flow-field refresh (a few times a second, or when the player changes cell)
this._navAcc += delta;
if (this._navAcc >= 180) {
  this._navAcc = 0;
  const pc = this.floorSys.worldToTile(this.player.x, this.player.y);
  this.nav.recompute(pc.col, pc.row);
}

const isBossFloor = this.bossFloors[this.floor] !== undefined;
if (isBossFloor && !this.activeBoss && !this.bossActiveThisFloor && !this.dueling && !this.challengePending) {
  // trigger when the player reaches the stairs (boss) room
  if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.floorSys.stairs.x, this.floorSys.stairs.y) < 220) {
    this.bossActiveThisFloor = true;
    this.duel.promptChallenge();                  // existing duel flow, unchanged
  }
}

// non-boss floors (and unlocked boss floors): step on the stairs to descend
if (!this.dueling && this.floorSys.atStairs(this.player.x, this.player.y)) {
  this.descendFloor();
}
```

`defeatBoss()` — on a boss floor, unlock the stairs (mini-boss) or conquer (last).
⚠ **Keep the boss XP grant** that `defeatBoss` now does (a boss is worth a chunk of
levels) — only the *progression tail* changes:

```js
// PRESERVE the existing milestone XP grant (added after this doc was drafted):
const bossLevels = (boss.isLocalFinal ? 1.4 : 0.7) * (clean ? 1.2 : 1);
const gained = this.player.addXp(this.player.xpToNext * bossLevels);
if (gained > 0) this.pendingLevels += gained;

// then, instead of the old bossPhase++/timestamp-schedule tail:
if (boss.isLocalFinal) { this.conquerStage(); return; }   // champion on the last floor
this.floorSys.unlockStairs();                              // mini-boss gate opens
this.bossPhase += 1;
Audio.setIntensity(0);
```

⚠ **Boss scaling.** `spawnBoss()` already scales boss **HP** (`hpScale`) AND
**damage** (`bossDmgScale`, capped at 6) by `stageScale × playerPower()`. Keep both
in floor mode; optionally fold in a mild floor term so deeper floors hit harder,
e.g. multiply each by `(1 + (this.floor - 1) * 0.04)`. Don't drop `bossDmgScale` —
without it boss projectiles feel weak against a geared build.

`captureRunState()` — persist the floor instead of stage time:

```js
r.floor = this.floor;
// r.stageTime no longer needed for resume
```

`isLocalFinal` for a boss is now "this boss sits on the last floor":
`isLocalFinal = this.bossFloors[this.floor] === this.bossSeq.length - 1 && this.floor === this.floorsTotal`.

Add a `clearField()` helper that deactivates all pooled enemies/projectiles/gems
between floors (reuses `deactivate`).

**Acceptance criteria:**
- [ ] You start on floor 1; stepping on the stairs advances the floor and rebuilds.
- [ ] Floors 5 & 10 lock the stairs and trigger the lieutenant duel near the
      stairs room; beating them unlocks the stairs.
- [ ] Floor 15 (or 30 final) is the champion/Xerxes; defeating them conquers.
- [ ] Camera follows the player within the floor; difficulty climbs per floor.
- [ ] Mid-run autosave + Continue resumes on the same floor.

**Test command:** `npm run build` + full browser playthrough (cheat: lower
`floorsPerStage` to 3 temporarily to reach a boss quickly).

---

#### Task 10: `src/systems/MapSystem.js` — anchor features in rooms

Replace `scatter()` (open-world random) with `scatterInRooms(lootCells)`: place
crates/shrines/terrain/hazard zones at the generator's room loot anchors
(converted tile→world via `scene.floorSys.tileToWorld`), respecting contracts
(`noShrines`) and per-civ `mapMods` counts as before. Hazards/terrain `update()`
logic is unchanged.

**Acceptance criteria:**
- [ ] Crates/shrines/hazards appear inside rooms (never in walls/corridors).
- [ ] `mapMods` still scale feature density per civ; `noShrines` still suppresses.

**Test command:** `npm run build` + browser.

---

#### Task 11: `src/scenes/UIScene.js` — floor indicator + descend prompt

Replace the survival **timer** readout with **`Floor N / Total`** (boss floors
flagged, e.g. `Floor 10 / 15  ⚔`). Show a **`↓ Stairs — descend`** prompt when
`floorSys.atStairs(player)` is true and no boss gates it. Boss HP bar / buff row
unchanged.

**Acceptance criteria:**
- [ ] HUD shows the current floor and total; boss floors are marked.
- [ ] Descend prompt appears only when standing on unlocked stairs.

**Test command:** `npm run build` + browser.

---

### Phase 4: tests & save

#### Task 12: `tools/test-dungeon.mjs` — headless harness

```js
import { DUNGEON } from '../src/config.js';
import { generateFloor, WALL, FLOOR } from '../src/data/dungeon.js';
import FlowField from '../src/systems/FlowField.js';

let fail = 0; const ok = (c, m) => { if (!c) { console.log('FAIL:', m); fail++; } };

// determinism
const a = generateFloor(123, DUNGEON), b = generateFloor(123, DUNGEON);
ok(a.grid.every((v, i) => v === b.grid[i]), 'same seed -> identical grid');

// start/stairs are floor cells in different rooms
ok(a.grid[a.start.row * a.cols + a.start.col] === FLOOR, 'start is floor');
ok(a.grid[a.stairs.row * a.cols + a.stairs.col] === FLOOR, 'stairs is floor');
ok(!(a.start.col === a.stairs.col && a.start.row === a.stairs.row), 'start != stairs');

// border is all wall
let border = true;
for (let c = 0; c < a.cols; c++) border &&= a.grid[c] === WALL && a.grid[(a.rows - 1) * a.cols + c] === WALL;
ok(border, 'top/bottom border is wall');

// flow field: reachable from start, dir points somewhere from stairs
const ff = new FlowField(a.cols, a.rows, a.grid);
ff.recompute(a.start.col, a.start.row);
ok(ff.dist[a.stairs.row * a.cols + a.stairs.col] > 0, 'stairs reachable from start');
ok(ff.dirAt(a.stairs.col, a.stairs.row) !== null, 'flow dir exists at stairs');

// boss-floor mapping — civ N=3, final N=9 (8 civ champions + Xerxes)
const mapFloors = (N, F) => { const m = {}; for (let i = 0; i < N; i++) m[Math.round((F*(i+1))/N)] = i; return m; };
const civ = mapFloors(3, 15);   // → {5:0, 10:1, 15:2}
const fin = mapFloors(9, 30);   // → {3:0, 7:1, 10:2, 13:3, 17:4, 20:5, 23:6, 27:7, 30:8}
ok(civ[5]===0 && civ[10]===1 && civ[15]===2, 'civ boss floors 5/10/15');
ok(fin[30]===8, 'Xerxes (boss 8 of 9) on floor 30');
ok(Object.keys(fin).length === 9, 'final stage has 9 boss floors');

console.log(fail ? `${fail} FAILED` : 'ALL PASS');
process.exit(fail ? 1 : 0);
```

**Acceptance criteria:** all assertions pass.
**Test command:** `node tools/test-dungeon.mjs`

---

#### Task 13: `src/systems/SaveSystem.js` + `BootScene.js`

- `SaveSystem`: no API change — it already serializes the whole `run`, so
  `floor`/`floorSeed` ride along automatically. Verify a saved run reloads with
  the correct floor.
- `BootScene`: ensure the new dungeon textures are generated (they are, via
  `generatePlaceholders`); no spritesheet load needed.

**Acceptance criteria:**
- [ ] Save → reload → resume on the same floor with the same layout (seed).

**Test command:** `npm run build` + browser (save mid-floor, refresh, Continue).

---

## 7. Testing strategy

- **Pure logic (no Phaser):** `data/dungeon.js` and `systems/FlowField.js` are
  imported directly in `tools/test-dungeon.mjs` and asserted headlessly
  (determinism, connectivity, borders, pathfinding gradient, boss-floor maths).
  This is the same pattern already used to validate the audio engine.
- **Integration:** `npm run build` after every task (catches import/syntax across
  all scenes). The Phaser-dependent systems (`FloorSystem`, `SpawnSystem`,
  `EnemyAI`, `GameScene`) are verified by **manual browser play** — there is no
  headless Phaser harness in this repo.
- **Fast manual loop:** temporarily set `DUNGEON.floorsPerStage = 3` to reach a
  boss floor in under a minute; confirm: walls collide, enemies path through
  corridors, stairs descend, boss floors lock/unlock, champion conquers, and
  Continue resumes the right floor. Revert to 15 before shipping.
- **Edge cases to exercise:** a floor where the start room and stairs room are
  adjacent (short path); a dense floor (maxRooms) for wall-body count / perf;
  dying on a boss floor; saving exactly on the stairs tile.

## 8. Cost estimates

N/A — no AI/LLM calls. Runtime cost notes instead: one BFS over ≤2500 cells every
~180ms is negligible; greedy-meshed walls keep static bodies in the low hundreds
(comparable to today's ~130 scattered obstacles), so Arcade collision cost is flat.

## 9. Open questions / future polish (not in scope here)

- **Fog of war / room reveal** (classic PMD): dim unexplored rooms, reveal on
  entry. Deferred — "survive + escape" reduces its value, and it adds a render
  layer. Easy to add later on top of `FloorData.rooms`.
- **Minimap** of discovered rooms in the HUD corner.
- **Floor variety:** trap rooms, treasure vaults, "monster house" rooms (a room
  that triggers a burst spawn) — all expressible as flags on `FloorData.rooms`.
- **Per-civ tilesets** beyond tinting (distinct wall art per civilization).
