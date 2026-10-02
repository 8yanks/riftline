const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const base = 'http://127.0.0.1:4173';
let server;
let dashboard;
let overlay;
let preview = false;

async function serverReady() {
  try { return (await fetch(`${base}/api/status`)).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverReady()) return;
  server = spawn(process.execPath, ['--env-file-if-exists=.env', 'src/server.js'], {
    cwd: root, windowsHide: true, stdio: 'ignore', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
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
    width: 344, height: 260, x: workArea.x + workArea.width - 360, y: workArea.y + 24,
    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, focusable: false, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.loadURL(`${base}/overlay.html`);
  dashboard.webContents.on('did-finish-load', () => console.log('Riftline desktop ready'));
  overlay.on('closed', () => { overlay = null; });
  dashboard.on('closed', () => { dashboard = null; });
  setInterval(async () => {
    if (!overlay || overlay.isDestroyed()) return;
    let online = false;
    try { online = Boolean((await (await fetch(`${base}/api/live`)).json()).online); } catch {}
    if (online || preview) overlay.showInactive();
    else overlay.hide();
    dashboard?.webContents.send('riftline-overlay-state', { visible: overlay.isVisible(), online, preview });
  }, 4000);
}

ipcMain.handle('riftline-preview', (_event, enabled) => { preview = Boolean(enabled); if (preview) overlay?.showInactive(); else overlay?.hide(); return preview; });
app.whenReady().then(async () => { await ensureServer(); createWindows(); }).catch((error) => {
  console.error(error);
  app.quit();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (server && !server.killed) server.kill(); });
