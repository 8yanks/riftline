const test = require('node:test');
const assert = require('node:assert/strict');
const { itemSignals } = require('../desktop/recommend.cjs');

test('item popup recommends defensive AP into enemy crit, not Randuin for Annie', () => {
  const live = { online: true, active: { riotId: 'me', champion: 'Annie' }, players: [
    { riotId: 'me', champion: 'Annie', team: 'ORDER', items: [] },
    { riotId: 'enemy', champion: 'Jinx', team: 'CHAOS', items: [{ id: 3031 }, { id: 3046 }] }
  ] };
  const items = { 3031: { stats: { FlatCritChanceMod: .25 } }, 3046: { stats: { FlatCritChanceMod: .25 } }, 3157: { name: "Zhonya's Hourglass" } };
  assert.deepEqual(itemSignals(live, items, { Annie: { tags: ['Mage'] } }).map((signal) => signal.item), [3157]);
});

test('item popup stays silent without a known enemy team', () => {
  assert.deepEqual(itemSignals({ online: true, active: {}, players: [] }, {}, {}), []);
});
