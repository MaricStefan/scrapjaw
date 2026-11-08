# Releasing Scrapjaw on Google Play

Scrapjaw goes on Play as a **Trusted Web Activity (TWA)**: a thin Android app, built with Google's Bubblewrap tool, that opens the hosted game full-screen. Game updates go live by pushing to GitHub; a new store build is only needed to change the app shell (name, icon, version).

- Package ID: `com.koderium.scrapjaw` (permanent, can never change once published)
- Developer: Koderium
- Game URL: `https://maricstefan.github.io/scrapjaw/`

## What's in this folder

| File | Use |
|---|---|
| `listing.md` | Store texts: name, short and full description, contact, release notes |
| `forms.md` | Answers for Data safety, Content rating, Ads, Target audience and the other App content forms |
| `graphics/` | 512 px icon, 1024×500 feature graphic, seven 1920×1080 screenshots |
| `make_graphics.py` | Regenerates the icons and graphics from the real game (`py -3 store/make_graphics.py`) |
| `twa-manifest.json` | Bubblewrap settings for the Android app |
| `assetlinks.json` | Template for the file that links the website and the app |
| `../privacy.html` | Privacy policy page, served at `/scrapjaw/privacy.html` |

## Release checklist

### 1. Put the game online (GitHub Pages)
1. On GitHub, open the `scrapjaw` repo → Settings → Pages.
2. Source: **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
3. After a minute, check that https://maricstefan.github.io/scrapjaw/ plays and that https://maricstefan.github.io/scrapjaw/privacy.html opens.

Note: GitHub Pages only serves public repos on a free account. If the repo is private, either make it public or move the hosted copy to a separate public repo.

### 2. Create the Play developer account
1. Sign up at https://play.google.com/console as an **Organization** (Koderium) or **Personal**. There's a one-time $25 fee.
   - An organization account needs a D-U-N-S number for Koderium (free, but it can take a couple of weeks).
   - A personal account works too. New personal accounts must run a **closed test with at least 12 testers for 14 days in a row** before they can publish to everyone, so start recruiting testers early.
2. Verify your identity when asked.

### 3. Build the Android app with Bubblewrap (once)
Needs Node.js. Bubblewrap downloads its own Java and Android tools on first run.
```
npm i -g @bubblewrap/cli
mkdir scrapjaw-android && cd scrapjaw-android
bubblewrap init --manifest https://maricstefan.github.io/scrapjaw/manifest.webmanifest
```
When it asks, use the values from `twa-manifest.json` here: package `com.koderium.scrapjaw`, name Scrapjaw, landscape, fullscreen, colour `#1e1922`. Let it create a new signing key (`android.keystore`, alias `scrapjaw`).

**Back up `android.keystore` and its passwords somewhere safe, outside this repo.** Never commit them. If you use Play App Signing (the default), losing this upload key is recoverable through Google support, but it's slow.

Then build:
```
bubblewrap build
```
This makes `app-release-bundle.aab` (for Play) and `app-release-signed.apk` (to try on your own phone).

### 4. Link the website and the app (Digital Asset Links)
Without this, the app shows a browser address bar at the top.
1. Upload the `.aab` once (step 5) so Play creates its app signing key.
2. In Play Console → your app → Setup → **App signing**, copy the **SHA-256 certificate fingerprint** for both the *App signing key* and the *Upload key*.
3. Put both into `assetlinks.json` (replacing the two placeholders).
4. Host it at exactly **`https://maricstefan.github.io/.well-known/assetlinks.json`**. Android only looks at the root of the domain, not inside `/scrapjaw/`, so it can't live in this repo. Two ways:
   - **Easiest:** create a public repo named **`maricstefan.github.io`**, add `.well-known/assetlinks.json` plus an empty `.nojekyll` file, and turn on Pages for it. That repo serves the root of your github.io address.
   - **Or** use a custom domain for the game (for example `scrapjaw.koderium.com`). Then the file goes in this repo at `.well-known/assetlinks.json`, and `host` in `twa-manifest.json` changes to that domain before you build.
5. Check it with Google's tester: https://developers.google.com/digital-asset-links/tools/generator

### 5. Set up the app in Play Console
1. Create app: name **Scrapjaw**, Game, Free, then accept the declarations.
2. Fill **App content** with the answers in `forms.md`.
3. Fill **Main store listing** with `listing.md` and upload the files in `graphics/`.
4. **Testing → Closed testing**: create a track, upload the `.aab`, add your testers' emails, and roll it out. (Personal accounts: keep it running 12+ testers for 14 days.)
5. When the test period is done, **Production → Create release**, upload the same or a newer `.aab`, add release notes, and send it for review. Reviews usually take a few days.

### Later updates
- **Game changes:** push to `main`, and players get them on their next launch. No store release needed.
- **App shell changes** (icon, name, Android version): raise `appVersionCode` and `appVersionName` in `twa-manifest.json`, run `bubblewrap update` and `bubblewrap build`, and upload the new `.aab`.
- **If the game ever adds ads, accounts, online scores or purchases:** update `forms.md`, the Data safety form and `privacy.html` before that release.
