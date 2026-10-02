const mage = [
  { key: 'burst', number: '01 · BURST', title: 'Punish a mistake', description: 'Short trades and kill pressure when the target enters your range.', main: [8112, 8126, 8137, 8106], secondary: [8226, 8210], objective: 'Create a roam window', items: [4645, 3089] },
  { key: 'safe', number: '02 · SAFETY', title: 'Protect your lane', description: 'Keep Electrocute for short return trades; Bone Plating and Overgrowth add protection against an all-in.', main: [8112, 8139, 8137, 8106], secondary: [8473, 8451], objective: 'Survive the first engage, then trade on cooldowns', items: [3157, 3089] },
  { key: 'poke', number: '03 · POKE', title: 'Wear them down', description: 'Repeat trades against a target that cannot easily engage.', main: [8229, 8226, 8210, 8237], secondary: [8126, 8106], objective: 'Force a recall and gain priority', items: [6655, 3137] }
];
const annie = [
  mage[0],
  mage[1],
  { key: 'poke', number: '03 · POKE', title: 'Pressure melee range', description: 'Use Aery for repeated Q and auto trades when the opponent must walk into your range.', main: [8214, 8226, 8210, 8237], secondary: [8473, 8451], objective: 'Build a health lead without spending stun', items: [6655, 3089] }
];
const assassin = [
  { key: 'burst', number: '01 · BURST', title: 'Find a pick', description: 'Commit to short kill windows against vulnerable carries.', main: [8112, 8143, 8137, 8106], secondary: [8009, 8014], objective: 'Turn priority into a pick', items: [3142, 6697] },
  { key: 'safe', number: '02 · SUSTAIN', title: 'Take extended fights', description: 'A longer trade page when one rotation will not finish the target.', main: [8010, 9111, 9104, 8299], secondary: [8139, 8106], objective: 'Choose fights with room to reset', items: [6697, 3814] },
  { key: 'poke', number: '03 · TEMPO', title: 'Roam for gold', description: 'Prioritize clean first contact and move after your wave is secured.', main: [8369, 8304, 8321, 8347], secondary: [8139, 8106], objective: 'Convert a roam into an objective', items: [3142, 6699] }
];
const fighter = [
  { key: 'burst', number: '01 · PRESSURE', title: 'Fight for lane', description: 'Repeated combat when you can stay on the target.', main: [8010, 9111, 9104, 8299], secondary: [8139, 8106], objective: 'Win a sustained trade', items: [3078, 3053] },
  { key: 'safe', number: '02 · SAFETY', title: 'Survive the lane', description: 'Short trades and extra resilience into threatening melee lanes.', main: [8437, 8446, 8473, 8451], secondary: [9111, 9104], objective: 'Keep health for the next wave', items: [3078, 3053] },
  { key: 'poke', number: '03 · MOBILITY', title: 'Control the side', description: 'Move in and out of fights against teams that can kite you.', main: [8230, 8226, 8210, 8236], secondary: [8473, 8451], objective: 'Pressure a side lane safely', items: [3078, 3053] }
];
const marksman = [
  { key: 'burst', number: '01 · TRADE', title: 'Win a short exchange', description: 'Look for a clean attack window with your support.', main: [8005, 8009, 9103, 8014], secondary: [8226, 8233], objective: 'Trade without losing wave control', items: [6672, 3031] },
  { key: 'safe', number: '02 · SUSTAIN', title: 'Absorb lane pressure', description: 'Choose this when poke makes early recall timings difficult.', main: [8021, 8009, 9103, 8014], secondary: [8473, 8451], objective: 'Farm through the lane', items: [6672, 3031] },
  { key: 'poke', number: '03 · LONG FIGHT', title: 'Play front to back', description: 'Value repeated attacks when their frontline is accessible.', main: [8008, 8009, 9103, 8014], secondary: [8226, 8233], objective: 'Keep safe spacing in team fights', items: [6672, 3031] }
];
const support = [
  { key: 'burst', number: '01 · PRESSURE', title: 'Take the first trade', description: 'Chip the enemy lane while preserving health.', main: [8214, 8226, 8210, 8237], secondary: [8473, 8451], objective: 'Create a safe engage window', items: [3870, 6616] },
  { key: 'safe', number: '02 · PROTECT', title: 'Hold your carry', description: 'Defensive response to a team that wants to dive.', main: [8465, 8463, 8473, 8451], secondary: [8226, 8233], objective: 'Protect the next objective setup', items: [3870, 6616] },
  { key: 'poke', number: '03 · ENGAGE', title: 'Start the fight', description: 'Use when your team can follow a reliable initiation.', main: [8439, 8463, 8473, 8451], secondary: [8306, 8345], objective: 'Find a grouped engage', items: [3871, 3190] }
];

