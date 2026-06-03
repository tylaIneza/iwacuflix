const KEY = 'iwacu_watchlist';

export interface WatchlistItem {
  id: string;
  title: string;
  thumbnail: string;
  type: 'movie' | 'series';
  category: string;
  addedAt: number;
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function isInWatchlist(id: string): boolean {
  return getWatchlist().some((i) => i.id === id);
}

export function toggleWatchlist(item: Omit<WatchlistItem, 'addedAt'>): boolean {
  const list = getWatchlist();
  const exists = list.some((i) => i.id === item.id);
  if (exists) {
    localStorage.setItem(KEY, JSON.stringify(list.filter((i) => i.id !== item.id)));
    return false;
  }
  localStorage.setItem(KEY, JSON.stringify([{ ...item, addedAt: Date.now() }, ...list]));
  return true;
}

export function removeFromWatchlist(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getWatchlist().filter((i) => i.id !== id)));
}
