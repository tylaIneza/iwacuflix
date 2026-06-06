export interface WatchHistoryItem {
  id:               string;
  sessionId:        string;
  video:            { id: number; title: string; thumbnail: string; type: string };
  watchTimeSeconds: number;
  totalVideoSeconds: number;
  completionRate:   number;
  startedAt:        string | null;
  lastWatchedAt:    string | null;
  completed:        boolean;
}

export interface WatchHistoryPage {
  items: WatchHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface AnalyticsStats {
  watchTime: { today: number; week: number; month: number; allTime: number };
  totalVideosWatched: number;
  avgCompletionRate: number;
  activeUsers: { today: number; month: number };
}

export interface DailyWatchData {
  date: string;
  watchTimeMinutes: number;
  views: number;
  completionRate: number;
}

export interface VideoAnalytics {
  video:          { id: number; title: string; thumbnail: string; type: string; category: string };
  totalViews:     number;
  totalWatchSeconds: number;
  avgWatchSeconds:   number;
  avgCompletionRate: number;
  completedCount:    number;
  uniqueViewers:     number;
  topViewers:        { sessionId: string; watchTimeSeconds: number; completionRate: number }[];
  dailyData:         DailyWatchData[];
}

export interface UserAnalytics {
  user: { id: number; email: string; createdAt: string };
  totalWatchSeconds: number;
  videosWatched: number;
  avgCompletionRate: number;
  completedVideos: number;
  lastActivity: string | null;
  history: WatchHistoryItem[];
}

export type WatchStatus = 'Completed' | 'In Progress' | 'Abandoned';

export function getWatchStatus(item: Pick<WatchHistoryItem, 'completed' | 'watchTimeSeconds'>): WatchStatus {
  if (item.completed) return 'Completed';
  if (item.watchTimeSeconds >= 30) return 'In Progress';
  return 'Abandoned';
}

export function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
