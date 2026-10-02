import { plansFor } from './planner.js';

let version = '16.19.1';
let itemData = {};
let runeData = {};
let championData = {};
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function loadData() {
  try {
    const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
    version = versions[0];
    const [items, trees, champions] = await Promise.all([
      (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`)).json(),
      (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`)).json(),
      (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)).json()
    ]);
    itemData = items.data || {};
    runeData = Object.fromEntries(trees.flatMap((tree) => tree.slots.flatMap((slot) => slot.runes.map((rune) => [rune.id, rune.icon]))));
    championData = champions.data || {};
  } catch {}
}

function ownPlayer(live) {
  return live.players?.find((p) => p.riotId && p.riotId === live.active?.riotId) || live.players?.find((p) => p.champion === live.active?.champion);
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

async function refresh() {
  let live = { online: false };
  try { live = await (await fetch('/api/live')).json(); } catch {}
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('riftline-plan') || '{}'); } catch {}
  try {
    const persisted = await (await fetch('/api/draft')).json();
    if (persisted.champion) saved = persisted;
  } catch {}
  const champion = live.online ? live.active?.champion || saved.champion || 'Annie' : saved.champion || 'Annie';
  const championEntry = championData[champion] || Object.values(championData).find((entry) => entry.name === champion);
  const championId = championEntry?.id || champion;
  const configured = String(championId).toLowerCase() === String(saved.champion || '').toLowerCase();
  const candidates = plansFor(championId, saved.role || 'MIDDLE', championEntry?.tags || []);
  const plan = configured ? candidates.find((entry) => entry.key === saved.viewedPlan) || candidates[0] : candidates[0];
  $('mode').textContent = live.online ? 'LIVE GAME' : 'PREVIEW';
  $('portrait').src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${encodeURIComponent(championId)}.png`;
  $('champion').textContent = championEntry?.name || champion;
  $('time').textContent = live.online ? formatTime(live.gameTime || 0) : '--:--';
  $('plan-name').textContent = plan.title;
  $('runes').innerHTML = configured ? plan.main.concat(plan.secondary).map((id) => runeData[id] ? `<img src="https://ddragon.leagueoflegends.com/cdn/img/${runeData[id]}" alt="Rune ${id}">` : '').join('') : '';
  const own = live.online ? ownPlayer(live) : null;
  const enemies = own ? live.players.filter((p) => p.team !== own.team) : [];
  const items = enemies.flatMap((p) => p.items || []);
  const crit = items.reduce((sum, item) => sum + Number(itemData[item.id]?.stats?.FlatCritChanceMod || 0), 0);
  const mr = items.reduce((sum, item) => sum + Number(itemData[item.id]?.stats?.FlatSpellBlockMod || 0), 0);
  $('advice').textContent = !live.online ? configured ? 'Draft page selected. Item alerts activate during a match.' : 'Choose your champion and runes in the desktop popup before the match.'
    : !configured ? `Live champion differs from the saved draft (${saved.champion || 'none'}). Review your rune plan in Game plans.`
    : !own ? 'Live match found. Waiting to identify your team for enemy item advice.'
    : crit >= .4 ? 'Enemy crit is rising. Compare a defensive purchase at your next recall; the item alert adapts to your champion.'
    : mr >= 100 ? 'Enemy magic resistance is rising. Compare magic penetration with raw damage on your next recall.'
    : 'No strong enemy item signal yet. Follow your selected plan and reassess each recall.';
}

await loadData();
await refresh();
setInterval(refresh, 4000);
window.addEventListener('storage', refresh);
window.riftlineDesktop?.onVisionState((rows) => {
  $('ss-list').innerHTML = rows.length ? rows.map((row) => `<div class="ss-row ${row.alert ? 'alert' : ''}"><span>${row.index}. ${escapeHtml(row.champion)}</span><b>${row.alert ? 'SS' : row.missing ? `${row.seconds}s` : 'VISIBLE'}</b><i>${row.missing ? formatTime(row.at) : ''}</i></div>`).join('') : 'Waiting for enemy team';
});
