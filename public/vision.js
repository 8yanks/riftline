export function formatGameTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function visionState(champion, now) {
  if (champion.visible) return { missingSeconds: 0, alert: false };
  const missingSeconds = Math.max(0, Math.floor(now - champion.lastSeenAt));
  return { missingSeconds, alert: missingSeconds >= 3 };
}

export function normalizedPosition(x, y, width, height) {
  if (width <= 0 || height <= 0) throw new Error('Dimensions de carte invalides');
  return {
    x: Math.max(0, Math.min(1, x / width)),
    y: Math.max(0, Math.min(1, y / height))
  };
}
