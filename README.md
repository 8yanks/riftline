# Riftline · V1 prototype

Local League of Legends tracker for `8YKS#DEPTH`. It does not read game memory or inject into the client.

## Start on Windows

Requires Node.js 24 or later.

```powershell
cd C:\Users\yanis\lol-coach-v1
$env:RIOT_API_KEY = Read-Host 'Riot API key'
npm start
```

Open `http://127.0.0.1:4173` and click **Refresh my matches**. The key stays in the terminal environment and is not written to project files. To use another account:

```powershell
$env:RIOT_GAME_NAME = '8YKS'
$env:RIOT_TAG_LINE = 'DEPTH'
```

The match cache is stored in `data/matches.json`, which Git ignores. Each sync fetches up to 20 solo queue match IDs, reuses cached matches, and spaces out API calls. HTTP 429 responses use Riot's `Retry-After` header.

## Pages

- **Overview**: Riot rank, recent matches, champions, and basic metrics.
- **Live game**: Riot's local API (`127.0.0.1:2999`). It stays empty outside a match. Item signals are exploratory heuristics.
- **Vision Lab**: interactive simulation of last seen game time, a timer that starts immediately on disappearance, a red SS after three seconds, and a resizable minimap.
- **Game plans**: three Annie rune pages with illustrated items and a suggested priority based on the manually selected enemy composition. These choices still need validation against patch statistics.

## Current limits

Vision Lab does not analyze game pixels yet: buttons simulate disappearances. Automatic minimap tracking is the next technical module. The Live Client Data API does not provide champion positions or visibility. Macro advice, inferred jungle paths, and bot-lane follow-up estimates are not active during matches yet. They should be tested on replays before any live deployment.

## Verify

```powershell
npm test
```

Tests cover Riot match statistics, the SS threshold, and proportional minimap coordinates.

## Sources

- [Riot Developer Portal](https://developer.riotgames.com/docs/portal)
- [LoL API and Live Client Data](https://developer.riotgames.com/docs/lol)
- [Vanguard and third-party game memory access](https://support.riotgames.com/en-us/riot/performance/game-memory-access-removed-for-third-party-apps)
