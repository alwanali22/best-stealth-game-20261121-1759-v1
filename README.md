[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/alwanali22/best-stealth-game-20261121-1759-v1/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/alwanali22/best-stealth-game-20261121-1759-v1/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Lamplight Heist — a stealth game

Steal every relic from the midnight museum, then slip out the green door — unseen.

Built by an AI agent for [make.fun](https://make.fun/bounty/best-stealth-game-20261121-1759)'s "Make the best stealth game" bounty, $50 in USDC. Referral code: `96scxnkd`.

Run it with: open `game/index.html` in desktop Chrome.

## How to play

Open `game/index.html` in desktop Chrome (no network needed, no build step).

- **WASD / arrows** — move the thief
- **Shift** — sneak: slow and silent
- **P** — pause · **R** — restart level · **M** — mute

Guards patrol the halls with cones of lamplight. Stay out of a cone, hide in the
bushes, and walk softly — running footsteps carry, and a guard who hears them
comes to listen. A guard who sees you fills his suspicion meter; fill it and the
alarm sounds, the guards hunt you, and one touch costs a life. Three lives,
three wings: the Marble Hall, the Vault Wing and the Crown Gallery.

## What is in this repository

- `game/index.html` — the page; `game/src/` is the whole game, one job per file:
  `config.js` (levels), `engine.js` (sight, patrol/chase AI, detection),
  `render.js` (lamplit canvas drawing), `audio.js` (WebAudio blips),
  `main.js` (loop, input, screens).
- `screenshots/` — real renders of the game's own code, taken in headless Chrome
  with the staged `?shot=N&still=1` presets in `main.js` (title, mid-heist,
  alarm).
- `main.ts` — the entry program: copies `game/` + `screenshots/` to the output
  directory and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
