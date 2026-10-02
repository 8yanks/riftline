const { app, BrowserWindow, ipcMain, screen, shell, globalShortcut } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const { itemSignals } = require('./recommend.cjs');
const { visionRows } = require('./vision.cjs');
const { leaguePhase } = require('./client.cjs');

const root = path.join(__dirname, '..');
let base;
let server;
let dashboard;
let overlay;
let draft;
let toast;
let preview = false;
let itemData = {};
let championData = {};
let seenSignals = new Set();
let lastGameTime = 0;
let toastTimer;
let latestLive = null;
let livePolledAt = 0;
let enemies = [];
const missing = new Map();
let ssPreviewStartedAt = 0;
let lastLeaguePhase = null;

async function serverReady() {
  try { return (await fetch(`${base}/api/status`)).ok; } catch { return false; }
}

async function ensureServer() {
  const port = await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const free = probe.address().port;
      probe.close(() => resolve(free));
    });
  });
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['--env-file-if-exists=.env', 'src/server.js'], {
    cwd: root, windowsHide: true, stdio: 'ignore', env: { ...process.env, PORT: String(port), ELECTRON_RUN_AS_NODE: '1' }
  });
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await serverReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Local Riftline server did not start');
}

function createWindows() {
  dashboard = new BrowserWindow({
    width: 1300, height: 850, minWidth: 900, minHeight: 650,
    backgroundColor: '#f6f8fc', title: 'Riftline',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  dashboard.loadURL(base);
  dashboard.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://lolalytics.com/')) shell.openExternal(url);
    return { action: 'deny' };
  });
  const { workArea } = screen.getPrimaryDisplay();
  overlay = new BrowserWindow({
    width: 344, height: 390, x: workArea.x + workArea.width - 360, y: workArea.y + 24,
    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, focusable: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.loadURL(`${base}/overlay.html`);
  dashboard.webContents.on('did-finish-load', () => console.log('Riftline desktop ready'));
  overlay.on('closed', () => { overlay = null; });
  dashboard.on('closed', () => { dashboard = null; app.quit(); });
  createDraft();
  createToast();
  setInterval(async () => {
    if (!overlay || overlay.isDestroyed()) return;
    let live = { online: false };
    try { live = await (await fetch(`${base}/api/live`)).json(); } catch {}
    const online = Boolean(live.online);
    latestLive = online ? live : null;
    livePolledAt = Date.now();
    if (online || preview) overlay.showInactive();
    else overlay.hide();
    dashboard?.webContents.send('riftline-overlay-state', { visible: overlay.isVisible(), online, preview });
    if (!online) { seenSignals.clear(); missing.clear(); enemies = []; lastGameTime = 0; return; }
    const own = live.players?.find((player) => player.riotId && player.riotId === live.active?.riotId)
      || live.players?.find((player) => player.champion === live.active?.champion);
    enemies = own ? live.players.filter((player) => player.team !== own.team).slice(0, 5).map((player) => player.champion) : [];
    if (live.gameTime < lastGameTime - 30) { seenSignals.clear(); missing.clear(); }
    lastGameTime = live.gameTime || 0;
    for (const signal of itemSignals(live, itemData, championData)) {
      if (seenSignals.has(signal.key)) continue;
      seenSignals.add(signal.key);
      showItemToast(signal);
      break;
    }
  }, 4000);
  setInterval(publishVision, 1000);
  setInterval(async () => {
    const phase = await leaguePhase();
    if (phase === 'ChampSelect' && lastLeaguePhase !== 'ChampSelect') createDraft();
    lastLeaguePhase = phase;
  }, 3000);
}

function estimatedGameTime() {
  return (latestLive?.gameTime || 0) + (Date.now() - livePolledAt) / 1000;
}

function publishVision() {
  if (!overlay || overlay.isDestroyed()) return;
  if (!latestLive && Date.now() - ssPreviewStartedAt < 9000) {
    const seconds = Math.max(0, Math.floor((Date.now() - ssPreviewStartedAt) / 1000));
    overlay.webContents.send('riftline-vision-state', [{ champion: 'Akali', index: 1, missing: true, seconds, alert: seconds >= 3, at: 723 }]);
    return;
  }
  const now = estimatedGameTime();
  overlay.webContents.send('riftline-vision-state', visionRows(enemies, missing, now));
}

function toggleMissing(index) {
  if (!latestLive?.online || !enemies[index]) return;
  const champion = enemies[index];
  if (missing.has(champion)) missing.delete(champion);
  else missing.set(champion, estimatedGameTime());
  publishVision();
}

function createDraft() {
  if (draft && !draft.isDestroyed()) { draft.focus(); return; }
  draft = new BrowserWindow({
    width: 520, height: 700, minWidth: 460, minHeight: 590, title: 'Riftline · Choose runes',
    backgroundColor: '#f5f8fc', alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  draft.loadURL(`${base}/draft.html`);
  draft.webContents.once('did-finish-load', () => console.log('Riftline rune popup ready'));
  draft.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://lolalytics.com/')) shell.openExternal(url);
    return { action: 'deny' };
  });
  draft.on('closed', () => { draft = null; });
}

function createToast() {
  const { workArea } = screen.getPrimaryDisplay();
  toast = new BrowserWindow({
    width: 360, height: 132, x: workArea.x + workArea.width - 368, y: workArea.y + 294,
    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, focusable: false, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  toast.setIgnoreMouseEvents(true, { forward: true });
  toast.setAlwaysOnTop(true, 'screen-saver');
  toast.on('closed', () => { toast = null; });
}

function showItemToast(signal) {
  if (!toast || toast.isDestroyed()) return;
  const query = new URLSearchParams({ item: String(signal.item), title: signal.title, detail: signal.detail });
  toast.loadURL(`${base}/item-toast.html?${query}`).then(() => toast?.showInactive()).catch(console.error);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast?.hide(), 12000);
}

async function loadStaticData() {
  try {
    const [version] = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
    const [items, champions] = await Promise.all([
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`).then((response) => response.json()),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`).then((response) => response.json())
    ]);
    itemData = items.data || {};
    championData = champions.data || {};
  } catch (error) { console.warn('Item alerts await Data Dragon:', error.message); }
}

ipcMain.handle('riftline-preview', (_event, enabled) => { preview = Boolean(enabled); if (preview) overlay?.showInactive(); else overlay?.hide(); return preview; });
ipcMain.handle('riftline-open-draft', () => { createDraft(); return true; });
ipcMain.handle('riftline-confirm-draft', () => { draft?.close(); return true; });
ipcMain.handle('riftline-preview-item', () => showItemToast({ item: 3157, title: 'Preview item alert', detail: 'This is a test notification. Live alerts react to observed enemy items.' }));
ipcMain.handle('riftline-preview-ss', () => { ssPreviewStartedAt = Date.now(); preview = true; overlay?.showInactive(); publishVision(); return true; });
app.whenReady().then(async () => {
  await ensureServer(); createWindows(); loadStaticData();
  globalShortcut.register('Control+Shift+R', createDraft);
  for (let index = 0; index < 5; index++) globalShortcut.register(`Control+Shift+${index + 1}`, () => toggleMissing(index));
}).catch((error) => {
  console.error(error);
  app.quit();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { globalShortcut.unregisterAll(); clearTimeout(toastTimer); if (server && !server.killed) server.kill(); });
