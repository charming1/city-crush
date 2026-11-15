# City Crush (web)

Same game as the Unity project, as plain HTML/CSS/JS. No install, no engine.

- `dist/city-crush.html` is the whole game in one file. Double-click it, or upload it to any static host
  (Netlify Drop, GitHub Pages, itch.io as an HTML5 game).
- `index.html` + `core.js` + `game.js` + `style.css` + `assets/` is the editable source.
  Run a local server in this folder (`python3 -m http.server`) and open http://localhost:8000.
- `test/core.test.js` tests the match engine: `node test/core.test.js`.
- `test/e2e.py` drives the whole game in a headless browser (needs Python Playwright):
  `python3 test/e2e.py http://localhost:8000/index.html shots/run`.
- `python3 build.py` rebuilds `dist/city-crush.html` after you change any source file or art.

## Swapping in your own art
Replace the PNGs in `assets/landmarks/<ID>/` (keep the file names) or `assets/ui/`, then rebuild the single file
(see `build.py`).

## Ads
`Ads` in `game.js` is a simulated interstitial gate and rewarded ad, so the whole flow is testable.
For real AdMob ads, wrap the game as an Android app with Capacitor and a Google AdMob plugin, then replace
`Ads.showCountryGate` and `Ads.showRewarded` with the plugin calls. Web pages cannot show AdMob directly.

## Progress
Saved as JSON in the browser's localStorage (key `landmarkMatch.progress.v1`): current country and level,
unlocked countries, levels cleared per country.

## Banner ads
`Ads.banner()` in `game.js` draws a simulated 320x50 banner, shown at the bottom of the level-complete and
out-of-moves popups. With real AdMob (Android app wrapper), replace it with a banner view placed over the popup.

## Screens and features
Home, a world-tour map with a route and progress rings, a level picker (12 levels per country, 3 stars each),
a goal card before every level, a pause menu, settings, and win / out-of-moves popups.
In play: Hammer, Shuffle and Hint boosters, an idle hint after 7 seconds, combo praise, floating scores with
the landmark's name, particles, confetti, sound effects, vibration and a first-run tutorial.
Swipe, tap-tap, or arrow keys + Space. Reduced-motion settings are respected.

Every 3 levels adds 2 moves (15, 17, 19, 21). Stars come from moves left:
3 stars at 35% or more, 2 stars at 15% or more, otherwise 1.

## Countries
All 193 UN member states are in. The first six (UK, France, Italy, Egypt, Japan, US) have their own landmark art. The rest show their flag and use six shared landmark-type tiles (assets/landmarks/_generic) until you add art: put 6 PNGs in assets/landmarks/<CODE>/ and set `generic: false`-style entries in game.js. Names live in countries.js.
