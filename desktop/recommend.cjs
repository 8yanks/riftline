function findOwn(live) {
  return live.players?.find((player) => player.riotId && player.riotId === live.active?.riotId)
    || live.players?.find((player) => player.champion === live.active?.champion);
}

function itemSignals(live, items, champions) {
  if (!live?.online) return [];
  const own = findOwn(live);
  if (!own?.team) return [];
  const enemies = live.players.filter((player) => player.team !== own.team);
  const enemyItems = enemies.flatMap((player) => player.items || []);
  const ownItems = new Set((own.items || []).map((item) => item.id));
  const crit = enemyItems.reduce((sum, item) => sum + Number(items[item.id]?.stats?.FlatCritChanceMod || 0), 0);
  const mr = enemyItems.reduce((sum, item) => sum + Number(items[item.id]?.stats?.FlatSpellBlockMod || 0), 0);
  const tags = champions[own.champion]?.tags || Object.values(champions).find((champion) => champion.name === own.champion)?.tags || [];
  const signals = [];
  if (crit >= .4) {
    const item = tags.includes('Mage') ? 3157 : tags.includes('Marksman') ? 3026 : tags.includes('Tank') || tags.includes('Fighter') ? 3143 : tags.includes('Assassin') ? 6333 : null;
    if (item && !ownItems.has(item)) signals.push({
      key: `crit:${item}`, item,
      title: 'Enemy crit is rising',
      detail: `${items[item]?.name || 'Defensive armor'} is an option for your next recall. Compare it with your current power spike.`
    });
  }
  if (mr >= 100 && tags.includes('Mage') && !ownItems.has(3135)) signals.push({
    key: 'mr:3135', item: 3135,
    title: 'Enemy magic resistance',
    detail: `${items[3135]?.name || 'Void Staff'} may outperform another raw AP purchase. Check who is stacking MR.`
  });
  return signals;
}

module.exports = { itemSignals };
