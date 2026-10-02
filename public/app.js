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
      getJson(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/fr_FR/item.json`),
      getJson(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/fr_FR/champion.json`),
      getJson(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/fr_FR/runesReforged.json`)
    ]);
    itemData = items.data || {};
    championData = champions.data || {};
    runeData = Object.fromEntries(runeTrees.flatMap((tree) => tree.slots.flatMap((slot) => slot.runes.map((rune) => [rune.id, rune.name]))));
  } catch { /* Offline mode keeps the dashboard usable. */ }
  renderPlans();
}

const plans = [
  { key: 'burst', number: '01 · BURST', title: 'Punir une erreur', description: 'Échanges courts et menace de kill après le niveau 6. La meilleure option si la lane te laisse entrer à portée sans subir trop de poke.', main: [8112, 8126, 8137, 8106], secondary: [8226, 8210], objective: 'Créer une fenêtre de roam', items: [4645, 3089] },
  { key: 'safe', number: '02 · SURVIE', title: 'Garder le contrôle', description: 'Mobilité défensive et lane stable face à un assassin ou à une composition capable de t’engager.', main: [8230, 8226, 8210, 8236], secondary: [8473, 8451], objective: 'Atteindre tes achats sans donner de kills', items: [3157, 3089] },
  { key: 'poke', number: '03 · POKE', title: 'User la lane', description: 'Pression régulière contre une cible peu mobile. Préparer la vague avant de bouger sur la carte.', main: [8229, 8226, 8210, 8237], secondary: [8126, 8106], objective: 'Forcer un recall et prendre la priorité', items: [6655, 3137] }
];

const dangerousMids = new Set(['Fizz', 'Zed', 'Talon', 'Katarina', 'Akali', 'Qiyana', 'Yasuo', 'Yone', 'Irelia', 'Leblanc', 'Syndra', 'Xerath', 'Velkoz', 'Hwei', 'Ziggs', 'Lux', 'Azir']);
const pokeMids = new Set(['Veigar', 'Malzahar', 'TwistedFate', 'Anivia', 'Viktor', 'Orianna']);

function choosePlan(composition) {
  const mid = composition.mid;
  const jungle = composition.jungle;
  if (!mid) return { key: null, reason: 'Choisis au moins le mid adverse pour recevoir une priorité expliquée.' };
  if (dangerousMids.has(mid) || ['Rengar', 'Khazix', 'Nocturne', 'Evelynn'].includes(jungle)) return { key: 'safe', reason: `${mid} ou le jungler choisi peut fortement punir une Annie avancée. La page survie mérite la priorité ; vérifie aussi les objets défensifs selon les dégâts réellement présents.` };
  if (pokeMids.has(mid)) return { key: 'poke', reason: `${mid} donne souvent des fenêtres d’échanges répétées. La page poke peut créer une pression de PV avant un roam ; compare-la à la page burst selon ta portée réelle en lane.` };
  return { key: 'burst', reason: `Contre ${mid}, la page burst est le point de départ. Garde la page survie si le matchup ou les ganks rendent l’accès à portée difficile.` };
}

function renderPlans() {
  $('#patch-label').textContent = `DATA DRAGON ${ddragonVersion}`;
  const names = Object.values(championData).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  document.querySelectorAll('.enemy-select').forEach((select) => {
    const previous = select.value;
    select.innerHTML = '<option value="">Choisir</option>' + names.map((champion) => `<option value="${escapeHtml(champion.id)}">${escapeHtml(champion.name)}</option>`).join('');
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
    return `<article class="plan-card ${recommended ? 'recommended' : ''}"><span class="plan-num">${plan.number}${recommended ? ' · PRIORITÉ' : ''}</span><h3>${plan.title}</h3><p>${plan.description}</p><div class="plan-runes"><div><b>PRINCIPAL</b> ${runeNames(plan.main)}</div><div><b>SECONDAIRE</b> ${runeNames(plan.secondary)}</div></div><div class="plan-items">${itemHtml || '<span class="subtle">Objets disponibles après chargement du patch.</span>'}</div><div class="plan-bottom"><span>OBJECTIF</span><strong>${plan.objective}</strong></div></article>`;
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
  $('#lp').textContent = solo ? `${solo.leaguePoints} LP · ${solo.wins} V / ${solo.losses} D cette saison` : 'Synchronise pour actualiser';
  $('#updated-at').textContent = profile.updatedAt ? `Mis à jour ${new Date(profile.updatedAt).toLocaleString('fr-FR')}` : 'En attente de synchronisation';
  $('#champions').classList.toggle('empty', !summary.champions.length);
  $('#champions').innerHTML = summary.champions.length ? summary.champions.slice(0, 8).map((row) => `
    <div class="champion-row"><img class="champion-icon" src="${championIcon(row.champion)}" alt=""><div class="champion-main"><strong>${escapeHtml(row.champion)}</strong><small>${row.games} partie${row.games > 1 ? 's' : ''} · ${row.csPerMin} CS/min · ${row.deaths} morts</small></div><div class="row-value"><strong class="${row.winRate >= 50 ? 'win' : 'loss'}">${row.winRate} %</strong><small>victoires</small></div></div>`).join('') : 'Synchronise pour voir tes champions.';
  $('#matches').classList.toggle('empty', !profile.matches.length);
  $('#matches').innerHTML = profile.matches.length ? profile.matches.slice(0, 8).map((match) => `
    <div class="match-row"><img class="champion-icon" src="${championIcon(match.champion)}" alt=""><div class="match-main"><strong>${escapeHtml(match.champion)} <span class="${match.win ? 'win' : 'loss'}">${match.win ? '· Victoire' : '· Défaite'}</span></strong><small>${escapeHtml(match.role)} · ${new Date(match.date).toLocaleDateString('fr-FR')} · ${match.minutes} min</small></div><div class="row-value"><strong>${match.kills}/${match.deaths}/${match.assists}</strong><small>${match.cs} CS · ${match.kp}% KP</small></div></div>`).join('') : 'Aucune partie en cache.';
}

async function refreshProfile() {
  try { renderProfile(await getJson('/api/profile')); }
  catch (error) { $('#sync-note').textContent = error.message; }
}

async function syncProfile() {
  const button = $('#sync-button');
  button.disabled = true;
  $('#sync-note').textContent = 'Import en cours. Les limites Riot sont respectées…';
  try {
    const profile = await getJson('/api/sync');
    renderProfile(profile);
    $('#sync-note').textContent = `${profile.matches.length} parties en cache. Clé jamais enregistrée sur disque.`;
  } catch (error) { $('#sync-note').textContent = error.message; }
  finally { button.disabled = false; }
}

function buildSignals(live) {
  const own = live.players.find((p) => p.riotId === live.active.riotId);
  const enemies = live.players.filter((p) => p.team !== own?.team);
  const crit = enemies.reduce((sum, player) => sum + player.items.reduce((n, item) => n + Number(itemData[item.id]?.stats?.FlatCritChanceMod || 0), 0), 0);
  const magicResist = enemies.reduce((sum, player) => sum + player.items.reduce((n, item) => n + Number(itemData[item.id]?.stats?.FlatSpellBlockMod || 0), 0), 0);
  const results = [];
  if (crit >= 0.4) results.push({ title: 'Critique adverse en hausse', detail: 'Plusieurs achats apportent du critique. Vérifie si une option défensive est nécessaire au prochain retour base. Randuin convient surtout aux champions qui peuvent investir dans l’armure ; sur Annie, compare d’abord les options AP défensives.' });
  if (magicResist >= 100) results.push({ title: 'Résistance magique adverse', detail: 'La pénétration magique mérite d’être comparée à un achat de puissance brute.' });
  if (!results.length) results.push({ title: 'Aucun signal fort pour le moment', detail: 'Les objets adverses observés ne déclenchent pas encore de conseil prioritaire. La recommandation reste indicative.' });
  return results;
}

async function refreshLive() {
  try {
    const live = await getJson('/api/live');
    $('#live-state').textContent = live.online ? 'PARTIE ACTIVE' : 'HORS PARTIE';
    $('#live-heading').textContent = live.online ? `${live.active.champion || 'Champion'} · Niveau ${live.active.level}` : 'Aucune partie active';
    $('#live-description').textContent = live.online ? 'Données locales du client de jeu. Actualisation toutes les 5 secondes.' : live.message;
    $('#live-time').textContent = live.online ? formatGameTime(live.gameTime) : '--:--';
    $('#players').classList.toggle('empty', !live.online);
    $('#build-signals').classList.toggle('empty', !live.online);
    $('#players').innerHTML = live.online ? live.players.map((player) => `
      <div class="player-row"><img class="champion-icon" src="${championIcon(player.champion)}" alt=""><div class="champion-main"><strong>${escapeHtml(player.champion)} · ${escapeHtml(player.role)}</strong><small>${escapeHtml(player.team)} · niveau ${player.level} · ${player.scores.kills}/${player.scores.deaths}/${player.scores.assists}</small><div class="item-list">${player.items.filter((i) => i.id).map((i) => `<img class="item-icon" src="${itemIcon(i.id)}" alt="${escapeHtml(i.name)}" title="${escapeHtml(i.name)}">`).join('')}</div></div></div>`).join('') : 'En attente d’une partie.';
    $('#build-signals').innerHTML = live.online ? buildSignals(live).map((signal) => `<div class="signal"><strong>${escapeHtml(signal.title)}</strong><p>${escapeHtml(signal.detail)}</p></div>`).join('') : 'Les signaux seront calculés à partir des objets observés.';
  } catch { $('#live-state').textContent = 'API INDISPONIBLE'; }
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
    return `<div class="vision-row ${state.alert ? 'alert' : ''} ${selected === index ? 'selected' : ''}" data-index="${index}"><div class="vision-portrait"><img src="${championIcon(champion.name)}" alt=""><span class="ss">SS</span></div><div class="vision-info"><strong>${champion.name} · ${champion.role}</strong><small>${champion.visible ? 'Visible · compteur à zéro' : `Dernier aperçu ${formatGameTime(champion.lastSeenAt)}`}</small></div><span class="vision-timer">${champion.visible ? '0 s' : `${state.missingSeconds} s`}</span><button class="vision-action" data-toggle="${index}">${champion.visible ? 'Disparaît' : 'Réapparaît'}</button></div>`;
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
    $('#server-status').textContent = status.keyConfigured ? 'API Riot configurée' : 'Clé Riot à configurer';
    $('#sync-note').textContent = status.keyConfigured ? 'Prêt à synchroniser depuis Riot.' : 'Définis RIOT_API_KEY dans le terminal, puis relance le serveur.';
  } catch { $('#server-status').textContent = 'Serveur indisponible'; }
  await refreshProfile();
  renderVision();
  refreshLive();
  setInterval(renderVision, 250);
  setInterval(() => { if ($('#live').classList.contains('active')) refreshLive(); }, 5000);
}
init();
