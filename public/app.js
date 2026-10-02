import { formatGameTime, visionState, normalizedPosition } from './vision.js';

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
    runeData = Object.fromEntries(runeTrees.flatMap((tree) => tree.slots.flatMap((slot) => slot.runes.map((rune) => [rune.id, rune.name]))));
  } catch { /* Offline mode keeps the dashboard usable. */ }
  renderPlans();
}

const plans = [
  { key: 'burst', number: '01 · BURST', title: 'Punish a mistake', description: 'Short trades and kill pressure after level 6. Best when you can get in range without taking too much poke.', main: [8112, 8126, 8137, 8106], secondary: [8226, 8210], objective: 'Create a roam window', items: [4645, 3089] },
  { key: 'safe', number: '02 · SAFETY', title: 'Stay in control', description: 'Defensive mobility and a steady lane against assassins or teams that can engage on you.', main: [8230, 8226, 8210, 8236], secondary: [8473, 8451], objective: 'Reach your item spikes without giving up kills', items: [3157, 3089] },
  { key: 'poke', number: '03 · POKE', title: 'Wear them down', description: 'Consistent pressure against a less mobile target. Set up the wave before moving around the map.', main: [8229, 8226, 8210, 8237], secondary: [8126, 8106], objective: 'Force a recall and gain priority', items: [6655, 3137] }
];

const dangerousMids = new Set(['Fizz', 'Zed', 'Talon', 'Katarina', 'Akali', 'Qiyana', 'Yasuo', 'Yone', 'Irelia', 'Leblanc', 'Syndra', 'Xerath', 'Velkoz', 'Hwei', 'Ziggs', 'Lux', 'Azir']);
const pokeMids = new Set(['Veigar', 'Malzahar', 'TwistedFate', 'Anivia', 'Viktor', 'Orianna']);

function choosePlan(composition) {
  const mid = composition.mid;
  const jungle = composition.jungle;
  if (!mid) return { key: null, reason: 'Select at least the enemy mid to see an explained priority.' };
  if (dangerousMids.has(mid) || ['Rengar', 'Khazix', 'Nocturne', 'Evelynn'].includes(jungle)) return { key: 'safe', reason: `${mid} or the selected jungler can punish an overextended Annie. Start with the safety page, then adjust defensive items to the damage actually present.` };
  if (pokeMids.has(mid)) return { key: 'poke', reason: `${mid} may offer repeated trade windows. The poke page can create a health advantage before a roam; compare it with burst based on your actual access to the lane.` };
  return { key: 'burst', reason: `Against ${mid}, burst is the starting point. Keep the safety page in mind if the matchup or ganks make it hard to get in range.` };
}

function renderPlans() {
  $('#patch-label').textContent = `DATA DRAGON ${ddragonVersion}`;
  const names = Object.values(championData).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  document.querySelectorAll('.enemy-select').forEach((select) => {
    const previous = select.value;
    select.innerHTML = '<option value="">Select</option>' + names.map((champion) => `<option value="${escapeHtml(champion.id)}">${escapeHtml(champion.name)}</option>`).join('');
    select.value = previous;
  });
  updatePlan();
}

function updatePlan() {
  const composition = Object.fromEntries([...document.querySelectorAll('.enemy-select')].map((select) => [select.dataset.role, select.value]));
  const selected = choosePlan(composition);
  $('#plan-reason').textContent = selected.reason;
  $('#plan-grid').innerHTML = plans.map((plan) => {
    const recommended = plan.key === selected.key;
    const itemHtml = plan.items.map((id) => itemData[id] ? `<span class="plan-item"><img src="${itemIcon(id)}" alt="">${escapeHtml(itemData[id].name)}</span>` : '').join('');
    const runeNames = (ids) => ids.map((id) => escapeHtml(runeData[id] || `Rune ${id}`)).join(' · ');
    return `<article class="plan-card ${recommended ? 'recommended' : ''}"><span class="plan-num">${plan.number}${recommended ? ' · SUGGESTED' : ''}</span><h3>${plan.title}</h3><p>${plan.description}</p><div class="plan-runes"><div><b>PRIMARY</b> ${runeNames(plan.main)}</div><div><b>SECONDARY</b> ${runeNames(plan.secondary)}</div></div><div class="plan-items">${itemHtml || '<span class="subtle">Items available after patch data loads.</span>'}</div><div class="plan-bottom"><span>GOAL</span><strong>${plan.objective}</strong></div></article>`;
  }).join('');
}

