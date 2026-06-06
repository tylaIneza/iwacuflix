const TOKEN_KEY  = 'iwacu_token';
const WATCH_KEY  = 'iwacu_watching';

// ── Token management — sessionStorage so token clears on tab/window close ─
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
};
export const setToken = (t: string) => sessionStorage.setItem(TOKEN_KEY, t);
export const removeToken = () => sessionStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();

// ── Continue Watching (localStorage, no login needed) ─────
export interface WatchEntry {
  id: string;
  title: string;
  thumbnail: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  progress: number; // 0-100
  lastWatched: number;
}

export function saveWatchProgress(content: {
  _id: string; title: string; thumbnail: string;
  type: 'movie' | 'series'; season?: number; episode?: number;
}, currentTime: number, duration: number) {
  if (typeof window === 'undefined' || duration < 10) return;

  const entry: WatchEntry = {
    id:          content._id,
    title:       content.title,
    thumbnail:   content.thumbnail,
    type:        content.type,
    season:      content.season,
    episode:     content.episode,
    currentTime,
    duration,
    progress:    Math.round((currentTime / duration) * 100),
    lastWatched: Date.now(),
  };

  const list = getContinueWatching().filter((e) => e.id !== content._id);
  list.unshift(entry);
  localStorage.setItem(WATCH_KEY, JSON.stringify(list.slice(0, 12)));
}

export function getContinueWatching(): WatchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(WATCH_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getWatchEntry(id: string): WatchEntry | undefined {
  return getContinueWatching().find((e) => e.id === id);
}

export function removeWatchEntry(id: string) {
  const list = getContinueWatching().filter((e) => e.id !== id);
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
}
