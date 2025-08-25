// Utility per GemDetailView

export function buildParagraphs(text?: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  const explicit = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (explicit.length > 1) return explicit;
  const periodSplit = normalized
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .split(/(?<=\.)\s+(?=[A-ZÀ-ÖØ-Ý])/)
    .map(s => s.trim())
    .filter(Boolean);
  if (periodSplit.length > 1) return periodSplit;
  return [normalized];
}

export function getReadingTime(text?: string) {
  if (!text) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const WPM = 200;
  const minutesFloat = words / WPM;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  const display = minutes < 1 ? `${seconds < 10 ? '~15s' : `${seconds}s`}` : `${minutes} min${minutes === 1 ? '' : ''}${seconds >= 30 && minutes < 10 ? ' +' : ''}`;
  return { words, minutes, seconds, display };
}

export function handleProtectedAction(isLoggedIn: boolean, onLogin: (() => void) | undefined, action: () => void) {
  console.log('[handleProtectedAction]', { isLoggedIn, hasOnLogin: !!onLogin });
  if (isLoggedIn) {
    action();
  } else if (onLogin) {
    onLogin();
  }
}
