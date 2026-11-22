// Lamplight Heist: game loop, input, screens, scoring and screenshot presets.
// URL presets for staged screenshots (real renders of this game's own code):
//   ?shot=1&still=1  title screen
//   ?shot=2&still=1  mid-heist, a guard half-suspicious, one relic taken
//   ?shot=3&still=1  the alarm in the Vault Wing, guards hunting

import { LEVELS } from './config.js';
import { parseLevel, updateLevel } from './engine.js';
import { drawGame, drawTitle, drawCenterText } from './render.js';
import { ensureAudio, toggleMute, sfxPickup, sfxAlarm, sfxCaught, sfxWin, sfxStep } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);

const game = {
  screen: 'title', // title | play | paused | caught | leveldone | win
  levelIndex: 0,
  level: null,
  lives: 3,
  time: 0,
  alarm: false,
  alarmTimer: 0,
  stepTimer: 0,
  noise: null,
  toast: '',
  toastTimer: 0,
  score: 0,
};

const keys = {};
let lastTs = 0;

function startLevel(i) {
  game.levelIndex = i;
  game.level = parseLevel(LEVELS[i]);
  game.alarm = false;
  game.alarmTimer = 0;
  game.noise = null;
  game.toast = LEVELS[i].name;
  game.toastTimer = 2.2;
}

function startGame() {
  game.lives = 3;
  game.time = 0;
  game.score = 0;
  startLevel(0);
  game.screen = 'play';
}

function respawn() {
  const level = game.level;
  level.player.x = level.start.x;
  level.player.y = level.start.y;
  game.alarm = false;
  for (const g of level.guards) {
    g.state = 'patrol';
    g.detect = 0;
    g.investigate = null;
    g.x = g.path[0].x;
    g.y = g.path[0].y;
    g.wp = 1;
  }
}

function readInput() {
  const x = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  const y = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, sneak: !!(keys['shift']) };
}

function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'pickup') {
      sfxPickup();
      game.score += 250;
      game.toast = 'Relic taken — the case is empty.';
      game.toastTimer = 1.6;
    } else if (e.type === 'alarm') {
      sfxAlarm();
      game.toast = 'SPOTTED! Run — break line of sight!';
      game.toastTimer = 2;
    } else if (e.type === 'alarmOff') {
      game.toast = 'The alarm cools off… they lost you.';
      game.toastTimer = 1.8;
    } else if (e.type === 'caught') {
      sfxCaught();
      game.lives -= 1;
      if (game.lives <= 0) {
        game.screen = 'caught';
      } else {
        respawn();
        game.toast = `Caught! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — back to the entrance.`;
        game.toastTimer = 2.2;
      }
    } else if (e.type === 'exit') {
      game.score += 500 + game.lives * 200;
      if (game.levelIndex + 1 >= LEVELS.length) {
        game.screen = 'win';
        sfxWin();
      } else {
        game.screen = 'leveldone';
        setTimeout(() => {
          if (game.screen === 'leveldone') { startLevel(game.levelIndex + 1); game.screen = 'play'; }
        }, 2200);
      }
    } else if (e.type === 'step' && !e.sneak) {
      sfxStep();
    }
  }
}