export function plansFor(champion, role, tags = []) {
  if (champion === 'Annie') return annie;
  if (['Veigar', 'Hwei', 'Lux', 'Viktor', 'Orianna'].includes(champion)) return mage;
  if (['Talon', 'Zed', 'Qiyana', 'KhaZix'].includes(champion)) return assassin;
  if (['Nasus', 'Sylas', 'Yone', 'Yasuo', 'Garen'].includes(champion)) return fighter;
  if (role === 'BOTTOM' || tags.includes('Marksman')) return marksman;
  if (role === 'UTILITY') return support;
  if (tags.includes('Assassin')) return assassin;
  if (tags.includes('Fighter') || tags.includes('Tank')) return fighter;
  if (tags.includes('Support')) return support;
  return mage;
}

export function planConfidence(champion) {
  return champion === 'Annie' ? 'curated' : 'experimental';
}

const danger = new Set(['Fizz', 'Zed', 'Talon', 'Katarina', 'Akali', 'Qiyana', 'Yasuo', 'Yone', 'Irelia', 'Leblanc', 'Syndra', 'Xerath', 'Hwei', 'Ziggs', 'Lux', 'Azir', 'Darius', 'Draven', 'Pyke']);
const poke = new Set(['Veigar', 'Malzahar', 'TwistedFate', 'Anivia', 'Viktor', 'Orianna', 'Caitlyn', 'Ezreal', 'Teemo']);
const laneByRole = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support' };

export function choosePlan(champion, role, composition) {
  const lane = laneByRole[role] || 'mid';
  const opponent = composition[lane];
  if (!opponent) return { key: null, reason: `Select the enemy ${lane === 'adc' ? 'bot' : lane} to get a draft suggestion for ${champion}.` };
  if (danger.has(opponent) || ['Rengar', 'Khazix', 'Nocturne', 'Evelynn'].includes(composition.jungle))
    return { key: 'safe', reason: `${opponent} or the selected jungler can punish risky trades. Start with the defensive page and reconsider after seeing their actual items.` };
  if (poke.has(opponent)) return { key: 'poke', reason: `${opponent} invites repeated trade windows. Use the third page to shape your lane or side lane plan.` };
  return { key: 'burst', reason: `Against ${opponent}, start with the pressure page. Choose another plan if your lane state demands it.` };
}

export function laneTips(own, enemy) {
  if (!enemy) return ['Select a lane opponent to see lane guidance.'];
  const tips = [];
  if ((own?.stats?.range || 0) > (enemy?.stats?.range || 0) + 100) tips.push('Use your range edge when the opponent spends an ability on the wave. Keep the wave close enough to retreat from a gank.');
  else if ((enemy?.stats?.range || 0) > (own?.stats?.range || 0) + 100) tips.push('Let the ranged opponent push early. Preserve health, then trade after a key spell is used on the wave.');
  else tips.push('Track the opponent’s key cooldown before committing to a trade. Avoid fighting inside a larger enemy wave.');
  if (enemy?.tags?.includes('Assassin')) tips.push('Respect the level 2 and 6 all-in. Keep a defensive spell or escape route available when the wave is far from your tower.');
  else if (enemy?.tags?.includes('Tank')) tips.push('Trade in short windows before armor or health purchases. Watch for the engage spell before walking up to last-hit.');
  else if (enemy?.tags?.includes('Mage')) tips.push('Stand outside the main poke line and move after their wave-clear spell. That cooldown is your clearest trading window.');
  else tips.push('Review the first three waves and reset timing; the winning trade depends on health, minions, and summoner spells.');
  return tips;
}

export function lolalyticsLinks(champion, opponent, role = 'MIDDLE') {
  const slug = (name) => {
    const clean = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return { nunuwillump: 'nunu', monkeyking: 'wukong' }[clean] || clean;
  };
  const lane = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'middle', BOTTOM: 'bottom', UTILITY: 'support' }[role] || 'middle';
  const query = `?lane=${lane}&tier=emerald_plus`;
  return {
    counters: `https://lolalytics.com/lol/${slug(opponent || champion)}/build/${query}`,
    matchup: opponent ? `https://lolalytics.com/lol/${slug(champion)}/vs/${slug(opponent)}/build/${query}` : null
  };
}
