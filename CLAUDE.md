# Scrapjaw – notes for Claude Code

Mobile-first 3D tank roguelike in ONE file: `index.html` (inline CSS and JS, inside one IIFE). Keep it a single self-contained file unless we explicitly decide to split it. The only other runtime files are `manifest.webmanifest` and `sw.js`, which the installable app (PWA) needs; browsers can't take them inline.

## Hard rules
- **No external assets.** All models are built from three.js primitives, and all audio is synthesized with WebAudio. The only external scripts are three.js **r128** from cdnjs (pinned) and Google Fonts (Black Ops One, Barlow Condensed).
- **Original work only.** The game is *inspired by* Wanderburg (Randwerk). Never copy its assets, names, UI art or text. Mechanics and style may be similar; content must be ours.
- **Mobile first, landscape.** Phones play in landscape: if one is held upright, a `#rotate` prompt covers the game and pauses it, and on Android, Play goes fullscreen and locks landscape. The phone layout lives in `@media (orientation:landscape) and (max-height:560px)`: steering thumb on the left (joystick anywhere), hull bars top-left, timer/boss bar top-right, ability slots and Boost bottom-right. Desktop keeps the original layout. Use safe-area insets, aim for 60fps on mid-range phones, and check screenshots at 844×390. Keep draw calls low: use InstancedMesh for anything numerous.
- **Progress lives in localStorage** under key `scrapjaw-v1` (`SAVE` object). Never break old saves: add fields with defaults in `loadSave()`.

## Code map (search for these section comments in index.html)
- Biomes: a map can have `fam` (Greenvale role → its own enemy/neutral type) and `bosses`. `famType()` swaps in the family at spawn time: `FAM_MIX` (80%) of hostiles, and all neutrals. Family types carry `base` (the role they replace), so eating rules, quest stats (`G.rs`) and the 2D fallback follow the base. Ironfield = the Foundry (`rivet`, `spark`, `crawler`, `boiler`, `stack`, `hauler`, plus `shed`/`orecart`/`bunker`) with bosses `ox`, `crane`, `anvil`, `duke` (and its `dukecar` gun cars). Shared hazards are `G.hazards` (burning pools), `G.clouds` (steam, slows) and `G.waves` (shockwave rings with gaps). Ashlands is next.
- `definitions`: `MODS` (player modules), `AB` (each module's special ability: name, cooldown, and `v(m,pow)` for its power value), `EN` (enemies, neutrals, bosses), `WAVES`, `MAPS` (difficulty multipliers and 3D palette `pal`), `CAPS` (captains), `MOD_COST`, `RAR` (card rarities).
- `quests` (right after `definitions`): `DAILY` and `MILESTONES` tables (`m` = metric from `runStats()`, `run:1` = best single run, otherwise runs add up). `ensureDaily()` picks 3 dailies from a hash of the local date. `checkQuests(live)` completes and pays quests, and shows a `#toast` during a run. `foldRun()` adds a finished run into `SAVE.daily`/`SAVE.ms`. `snapshotRun()` (when the app is hidden) and `recoverRun()` (on load) keep progress if the app is killed. Modules in `QUEST_MODS` (Turret Layer) unlock only through a milestone.
- `state`: `newGame()` builds `G` (the whole run state), and `newPlayer()` builds `G.p`. `G.rs` counts what was eaten and killed per type (`on` only during a real run). `G.qDone` lists the quests finished this run.
- `audio & haptics`: `sfx(name)`, `SFX` table, procedural music (`playStep`), and `buzz()` for vibration.
- `combat helpers` / `player modules` / `boss AI`: the gameplay simulation. `useAbility(slot)` fires a module's ability (the player taps its HUD slot, or presses keys 1-4). Each module carries `m.ab = {cd, t, pow}`.
- Pressure beyond chasing: `GARRISON_P` of huts/depots carry `e.garrison` (a red pennant) and burst open with soldiers within `GARRISON_R` (`openGarrison`); the Swarm (`G.swarm`, stage seconds `SWARM_AT` to `SWARM_AT+SWARM_LEN`) rushes weak, fast enemies before each boss. `TYPE_CAP` limits how many ranged/static enemies can be alive.
- Stage flow: a boss spawns `BOSS_AT` seconds into each stage, and boss fights have no timer. When the 4th boss dies, `clearMap()` records the win and unlocks right away, then the player picks Finish run or Overtime. In Overtime (`G.overtime`) the night tint, mortar strikes and dense waves are on, and silver is paid every `OT_PAY` seconds. Dying or quitting there still ends the run as a win. Everything is 2D (x,y); the renderer maps this to 3D (x, height, y).
- `upgrade cards`: `upgradePool()` returns cards with `s:k=>[[label, old, new]]` stat comparisons. `k` is the rarity multiplier.
- `garage`: meta-progression UI (maps, captains, workshop).
- `3D renderer (three.js)`:
  - `MODELS` are instanced enemy parts; `BOSS_MODELS` and `buildPlayer3D()` (which grows tiers by rank) build normal groups.
  - `setupWorld()` builds the ground, roads and trees; `render3D()` draws each frame; `drawOverlay3D()` handles 2D overlays such as HP bars, texts, arrows and the joystick.
  - The camera is orthographic at a 55° pitch (`PITCH`). Game angle `a` maps to three.js yaw `-a`.
- `install (PWA)`: registers `sw.js` (only over http/https), adds the favicon and iOS home-screen icon from the manifest's SVG, and shows the title screen's Install button or iPhone hint. The app icon is an SVG drawn in code inside `manifest.webmanifest`. `sw.js` makes pages network-first and the pinned three.js plus fonts cache-first. When you add a new runtime file, add it to `CORE` in `sw.js`.
- `render2D()` is the fallback if WebGL or three.js fails.
- `HUD`: `updateHUD()`.

## Testing
- `npm install && npm test` runs `tests/smoke.js`. It plays several full runs on all maps with stubbed DOM and WebGL, using real three.js math. It must finish without exceptions.
- `python3 tests/screenshots.py` (on Windows: `py -3 tests/screenshots.py`) takes real headless-Chromium screenshots into `shots/`. Look at them after any visual change.
- `py -3 tests/pwa.py` serves the game locally and checks, in headless Chromium, the manifest and icon, the service worker, Chrome's install criteria, and that the game boots and plays offline. Run it after touching `sw.js`, the manifest, or the `<head>`.
- Test hook: if `window.__SJ_TEST` exists, the game passes it an API (`G`, `mode`, `update`, `render`, `startRun`, `pick`, `SAVE`, `setSave`, `setDate`, `checkQuests`, `R3`, ...). Keep that hook working.

## Roadmap (next up first)
1. ~~Quests and end screen~~ (done).
2. ~~Installable PWA~~ (done).
3. Biomes: ~~Ironfield~~ (done). Ashlands is next: the Cinder Clans (Ash Walker, Cinder Bike, Scorpion Tank, Magma Roller, Obsidian Spire, Behemoth Crawler) and the bosses Cinder Wyrm, Ash Prophet, Twin Kilns and The Caldera (concepts approved 2026-10-14).
4. Artifacts from chests (damage-type families, behavior changers), a crew slot, module evolutions (level 10 unlocks a stronger relative), alternate chassis.
5. Online leaderboard (needs a backend), later.
