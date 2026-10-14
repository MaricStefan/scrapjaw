# Scrapjaw – notes for Claude Code

Mobile-first 3D tank roguelike in ONE file: `index.html` (inline CSS and JS, inside one IIFE). Keep it a single self-contained file unless we explicitly decide to split it.

## Hard rules
- **No external assets.** All models are built from three.js primitives, and all audio is synthesized with WebAudio. The only external scripts are three.js **r128** from cdnjs (pinned) and Google Fonts (Black Ops One, Barlow Condensed).
- **Original work only.** The game is *inspired by* Wanderburg (Randwerk). Never copy its assets, names, UI art or text. Mechanics and style may be similar; content must be ours.
- **Mobile first.** Touch joystick anywhere, Boost button bottom-right, safe-area insets, 60fps on mid-range phones. Keep draw calls low: use InstancedMesh for anything numerous.
- **Progress lives in localStorage** under key `scrapjaw-v1` (`SAVE` object). Never break old saves: add fields with defaults in `loadSave()`.

## Code map (search for these section comments in index.html)
- `definitions`: `MODS` (player modules), `EN` (enemies, neutrals, bosses), `WAVES`, `MAPS` (difficulty multipliers and 3D palette `pal`), `CAPS` (captains), `MOD_COST`, `RAR` (card rarities).
- `quests` (right after `definitions`): `DAILY` and `MILESTONES` tables (`m` = metric from `runStats()`, `run:1` = best single run, otherwise runs add up). `ensureDaily()` picks 3 dailies from a hash of the local date. `checkQuests(live)` completes and pays quests, and shows a `#toast` during a run. `foldRun()` adds a finished run into `SAVE.daily`/`SAVE.ms`. `snapshotRun()` (when the app is hidden) and `recoverRun()` (on load) keep progress if the app is killed. Modules in `QUEST_MODS` (Turret Layer) unlock only through a milestone.
- `state`: `newGame()` builds `G` (the whole run state), and `newPlayer()` builds `G.p`. `G.rs` counts what was eaten and killed per type (`on` only during a real run). `G.qDone` lists the quests finished this run.
- `audio & haptics`: `sfx(name)`, `SFX` table, procedural music (`playStep`), and `buzz()` for vibration.
- `combat helpers` / `player modules` / `boss AI`: the gameplay simulation. Everything is 2D (x,y); the renderer maps this to 3D (x, height, y).
- `upgrade cards`: `upgradePool()` returns cards with `s:k=>[[label, old, new]]` stat comparisons. `k` is the rarity multiplier.
- `garage`: meta-progression UI (maps, captains, workshop).
- `3D renderer (three.js)`:
  - `MODELS` are instanced enemy parts; `BOSS_MODELS` and `buildPlayer3D()` (which grows tiers by rank) build normal groups.
  - `setupWorld()` builds the ground, roads and trees; `render3D()` draws each frame; `drawOverlay3D()` handles 2D overlays such as HP bars, texts, arrows and the joystick.
  - The camera is orthographic at a 55° pitch (`PITCH`). Game angle `a` maps to three.js yaw `-a`.
- `render2D()` is the fallback if WebGL or three.js fails.
- `HUD`: `updateHUD()`.

## Testing
- `npm install && npm test` runs `tests/smoke.js`. It plays several full runs on all maps with stubbed DOM and WebGL, using real three.js math. It must finish without exceptions.
- `python3 tests/screenshots.py` (on Windows: `py -3 tests/screenshots.py`) takes real headless-Chromium screenshots into `shots/`. Look at them after any visual change.
- Test hook: if `window.__SJ_TEST` exists, the game passes it an API (`G`, `mode`, `update`, `render`, `startRun`, `pick`, `SAVE`, `setSave`, `setDate`, `checkQuests`, `R3`, ...). Keep that hook working.

## Roadmap (next up first)
1. ~~Quests and end screen~~ (done).
2. Installable PWA (manifest, icon, service worker for offline).
3. Biomes for Ironfield and Ashlands: their own enemy families and 4 bosses each.
4. Artifacts from chests (damage-type families, behavior changers), a crew slot, module evolutions (level 10 unlocks a stronger relative), alternate chassis.
5. Online leaderboard (needs a backend), later.
