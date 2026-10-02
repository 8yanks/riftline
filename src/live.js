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

export async function getLive() {
  try {
    const [game, players, events, active] = await Promise.all([
      localGet('/liveclientdata/gamestats'),
      localGet('/liveclientdata/playerlist'),
      localGet('/liveclientdata/eventdata'),
      localGet('/liveclientdata/activeplayer')
    ]);
    return {
      online: true,
      gameTime: game.gameTime,
      gameMode: game.gameMode,
      active: { riotId: active.riotId, champion: active.championName, gold: active.currentGold, level: active.level },
      players: players.map((p) => ({
        riotId: p.riotId,
        champion: p.championName,
        team: p.team,
        role: p.position,
        level: p.level,
        isDead: p.isDead,
        items: p.items.map((i) => ({ id: i.itemID, name: i.displayName })),
        scores: p.scores
      })),
      events: events.Events?.slice(-20) ?? []
    };
  } catch {
    return { online: false, message: 'No active match detected. Vision simulation is still available.' };
  }
}
