import React, { useState } from 'react';

/**
 * Interactive architecture visualization for the Dungeon Floors redesign.
 * Source of truth: ./dungeon-floors-architecture.md
 *
 * Self-contained (React only). Drop into any React app and render <ArchitectureDoc/>.
 * Tabs: Flow · Code · Data Model · Folders · Phases · Tests.
 * Code tab has One-Dark syntax highlighting, category badges, and clickable
 * cross-references between functions.
 */

// ─── theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#282c34', panel: '#21252b', line: '#3a3f4b', text: '#abb2bf',
  dim: '#5c6370', white: '#e6e6e6', accent: '#ffd700',
};
// category → colour (matches the "color-coded by function type" requirement)
const CAT = {
  gen:   { c: '#c678dd', label: 'generation' },
  nav:   { c: '#61afef', label: 'navigation' },
  floor: { c: '#98c379', label: 'realization' },
  spawn: { c: '#e5c07b', label: 'spawning' },
  ai:    { c: '#e06c75', label: 'enemy-ai' },
  core:  { c: '#56b6c2', label: 'scene/flow' },
  data:  { c: '#d19a66', label: 'data/save' },
};

// ─── function registry (clickable, cross-referenced) ───────────────────────────
const FUNCS = [
  {
    id: 'generateFloor', name: 'generateFloor(seed, cfg)', file: 'data/dungeon.js', cat: 'gen',
    summary: 'Pure, seeded floor generator → FloorData (grid, rooms, start, stairs, loot).',
    refs: ['carveCorridor', 'build'],
    code: `export function generateFloor(seed, cfg) {
  const { cols, rows, minRooms, maxRooms, roomMin, roomMax } = cfg;
  const rand = rng(seed);            // mulberry32 — deterministic
  const grid = new Int8Array(cols * rows); // all WALL (0)
  const rooms = [];
  const target = ri(rand, minRooms, maxRooms);
  let tries = 0;
  while (rooms.length < target && tries++ < target * 12) {
    const w = ri(rand, roomMin, roomMax), h = ri(rand, roomMin, roomMax);
    const x = ri(rand, 1, cols - w - 2), y = ri(rand, 1, rows - h - 2);
    const room = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
    if (rooms.some((r) => overlaps(r, room))) continue;
    carveRoom(grid, cols, room); rooms.push(room);
  }
  for (let i = 1; i < rooms.length; i++)
    carveCorridor(grid, cols, rooms[i-1].cx, rooms[i-1].cy, rooms[i].cx, rooms[i].cy, rand);
  const start = { col: rooms[0].cx, row: rooms[0].cy };
  let far = rooms[0], best = -1;
  for (const r of rooms) {
    const d = Math.abs(r.cx - start.col) + Math.abs(r.cy - start.row);
    if (d > best) { best = d; far = r; }
  }
  return { cols, rows, tile: cfg.tile, grid, rooms,
           start, stairs: { col: far.cx, row: far.cy }, lootCells: anchors(rooms, far, rand) };
}`,
  },
  {
    id: 'carveCorridor', name: 'carveCorridor(...)', file: 'data/dungeon.js', cat: 'gen',
    summary: 'Carves a 1-wide L-shaped corridor between two room centers.',
    refs: ['generateFloor'],
    code: `function carveCorridor(grid, cols, ax, ay, bx, by, rand) {
  const hRun = (y, x0, x1) => { for (let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++) grid[y*cols+x]=FLOOR; };
  const vRun = (x, y0, y1) => { for (let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++) grid[y*cols+x]=FLOOR; };
  if (rand() < 0.5) { hRun(ay, ax, bx); vRun(bx, ay, by); }
  else              { vRun(ax, ay, by); hRun(by, ax, bx); }
}`,
  },
  {
    id: 'recompute', name: 'FlowField.recompute(tc, tr)', file: 'systems/FlowField.js', cat: 'nav',
    summary: 'BFS distance field from the player cell over floor tiles. Early-outs if the cell is unchanged.',
    refs: ['dirAt', 'enterFloor'],
    code: `recompute(tc, tr) {
  if (tc === this.target.col && tr === this.target.row) return; // unchanged cell
  this.target = { col: tc, row: tr };
  const { cols, rows, dist, grid } = this;
  dist.fill(-1);
  if (!this._walk(tc, tr)) return;
  const q = this._queue; let head = 0, tail = 0;
  dist[tr*cols+tc] = 0; q[tail++] = tr*cols+tc;
  while (head < tail) {
    const idx = q[head++], c = idx % cols, r = (idx/cols)|0, d = dist[idx];
    for (const ni of [idx-1, idx+1, idx-cols, idx+cols]) {
      if (ni < 0 || ni >= cols*rows) continue;
      if (dist[ni] !== -1 || !grid[ni]) continue;       // visited or wall
      dist[ni] = d + 1; q[tail++] = ni;
    }
  }
}`,
  },
  {
    id: 'dirAt', name: 'FlowField.dirAt(c, r)', file: 'systems/FlowField.js', cat: 'nav',
    summary: 'Unit step toward the lowest-distance neighbour (= toward the player). null if no gradient.',
    refs: ['recompute', 'navDir'],
    code: `dirAt(c, r) {
  const { cols, dist } = this;
  if (!this._walk(c, r)) return null;
  const here = dist[r*cols+c];
  if (here <= 0) return here === 0 ? { x:0, y:0 } : null;
  let best = here, bc = 0, br = 0;
  for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    if (!this._walk(c+dc, r+dr)) continue;
    const nd = dist[(r+dr)*cols + (c+dc)];
    if (nd !== -1 && nd < best) { best = nd; bc = dc; br = dr; }
  }
  return (bc || br) ? { x: bc, y: br } : null;
}`,
  },
  {
    id: 'build', name: 'FloorSystem.build(seed, opts)', file: 'systems/FloorSystem.js', cat: 'floor',
    summary: 'Realizes a FloorData: floor backdrop, greedy-meshed wall colliders, stairs, world/camera bounds.',
    refs: ['generateFloor', 'isWalkable', 'unlockStairs', 'enterFloor'],
    code: `build(seed, opts = {}) {
  this.destroy();
  const theme = this.scene.theme;
  this.data = generateFloor(seed, DUNGEON);
  this.scene.physics.world.setBounds(0, 0, this.pixelW(), this.pixelH());
  this.scene.cameras.main.setBounds(0, 0, this.pixelW(), this.pixelH());
  this.scene.add.tileSprite(0, 0, this.pixelW(), this.pixelH(), 'dungeon_floor')
    .setOrigin(0).setDepth(-10).setTint(theme.ground);
  // greedy-mesh wall cells into horizontal strips -> few static bodies
  for (let row = 0; row < this.data.rows; row++) {
    let runStart = -1;
    for (let col = 0; col <= this.data.cols; col++) {
      const wall = col < this.data.cols && this.data.grid[row*this.data.cols+col] === WALL;
      if (wall && runStart === -1) runStart = col;
      if (!wall && runStart !== -1) { this._wallStrip(runStart, row, col-runStart, theme); runStart = -1; }
    }
  }
  const sp = this.tileToWorld(this.data.stairs.col, this.data.stairs.row);
  this.stairs = { x: sp.x, y: sp.y, locked: !!opts.lockStairs,
    sprite: this.scene.add.image(sp.x, sp.y, 'stairs_down').setDepth(3).setScale(1.4) };
  if (this.stairs.locked) this.stairs.sprite.setAlpha(0.25).setTint(0x884444);
  return this.data;
}`,
  },
  {
    id: 'isWalkable', name: 'FloorSystem.isWalkable(x, y)', file: 'systems/FloorSystem.js', cat: 'floor',
    summary: 'World point → walkable? Used to reject wall spawns and validate nav.',
    refs: ['spawnPointOnFloor'],
    code: `isWalkable(x, y) {
  const { col, row } = this.worldToTile(x, y);
  const d = this.data;
  if (col < 0 || row < 0 || col >= d.cols || row >= d.rows) return false;
  return d.grid[row*d.cols + col] !== WALL;
}`,
  },
  {
    id: 'unlockStairs', name: 'FloorSystem.unlockStairs()', file: 'systems/FloorSystem.js', cat: 'floor',
    summary: 'Opens a boss-gated staircase (mini-boss defeated) with a shockwave cue.',
    refs: ['defeatBoss'],
    code: `unlockStairs() {
  if (!this.stairs) return;
  this.stairs.locked = false;
  this.stairs.sprite.setAlpha(1).clearTint();
  this.scene.fx.shockwave(this.stairs.x, this.stairs.y, this.scene.theme.accent, 220);
}`,
  },
  {
    id: 'spawnPointOnFloor', name: 'SpawnSystem.spawnPointOnFloor()', file: 'systems/SpawnSystem.js', cat: 'spawn',
    summary: 'Ring-around-camera spawn point, rejected until it lands on a walkable tile.',
    refs: ['isWalkable', 'difficulty'],
    code: `spawnPointOnFloor() {
  for (let i = 0; i < 10; i++) {
    const p = this.spawnPointAroundCamera();      // existing ring logic
    if (this.scene.floorSys.isWalkable(p.x, p.y)) return p;
  }
  return this.scene.floorSys.randomWalkableNear(this.player.x, this.player.y);
}`,
  },
  {
    id: 'difficulty', name: 'SpawnSystem.difficulty', file: 'systems/SpawnSystem.js', cat: 'spawn',
    summary: 'Floor replaces the time term; KEEP playerPower + stageScale (drives HP/XP/damage).',
    refs: ['enterFloor'],
    code: `get difficulty() {
  const floor = this.scene.floor || 1;
  const power = this.scene.playerPower ? this.scene.playerPower() : 1;
  // keep playerPower so a geared build stays challenged (the power-scaling fix)
  return power * (1 + (floor - 1) * 0.14 + this.dwell / 200) * (this.scene.stageScale || 1);
}
// also port the enemy DAMAGE scale (today: 1 + elapsed/130) → floor term.`,
  },
  {
    id: 'navDir', name: 'EnemyAI.navDir(scene, e)', file: 'systems/EnemyAI.js', cat: 'ai',
    summary: 'Per-enemy flow-field direction; chasers steer by this instead of straight-at-player.',
    refs: ['dirAt'],
    code: `export function navDir(scene, e) {
  if (!scene.nav) return null;
  const { col, row } = scene.floorSys.worldToTile(e.x, e.y);
  return scene.nav.dirAt(col, row);     // {x,y} unit step or null (fallback to LOS)
}
// inside updateMob() chase branch:
const nd = navDir(scene, e);
const ax = nd ? nd.x : Math.cos(ang);
const ay = nd ? nd.y : Math.sin(ang);
e.setVelocity(ax * spd, ay * spd);`,
  },
  {
    id: 'enterFloor', name: 'GameScene.enterFloor(floor)', file: 'scenes/GameScene.js', cat: 'core',
    summary: 'Build+realize a floor, place player/stairs/loot, make the nav field, reset the swarm.',
    refs: ['build', 'recompute', 'difficulty', 'descendFloor'],
    code: `enterFloor(floor) {
  this.floor = floor;
  this.bossActiveThisFloor = false;
  this.dungeonMode = true;        // ⚠ gate off wrapEntity (torus) — floors have walls
  const isBoss = this.bossFloors[floor] !== undefined;
  this.floorSys.build(this.run.floorSeed + floor, { lockStairs: isBoss });
  const s = this.floorSys.startWorld();
  this.player.setPosition(s.x, s.y);
  this.cameras.main.centerOn(s.x, s.y);
  this.nav = new FlowField(this.floorSys.data.cols, this.floorSys.data.rows, this.floorSys.data.grid);
  this.map.scatterInRooms(this.floorSys.data.lootCells);
  this.spawner.onFloorStart(floor);
  if (isBoss) this.bossPhase = this.bossFloors[floor];
  this.showBanner(\`Floor \${floor} / \${this.floorsTotal}\`, '#ffd700');
  Audio.setIntensity(0);
  this.captureRunState();
}`,
  },
  {
    id: 'descendFloor', name: 'GameScene.descendFloor()', file: 'scenes/GameScene.js', cat: 'core',
    summary: 'Step on the stairs → clear the field and build the next floor. Last floor ends via conquerStage.',
    refs: ['enterFloor'],
    code: `descendFloor() {
  if (this.floor >= this.floorsTotal) return;  // champion on the last floor ends the stage
  this.clearField();                           // deactivate enemies/projectiles/gems
  Audio.sfx('levelup');
  this.enterFloor(this.floor + 1);
}`,
  },
  {
    id: 'updateLoop', name: 'GameScene.update() — stairs & boss gate', file: 'scenes/GameScene.js', cat: 'core',
    summary: 'Refresh nav; trigger the duel at a boss floor stairs room; descend on the open stairs.',
    refs: ['recompute', 'descendFloor', 'defeatBoss'],
    code: `// nav refresh (a few times/sec)
this._navAcc += delta;
if (this._navAcc >= 180) {
  this._navAcc = 0;
  const pc = this.floorSys.worldToTile(this.player.x, this.player.y);
  this.nav.recompute(pc.col, pc.row);
}
const isBoss = this.bossFloors[this.floor] !== undefined;
if (isBoss && !this.activeBoss && !this.bossActiveThisFloor && !this.dueling && !this.challengePending
    && Phaser.Math.Distance.Between(this.player.x, this.player.y,
                                    this.floorSys.stairs.x, this.floorSys.stairs.y) < 220) {
  this.bossActiveThisFloor = true;
  this.duel.promptChallenge();                 // existing duel flow
}
if (!this.dueling && this.floorSys.atStairs(this.player.x, this.player.y)) this.descendFloor();`,
  },
  {
    id: 'defeatBoss', name: 'GameScene.defeatBoss(boss)', file: 'scenes/GameScene.js', cat: 'core',
    summary: 'Keep the boss XP grant; mini-boss → unlock stairs; last-floor champion/Xerxes → conquerStage().',
    refs: ['unlockStairs', 'descendFloor'],
    code: `// ⚠ PRESERVE the milestone XP grant (added after the original draft):
const lv = (boss.isLocalFinal ? 1.4 : 0.7) * (clean ? 1.2 : 1);
const gained = this.player.addXp(this.player.xpToNext * lv);
if (gained > 0) this.pendingLevels += gained;
// then the floor tail:
if (boss.isLocalFinal) { this.conquerStage(); return; }  // champion on the last floor
this.floorSys.unlockStairs();                            // mini-boss gate opens
this.bossPhase += 1;
Audio.setIntensity(0);`,
  },
  {
    id: 'bossFloorsFor', name: 'campaign.bossFloorsFor(run)', file: 'data/campaign.js', cat: 'data',
    summary: 'Maps the boss sequence onto floors; the last boss always lands on the last floor.',
    refs: ['enterFloor'],
    code: `export function bossFloorsFor(run) {
  const seq = bossSequence(run);   // civ: 2 lts + champion (N=3)
  const F = floorsForStage(run), N = seq.length;  // final: 8 champions + Xerxes (N=9!)
  const map = {};                       // floorNumber -> bossIndex
  seq.forEach((_, i) => { map[Math.round((F * (i + 1)) / N)] = i; });
  return map;   // civ: {5:0,10:1,15:2}  ·  final: {3,7,10,13,17,20,23,27,30} (9 bosses)
}`,
  },
];
const BY_ID = Object.fromEntries(FUNCS.map((f) => [f.id, f]));

