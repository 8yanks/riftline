import test from 'node:test';
import assert from 'node:assert/strict';
import { formatGameTime, visionState, normalizedPosition } from '../public/vision.js';

test('SS starts after three seconds of absence and resets on reappearance', () => {
  const player = { visible: false, lastSeenAt: 723 };
  assert.deepEqual(visionState(player, 725.9), { missingSeconds: 2, alert: false });
  assert.deepEqual(visionState(player, 726), { missingSeconds: 3, alert: true });
  player.visible = true;
  assert.deepEqual(visionState(player, 730), { missingSeconds: 0, alert: false });
});

test('map coordinate stays proportional across map sizes', () => {
  assert.deepEqual(normalizedPosition(75, 120, 150, 150), normalizedPosition(200, 320, 400, 400));
  assert.equal(formatGameTime(723), '12:03');
});