document.querySelectorAll('.enemy-select').forEach((select) => select.addEventListener('change', updatePlan));

function renderProfile(profile) {
  const summary = profile.summary;
  $('#total-games').textContent = summary.total || '—';
  $('#win-rate').textContent = summary.total ? `${summary.winRate} %` : '—';
  $('#mid-games').textContent = summary.total ? summary.midGames : '—';
  const solo = profile.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  $('#rank').textContent = solo ? `${solo.tier} ${solo.rank}` : '—';
  $('#lp').textContent = solo ? `${solo.leaguePoints} LP · ${solo.wins} W / ${solo.losses} L this season` : 'Sync to refresh';
  $('#updated-at').textContent = profile.updatedAt ? `Updated ${new Date(profile.updatedAt).toLocaleString('en-GB')}` : 'Waiting for first sync';
  $('#champions').classList.toggle('empty', !summary.champions.length);
  $('#champions').innerHTML = summary.champions.length ? summary.champions.slice(0, 8).map((row) => `
    <div class="champion-row"><img class="champion-icon" src="${championIcon(row.champion)}" alt=""><div class="champion-main"><strong>${escapeHtml(row.champion)}</strong><small>${row.games} game${row.games > 1 ? 's' : ''} · ${row.csPerMin} CS/min · ${row.deaths} deaths</small></div><div class="row-value"><strong class="${row.winRate >= 50 ? 'win' : 'loss'}">${row.winRate} %</strong><small>win rate</small></div></div>`).join('') : 'Sync to view your champions.';
  $('#matches').classList.toggle('empty', !profile.matches.length);
  $('#matches').innerHTML = profile.matches.length ? profile.matches.slice(0, 8).map((match) => `
    <div class="match-row"><img class="champion-icon" src="${championIcon(match.champion)}" alt=""><div class="match-main"><strong>${escapeHtml(match.champion)} <span class="${match.win ? 'win' : 'loss'}">${match.win ? '· Win' : '· Loss'}</span></strong><small>${escapeHtml(match.role)} · ${new Date(match.date).toLocaleDateString('en-GB')} · ${match.minutes} min</small></div><div class="row-value"><strong>${match.kills}/${match.deaths}/${match.assists}</strong><small>${match.cs} CS · ${match.kp}% KP</small></div></div>`).join('') : 'No matches cached yet.';
}

async function refreshProfile() {
  try { renderProfile(await getJson('/api/profile')); }
  catch (error) { $('#sync-note').textContent = error.message; }
}

async function syncProfile() {
  const button = $('#sync-button');
  button.disabled = true;
  $('#sync-note').textContent = 'Importing matches within Riot rate limits…';
  try {
    const profile = await getJson('/api/sync');
    renderProfile(profile);
    $('#sync-note').textContent = `${profile.matches.length} matches cached. Your key is never saved to disk.`;
  } catch (error) { $('#sync-note').textContent = error.message; }
  finally { button.disabled = false; }
}

function buildSignals(live) {
  const own = live.players.find((p) => p.riotId === live.active.riotId);
  const enemies = live.players.filter((p) => p.team !== own?.team);
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
    $('#live-heading').textContent = live.online ? `${live.active.champion || 'Champion'} · Level ${live.active.level}` : 'No active game';
    $('#live-description').textContent = live.online ? 'Local game client data. Refreshes every 5 seconds.' : live.message;
    $('#live-time').textContent = live.online ? formatGameTime(live.gameTime) : '--:--';
    $('#players').classList.toggle('empty', !live.online);
    $('#build-signals').classList.toggle('empty', !live.online);
    $('#players').innerHTML = live.online ? live.players.map((player) => `
      <div class="player-row"><img class="champion-icon" src="${championIcon(player.champion)}" alt=""><div class="champion-main"><strong>${escapeHtml(player.champion)} · ${escapeHtml(player.role)}</strong><small>${escapeHtml(player.team)} · level ${player.level} · ${player.scores.kills}/${player.scores.deaths}/${player.scores.assists}</small><div class="item-list">${player.items.filter((i) => i.id).map((i) => { const name = itemData[i.id]?.name || `Item ${i.id}`; return `<img class="item-icon" src="${itemIcon(i.id)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}">`; }).join('')}</div></div></div>`).join('') : 'Waiting for a match.';
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

async function init() {
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
