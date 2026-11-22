// Canvas rendering for Lamplight Heist: lamplit museum floor, walls, crates,
// bushes, relics, exit, guards with vision cones, the thief, HUD and screens.

import { TILE, COLS, ROWS } from './config.js';
import { CONE_RANGE, CONE_HALF, tileAt, inBush } from './engine.js';

function coneColor(g) {
  if (g.state === 'chase') return 'rgba(255, 60, 50, 0.30)';
  if (g.detect >= 30) return 'rgba(255, 150, 40, 0.22)';
  return 'rgba(255, 214, 90, 0.13)';
}

export function drawGame(ctx, level, game) {
  const W = COLS * TILE;
  const H = ROWS * TILE;
  // Floor.
  ctx.fillStyle = '#171a21';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, H); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(W, y * TILE); ctx.stroke(); }

  // Warm lamplight pools.
  for (const l of level.lamps) {
    const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, 150);
    g.addColorStop(0, 'rgba(255, 196, 110, 0.20)');
    g.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(l.x - 150, l.y - 150, 300, 300);
  }

  // Bushes (hiding spots).
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.grid[y][x] !== 'B') continue;
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      ctx.fillStyle = '#1d3a24';
      for (const [ox, oy, r] of [[-9, -6, 12], [8, -8, 11], [0, 8, 12], [-4, 2, 10], [9, 7, 9]]) {
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#2c5a34';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy + 5, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Relics.
  const t = performance.now() / 1000;
  for (const r of level.relics) {
    if (r.got) continue;
    const pulse = 0.7 + Math.sin(t * 3 + r.x) * 0.3;
    const g = ctx.createRadialGradient(r.x, r.y, 2, r.x, r.y, 26);
    g.addColorStop(0, `rgba(90, 220, 255, ${0.5 * pulse})`);
    g.addColorStop(1, 'rgba(90, 220, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x - 26, r.y - 26, 52, 52);
    ctx.save();
    ctx.translate(r.x, r.y + Math.sin(t * 2 + r.x) * 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#7ee7ff';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#d8f6ff';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }

  // Exit door.
  const open = level.relics.every((r) => r.got);
  const ex = level.exit;
  ctx.save();
  ctx.translate(ex.x, ex.y);
  ctx.fillStyle = open ? '#1f7a3d' : '#3a3f4a';
  ctx.fillRect(-16, -18, 32, 36);
  ctx.strokeStyle = open ? '#7dff9e' : '#6a7180';
  ctx.lineWidth = 2;
  ctx.strokeRect(-16, -18, 32, 36);
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
  if (open) {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, 'rgba(120, 255, 150, 0.45)');
    g.addColorStop(1, 'rgba(120, 255, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-46, -46, 92, 92);
  }
  ctx.restore();

  // Walls and crates.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = level.grid[y][x];
      if (c === '#') {
        ctx.fillStyle = '#2b3040';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.fillStyle = '#3d4458';
        ctx.fillRect(x * TILE, y * TILE, TILE, 4);
      } else if (c === 'C') {
        ctx.fillStyle = '#5a4023';
        ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#7a5a30';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
        ctx.beginPath(); ctx.moveTo(x * TILE + 3, y * TILE + 3); ctx.lineTo(x * TILE + TILE - 3, y * TILE + TILE - 3); ctx.stroke();
      }
    }
  }

  // Vision cones (under the guards, over the floor).
  for (const g of level.guards) {
    ctx.fillStyle = coneColor(g);
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, CONE_RANGE, g.dir - CONE_HALF, g.dir + CONE_HALF);
    ctx.closePath();
    ctx.fill();
  }

  // Noise rings.
  if (game.noise) {
    const p = 1 - game.noise.t / game.noise.max;
    ctx.strokeStyle = `rgba(200, 200, 220, ${0.35 * (1 - p)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(game.noise.x, game.noise.y, 12 + p * 58, 0, Math.PI * 2); ctx.stroke();
  }

  // Guards.
  for (const g of level.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = '#8c2f2f';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c94f4f';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    // Facing tick + lamp.
    ctx.rotate(g.dir);
    ctx.fillStyle = '#ffd65a';
    ctx.beginPath(); ctx.arc(11, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Detection arc over the guard.
    if (g.detect > 2) {
      ctx.strokeStyle = g.detect >= 100 ? '#ff3c32' : '#ffb02e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + (g.detect / 100) * Math.PI * 2);
      ctx.stroke();
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff3c32';
      ctx.font = 'bold 13px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 22);
    } else if (g.detect >= 30) {
      ctx.fillStyle = '#ffb02e';
      ctx.font = 'bold 13px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 22);
    }
  }

  // The thief.
  const p = level.player;
  const hidden = inBush(level.grid, p.x, p.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = hidden ? 0.55 : 1;
  ctx.fillStyle = '#2f8f7a';
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(11, 10);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#57d9b8';
  ctx.beginPath(); ctx.arc(0, -2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#123b32';
  ctx.beginPath(); ctx.arc(0, -2, 7, 0, Math.PI); ctx.fill();
  ctx.restore();

  drawHud(ctx, level, game);
}

function drawHud(ctx, level, game) {
  const W = COLS * TILE;
  ctx.fillStyle = 'rgba(8, 10, 14, 0.72)';
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = '#e8c87a';
  ctx.font = 'bold 14px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(level.name, 12, 20);
  // Relics.
  const got = level.relics.filter((r) => r.got).length;
  ctx.fillStyle = '#7ee7ff';
  ctx.fillText(`◆ ${got}/${level.relics.length}`, 250, 20);
  // Lives.
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('♥'.repeat(Math.max(0, game.lives)), 330, 20);
  // Timer.
  ctx.fillStyle = '#cfc4a8';
  const s = Math.floor(game.time);
  ctx.fillText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, 430, 20);
  // Detection bar.
  const det = Math.max(0, ...level.guards.map((g) => g.detect));
  ctx.fillStyle = '#222';
  ctx.fillRect(520, 9, 170, 12);
  ctx.fillStyle = game.alarm ? '#ff3c32' : det >= 30 ? '#ffb02e' : '#57d9b8';
  ctx.fillRect(520, 9, (170 * det) / 100, 12);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.strokeRect(520, 9, 170, 12);
  ctx.fillStyle = '#e8c87a';
  ctx.fillText(game.alarm ? 'ALARM!' : 'SEEN', 700, 20);
  ctx.fillStyle = '#9a8a68';
  ctx.textAlign = 'right';
  ctx.fillText(`Level ${game.levelIndex + 1}/3`, W - 12, 20);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx) {
  const W = COLS * TILE;
  const H = ROWS * TILE;
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 190, 10, W / 2, 190, 320);
  g.addColorStop(0, 'rgba(255, 196, 110, 0.22)');
  g.addColorStop(1, 'rgba(255, 196, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8c87a';
  ctx.font = 'bold 54px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('LAMPLIGHT HEIST', W / 2, 170);
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'italic 20px Georgia';
  ctx.fillText('a game of shadows, patience and very quiet feet', W / 2, 208);
  ctx.fillStyle = '#cfc4a8';
  ctx.font = '17px Georgia';
  ctx.fillText('Steal every relic from the midnight museum, then slip out the green door — unseen.', W / 2, 280);
  ctx.fillText('Guards sweep the halls with lamplight. Their cones are their eyes: stay out of them,', W / 2, 308);
  ctx.fillText('hide in the bushes, and walk softly — running footsteps carry, and guards come to listen.', W / 2, 336);
  ctx.fillText('If a guard fills his meter, the alarm sounds and they hunt you. Three lives. Three wings.', W / 2, 364);
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 22px Georgia';
  ctx.fillText('Press ENTER to begin', W / 2, 440);
  ctx.fillStyle = '#9a8a68';
  ctx.font = '15px Georgia';
  ctx.fillText('WASD / arrows move · Shift sneak · P pause · R restart', W / 2, 480);
  ctx.textAlign = 'left';
}

export function drawCenterText(ctx, lines, color) {
  const W = COLS * TILE;
  const H = ROWS * TILE;
  ctx.fillStyle = 'rgba(8, 10, 14, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  lines.forEach(([text, size, c], i) => {
    ctx.fillStyle = c || color || '#e8c87a';
    ctx.font = `bold ${size}px Georgia`;
    ctx.fillText(text, W / 2, H / 2 - 40 + i * 44);
  });
  ctx.textAlign = 'left';
}
