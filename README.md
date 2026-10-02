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

Run `npm install` once, then `npm run desktop`. The desktop app starts its own local server on a free port, opens a separate rune selector, and creates a transparent, click-through overlay. This avoids reusing an outdated web server on port 4173. Open **Live game → Preview overlay**, **Preview item alert**, and **Preview SS timer** to test without a match. During a match, the overlay appears automatically when the Live Client Data API responds. Use League's **Borderless** or **Windowed** display mode; an exclusive fullscreen game may cover ordinary desktop windows. Close the desktop window to stop the app.

The rune popup asks for your champion, role, and lane opponent when the desktop app opens. It also reopens when the local League Client reports a new champion-select phase. This read-only client integration uses the League `lockfile` in `C:\Riot Games\League of Legends` by default; set `LEAGUE_INSTALL_DIR` if League is installed elsewhere. If the client API is unavailable, press **Ctrl+Shift+R** to reopen the popup. Choose one of three pages and click **Use selected page**. The app saves the choice in `data/draft.json` and displays it in the overlay. It does not change League's rune page for you; confirm the runes in the League client before loading in. Annie's safety page against Akali now keeps Electrocute and adds Bone Plating instead of suggesting Phase Rush.

Item notifications appear in a separate in-game popup when observed enemy purchases cross a threshold. The suggested item depends on your champion class: for example, Annie sees Zhonya's Hourglass against enemy crit, not Randuin's Omen. Each signal appears once per match, then resets for the next match. These are options for the next recall, not automatic purchases.

**SS is currently manual.** The official Live Client Data API does not expose champion visibility or minimap positions. During a game, press **Ctrl+Shift+1** through **Ctrl+Shift+5** to toggle each enemy (in the overlay's listed order) between missing and visible. The overlay shows a red SS after three seconds of manually marked absence and records the game time of that mark. Automatic minimap detection needs calibration against actual game screenshots and is not active yet.

## Pages

- **Overview**: Riot rank and a role selector for top, jungle, mid, bot, and support. Each role shows its games, wins, win rate, KDA, CS/min, kill participation, damage/min, gold/min, vision/min, champions, and matches from the imported solo queue sample.
- **Live game**: Riot's local API (`127.0.0.1:2999`) for matchmade and custom games. It stays empty outside a match. Optional local endpoints can fail without hiding the game status. Item signals are exploratory heuristics.
- **Vision Lab**: interactive simulation of last seen game time and a resizable minimap. This is separate from the desktop overlay's manual SS timer.
- **Game plans**: choose any champion and role, then enter the enemy team. Three rune and item archetypes and lane tips respond to the draft. The matchup tab links to the selected duel and counter page on LoLalytics for current Emerald+ win rates, sample size and patch. LoLalytics does not provide a public data API for third-party apps, so Riftline does not import its statistics or claim its local suggestions are statistically validated.

## Current limits

Role averages are descriptive, especially for small samples. Custom games are supported by the live connection, but this has been validated with a simulated local API response rather than an active custom match on this machine. The local `gamestats` response does not identify the queue type, so the app shows the game mode and map without claiming that it can distinguish a custom lobby from a matchmade one. Custom matches are not included in the solo queue history. Automatic minimap tracking, macro advice, inferred jungle paths, and bot-lane follow-up estimates are not active during matches yet. The desktop windows have launched locally, but visibility over an actual League match still needs a custom-game test on this machine.

## Verify

```powershell
npm test
```

Tests cover Riot match statistics, the SS threshold, and proportional minimap coordinates.

## Sources

- [Riot Developer Portal](https://developer.riotgames.com/docs/portal)
- [LoL API and Live Client Data](https://developer.riotgames.com/docs/lol)
- [Vanguard and third-party game memory access](https://support.riotgames.com/en-us/riot/performance/game-memory-access-removed-for-third-party-apps)