// ─── tiny One-Dark JS highlighter (regex tokeniser) ─────────────────────────────
const KW = /\b(const|let|var|function|return|if|else|for|while|of|in|new|this|export|import|from|continue|break|true|false|null)\b/;
function highlight(code) {
  const out = [];
  const re = /(\/\/[^\n]*)|(`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$])/g;
  let m, key = 0;
  while ((m = re.exec(code))) {
    if (m[1]) out.push(<span key={key++} style={{ color: C.dim, fontStyle: 'italic' }}>{m[1]}</span>);
    else if (m[2]) out.push(<span key={key++} style={{ color: '#98c379' }}>{m[2]}</span>);
    else if (m[3]) out.push(<span key={key++} style={{ color: '#d19a66' }}>{m[3]}</span>);
    else if (m[4]) {
      const w = m[4];
      const after = code[re.lastIndex];
      if (KW.test(w)) out.push(<span key={key++} style={{ color: '#c678dd' }}>{w}</span>);
      else if (after === '(') out.push(<span key={key++} style={{ color: '#61afef' }}>{w}</span>);
      else out.push(<span key={key++} style={{ color: C.text }}>{w}</span>);
    } else out.push(<span key={key++} style={{ color: C.text }}>{m[0]}</span>);
  }
  return out;
}

// ─── flow diagram (boxes) ───────────────────────────────────────────────────────
const FLOW = [
  { t: 'init()  →  floor, floorsTotal, bossFloors', cat: 'core', fn: 'bossFloorsFor' },
  { t: 'enterFloor(f)  →  generateFloor → build → place player/stairs/loot', cat: 'core', fn: 'enterFloor' },
  { t: 'update()  →  recompute nav · EnemyAI chases via flow field · swarm', cat: 'nav', fn: 'updateLoop' },
  { t: 'boss floor? reach stairs room → duel.promptChallenge()', cat: 'core', fn: 'updateLoop' },
  { t: 'defeatBoss → unlock stairs (mini) | conquerStage (champion)', cat: 'core', fn: 'defeatBoss' },
  { t: 'step on open stairs → descendFloor() → enterFloor(f+1)', cat: 'core', fn: 'descendFloor' },
];

// ─── UI bits ────────────────────────────────────────────────────────────────────
function Badge({ cat }) {
  const k = CAT[cat];
  return <span style={{ background: k.c + '22', color: k.c, border: `1px solid ${k.c}55`,
    borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{k.label}</span>;
}

function CodeBlock({ code }) {
  return (
    <pre style={{ background: '#1b1e24', border: `1px solid ${C.line}`, borderRadius: 8,
      padding: 14, overflow: 'auto', fontSize: 12.5, lineHeight: 1.55,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', margin: 0 }}>
      <code>{highlight(code)}</code>
    </pre>
  );
}

const TABS = ['Flow', 'Code', 'Data Model', 'Folders', 'Phases', 'Tests'];

const FOLDERS = `src/
  config.js               (+ DUNGEON tuning block)
  data/
    campaign.js           (+ run.floor / floorSeed, bossFloorsFor)
    dungeon.js            NEW · pure seeded floor generator
  systems/
    FloorSystem.js        NEW · realize floor (walls/stairs/loot) + descend()
    FlowField.js          NEW · BFS distance field for enemy pathfinding
    SpawnSystem.js        floor-based difficulty; walkable spawns
    EnemyAI.js            chasers steer by the flow field
    MapSystem.js          terrain/hazards anchored in rooms
  scenes/
    GameScene.js          floor lifecycle replaces stage timer + boss schedule
    UIScene.js            Floor X/Y + descend prompt replace the timer
    BootScene.js          load dungeon textures
  art/placeholders.js     + dungeon_wall / dungeon_floor / stairs_down
tools/
  test-dungeon.mjs        NEW · headless tests (generator + flow field)`;

const PHASES = [
  { n: 1, name: 'data/ + art/ — generation & textures', cat: 'gen',
    tasks: ['config DUNGEON block', 'data/dungeon.js (generateFloor)', 'dungeon textures'] },
  { n: 2, name: 'systems/ — realization & navigation', cat: 'floor',
    tasks: ['FlowField.js (BFS)', 'FloorSystem.js (build/walls/stairs)', 'SpawnSystem floor difficulty', 'EnemyAI flow-field steering'] },
  { n: 3, name: 'scenes — floor lifecycle & progression', cat: 'core',
    tasks: ['campaign bossFloorsFor + run.floor', 'GameScene enterFloor/descendFloor/gates', 'MapSystem scatterInRooms', 'UIScene floor indicator'] },
  { n: 4, name: 'tests & save', cat: 'data',
    tasks: ['tools/test-dungeon.mjs', 'SaveSystem resume on floor'] },
];

const DATA_MODEL = `// config.js
DUNGEON = { tile:32, cols:50, rows:50, minRooms:7, maxRooms:11,
            roomMin:6, roomMax:13, floorsPerStage:15, floorsFinal:30 }

// data/dungeon.js — generateFloor() output
WALL = 0, FLOOR = 1
FloorData {
  cols, rows, tile
  grid: Int8Array            // rows*cols; index = row*cols + col
  rooms: { x,y,w,h,cx,cy }[] // tile coords
  start:  { col, row }       // room[0] center (player spawn)
  stairs: { col, row }       // farthest room center (down-stairs)
  lootCells: { col, row }[]  // crate/shrine/terrain anchors
}

// data/campaign.js — run model additions
Run { ...existing, floor: number, floorSeed: number }   // floor replaces stageTime
// boss floors:  civ → {5,10,15}   ·   final → {3,7,10,13,17,20,23,27,30}  (9 bosses!)`;

const TESTS = `# pure logic (no Phaser) — headless harness, same pattern as the audio engine
node tools/test-dungeon.mjs
  ✓ same seed → identical grid (determinism)
  ✓ start & stairs are FLOOR cells, in different rooms
  ✓ 1-tile wall border all around
  ✓ flow field: stairs reachable from start; dirAt() non-null along path
  ✓ boss-floor maths: civ {5,10,15} (N=3), final 9 bosses incl. Xerxes on floor 30

# integration — after every task
npm run build            # catches import/syntax across all scenes

# manual browser loop (temporarily set DUNGEON.floorsPerStage = 3)
  ✓ walls collide; enemies route through corridors (not into walls)
  ✓ stairs descend; boss floors lock then unlock on defeat
  ✓ champion on last floor → conquerStage; Continue resumes the right floor`;

export default function ArchitectureDoc() {
  const [tab, setTab] = useState('Flow');
  const [sel, setSel] = useState('enterFloor');
  const open = (id) => { setSel(id); setTab('Code'); };
  const fn = BY_ID[sel];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', padding: 24,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ color: C.white, margin: '0 0 2px' }}>
          Dungeon Floors <span style={{ color: C.accent }}>· Architecture</span>
        </h1>
        <p style={{ color: C.dim, marginTop: 0 }}>
          Open arena → Pokémon-Mystery-Dungeon descent. 15 floors per stage (30 final);
          real-time combat unchanged — only the map, difficulty driver, and boss placement change.
        </p>
        <p style={{ color: C.accent, marginTop: 0, fontSize: 13 }}>
          ⚠ Updated 2026-06-01: 8-civ roster (final gauntlet = 9 bosses, not 5),
          keep playerPower in difficulty, preserve boss HP/damage scaling + XP grant,
          disable the toroidal wrap, handle Caesar&apos;s allied legionaries.
        </p>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${C.line}`, marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? C.panel : 'transparent', color: tab === t ? C.accent : C.text,
              border: 'none', borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
              padding: '8px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{t}</button>
          ))}
        </div>

        {tab === 'Flow' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FLOW.map((s, i) => (
                <div key={i}>
                  <div onClick={() => open(s.fn)} style={{ background: C.panel, border: `1px solid ${C.line}`,
                    borderLeft: `4px solid ${CAT[s.cat].c}`, borderRadius: 8, padding: '12px 14px',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13.5, color: C.white }}>{s.t}</span>
                    <Badge cat={s.cat} />
                  </div>
                  {i < FLOW.length - 1 && <div style={{ textAlign: 'center', color: C.dim }}>↓</div>}
                </div>
              ))}
            </div>
            <p style={{ color: C.dim, fontSize: 13, marginTop: 16 }}>
              Click any step to jump to its code. The hardest new piece is the
              <span style={{ color: CAT.nav.c }}> flow-field navigation</span> — without it the swarm
              can't path through corridors.
            </p>
          </div>
        )}

        {tab === 'Code' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 560, overflow: 'auto' }}>
              {FUNCS.map((f) => (
                <button key={f.id} onClick={() => setSel(f.id)} style={{
                  textAlign: 'left', background: sel === f.id ? C.panel : 'transparent',
                  border: `1px solid ${sel === f.id ? CAT[f.cat].c + '88' : 'transparent'}`,
                  borderRadius: 6, padding: '7px 9px', cursor: 'pointer', color: C.text }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: CAT[f.cat].c, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: C.white }}>{f.name}</span>
                  </div>
                  <div style={{ color: C.dim, fontSize: 11, marginLeft: 14 }}>{f.file}</div>
                </button>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 15, color: C.white }}>{fn.name}</span>
                <Badge cat={fn.cat} />
                <span style={{ color: C.dim, fontSize: 12 }}>{fn.file}</span>
              </div>
              <p style={{ color: C.text, fontSize: 13, marginTop: 0 }}>{fn.summary}</p>
              <CodeBlock code={fn.code} />
              {fn.refs?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ color: C.dim, fontSize: 12, marginRight: 8 }}>references:</span>
                  {fn.refs.map((r) => BY_ID[r] && (
                    <button key={r} onClick={() => setSel(r)} style={{
                      background: 'transparent', border: `1px solid ${CAT[BY_ID[r].cat].c}55`,
                      color: CAT[BY_ID[r].cat].c, borderRadius: 12, padding: '2px 10px', marginRight: 6,
                      cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>{BY_ID[r].name.split('(')[0]}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'Data Model' && <CodeBlock code={DATA_MODEL} />}
        {tab === 'Folders' && <CodeBlock code={FOLDERS} />}

        {tab === 'Phases' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PHASES.map((p) => (
              <div key={p.n} style={{ background: C.panel, border: `1px solid ${C.line}`,
                borderLeft: `4px solid ${CAT[p.cat].c}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ background: CAT[p.cat].c, color: '#111', borderRadius: 6,
                    width: 24, height: 24, display: 'grid', placeItems: 'center', fontWeight: 800 }}>{p.n}</span>
                  <span style={{ color: C.white, fontWeight: 700 }}>{p.name}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 22, color: C.text, fontSize: 13 }}>
                  {p.tasks.map((t) => <li key={t} style={{ marginBottom: 3 }}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === 'Tests' && <CodeBlock code={TESTS} />}

        <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${C.line}`,
          color: C.dim, fontSize: 12 }}>
          Source of truth: <span style={{ color: C.text }}>docs/dungeon-floors/dungeon-floors-architecture.md</span>
        </div>
      </div>
    </div>
  );
}
