# Chess Arena — Android installable web app

A mobile-first single-player chess PWA. It uses `chess.js` for legal move validation and a Stockfish 16 browser worker for computer moves.

## Run locally

The service worker requires HTTPS or localhost. From this folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080` on a desktop browser for testing. For an Android phone, deploy the folder to an HTTPS host (for example GitHub Pages, Netlify, or Cloudflare Pages), then open the deployed URL in Chrome.

## Install on Android

1. Open the HTTPS site in Chrome.
2. Open Chrome's three-dot menu.
3. Tap **Install app** or **Add to Home screen**.
4. Launch Chess Arena from the home screen.

## Features

- Responsive 8×8 board and touch controls.
- Legal moves, castling, en passant, promotion, check and checkmate via chess.js.
- Board flip: changes the board viewpoint, without rotating individual pieces.
- Stockfish UCI engine integration.
- Engine strength slider and three play-style presets.
- Bot reply selector when it is Black's turn, plus a button to let Stockfish choose.
- Undo, new game, move history.
- PWA manifest and service worker shell cache.

## Important limitations

- The app must be served over HTTPS (or localhost) for installation and service workers.
- `chess.js` and Stockfish are loaded from public CDNs, so the first load and engine require an internet connection.
- The "Quickest checkmate focus" mode asks Stockfish for a strong search; it does not guarantee the shortest possible mate in every position.
- The displayed Elo setting is an engine strength limit, not a certified rating or a promise of an unbeatable opponent. Stockfish strength is strongest at maximum settings.
- A chosen bot reply is only available when it is Black's turn and lists legal moves in the current position.
- This is a PWA project, not a signed APK. Android Chrome installs it as a home-screen app. A Play Store release would require a separate packaging and publishing step.

## Project files

- `index.html` — app layout
- `styles.css` — mobile design
- `app.js` — chess UI and Stockfish integration
- `manifest.webmanifest` — install metadata
- `sw.js` — service worker
- `icons/` — app icons
