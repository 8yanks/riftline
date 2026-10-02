const test = require('node:test');
const assert = require('node:assert/strict');
const { visionRows } = require('../desktop/vision.cjs');

test('manual SS becomes red after three seconds of game time and resets when visible', () => {
  const missing = new Map([['Akali', 723]]);
  assert.equal(visionRows(['Akali'], missing, 725.9)[0].alert, false);
  assert.equal(visionRows(['Akali'], missing, 726)[0].alert, true);
  assert.equal(visionRows(['Akali'], missing, 726)[0].at, 723);
  missing.delete('Akali');
  assert.equal(visionRows(['Akali'], missing, 727)[0].seconds, 0);
});
