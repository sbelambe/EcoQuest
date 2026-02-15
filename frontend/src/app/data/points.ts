const POINTS_STORAGE_KEY = "ecoquest_points";

export function getStoredPoints(defaultPoints: number): number {
  const raw = window.localStorage.getItem(POINTS_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;
  window.localStorage.setItem(POINTS_STORAGE_KEY, String(defaultPoints));
  return defaultPoints;
}

export function setStoredPoints(points: number): void {
  window.localStorage.setItem(POINTS_STORAGE_KEY, String(points));
}

export function addStoredPoints(delta: number, defaultPoints: number): number {
  const next = getStoredPoints(defaultPoints) + delta;
  setStoredPoints(next);
  return next;
}

