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
    if (gap < 1300) await delay(1300 - gap);
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

  matchIds(puuid, count = 50, start = 0, queue = 420) {
    return this.get(REGION, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?queue=${queue}&start=${start}&count=${Math.min(100, Math.max(1, count))}`);
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
    queueId: match.info.queueId,
    gameType: match.info.gameType,
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
  const byRole = Object.fromEntries(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].map((role) => {
    const roleMatches = matches.filter((m) => m.role === role);
    const games = roleMatches.length;
    const average = (value) => games ? Math.round(roleMatches.reduce((sum, match) => sum + value(match), 0) / games * 10) / 10 : 0;
    const roleChampions = Object.values(roleMatches.reduce((acc, match) => {
    const row = acc[match.champion] ??= { champion: match.champion, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0, kp: 0, damagePerMin: 0 };
    row.games++;
    row.wins += Number(match.win);
    row.kills += match.kills;
    row.deaths += match.deaths;
    row.assists += match.assists;
    row.csPerMin += match.minutes ? match.cs / match.minutes : 0;
    row.kp += match.kp;
    row.damagePerMin += match.minutes ? match.damage / match.minutes : 0;
    return acc;
    }, {})).map((row) => ({
    champion: row.champion,
    games: row.games,
    winRate: Math.round(row.wins / row.games * 100),
    kills: Math.round(row.kills / row.games * 10) / 10,
    deaths: Math.round(row.deaths / row.games * 10) / 10,
    assists: Math.round(row.assists / row.games * 10) / 10,
    csPerMin: Math.round(row.csPerMin / row.games * 10) / 10,
    kp: Math.round(row.kp / row.games),
    damagePerMin: Math.round(row.damagePerMin / row.games)
    })).sort((a, b) => b.games - a.games);
    return [role, {
      games,
      wins: roleMatches.filter((m) => m.win).length,
      winRate: games ? Math.round(roleMatches.filter((m) => m.win).length / games * 100) : 0,
      kills: average((m) => m.kills), deaths: average((m) => m.deaths), assists: average((m) => m.assists),
      csPerMin: average((m) => m.minutes ? m.cs / m.minutes : 0),
      kp: average((m) => m.kp), damagePerMin: average((m) => m.minutes ? m.damage / m.minutes : 0),
      goldPerMin: average((m) => m.minutes ? m.gold / m.minutes : 0),
      visionPerMin: average((m) => m.minutes ? m.vision / m.minutes : 0),
      champions: roleChampions
    }];
  }));
  return { total, wins, winRate: total ? Math.round(wins / total * 100) : 0, midGames: mid.length, champions, byRole };
}
