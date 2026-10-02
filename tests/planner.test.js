import test from 'node:test';
import assert from 'node:assert/strict';
import { plansFor, choosePlan, lolalyticsLinks, laneTips } from '../public/planner.js';

test('draft suggestions follow champion and lane opponent', () => {
  const annieSafety = plansFor('Annie', 'MIDDLE').find((plan) => plan.key === 'safe');
  assert.equal(annieSafety.main[0], 8112);
  assert.ok(annieSafety.secondary.includes(8473));
  assert.equal(choosePlan('Annie', 'MIDDLE', { mid: 'Akali' }).key, 'safe');
  assert.equal(plansFor('Talon', 'MIDDLE')[0].main[0], 8112);
  assert.equal(plansFor('Nasus', 'TOP')[0].main[0], 8010);
  assert.equal(plansFor('Caitlyn', 'BOTTOM', ['Marksman'])[0].main[0], 8005);
  assert.equal(choosePlan('Talon', 'MIDDLE', { mid: 'Fizz' }).key, 'safe');
  assert.equal(choosePlan('Nasus', 'TOP', { top: 'Teemo' }).key, 'poke');
});

test('matchup links point to the selected champion and opponent', () => {
  const links = lolalyticsLinks('Talon', 'Fizz', 'MIDDLE');
  assert.equal(links.matchup, 'https://lolalytics.com/lol/talon/vs/fizz/build/?lane=middle&tier=emerald_plus');
  assert.equal(links.counters, 'https://lolalytics.com/lol/fizz/build/?lane=middle&tier=emerald_plus');
  assert.ok(laneTips({ stats: { range: 125 } }, { stats: { range: 550 }, tags: ['Mage'] }).length >= 2);
});
