import test from 'node:test';
import assert from 'node:assert/strict';
import { simplifyMatch, summarize } from '../src/riot.js';

test('match summary uses the selected PUUID and team kills', () => {
  const raw = {
    metadata: { matchId: 'EUW1_example' },
    info: {
      gameCreation: 1790000000000,
      gameDuration: 1800,
      gameVersion: '16.19.1',
      participants: [
        { puuid: 'mine', teamId: 100, championName: 'Annie', teamPosition: 'MIDDLE', win: true, kills: 4, deaths: 2, assists: 8, totalMinionsKilled: 180, neutralMinionsKilled: 0, totalDamageDealtToChampions: 20000, visionScore: 25, goldEarned: 13000, item0: 3157 },
        { puuid: 'ally', teamId: 100, kills: 8 }
      ]
    }
  };
  const match = simplifyMatch(raw, 'mine');
  assert.equal(match.kp, 100);
  assert.equal(match.cs, 180);
  assert.deepEqual(match.items, [3157]);
  assert.equal(summarize([match]).midGames, 1);
});
