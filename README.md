# Scrapjaw

A mobile-first 3D roguelike: drive a tank that eats the battlefield, bolt on guns, and flatten four fortresses per map.

**Play:** open `index.html` in a browser, or use the GitHub Pages link once it's enabled (see below). It works on phones (touch and drag to steer) and on desktop (WASD plus Space for Boost).

## How it's built

The whole game is a single file, `index.html`: HTML, CSS and JavaScript, with no build step.

- 3D rendering uses three.js r128, loaded from cdnjs.
- All models, sounds and music are generated in code, so there are no asset files.
- Progress (silver, unlocks, settings) is saved in the browser's localStorage.

## Install as an app

When the game is served over http(s), for example on GitHub Pages or with `npm run serve`, it can be installed. On Android/Chrome, use the **Install app** button on the title screen. On iPhone, tap Share, then **Add to Home Screen**. After the first visit it also works offline. Opening `index.html` directly as a file still works, but it can't be installed.

## Run locally

Opening `index.html` directly works. To test on a phone on the same Wi-Fi:

```bash
npm run serve   # then open http://<your-computer-ip>:8080 on the phone
```

## Tests

```bash
npm install
npm test                      # headless smoke test: plays full runs and checks the 3D scene logic
python3 tests/screenshots.py  # optional: real screenshots in headless Chromium (needs Playwright; on Windows use py -3)
python3 tests/pwa.py          # optional: install + offline check (needs Playwright and internet)
```

## Publish for testers (GitHub Pages)

1. Go to Settings → Pages.
2. Under Source, choose "Deploy from a branch", then select `main` and `/ (root)`.
3. Within about a minute the game is live at `https://<username>.github.io/<repo>/`.
