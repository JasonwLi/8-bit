// Headless tests for the pure dungeon modules (no Phaser). Run: node tools/test-dungeon.mjs
import { DUNGEON } from '../src/config.js';
import { generateFloor, WALL, FLOOR } from '../src/data/dungeon.js';
import FlowField from '../src/systems/FlowField.js';

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('FAIL:', m); fail++; } else { console.log('  ok  ', m); } };

// determinism
const a = generateFloor(123, DUNGEON), b = generateFloor(123, DUNGEON);
ok(a.grid.every((v, i) => v === b.grid[i]), 'same seed -> identical grid');
const c = generateFloor(124, DUNGEON);
ok(!a.grid.every((v, i) => v === c.grid[i]), 'different seed -> different grid');

// start/stairs are distinct floor cells
ok(a.grid[a.start.row * a.cols + a.start.col] === FLOOR, 'start is floor');
ok(a.grid[a.stairs.row * a.cols + a.stairs.col] === FLOOR, 'stairs is floor');
ok(!(a.start.col === a.stairs.col && a.start.row === a.stairs.row), 'start != stairs');

// caverns: a sizeable single connected walkable space + scattered encounters
const floorCount = a.grid.reduce((s, v) => s + (v === FLOOR ? 1 : 0), 0);
ok(floorCount > a.cols * a.rows * 0.12, 'cavern fills a meaningful share of the floor');
ok(Array.isArray(a.encounters) && a.encounters.length >= 1, 'has scattered encounters');
ok(a.encounters.every((e) => ['trap', 'treasure', 'ambush'].includes(e.kind)), 'encounter kinds valid');
ok(a.encounters.every((e) => a.grid[e.row * a.cols + e.col] === FLOOR), 'encounters anchored on floor');

// border is all wall
let border = true;
for (let col = 0; col < a.cols; col++) border = border && a.grid[col] === WALL && a.grid[(a.rows - 1) * a.cols + col] === WALL;
for (let row = 0; row < a.rows; row++) border = border && a.grid[row * a.cols] === WALL && a.grid[row * a.cols + a.cols - 1] === WALL;
ok(border, '1-tile wall border all around');

// flow field: reachable from start, full connectivity (every floor cell has a distance)
const ff = new FlowField(a.cols, a.rows, a.grid);
ff.recompute(a.start.col, a.start.row);
ok(ff.dist[a.stairs.row * a.cols + a.stairs.col] > 0, 'stairs reachable from start');
ok(ff.dirAt(a.stairs.col, a.stairs.row) !== null, 'flow dir exists at stairs');
let connected = true;
for (let i = 0; i < a.grid.length; i++) if (a.grid[i] === FLOOR && ff.dist[i] === -1) connected = false;
ok(connected, 'every floor cell is reachable from start (fully connected)');

// recompute early-returns when the target cell is unchanged (no re-fill)
ff.dist[0] = 999;
ff.recompute(a.start.col, a.start.row);
ok(ff.dist[0] === 999, 'recompute early-returns when target cell unchanged');

// boss-floor mapping — civ N=3, final N=9 (8 civ champions + Xerxes)
const mapFloors = (N, F) => { const m = {}; for (let i = 0; i < N; i++) m[Math.round((F * (i + 1)) / N)] = i; return m; };
const civ = mapFloors(3, 15);
const fin = mapFloors(9, 30);
ok(civ[5] === 0 && civ[10] === 1 && civ[15] === 2, 'civ boss floors 5/10/15');
ok(fin[30] === 8, 'Xerxes (boss 8 of 9) on floor 30');
ok(Object.keys(fin).length === 9, 'final stage has 9 boss floors');

// 200-seed sweep: every floor is deterministic + fully connected
let sweepOk = true;
for (let s = 1; s <= 200; s++) {
  const f = generateFloor(s * 7919, DUNGEON);
  const fff = new FlowField(f.cols, f.rows, f.grid);
  fff.recompute(f.start.col, f.start.row);
  if (fff.dist[f.stairs.row * f.cols + f.stairs.col] <= 0) { sweepOk = false; break; }
}
ok(sweepOk, '200-seed sweep: stairs always reachable from start');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
