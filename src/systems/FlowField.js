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
