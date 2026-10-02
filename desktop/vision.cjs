function visionRows(enemies, missing, now) {
  return enemies.map((champion, index) => {
    const started = missing.get(champion);
    const seconds = started === undefined ? 0 : Math.max(0, Math.floor(now - started));
    return { champion, index: index + 1, missing: started !== undefined, seconds, alert: seconds >= 3, at: started ?? null };
  });
}

module.exports = { visionRows };
