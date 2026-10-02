import { setTimeout as delay } from 'node:timers/promises';

const REGION = 'https://europe.api.riotgames.com';
const PLATFORM = 'https://euw1.api.riotgames.com';

export class RiotClient {
  constructor(key) {
    this.key = key;
    this.lastCall = 0;
  }

  async get(host, path) {
    if (!this.key) throw new Error('Riot API key missing. Set RIOT_API_KEY before starting.');
    const gap = Date.now() - this.lastCall;
    if (gap < 650) await delay(650 - gap);
    this.lastCall = Date.now();
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${host}${path}`, {
        headers: { 'X-Riot-Token': this.key },
        signal: AbortSignal.timeout(12000)
      });
      if (response.status === 429) {
        const retrySeconds = Number(response.headers.get('Retry-After') || 2);
        await delay(Math.min(120000, retrySeconds * 1000));
        continue;
      }
      if (!response.ok) {
        const label = response.status === 403 ? 'Riot API key expired or rejected' : `Riot HTTP ${response.status}`;
        throw new Error(label);
      }
      return response.json();
    }
    throw new Error('Riot rate limit reached. Try again later.');
  }

  account(name, tag) {
    return this.get(REGION, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  }

  ranks(puuid) {
    return this.get(PLATFORM, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`);
  }

  matchIds(puuid, count = 20) {
    return this.get(REGION, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?queue=420&start=0&count=${Math.min(50, Math.max(1, count))}`);
  }

  match(id) {
    return this.get(REGION, `/lol/match/v5/matches/${encodeURIComponent(id)}`);
  }
}

export function simplifyMatch(match, puuid) {
  const player = match.info.participants.find((p) => p.puuid === puuid);
  if (!player) throw new Error('Player not found in match');
  const teammates = match.info.participants.filter((p) => p.teamId === player.teamId);
  const teamKills = teammates.reduce((sum, p) => sum + p.kills, 0);
  return {
    id: match.metadata.matchId,
    date: new Date(match.info.gameCreation).toISOString(),
    patch: match.info.gameVersion,
    champion: player.championName,
    role: player.teamPosition,
    win: player.win,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    cs: player.totalMinionsKilled + player.neutralMinionsKilled,
    minutes: Math.round(match.info.gameDuration / 6) / 10,
    damage: player.totalDamageDealtToChampions,
    vision: player.visionScore,
    gold: player.goldEarned,
    kp: teamKills ? Math.round((player.kills + player.assists) / teamKills * 100) : 0,
    items: [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5].filter(Boolean)
  };
}

export function summarize(matches) {
  const total = matches.length;
  const wins = matches.filter((m) => m.win).length;
  const mid = matches.filter((m) => m.role === 'MIDDLE');
  const champions = Object.values(matches.reduce((acc, match) => {
    const row = acc[match.champion] ??= { champion: match.champion, games: 0, wins: 0, deaths: 0, csPerMin: 0 };
    row.games++;
    row.wins += Number(match.win);
    row.deaths += match.deaths;
    row.csPerMin += match.minutes ? match.cs / match.minutes : 0;
    return acc;
  }, {})).map((row) => ({
    champion: row.champion,
    games: row.games,
    winRate: Math.round(row.wins / row.games * 100),
    deaths: Math.round(row.deaths / row.games * 10) / 10,
    csPerMin: Math.round(row.csPerMin / row.games * 10) / 10
  })).sort((a, b) => b.games - a.games);
  return { total, wins, winRate: total ? Math.round(wins / total * 100) : 0, midGames: mid.length, champions };
}
