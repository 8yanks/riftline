import { plansFor, choosePlan, planConfidence, lolalyticsLinks } from './planner.js';

const $ = (id) => document.getElementById(id);
let champions = {};
let runes = {};
let version = '16.19.1';
let selected = 'burst';
let manual = false;
let staticReady = false;

function savedPlan() {
  try { return JSON.parse(localStorage.getItem('riftline-plan') || '{}'); } catch { return {}; }
}

function icon(id) {
  const rune = runes[id];
  return rune ? `<img src="https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}" title="${rune.name}" alt="${rune.name}">` : '';
}

function composition() {
  const role = $('role').value;
  const lane = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support' }[role];
  return { [lane]: $('opponent').value };
}

function render() {
  const champion = $('champion').value || 'Annie';
  const role = $('role').value;
  const opponent = $('opponent').value;
  const pages = plansFor(champion, role, champions[champion]?.tags || []);
  const priority = choosePlan(champion, role, composition());
  const curated = planConfidence(champion) === 'curated';
  if (!manual) selected = curated ? priority.key || pages[0].key : pages[0].key;
  $('priority').textContent = curated ? priority.reason : `No reviewed rune set for ${champion} yet. These are experimental archetypes; verify the page for your champion before selecting it.`;
  $('pages').innerHTML = pages.map((page) => `<button class="page ${selected === page.key ? 'selected' : ''}" data-key="${page.key}" aria-pressed="${selected === page.key}"><span class="line"><strong>${page.title}</strong><small>${curated && priority.key === page.key ? 'SUGGESTED' : page.number.slice(5)}</small></span><p>${page.description}</p><span class="icons">${page.main.concat(page.secondary).map(icon).join('')}</span></button>`).join('');
  const links = lolalyticsLinks(champions[champion]?.name || champion, champions[opponent]?.name || opponent, role);
  $('source').href = links.matchup || links.counters;
  $('source').textContent = opponent ? 'Check this matchup on LoLalytics ↗' : 'Check counters on LoLalytics ↗';
  $('foot').textContent = curated ? 'This is a draft suggestion, not a measured rune win rate. Confirm it in the League client before the match starts.' : 'Experimental page: verify all runes for this champion in League before using it.';
}

async function load() {
  try {
    const persisted = await (await fetch('/api/draft')).json();
    if (persisted.champion) localStorage.setItem('riftline-plan', JSON.stringify(persisted));
  } catch {}
  try {
    const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
    version = versions[0];
    const [championResponse, runeResponse] = await Promise.all([
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`).then((response) => response.json()),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`).then((response) => response.json())
    ]);
    champions = championResponse.data || {};
    runes = Object.fromEntries(runeResponse.flatMap((tree) => tree.slots.flatMap((slot) => slot.runes.map((rune) => [rune.id, rune]))));
    staticReady = Boolean(Object.keys(champions).length && Object.keys(runes).length);
  } catch { champions = { Annie: { id: 'Annie', name: 'Annie', tags: ['Mage'] } }; }
  const names = Object.values(champions).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const options = names.map((champion) => `<option value="${champion.id}">${champion.name}</option>`).join('');
  $('champion').innerHTML = options;
  $('opponent').innerHTML = '<option value="">Unknown</option>' + options;
  const saved = savedPlan();
  $('champion').value = champions[saved.champion] ? saved.champion : 'Annie';
  $('role').value = saved.role || 'MIDDLE';
  const lane = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support' }[$('role').value];
  $('opponent').value = saved.composition?.[lane] || '';
  manual = Boolean(saved.manualPlan);
  selected = saved.viewedPlan || 'burst';
  render();
  if (!staticReady) {
    $('confirm').disabled = true;
    $('foot').textContent = 'Rune data could not load. Reconnect and reopen the selector before confirming a page.';
  }
}

for (const id of ['champion', 'role', 'opponent']) $(id).addEventListener('change', () => { manual = false; render(); });
$('pages').addEventListener('click', (event) => {
  const button = event.target.closest('[data-key]');
  if (!button) return;
  selected = button.dataset.key;
  manual = true;
  render();
});
$('confirm').addEventListener('click', async () => {
  const previous = savedPlan();
  const draft = { ...previous, champion: $('champion').value, role: $('role').value, composition: { ...previous.composition, ...composition() }, viewedPlan: selected, manualPlan: true };
  localStorage.setItem('riftline-plan', JSON.stringify(draft));
  try { await fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }); } catch {}
  if (window.riftlineDesktop) await window.riftlineDesktop.confirmDraft();
  else $('foot').textContent = 'Page saved. Open Riftline desktop to use the overlay.';
});

await load();
