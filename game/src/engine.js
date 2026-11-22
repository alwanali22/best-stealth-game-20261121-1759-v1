// Core stealth simulation: grid collision, line of sight, guard patrol /
// suspicion / chase AI, detection meter, relics, exit, lives.

import { TILE, COLS, ROWS } from './config.js';

export const CONE_RANGE = 195;
export const CONE_HALF = 0.61; // ~35 degrees each side

export function parseLevel(def) {
  const grid = def.map.map((r) => (r + '#'.repeat(COLS)).slice(0, COLS).split(''));
  const relics = [];
  let player = { x: 60, y: 60 };
  let exit = { x: 900, y: 540 };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (c === 'R') { relics.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, got: false }); grid[y][x] = '.'; }
      if (c === 'P') { player = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; grid[y][x] = '.'; }
      if (c === 'E') { exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; grid[y][x] = '.'; }
    }
  }
  const guards = def.guards.map((g) => ({
    path: g.path.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
    wp: 1,
    x: g.path[0][0] * TILE + TILE / 2,
    y: g.path[0][1] * TILE + TILE / 2,
    dir: 0,
    speed: g.speed || 60,
    state: 'patrol',
    wait: 0,
    detect: 0,
    investigate: null,
    lookTimer: 0,
    stuck: 0,
    lastX: 0,
    lastY: 0,
  }));
  return {
    name: def.name, grid, relics, player, exit, guards,
    lamps: (def.lamps || []).map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
    start: { x: player.x, y: player.y },
  };
}

export function tileAt(grid, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function solidAt(grid, x, y) {
  const c = tileAt(grid, x, y);
  return c === '#' || c === 'C';
}

export function inBush(grid, x, y) {
  return tileAt(grid, x, y) === 'B';
}

export function losClear(grid, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    if (solidAt(grid, ax + (dx * i) / steps, ay + (dy * i) / steps)) return false;
  }
  return true;
}

function canBe(grid, x, y, r) {
  return !solidAt(grid, x - r, y - r) && !solidAt(grid, x + r, y - r) &&
    !solidAt(grid, x - r, y + r) && !solidAt(grid, x + r, y + r);
}

export function moveEntity(grid, e, dx, dy, r = 13) {
  if (dx !== 0 && canBe(grid, e.x + dx, e.y, r)) e.x += dx;
  if (dy !== 0 && canBe(grid, e.x, e.y + dy, r)) e.y += dy;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function guardSees(level, g, px, py) {
  const dx = px - g.x;
  const dy = py - g.y;
  const d = Math.hypot(dx, dy);
  if (d > CONE_RANGE) return false;
  if (angleDiff(Math.atan2(dy, dx), g.dir) > CONE_HALF) return false;
  if (inBush(level.grid, px, py)) return false;
  return losClear(level.grid, g.x, g.y, px, py);
}

// One simulation step. `input` = {x, y, sneak}. Returns events pushed into `events`.
export function updateLevel(level, input, dt, events, game) {
  const p = level.player;
  const speed = input.sneak ? 88 : 152;
  const mx = input.x * speed * dt;
  const my = input.y * speed * dt;
  const moving = mx !== 0 || my !== 0;
  moveEntity(level.grid, p, mx, my);
  if (moving) {
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      game.stepTimer = input.sneak ? 0.55 : 0.34;
      events.push({ type: 'step', sneak: input.sneak });
      if (!input.sneak) {
        game.noise = { x: p.x, y: p.y, t: 0.55, max: 0.55 };
        events.push({ type: 'noise', x: p.x, y: p.y });
      }
    }
  }
  if (game.noise) {
    game.noise.t -= dt;
    if (game.noise.t <= 0) game.noise = null;
  }

  // Relic pickup.
  for (const r of level.relics) {
    if (!r.got && Math.hypot(r.x - p.x, r.y - p.y) < 24) {
      r.got = true;
      events.push({ type: 'pickup', x: r.x, y: r.y });
    }
  }
  const allRelics = level.relics.every((r) => r.got);
  if (allRelics && Math.hypot(level.exit.x - p.x, level.exit.y - p.y) < 26) {
    events.push({ type: 'exit' });
  }

  // Guards.
  let anySees = false;
  for (const g of level.guards) {
    const sees = guardSees(level, g, p.x, p.y);
    if (sees) anySees = true;
    if (sees) {
      g.detect = Math.min(100, g.detect + dt * 115);
      g.dir = Math.atan2(p.y - g.y, p.x - g.x);
      if (g.detect >= 100 && !game.alarm) {
        game.alarm = true;
        game.alarmTimer = 0;
        events.push({ type: 'alarm' });
      }
      if (g.detect >= 30) g.state = 'suspicious';
    } else {
      g.detect = Math.max(0, g.detect - dt * 48);
      if (g.detect < 25 && g.state === 'suspicious') g.state = 'patrol';
    }

    if (game.alarm) {
      // Chase the player.
      g.state = 'chase';
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        g.dir = Math.atan2(dy, dx);
        moveEntity(level.grid, g, (dx / d) * g.speed * 1.85 * dt, (dy / d) * g.speed * 1.85 * dt, 13);
      }
      if (d < 22) events.push({ type: 'caught', guard: g });
    } else if (g.state === 'investigate' && g.investigate) {
      const dx = g.investigate.x - g.x;
      const dy = g.investigate.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        g.lookTimer -= dt;
        g.dir += dt * 1.6;
        if (g.lookTimer <= 0) { g.state = 'patrol'; g.investigate = null; }
      } else {
        g.dir = Math.atan2(dy, dx);
        moveEntity(level.grid, g, (dx / d) * g.speed * 1.25 * dt, (dy / d) * g.speed * 1.25 * dt, 13);
      }
    } else if (g.state === 'patrol' || g.state === 'suspicious') {
      if (g.state === 'suspicious' && g.detect >= 30) {
        // Freeze and stare at the player for a beat.
        g.dir = Math.atan2(p.y - g.y, p.x - g.x);
      } else {
        const wp = g.path[g.wp];
        const dx = wp.x - g.x;
        const dy = wp.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) {
          g.wait -= dt;
          if (g.wait <= 0) { g.wp = (g.wp + 1) % g.path.length; g.wait = 0.9; }
        } else {
          g.dir = Math.atan2(dy, dx);
          const ox = g.x;
          const oy = g.y;
          moveEntity(level.grid, g, (dx / d) * g.speed * dt, (dy / d) * g.speed * dt, 13);
          if (Math.hypot(g.x - ox, g.y - oy) < 0.5) {
            g.stuck += dt;
            if (g.stuck > 3) { g.wp = (g.wp + 1) % g.path.length; g.stuck = 0; }
          } else g.stuck = 0;
        }
      }
    }
  }

  // Noise investigation: guards that hear footsteps walk over to listen.
  if (!game.alarm) {
    for (const e of events) {
      if (e.type !== 'noise') continue;
      for (const g of level.guards) {
        if (g.state === 'patrol' && Math.hypot(g.x - e.x, g.y - e.y) < 250) {
          g.state = 'investigate';
          g.investigate = { x: e.x, y: e.y };
          g.lookTimer = 1.6;
        }
      }
    }
  }

  // Alarm decay: if nobody sees you for 3 s, the alarm cools off.
  if (game.alarm) {
    if (anySees) game.alarmTimer = 0;
    else {
      game.alarmTimer += dt;
      if (game.alarmTimer > 3) {
        game.alarm = false;
        for (const g of level.guards) { g.state = 'patrol'; g.detect = 40; }
        events.push({ type: 'alarmOff' });
      }
    }
  }
  return allRelics;
}
