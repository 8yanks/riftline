import https from 'node:https';

const BASE = 'https://127.0.0.1:2999';

function localGet(path) {
  return new Promise((resolve, reject) => {
    // Riot documents a self-signed local certificate. This exception is limited to 127.0.0.1.
    const req = https.get(`${BASE}${path}`, { rejectUnauthorized: false, timeout: 2500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid local API response')); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Local API timed out')));
    req.on('error', reject);
  });
}

export async function getLive(read = localGet) {
  try {
    const game = await read('/liveclientdata/gamestats');
    const [playersResult, eventsResult, activeResult] = await Promise.allSettled([
      read('/liveclientdata/playerlist'),
      read('/liveclientdata/eventdata'),
      read('/liveclientdata/activeplayer')
    ]);
    const players = playersResult.status === 'fulfilled' && Array.isArray(playersResult.value) ? playersResult.value : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : {};
    const active = activeResult.status === 'fulfilled' ? activeResult.value : {};
    return {
      online: true,
      gameTime: game.gameTime,
      gameMode: game.gameMode,
      mapName: game.mapName,
      active: { riotId: active.riotId || active.summonerName || '', champion: active.championName || '', gold: active.currentGold, level: active.level },
      players: players.map((p) => ({
        riotId: p.riotId || p.summonerName || '',
        champion: p.championName,
        team: p.team,
        role: p.position,
        level: p.level,
        isDead: p.isDead,
        items: (p.items || []).map((i) => ({ id: i.itemID, name: i.displayName })),
        scores: p.scores || { kills: 0, deaths: 0, assists: 0 }
      })),
      events: events.Events?.slice(-20) ?? []
    };
  } catch {
    return { online: false, message: 'No active match detected. Vision simulation is still available.' };
  }
}
