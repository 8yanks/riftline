const { readFile } = require('node:fs/promises');
const https = require('node:https');
const path = require('node:path');

function parseLockfile(content) {
  const parts = String(content).trim().split(':');
  if (parts.length < 5) return null;
  const port = Number(parts[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !parts[3]) return null;
  return { port, password: parts[3], protocol: parts[4] };
}

function requestPhase({ port, password }) {
  return new Promise((resolve) => {
    const request = https.get(`https://127.0.0.1:${port}/lol-gameflow/v1/gameflow-phase`, {
      auth: `riot:${password}`, rejectUnauthorized: false, timeout: 1500
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) return resolve(null);
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

async function leaguePhase(installDir = process.env.LEAGUE_INSTALL_DIR || 'C:\\Riot Games\\League of Legends') {
  try {
    const lock = parseLockfile(await readFile(path.join(installDir, 'lockfile'), 'utf8'));
    return lock ? await requestPhase(lock) : null;
  } catch { return null; }
}

module.exports = { parseLockfile, leaguePhase };
