// Pure, seeded dungeon-floor generator — organic cellular-automata CAVERNS (no
// rooms/corridors). Returns a FloorData record (grid + start/stairs/loot/encounter
// anchors) that FloorSystem realizes into a live floor. Deterministic for a given
// seed so saves resume the same floor.
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

// Count WALL cells in the 8-neighbourhood of (x,y). Out-of-bounds counts as WALL
// so the cave naturally seals against the border.
function wallNeighbours(grid, cols, rows, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { n++; continue; }
      if (grid[ny * cols + nx] === WALL) n++;
    }
  }
  return n;
}

// BFS-label connected FLOOR regions (4-connectivity). Returns { label, sizes }.
function labelRegions(grid, cols, rows) {
  const label = new Int32Array(cols * rows).fill(-1);
  const sizes = [];
  const queue = new Int32Array(cols * rows);
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== FLOOR || label[i] !== -1) continue;
    const id = sizes.length;
    let head = 0, tail = 0, count = 0;
    queue[tail++] = i; label[i] = id;
    while (head < tail) {
      const cur = queue[head++]; count++;
      const cx = cur % cols, cy = (cur / cols) | 0;
      const nb = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (grid[ni] === FLOOR && label[ni] === -1) { label[ni] = id; queue[tail++] = ni; }
      }
    }
    sizes.push(count);
  }
  return { label, sizes };
}

// BFS distance field over FLOOR cells from a start cell (−1 = unreachable/wall).
function bfsDist(grid, cols, rows, startIdx) {
  const dist = new Int32Array(cols * rows).fill(-1);
  const queue = new Int32Array(cols * rows);
  let head = 0, tail = 0;
  dist[startIdx] = 0; queue[tail++] = startIdx;
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % cols, cy = (cur / cols) | 0;
    const nb = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx;
      if (grid[ni] === FLOOR && dist[ni] === -1) { dist[ni] = dist[cur] + 1; queue[tail++] = ni; }
    }
  }
  return dist;
}

export function generateFloor(seed, cfg) {
  const { cols, rows, tile } = cfg;
  const fillProb = cfg.caveFill ?? 0.44;
  const steps = cfg.caveSteps ?? 5;
  const nEncounters = cfg.encounters ?? 4;
  const rand = rng(seed);

  // 1) random fill (border forced WALL)
  let grid = new Int8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) grid[i] = WALL;
      else grid[i] = rand() < fillProb ? WALL : FLOOR;
    }
  }

  // 2) smoothing — the classic cave rule (born B5 / survive S4): a wall stays a
  //    wall if it has >=4 wall neighbours, and a floor BECOMES wall only if it has
  //    >=5. This PRESERVES interior rock (unlike a pure >=5 erode), yielding winding
  //    caverns with cover rather than one flat blob. Border stays WALL.
  for (let s = 0; s < steps; s++) {
    const next = new Int8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) { next[i] = WALL; continue; }
        const w = wallNeighbours(grid, cols, rows, x, y);
        next[i] = grid[i] === WALL ? (w >= 4 ? WALL : FLOOR) : (w >= 5 ? WALL : FLOOR);
      }
    }
    grid = next;
  }

  // 2b) WIDEN walkways: dilate the floor by opening wall tiles that already border a
  //     lot of floor (pinch points / nubs poking into open space). This removes 1-tile
  //     chokes so passages read wider and mobs/nav don't snag on them. Border stays WALL.
  for (let s = 0; s < (cfg.widenPasses ?? 1); s++) {
    const next = grid.slice();
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        if (grid[y * cols + x] !== WALL) continue;
        let f = 0;
        if (grid[y * cols + x - 1] === FLOOR) f++;
        if (grid[y * cols + x + 1] === FLOOR) f++;
        if (grid[(y - 1) * cols + x] === FLOOR) f++;
        if (grid[(y + 1) * cols + x] === FLOOR) f++;
        // open a wall mostly surrounded by floor (≥3 orthogonal) — clears nubs/pinch
        // points that snag navigation, without dissolving corridor walls into open arena
        if (f >= 3) next[y * cols + x] = FLOOR;
      }
    }
    grid = next;
  }

  // 3) keep only the LARGEST connected cavern; fill every other pocket as WALL.
  //    Guarantees a single fully-connected walkable space (test invariant).
  const { label, sizes } = labelRegions(grid, cols, rows);
  let big = 0;
  for (let id = 1; id < sizes.length; id++) if (sizes[id] > sizes[big]) big = id;
  for (let i = 0; i < grid.length; i++) if (grid[i] === FLOOR && label[i] !== big) grid[i] = WALL;

  // collect the surviving cavern's floor cells (scan order = deterministic)
  const floorCells = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] === FLOOR) floorCells.push(i);

  // 4) start = a seeded floor cell; stairs = the floor cell farthest from start.
  const startIdx = floorCells[Math.floor(rand() * floorCells.length)];
  const start = { col: startIdx % cols, row: (startIdx / cols) | 0 };
  const dist = bfsDist(grid, cols, rows, startIdx);
  let stairsIdx = startIdx, best = 0;
  for (const i of floorCells) if (dist[i] > best) { best = dist[i]; stairsIdx = i; }
  const stairs = { col: stairsIdx % cols, row: (stairsIdx / cols) | 0 };

  // helper: a random floor cell at least `minDist` BFS-steps from start AND from
  // every cell already chosen (so anchors spread out across the cavern).
  const chosen = [startIdx, stairsIdx];
  const tileDist = (a, b) => Math.abs((a % cols) - (b % cols)) + Math.abs(((a / cols) | 0) - ((b / cols) | 0));
  const pickSpread = (minFromOthers) => {
    for (let tries = 0; tries < 40; tries++) {
      const idx = floorCells[Math.floor(rand() * floorCells.length)];
      if (dist[idx] < 6) continue; // keep clear of the spawn pocket
      if (chosen.every((c) => tileDist(idx, c) >= minFromOthers)) { chosen.push(idx); return idx; }
    }
    return -1;
  };

  // 5) loot anchors: scattered floor cells (crates/shrines/hazards/terrain in MapSystem)
  const lootCells = [];
  const nLoot = Math.round(floorCells.length / 90); // ~density-scaled count
  for (let k = 0; k < Math.max(6, nLoot); k++) {
    const idx = floorCells[Math.floor(rand() * floorCells.length)];
    lootCells.push({ col: idx % cols, row: (idx / cols) | 0 });
  }

  // 6) encounters: a few scattered special zones (trap / treasure / ambush),
  //    spread apart and away from spawn. Triggered by proximity in GameScene.
  //    Weighted bag: treasure is RARE (~1 in 5) — most zones are danger, so a cache
  //    is a real find rather than litter. At most one treasure per floor.
  const KIND_BAG = ['trap', 'trap', 'ambush', 'ambush', 'treasure'];
  const encounters = [];
  let treasures = 0;
  for (let k = 0; k < nEncounters; k++) {
    const idx = pickSpread(7);
    if (idx < 0) break;
    let kind = KIND_BAG[Math.floor(rand() * KIND_BAG.length)];
    if (kind === 'treasure' && treasures >= 1) kind = 'trap'; // cap one cache per floor
    if (kind === 'treasure') treasures++;
    encounters.push({ col: idx % cols, row: (idx / cols) | 0, kind });
  }

  return { cols, rows, tile, grid, start, stairs, lootCells, encounters };
}
