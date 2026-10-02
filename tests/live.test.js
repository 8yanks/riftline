import test from 'node:test';
import assert from 'node:assert/strict';
import { getLive } from '../src/live.js';

test('live data works when optional endpoints are unavailable in a custom game', async () => {
  const read = async (path) => {
    if (path.endsWith('/gamestats')) return { gameMode: 'CLASSIC', mapName: 'Map11', gameTime: 95 };
    if (path.endsWith('/playerlist')) return [{ summonerName: 'Local player', championName: 'Annie', team: 'ORDER', items: [], scores: { kills: 0, deaths: 0, assists: 0 } }];
    throw new Error('Optional endpoint unavailable');
  };
  const live = await getLive(read);
  assert.equal(live.online, true);
  assert.equal(live.gameMode, 'CLASSIC');
  assert.equal(live.players[0].riotId, 'Local player');
  assert.deepEqual(live.events, []);
});

test('active champion is resolved from playerlist using the active Riot ID', async () => {
  const read = async (path) => {
    if (path.endsWith('/gamestats')) return { gameMode: 'CLASSIC', gameTime: 300 };
    if (path.endsWith('/activeplayer')) return { riotId: 'Me#EUW', currentGold: 700, level: 6 };
    if (path.endsWith('/playerlist')) return [
      { riotId: 'Me#EUW', championName: 'Annie', team: 'ORDER', items: [] },
      { riotId: 'Enemy#EUW', championName: 'Akali', team: 'CHAOS', items: [] }
    ];
    return { Events: [] };
  };
  const live = await getLive(read);
  assert.equal(live.active.champion, 'Annie');
  assert.equal(live.active.gold, 700);
});