function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  if (game.screen === 'play') {
    game.time += dt;
    const events = [];
    updateLevel(game.level, readInput(), dt, events, game);
    handleEvents(events);
    if (game.toastTimer > 0) game.toastTimer -= dt;
  }
  render();
  requestAnimationFrame(frame);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (game.screen === 'title') {
    drawTitle(ctx);
  } else if (game.screen === 'win') {
    drawGame(ctx, game.level, game);
    const m = Math.floor(game.time / 60);
    const s = Math.floor(game.time % 60);
    drawCenterText(ctx, [
      ['THE CLEAN GETAWAY', 40],
      [`Every relic, every wing — in ${m}:${String(s).padStart(2, '0')}`, 20, '#cfc4a8'],
      [`Score: ${game.score}`, 22, '#7ee7ff'],
      ['Press ENTER to play again', 18, '#9a8a68'],
    ]);
  } else if (game.screen === 'caught') {
    drawGame(ctx, game.level, game);
    drawCenterText(ctx, [
      ['CAUGHT IN THE LAMPLIGHT', 36, '#ff6b6b'],
      ['The museum keeps its relics tonight.', 19, '#cfc4a8'],
      [`Score: ${game.score}`, 20, '#7ee7ff'],
      ['Press ENTER to try again', 18, '#9a8a68'],
    ]);
  } else if (game.screen === 'leveldone') {
    drawGame(ctx, game.level, game);
    drawCenterText(ctx, [
      ['WING CLEARED', 38],
      ['You slip through the door as the patrol turns…', 19, '#cfc4a8'],
    ]);
  } else {
    drawGame(ctx, game.level, game);
    if (game.screen === 'paused') {
      drawCenterText(ctx, [['PAUSED', 40], ['Press P to resume', 18, '#9a8a68']]);
    } else if (game.toastTimer > 0 && game.toast) {
      ctx.fillStyle = 'rgba(8, 10, 14, 0.72)';
      const w = ctx.measureText(game.toast).width + 28;
      ctx.fillRect((canvas.width - w) / 2, 44, w, 28);
      ctx.fillStyle = '#e8c87a';
      ctx.font = '15px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(game.toast, canvas.width / 2, 63);
      ctx.textAlign = 'left';
    }
  }
}

window.addEventListener('keydown', (e) => {
  ensureAudio();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'enter') {
    if (game.screen === 'title' || game.screen === 'win' || game.screen === 'caught') startGame();
  } else if (k === 'p' && game.screen === 'play') {
    game.screen = 'paused';
  } else if (k === 'p' && game.screen === 'paused') {
    game.screen = 'play';
  } else if (k === 'r' && (game.screen === 'play' || game.screen === 'paused')) {
    startLevel(game.levelIndex);
    game.screen = 'play';
  } else if (k === 'm') {
    toggleMute();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousedown', () => {
  ensureAudio();
  if (game.screen === 'title' || game.screen === 'win' || game.screen === 'caught') startGame();
});

// Staged screenshot presets: real renders of the game's own code.
function applyShot() {
  const shot = params.get('shot');
  if (!shot) return false;
  if (shot === '1') {
    game.screen = 'title';
  } else if (shot === '2') {
    startGame();
    game.level.relics[0].got = true;
    game.level.player.x = 16 * 40 + 20;
    game.level.player.y = 3 * 40 + 20;
    const g = game.level.guards[1];
    g.x = 15 * 40 + 20;
    g.y = 2 * 40 + 20;
    g.dir = Math.atan2(game.level.player.y - g.y, game.level.player.x - g.x);
    g.detect = 55;
    g.state = 'suspicious';
    game.toast = 'One relic down — the guard is turning…';
    game.toastTimer = 99;
  } else if (shot === '3') {
    startGame();
    startLevel(1);
    game.level.relics[0].got = true;
    game.level.relics[1].got = true;
    game.level.relics[2].got = true;
    game.level.player.x = 20 * 40 + 20;
    game.level.player.y = 12 * 40 + 20;
    game.alarm = true;
    const g = game.level.guards[3];
    g.x = 17 * 40 + 20;
    g.y = 11 * 40 + 20;
    g.dir = Math.atan2(game.level.player.y - g.y, game.level.player.x - g.x);
    g.detect = 100;
    g.state = 'chase';
    game.level.guards[2].detect = 60;
    game.level.guards[2].state = 'suspicious';
    game.toast = 'SPOTTED! Run — break line of sight!';
    game.toastTimer = 99;
  }
  return true;
}

if (applyShot() && params.has('still')) {
  render();
} else {
  if (!game.level) startLevel(0);
  requestAnimationFrame(frame);
}
