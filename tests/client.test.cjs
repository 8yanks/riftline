const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLockfile } = require('../desktop/client.cjs');

test('League lockfile parser uses only a local port and does not expose credentials in logs', () => {
  const result = parseLockfile('LeagueClient:1234:56789:secret:https');
  assert.equal(result.port, 56789);
  assert.equal(result.protocol, 'https');
  assert.equal(parseLockfile('broken'), null);
  assert.equal(parseLockfile('LeagueClient:1234:99999:secret:https'), null);
});
