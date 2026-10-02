import { formatGameTime, visionState, normalizedPosition } from './vision.js';
import { plansFor, choosePlan, planConfidence, laneTips, lolalyticsLinks } from './planner.js';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let ddragonVersion = '16.19.1';
let itemData = {};
let championData = {};
let runeData = {};

async function getJson(path) {
  const response = await fetch(path);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function championIcon(champion) {
  const file = champion === 'MonkeyKing' ? 'MonkeyKing' : champion;
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${encodeURIComponent(file)}.png`;
}

function itemIcon(id) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${id}.png`;
}

async function loadStaticData() {
  try {
    const versions = await getJson('https://ddragon.leagueoflegends.com/api/versions.json');
    ddragonVersion = versions[0];
    const [items, champions, runeTrees] = await Promise.all([
      getJson(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/item.json`),
      getJson(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`),
      getJson(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/runesReforged.json`)
    ]);
    itemData = items.data || {};
    championData = champions.data || {};
    runeData = Object.fromEntries(runeTrees.flatMap((tree) => tree.slots.flatMap((slot) => slot.runes.map((rune) => [rune.id, { name: rune.name, icon: rune.icon }]))));
  } catch { /* Offline mode keeps the dashboard usable. */ }
  renderPlans();
}

let plans = plansFor('Annie', 'MIDDLE');
let viewedPlan = 'burst';
let activeDeskTab = 'builds';
let manualPlan = false;

function renderPlans() {
  $('#patch-label').textContent = `DATA DRAGON ${ddragonVersion}`;
  const names = Object.values(championData).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  if (!names.length) {
    $('#plan-reason').textContent = 'Champion and rune data are unavailable. Reconnect and reload to choose a page.';
    return;
  }
  const self = $('#self-champion');
  const saved = JSON.parse(localStorage.getItem('riftline-plan') || '{}');
  manualPlan = Boolean(saved.manualPlan);
  if (saved.viewedPlan) viewedPlan = saved.viewedPlan;
  self.innerHTML = names.map((champion) => `<option value="${escapeHtml(champion.id)}">${escapeHtml(champion.name)}</option>`).join('');
  self.value = saved.champion && championData[saved.champion] ? saved.champion : 'Annie';
  $('#self-role').value = saved.role || 'MIDDLE';
  document.querySelectorAll('.enemy-select').forEach((select) => {
    const previous = saved.composition?.[select.dataset.role] || select.value;
    select.innerHTML = '<option value="">Select</option>' + names.map((champion) => `<option value="${escapeHtml(champion.id)}">${escapeHtml(champion.name)}</option>`).join('');
    select.value = previous;
  });
  updatePlan();
}

function updatePlan() {
  const champion = $('#self-champion').value || 'Annie';
  const role = $('#self-role').value;
  plans = plansFor(champion, role, championData[champion]?.tags || []);
  const composition = Object.fromEntries([...document.querySelectorAll('.enemy-select')].map((select) => [select.dataset.role, select.value]));
  const heuristic = choosePlan(champion, role, composition);
  const selected = planConfidence(champion) === 'curated' ? heuristic : { key: null, reason: `Rune pages for ${championData[champion]?.name || champion} are experimental. Pick a page manually and verify it with current champion-specific data.` };
  $('#plan-reason').textContent = selected.reason;
  if (!manualPlan || !plans.some((p) => p.key === viewedPlan)) viewedPlan = selected.key || plans[0].key;
  $('#plan-title').textContent = `Draft desk · ${championData[champion]?.name || champion}`;
  $('#self-icon').src = championIcon(champion);
  $('#self-icon').alt = champion;
  $('#self-name').textContent = championData[champion]?.name || champion;
  $('#self-role-label').textContent = `YOUR PICK · ${role === 'MIDDLE' ? 'MID' : role === 'BOTTOM' ? 'BOT' : role === 'UTILITY' ? 'SUPPORT' : role}`;
  const roles = [['top', 'TOP'], ['jungle', 'JUNGLE'], ['mid', 'MID'], ['adc', 'BOT'], ['support', 'SUPPORT']];
  $('#draft-enemies').innerHTML = roles.map(([key, label]) => `<div class="draft-slot ${composition[key] ? 'filled' : ''}">${composition[key] ? `<img src="${championIcon(composition[key])}" alt="">` : '<span>?</span>'}<small>${label}</small></div>`).join('');
  renderPlanCards(selected);
  const lane = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support' }[role];
  const mid = composition[lane];
  const jungle = composition.jungle;
  const tips = laneTips(championData[champion], championData[mid]);
  const links = lolalyticsLinks(championData[champion]?.name || champion, championData[mid]?.name || mid, role);
  $('#matchup-brief').innerHTML = `<div class="brief-opponent">${mid ? `<img src="${championIcon(mid)}" alt="">` : '<span>?</span>'}<div><small>${role === 'JUNGLE' ? 'ENEMY JUNGLER' : 'LANE OPPONENT'}</small><strong>${escapeHtml(championData[mid]?.name || 'Choose opponent')}</strong></div></div><div class="brief-row"><span>LANE APPROACH</span><strong>${heuristic.key === 'safe' ? 'Respect engage range' : heuristic.key === 'poke' ? 'Trade around cooldowns' : heuristic.key === 'burst' ? 'Look for a short pressure window' : 'Waiting for matchup'}</strong></div><div class="brief-row"><span>JUNGLE CONTEXT</span><strong>${jungle ? `Track ${escapeHtml(championData[jungle]?.name || jungle)} before pushing` : 'Select enemy jungle for context'}</strong></div><div class="lane-tips"><strong>HOW TO PLAY THE LANE</strong>${tips.map((tip) => `<p>${escapeHtml(tip)}</p>`).join('')}</div><div class="source-links"><a href="${links.counters}" target="_blank" rel="noopener noreferrer">Counter picks on LoLalytics ↗</a>${links.matchup ? `<a href="${links.matchup}" target="_blank" rel="noopener noreferrer">This matchup: Emerald+ stats ↗</a>` : ''}</div><p class="brief-note">Lane tips are local heuristics. Open LoLalytics for current counter picks, win rate, sample size, and patch; its data is not imported into Riftline.</p>`;
  const draft = { champion, role, composition, viewedPlan, manualPlan };
  localStorage.setItem('riftline-plan', JSON.stringify(draft));
  fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }).catch(() => {});
}

function runeIcon(id) {
  const rune = runeData[id];
  return rune?.icon ? `<img src="https://ddragon.leagueoflegends.com/cdn/img/${escapeHtml(rune.icon)}" alt="${escapeHtml(rune.name)}" title="${escapeHtml(rune.name)}">` : `<span title="Rune ${id}">?</span>`;
}

function renderPlanCards(selected) {
  $('#plan-grid').innerHTML = plans.map((plan) => {
    const recommended = plan.key === selected.key;
    const itemIcons = plan.items.map((id) => `<img src="${itemIcon(id)}" alt="${escapeHtml(itemData[id]?.name || `Item ${id}`)}" title="${escapeHtml(itemData[id]?.name || `Item ${id}`)}">`).join('');
    return `<button class="plan-row ${recommended ? 'recommended' : ''} ${viewedPlan === plan.key ? 'selected' : ''}" data-plan="${plan.key}" aria-pressed="${viewedPlan === plan.key}"><span class="plan-index">${plan.number.slice(0, 2)}</span><span class="plan-row-copy"><strong>${plan.title}</strong><small>${recommended ? 'SUGGESTED FOR THIS DRAFT' : plan.number.slice(5)}</small></span><span class="plan-icons">${plan.main.slice(0, 2).map(runeIcon).join('')}${itemIcons}</span><span class="plan-arrow">›</span></button>`;
  }).join('');
  const plan = plans.find((row) => row.key === viewedPlan) || plans[0];
  const runeNames = (ids) => ids.map((id) => `<span class="detail-rune">${runeIcon(id)}${escapeHtml(runeData[id]?.name || `Rune ${id}`)}</span>`).join('');
  const itemNames = plan.items.map((id) => `<span class="detail-item"><img src="${itemIcon(id)}" alt="">${escapeHtml(itemData[id]?.name || `Item ${id}`)}</span>`).join('');
  $('#plan-detail').innerHTML = `<div class="detail-heading"><span>${plan.number}</span><h3>${plan.title}</h3></div><p>${plan.description}</p><div class="detail-columns"><div><small>PRIMARY RUNES</small>${runeNames(plan.main)}</div><div><small>SECONDARY RUNES</small>${runeNames(plan.secondary)}</div><div><small>CORE ITEMS</small>${itemNames}</div></div><div class="detail-goal"><small>GAME PLAN</small><strong>${plan.objective}</strong></div>`;
}

document.querySelectorAll('.enemy-select').forEach((select) => select.addEventListener('change', () => { manualPlan = false; updatePlan(); }));
$('#self-champion').addEventListener('change', () => { manualPlan = false; updatePlan(); });
$('#self-role').addEventListener('change', () => { manualPlan = false; updatePlan(); });
$('#plan-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-plan]');
  if (!button) return;
  viewedPlan = button.dataset.plan;
  manualPlan = true;
  const composition = Object.fromEntries([...document.querySelectorAll('.enemy-select')].map((select) => [select.dataset.role, select.value]));
  renderPlanCards(choosePlan($('#self-champion').value, $('#self-role').value, composition));
  const draft = { champion: $('#self-champion').value, role: $('#self-role').value, composition, viewedPlan, manualPlan };
  localStorage.setItem('riftline-plan', JSON.stringify(draft));
  fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }).catch(() => {});
});
document.querySelectorAll('[data-desk-tab]').forEach((button) => button.addEventListener('click', () => {
  activeDeskTab = button.dataset.deskTab;
  document.querySelectorAll('[data-desk-tab]').forEach((tab) => tab.classList.toggle('active', tab.dataset.deskTab === activeDeskTab));
  document.querySelectorAll('.desk-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `desk-${activeDeskTab}`));
}));

let currentProfile = null;
const roleNames = { ALL: 'All roles', TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' };

function renderRole(profile) {
  const role = $('#role-select').value;
  const matches = role === 'ALL' ? profile.matches : profile.matches.filter((match) => match.role === role);
  const stats = role === 'ALL' ? { games: profile.summary.total, wins: profile.summary.wins, winRate: profile.summary.winRate, champions: profile.summary.champions } : profile.summary.byRole?.[role];
  const games = stats?.games ?? 0;
  const roleMetrics = role === 'ALL' ? null : stats;
  const average = (value) => games ? Math.round(matches.reduce((sum, match) => sum + value(match), 0) / games * 10) / 10 : 0;
  const allMetrics = { kills: average((m) => m.kills), deaths: average((m) => m.deaths), assists: average((m) => m.assists), csPerMin: average((m) => m.minutes ? m.cs / m.minutes : 0), kp: average((m) => m.kp), damagePerMin: average((m) => m.minutes ? m.damage / m.minutes : 0), goldPerMin: average((m) => m.minutes ? m.gold / m.minutes : 0), visionPerMin: average((m) => m.minutes ? m.vision / m.minutes : 0) };
  const metrics = roleMetrics || allMetrics;
  const metric = (label, value) => `<div class="role-metric"><small>${label}</small><strong>${value}</strong></div>`;
  $('#role-summary').classList.toggle('empty', !games);
  $('#role-summary').innerHTML = games ? [
    metric('GAMES', games), metric('WINS', stats.wins), metric('WIN RATE', `${stats.winRate} %`),
    metric('K / D / A', `${metrics.kills} / ${metrics.deaths} / ${metrics.assists}`),
    metric('CS / MIN', metrics.csPerMin), metric('KILL PARTICIPATION', `${metrics.kp} %`),
    metric('DAMAGE / MIN', metrics.damagePerMin), metric('GOLD / MIN', metrics.goldPerMin), metric('VISION / MIN', metrics.visionPerMin)
  ].join('') : 'No imported games for this role yet.';
  $('#role-note').textContent = games < 10 && role !== 'ALL' ? `Only ${games} ${roleNames[role].toLowerCase()} game${games === 1 ? '' : 's'} imported. Treat these averages as observations, not a reliable trend.` : 'Stats reflect the imported solo queue sample. Averages are per game.';
  const won = matches.filter((match) => match.win);
  const lost = matches.filter((match) => !match.win);
  if (won.length >= 3 && lost.length >= 3) {
    const mean = (group, value) => Math.round(group.reduce((sum, match) => sum + value(match), 0) / group.length * 10) / 10;
    const comparisons = [
      ['Deaths / game', (m) => m.deaths],
      ['CS / min', (m) => m.minutes ? m.cs / m.minutes : 0],
      ['Kill participation', (m) => m.kp]
    ];
    $('#role-insights').innerHTML = `<strong>WIN / LOSS PATTERNS</strong><p>Compare these games in replay before treating a difference as a cause.</p><div>${comparisons.map(([label, value]) => { const suffix = label === 'Kill participation' ? '%' : ''; return `<span>${label}<b>${mean(won, value)}${suffix} wins · ${mean(lost, value)}${suffix} losses</b></span>`; }).join('')}</div>`;
  } else $('#role-insights').innerHTML = '';
  $('#champions-title').textContent = role === 'ALL' ? 'What you actually play' : `${roleNames[role]} champions`;
  $('#matches-title').textContent = role === 'ALL' ? 'Recent matches' : `Recent ${roleNames[role].toLowerCase()} matches`;
  const championRows = stats?.champions || [];
  $('#champions').classList.toggle('empty', !championRows.length);
  $('#champions').innerHTML = championRows.length ? championRows.slice(0, 8).map((row) => `
    <div class="champion-row"><img class="champion-icon" src="${championIcon(row.champion)}" alt=""><div class="champion-main"><strong>${escapeHtml(row.champion)}</strong><small>${row.games} game${row.games > 1 ? 's' : ''} · ${row.csPerMin} CS/min · ${row.deaths} deaths</small></div><div class="row-value"><strong class="${row.winRate >= 50 ? 'win' : 'loss'}">${row.winRate} %</strong><small>win rate</small></div></div>`).join('') : 'No champions in this role yet.';
  $('#matches').classList.toggle('empty', !matches.length);
  $('#matches').innerHTML = matches.length ? matches.slice(0, 8).map((match) => `
    <div class="match-row"><img class="champion-icon" src="${championIcon(match.champion)}" alt=""><div class="match-main"><strong>${escapeHtml(match.champion)} <span class="${match.win ? 'win' : 'loss'}">${match.win ? '· Win' : '· Loss'}</span></strong><small>${escapeHtml(match.role)} · ${new Date(match.date).toLocaleDateString('en-GB')} · ${match.minutes} min</small></div><div class="row-value"><strong>${match.kills}/${match.deaths}/${match.assists}</strong><small>${match.cs} CS · ${match.kp}% KP</small></div></div>`).join('') : 'No matches in this role yet.';
}

function renderProfile(profile) {
  currentProfile = profile;
  const summary = profile.summary;
  $('#total-games').textContent = summary.total || '—';
  $('#win-rate').textContent = summary.total ? `${summary.winRate} %` : '—';
  $('#roles-played').textContent = summary.total ? Object.values(summary.byRole || {}).filter((row) => row.games).length : '—';
  const solo = profile.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  $('#rank').textContent = solo ? `${solo.tier} ${solo.rank}` : '—';
  $('#lp').textContent = solo ? `${solo.leaguePoints} LP · ${solo.wins} W / ${solo.losses} L this season` : 'Sync to refresh';
  $('#updated-at').textContent = profile.updatedAt ? `Updated ${new Date(profile.updatedAt).toLocaleString('en-GB')}` : 'Waiting for first sync';
  renderRole(profile);
}

$('#role-select').addEventListener('change', () => { if (currentProfile) renderRole(currentProfile); });

async function refreshProfile() {
  try { renderProfile(await getJson('/api/profile')); }
  catch (error) { $('#sync-note').textContent = error.message; }
}

async function syncProfile() {
  const button = $('#sync-button');
  button.disabled = true;
  $('#sync-note').textContent = 'Importing matches within Riot rate limits…';
  const progressTimer = setInterval(async () => {
    try {
      const status = await getJson('/api/sync-status');
      if (status.progress?.total) $('#sync-note').textContent = `${status.progress.phase}: ${status.progress.done} / ${status.progress.total}. Keep this page open.`;
    } catch { /* Keep the existing message. */ }
  }, 2000);
  try {
    const response = await fetch('/api/sync', { method: 'POST' });
    const profile = await response.json();
    if (!response.ok) throw new Error(profile.error || `HTTP ${response.status}`);
    renderProfile(profile);
    $('#sync-note').textContent = `${profile.matches.length} matches cached. Your key is never saved to disk.`;
  } catch (error) { $('#sync-note').textContent = error.message; }
  finally { clearInterval(progressTimer); button.disabled = false; }
}

function buildSignals(live) {
  const own = live.players.find((p) => p.riotId && p.riotId === live.active.riotId) || live.players.find((p) => p.champion === live.active.champion);
  if (!own) return [{ title: 'Team not identified', detail: 'Player data is available, but the local API did not identify your team. Enemy item signals are paused.' }];
  const enemies = live.players.filter((p) => p.team !== own.team);
  const crit = enemies.reduce((sum, player) => sum + player.items.reduce((n, item) => n + Number(itemData[item.id]?.stats?.FlatCritChanceMod || 0), 0), 0);
  const magicResist = enemies.reduce((sum, player) => sum + player.items.reduce((n, item) => n + Number(itemData[item.id]?.stats?.FlatSpellBlockMod || 0), 0), 0);
  const results = [];
  if (crit >= 0.4) results.push({ title: 'Enemy crit is rising', detail: 'Several enemy purchases add crit. Consider a defensive option on your next recall. Randuin works best on champions that can invest in armor; on Annie, compare defensive AP options first.' });
  if (magicResist >= 100) results.push({ title: 'Enemy magic resistance', detail: 'Compare magic penetration with a raw ability power purchase.' });
  if (!results.length) results.push({ title: 'No strong item signal yet', detail: 'Observed enemy items do not trigger a priority suggestion. This readout is only a guide.' });
  return results;
}

async function refreshLive() {
  try {
    const live = await getJson('/api/live');
    $('#live-state').textContent = live.online ? 'GAME LIVE' : 'OFFLINE';
    $('#live-heading').textContent = live.online ? `${live.active.champion || 'In game'}${live.active.level ? ` · Level ${live.active.level}` : ''}` : 'No active game';
    $('#live-description').textContent = live.online ? `${live.gameMode || 'Game'} · ${live.mapName || 'Map'} · Local API refreshes every 5 seconds. Custom games use the same connection.` : live.message;
    $('#live-time').textContent = live.online ? formatGameTime(live.gameTime) : '--:--';
    $('#players').classList.toggle('empty', !live.online || !live.players.length);
    $('#build-signals').classList.toggle('empty', !live.online);
    $('#players').innerHTML = live.online && live.players.length ? live.players.map((player) => `
      <div class="player-row"><img class="champion-icon" src="${championIcon(player.champion)}" alt=""><div class="champion-main"><strong>${escapeHtml(player.champion)} · ${escapeHtml(player.role || 'Role unknown')}</strong><small>${escapeHtml(player.team)} · level ${player.level} · ${player.scores.kills}/${player.scores.deaths}/${player.scores.assists}</small><div class="item-list">${player.items.filter((i) => i.id).map((i) => { const name = itemData[i.id]?.name || `Item ${i.id}`; return `<img class="item-icon" src="${itemIcon(i.id)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}">`; }).join('')}</div></div></div>`).join('') : live.online ? 'Player list is not available yet.' : 'Waiting for a match.';
    $('#build-signals').innerHTML = live.online ? buildSignals(live).map((signal) => `<div class="signal"><strong>${escapeHtml(signal.title)}</strong><p>${escapeHtml(signal.detail)}</p></div>`).join('') : 'Signals will use observed enemy items.';
  } catch { $('#live-state').textContent = 'API UNAVAILABLE'; }
}

const champions = [
  { name: 'Talon', role: 'MID', x: .52, y: .47, visible: true, lastSeenAt: 723 },
  { name: 'LeeSin', role: 'JUNGLE', x: .68, y: .37, visible: true, lastSeenAt: 723 },
  { name: 'Renekton', role: 'TOP', x: .38, y: .15, visible: true, lastSeenAt: 723 },
  { name: 'Jinx', role: 'BOT', x: .78, y: .77, visible: true, lastSeenAt: 723 },
  { name: 'Nautilus', role: 'SUPPORT', x: .74, y: .72, visible: true, lastSeenAt: 723 }
];
let selected = 0;
let simBase = 723;
let simStarted = Date.now();
const simNow = () => simBase + (Date.now() - simStarted) / 1000;

function renderVision() {
  const now = simNow();
  $('#sim-time').textContent = formatGameTime(now);
  $('#vision-list').innerHTML = champions.map((champion, index) => {
    const state = visionState(champion, now);
    return `<div class="vision-row ${state.alert ? 'alert' : ''} ${selected === index ? 'selected' : ''}" data-index="${index}"><div class="vision-portrait"><img src="${championIcon(champion.name)}" alt=""><span class="ss">SS</span></div><div class="vision-info"><strong>${champion.name} · ${champion.role}</strong><small>${champion.visible ? 'Visible · timer reset' : `Last seen ${formatGameTime(champion.lastSeenAt)}`}</small></div><span class="vision-timer">${champion.visible ? '0 s' : `${state.missingSeconds} s`}</span><button class="vision-action" data-toggle="${index}">${champion.visible ? 'Disappears' : 'Reappears'}</button></div>`;
  }).join('');
  const marker = $('#map-marker');
  marker.style.setProperty('--marker-x', `${champions[selected].x * 100}%`);
  marker.style.setProperty('--marker-y', `${champions[selected].y * 100}%`);
  marker.style.background = champions[selected].visible ? '#d45c59' : '#9a6875';
}

$('#vision-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-toggle]');
  const row = event.target.closest('[data-index]');
  if (!row) return;
  const index = Number(row.dataset.index);
  selected = index;
  if (button) {
    const champion = champions[index];
    champion.visible = !champion.visible;
    if (!champion.visible) champion.lastSeenAt = simNow();
    else champion.lastSeenAt = simNow();
  }
  renderVision();
});

$('#minimap').addEventListener('click', (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const point = normalizedPosition(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
  champions[selected].x = point.x;
  champions[selected].y = point.y;
  renderVision();
});

$('#map-scale').addEventListener('input', (event) => {
  const scale = Number(event.target.value);
  $('#scale-value').textContent = `${scale} %`;
  $('#minimap').style.setProperty('--map-size', `${scale * 5}px`);
});

document.querySelectorAll('.nav').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.nav').forEach((item) => item.classList.toggle('active', item === button));
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === button.dataset.page));
  $('#page-title').textContent = button.textContent.trim();
  if (button.dataset.page === 'live') refreshLive();
}));

$('#sync-button').addEventListener('click', syncProfile);
if (window.riftlineDesktop) {
  $('#overlay-preview').hidden = false;
  $('#item-preview').hidden = false;
  $('#ss-preview').hidden = false;
  $('#open-rune-popup').hidden = false;
  let preview = false;
  $('#overlay-preview').addEventListener('click', async () => {
    preview = await window.riftlineDesktop.preview(!preview);
    $('#overlay-preview').textContent = preview ? 'Hide preview' : 'Preview overlay';
  });
  window.riftlineDesktop.onOverlayState((state) => {
    $('#desktop-status').textContent = state.online ? 'Overlay active over the game.' : state.preview ? 'Preview active.' : 'Waiting for a match. The overlay appears automatically.';
  });
  $('#item-preview').addEventListener('click', () => window.riftlineDesktop.previewItem());
  $('#ss-preview').addEventListener('click', () => window.riftlineDesktop.previewSS());
  $('#open-rune-popup').addEventListener('click', () => window.riftlineDesktop.openDraft());
}
window.addEventListener('storage', (event) => { if (event.key === 'riftline-plan') renderPlans(); });

async function init() {
  try {
    const draft = await getJson('/api/draft');
    if (draft.champion) localStorage.setItem('riftline-plan', JSON.stringify(draft));
  } catch {}
  await loadStaticData();
  try {
    const status = await getJson('/api/status');
    $('#server-status').textContent = status.keyConfigured ? 'Riot API ready' : 'Riot key needed';
    $('#sync-note').textContent = status.keyConfigured ? 'Ready to sync from Riot.' : 'Set RIOT_API_KEY in the terminal, then restart the server.';
  } catch { $('#server-status').textContent = 'Server unavailable'; }
  await refreshProfile();
  renderVision();
  refreshLive();
  setInterval(renderVision, 250);
  setInterval(() => { if ($('#live').classList.contains('active')) refreshLive(); }, 5000);
}
init();
