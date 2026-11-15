/* Pure match-3 logic. No DOM. Boards are arrays of rows: t[r][c] = tile type (0..n-1) or -1 for empty. Row 0 is the top. */
(function (root) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Every cell that is part of a horizontal or vertical run of 3 or more. */
  function findMatches(t) {
    const rows = t.length, cols = t[0].length;
    const hit = new Uint8Array(rows * cols);

    for (let r = 0; r < rows; r++) {
      let run = 1;
      for (let c = 1; c <= cols; c++) {
        const same = c < cols && t[r][c] >= 0 && t[r][c] === t[r][c - 1];
        if (same) { run++; continue; }
        if (run >= 3) for (let k = 1; k <= run; k++) hit[r * cols + c - k] = 1;
        run = 1;
      }
    }
    for (let c = 0; c < cols; c++) {
      let run = 1;
      for (let r = 1; r <= rows; r++) {
        const same = r < rows && t[r][c] >= 0 && t[r][c] === t[r - 1][c];
        if (same) { run++; continue; }
        if (run >= 3) for (let k = 1; k <= run; k++) hit[(r - k) * cols + c] = 1;
        run = 1;
      }
    }

    const out = [];
    for (let i = 0; i < hit.length; i++) if (hit[i]) out.push({ r: Math.floor(i / cols), c: i % cols });
    return out;
  }

  function swapCells(t, a, b) {
    const x = t[a.r][a.c]; t[a.r][a.c] = t[b.r][b.c]; t[b.r][b.c] = x;
  }

  /** True if any single adjacent swap would create a match. */
  function hasMove(t) {
    const rows = t.length, cols = t[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = { r, c };
        for (const b of [{ r, c: c + 1 }, { r: r + 1, c }]) {
          if (b.r >= rows || b.c >= cols) continue;
          swapCells(t, a, b);
          const found = findMatches(t).length > 0;
          swapCells(t, a, b);
          if (found) return true;
        }
      }
    }
    return false;
  }

  function randomTypeAvoidingMatch(t, r, c, n, rand) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const v = Math.floor(rand() * n);
      const horiz = c >= 2 && t[r][c - 1] === v && t[r][c - 2] === v;
      const vert = r >= 2 && t[r - 1][c] === v && t[r - 2][c] === v;
      if (!horiz && !vert) return v;
    }
    return Math.floor(rand() * n);
  }

  /** A fresh board with no existing matches and at least one legal move. */
  function randomBoard(rows, cols, n, rand) {
    rand = rand || Math.random;
    for (let attempt = 0; attempt < 200; attempt++) {
      const t = [];
      for (let r = 0; r < rows; r++) {
        t.push(new Array(cols).fill(-1));
        for (let c = 0; c < cols; c++) t[r][c] = randomTypeAvoidingMatch(t, r, c, n, rand);
      }
      if (findMatches(t).length === 0 && hasMove(t)) return t;
    }
    throw new Error('Could not build a playable board');
  }

  /**
   * Gravity for a board that has -1 holes. Pure: does not modify t.
   * moves: existing tiles that fall {c, fromR, toR}
   * spawns: new tiles entering from above {c, toR, k} where k = 0 is the lowest new tile in that column
   */
  function gravityPlan(t) {
    const rows = t.length, cols = t[0].length;
    const moves = [], spawns = [];
    for (let c = 0; c < cols; c++) {
      let write = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (t[r][c] < 0) continue;
        if (r !== write) moves.push({ c, fromR: r, toR: write });
        write--;
      }
      for (let r = write, k = 0; r >= 0; r--, k++) spawns.push({ c, toR: r, k });
    }
    return { moves, spawns };
  }

  const api = { mulberry32, findMatches, hasMove, randomBoard, gravityPlan, swapCells };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
