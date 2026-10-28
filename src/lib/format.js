export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '—';

export function timeLeft(value) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff < 0) return { label: 'Closed', tone: 'muted' };
  const hours = diff / 36e5;
  if (hours < 24) return { label: `${Math.max(1, Math.round(hours))}h left`, tone: 'danger' };
  const days = Math.round(hours / 24);
  return { label: `${days} day${days === 1 ? '' : 's'} left`, tone: days <= 3 ? 'warning' : 'success' };
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

// For <input type="datetime-local"> values.
export function toLocalInput(value) {
  const d = value ? new Date(value) : new Date(Date.now() + 7 * 864e5);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function grade(pct) {
  if (pct === null || pct === undefined) return '—';
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'A-';
  if (pct >= 75) return 'B+';
  if (pct >= 71) return 'B';
  if (pct >= 68) return 'B-';
  if (pct >= 64) return 'C+';
  if (pct >= 61) return 'C';
  if (pct >= 58) return 'C-';
  if (pct >= 54) return 'D+';
  if (pct >= 50) return 'D';
  return 'F';
}
