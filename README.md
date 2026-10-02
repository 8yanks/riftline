# Riftline · V1 prototype

Local League of Legends tracker for `8YKS#DEPTH`. It does not read game memory or inject into the client.

## Start on Windows

Requires Node.js 24 or later.

```powershell
git clone https://github.com/8yanks/riftline.git
cd riftline
Copy-Item .env.example .env
# Edit .env and replace the RIOT_API_KEY placeholder.
npm start
```

In Command Prompt (CMD), run:

```cmd
copy .env.example .env
notepad .env
npm start
```

In Notepad, replace the `RIOT_API_KEY` placeholder with your current key and save the file before running `npm start`. Node.js 24 loads `.env` automatically. The key stays in the local `.env` file, which Git ignores. Open `http://127.0.0.1:4173` and click **Refresh my matches**. To use another account, edit the two Riot ID lines in `.env`.

You can also set the variables for one PowerShell session instead of using `.env`:

```powershell
$env:RIOT_API_KEY = Read-Host 'Riot API key'
$env:RIOT_GAME_NAME = '8YKS'
$env:RIOT_TAG_LINE = 'DEPTH'
npm start
```

The match cache is stored in `data/matches.json`, which Git ignores. Each sync fetches up to 100 recent solo queue match IDs, reuses cached matches, and spaces out API calls. The first expanded sync can take roughly two minutes. The UI shows import progress. HTTP 429 responses use Riot's `Retry-After` header.

## Desktop overlay

Run `npm install` once, then `npm run desktop`. This starts a desktop window and a small transparent, click-through overlay. If the local server is already running on port 4173, the desktop app reuses it. Open **Live game → Preview overlay** to test without a match. During a match, the overlay appears automatically when the Live Client Data API responds. Use League's **Borderless** or **Windowed** display mode; an exclusive fullscreen game may cover ordinary desktop windows. Close the desktop window to stop the overlay.

The overlay displays the selected rune plan and item signals from observed enemy purchases. It works with custom games when their Live Client Data API is available. It cannot recommend runes during champion select automatically: choose your champion, role and enemy team in **Game plans** before entering the match. The app does not change League's rune page for you.

## Pages

- **Overview**: Riot rank and a role selector for top, jungle, mid, bot, and support. Each role shows its games, wins, win rate, KDA, CS/min, kill participation, damage/min, gold/min, vision/min, champions, and matches from the imported solo queue sample.
- **Live game**: Riot's local API (`127.0.0.1:2999`) for matchmade and custom games. It stays empty outside a match. Optional local endpoints can fail without hiding the game status. Item signals are exploratory heuristics.
- **Vision Lab**: interactive simulation of last seen game time, a timer that starts immediately on disappearance, a red SS after three seconds, and a resizable minimap.
- **Game plans**: choose any champion and role, then enter the enemy team. Three rune and item archetypes and lane tips respond to the draft. The matchup tab links to the selected duel and counter page on LoLalytics for current Emerald+ win rates, sample size and patch. LoLalytics does not provide a public data API for third-party apps, so Riftline does not import its statistics or claim its local suggestions are statistically validated.

## Current limits

Role averages are descriptive, especially for small samples. Custom games are supported by the live connection, but this has been validated with a simulated local API response rather than an active custom match on this machine. The local `gamestats` response does not identify the queue type, so the app shows the game mode and map without claiming that it can distinguish a custom lobby from a matchmade one. Custom matches are not included in the solo queue history. Vision Lab does not analyze game pixels yet: buttons simulate disappearances. Automatic minimap tracking is the next technical module. The Live Client Data API does not provide champion positions or visibility. Macro advice, inferred jungle paths, and bot-lane follow-up estimates are not active during matches yet. They should be tested on replays before any live deployment.

## Verify

```powershell
npm test
```

Tests cover Riot match statistics, the SS threshold, and proportional minimap coordinates.

## Sources

- [Riot Developer Portal](https://developer.riotgames.com/docs/portal)
- [LoL API and Live Client Data](https://developer.riotgames.com/docs/lol)
- [Vanguard and third-party game memory access](https://support.riotgames.com/en-us/riot/performance/game-memory-access-removed-for-third-party-apps)
