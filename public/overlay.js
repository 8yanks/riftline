import { plansFor } from './planner.js';

let version = '16.19.1';
let itemData = {};
let runeData = {};
const $ = (id) => document.getElementById(id);

async function loadData() {
  try {
    const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
    version = versions[0];
    const [items, trees] = await Promise.all([
      (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`)).json(),
      (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`)).json()
    ]);
    itemData = items.data || {};
    runeData = Object.fromEntries(trees.flatMap((tree) => tree.slots.flatMap((slot) => slot.runes.map((rune) => [rune.id, rune.icon]))));
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
  const champion = live.online ? live.active?.champion || saved.champion || 'Annie' : saved.champion || 'Annie';
  const configured = String(champion).toLowerCase() === String(saved.champion || '').toLowerCase();
  const candidates = plansFor(champion, saved.role || 'MIDDLE');
  const plan = configured ? candidates.find((entry) => entry.key === saved.viewedPlan) || candidates[0] : candidates[0];
  $('mode').textContent = live.online ? 'LIVE GAME' : 'PREVIEW';
  $('portrait').src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${encodeURIComponent(champion)}.png`;
  $('champion').textContent = champion;
  $('time').textContent = live.online ? formatTime(live.gameTime || 0) : '--:--';
  $('plan-name').textContent = plan.title;
  $('runes').innerHTML = plan.main.concat(plan.secondary).map((id) => runeData[id] ? `<img src="https://ddragon.leagueoflegends.com/cdn/img/${runeData[id]}" alt="Rune ${id}">` : '').join('');
  const own = live.online ? ownPlayer(live) : null;
  const enemies = own ? live.players.filter((p) => p.team !== own.team) : [];
  const items = enemies.flatMap((p) => p.items || []);
  const crit = items.reduce((sum, item) => sum + Number(itemData[item.id]?.stats?.FlatCritChanceMod || 0), 0);
  const mr = items.reduce((sum, item) => sum + Number(itemData[item.id]?.stats?.FlatSpellBlockMod || 0), 0);
  $('advice').textContent = !live.online ? 'Set your champion, role, and enemy team in Game plans before the match.'
    : !configured ? `Live champion differs from the saved draft (${saved.champion || 'none'}). Review your rune plan in Game plans.`
    : !own ? 'Live match found. Waiting to identify your team for enemy item advice.'
    : crit >= .4 ? 'Enemy crit is rising. Compare an armor purchase at your next recall; Randuin is a situational option.'
    : mr >= 100 ? 'Enemy magic resistance is rising. Compare magic penetration with raw damage on your next recall.'
    : 'No strong enemy item signal yet. Follow your selected plan and reassess each recall.';
}

await loadData();
await refresh();
setInterval(refresh, 4000);
window.addEventListener('storage', refresh);
