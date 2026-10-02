import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RiotClient, simplifyMatch, summarize } from './riot.js';
import { getLive } from './live.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicDir = join(root, 'public');
const dataDir = join(root, 'data');
const cacheFile = join(dataDir, 'matches.json');
const port = Number(process.env.PORT || 4173);
const riot = new RiotClient(process.env.RIOT_API_KEY);
const riotId = { name: process.env.RIOT_GAME_NAME || '8YKS', tag: process.env.RIOT_TAG_LINE || 'DEPTH' };

let cached = null;
let syncing = null;

async function readCache() {
  if (cached) return cached;
  try { cached = JSON.parse(await readFile(cacheFile, 'utf8')); }
  catch { cached = { account: null, ranks: [], matches: [], updatedAt: null }; }
  return cached;
}

async function sync() {
  if (syncing) return syncing;
  syncing = (async () => {
    const cache = await readCache();
    const account = await riot.account(riotId.name, riotId.tag);
    const ranks = await riot.ranks(account.puuid);
    const ids = await riot.matchIds(account.puuid, 20);
    const byId = new Map(cache.matches.map((m) => [m.id, m]));
    for (const id of ids) {
      if (byId.has(id)) continue;
      byId.set(id, simplifyMatch(await riot.match(id), account.puuid));
    }
    cached = {
      account: { gameName: account.gameName, tagLine: account.tagLine },
      ranks,
      matches: [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200),
      updatedAt: new Date().toISOString()
    };
    await mkdir(dataDir, { recursive: true });
    await writeFile(cacheFile, JSON.stringify(cached), 'utf8');
    return cached;
  })().finally(() => { syncing = null; });
  return syncing;
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    const origin = req.headers.origin;
    if (origin && origin !== `http://127.0.0.1:${port}`) return json(res, 403, { error: 'Origin rejected' });
    if (url.pathname === '/api/status') return json(res, 200, { keyConfigured: Boolean(riot.key), riotId, cacheUpdatedAt: (await readCache()).updatedAt });
    if (url.pathname === '/api/profile') {
      const cache = await readCache();
      return json(res, 200, { ...cache, summary: summarize(cache.matches) });
    }
    if (url.pathname === '/api/sync' && req.method === 'POST') {
      const cache = await sync();
      return json(res, 200, { ...cache, summary: summarize(cache.matches) });
    }
    if (url.pathname === '/api/live') return json(res, 200, await getLive());
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const name = url.pathname === '/' ? '/index.html' : url.pathname;
    const path = resolve(publicDir, `.${name}`);
    if (!path.startsWith(`${publicDir}${sep}`)) return json(res, 403, { error: 'Path rejected' });
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(body);
  } catch (error) {
    const code = error.code === 'ENOENT' ? 404 : 500;
    json(res, code, { error: error.message });
  }
}).listen(port, '127.0.0.1', () => console.log(`LoL Coach V1 : http://127.0.0.1:${port}`));
