'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminFetchUserAnalytics } from '@/lib/api';
import { formatSeconds, getWatchStatus } from '@/types/analytics';
import { FiArrowLeft, FiLoader, FiClock, FiFilm, FiCheckCircle, FiCalendar, FiTrendingUp } from 'react-icons/fi';

interface HistoryEntry {
  id: string;
  video:            { id: number; title: string; thumbnail: string; type: string };
  watchTimeSeconds: number;
  completionRate:   number;
  startedAt:        string | null;
  lastWatchedAt:    string | null;
  completed:        boolean;
}

interface UserData {
  user:              { id: number; email: string; createdAt: string };
  totalWatchSeconds: number;
  videosWatched:     number;
  avgCompletionRate: number;
  completedVideos:   number;
  lastActivity:      string | null;
  history:           HistoryEntry[];
}

export default function UserAnalyticsPage() {
  const { id }  = useParams<{ id: string }>();
  const [data,    setData]    = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminFetchUserAnalytics(id)
      .then(setData)
      .catch(() => setError('Failed to load user analytics.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <FiLoader className="animate-spin text-[#E50914]" size={32} />
    </div>
  );

  if (error || !data) return (
    <div className="p-10 text-center text-gray-500">
      <p className="text-4xl mb-3">👤</p>
      <p>{error || 'No data found.'}</p>
      <Link href="/admin/analytics" className="text-[#E50914] text-sm hover:underline mt-2 inline-block">← Back to Analytics</Link>
    </div>
  );

  const { user, history } = data;

  const cards = [
    { label: 'Total Watch Time',    value: formatSeconds(data.totalWatchSeconds), sub: 'cumulative',     color: 'text-[#E50914]',  bg: 'bg-[#E50914]/10 border-[#E50914]/20',   Icon: FiClock },
    { label: 'Videos Watched',      value: data.videosWatched.toLocaleString(),   sub: 'unique videos',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     Icon: FiFilm },
    { label: 'Avg Completion',       value: `${data.avgCompletionRate}%`,          sub: 'across videos',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',   Icon: FiTrendingUp },
    { label: 'Completed Videos',    value: data.completedVideos.toLocaleString(), sub: '≥90% watched',   color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', Icon: FiCheckCircle },
    { label: 'Last Activity',
      value: data.lastActivity ? new Date(data.lastActivity).toLocaleDateString() : '—',
      sub: 'most recent watch', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', Icon: FiCalendar },
    { label: 'Member Since',
      value: new Date(user.createdAt).toLocaleDateString(),
      sub: 'account created',   color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',     Icon: FiCalendar },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors group">
        <FiArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Analytics
      </Link>

      {/* User header */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-full bg-[#E50914]/20 flex items-center justify-center mb-3">
          <span className="text-[#E50914] font-bold text-lg">{user.email[0].toUpperCase()}</span>
        </div>
        <h1 className="text-white text-xl font-bold">{user.email}</h1>
        <p className="text-gray-500 text-sm">Admin · User #{user.id}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, sub, color, bg, Icon }) => (
          <div key={label} className={`border rounded-xl p-5 ${bg}`}>
            <div className="flex items-start justify-between mb-3">
              <Icon size={18} className={color} />
              <span className="text-gray-600 text-[11px]">{sub}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Viewing History */}
      <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <h3 className="text-white font-semibold text-sm">Viewing History Timeline</h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-3xl mb-2">🎬</p>
            <p className="text-sm">No watch history.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {history.map(h => {
              const status = getWatchStatus(h);
              const statusCls =
                status === 'Completed'   ? 'bg-green-500/15 text-green-400' :
                status === 'In Progress' ? 'bg-yellow-500/15 text-yellow-400' :
                                           'bg-red-500/15 text-red-400';
              return (
                <div key={h.id} className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.video.thumbnail} alt={h.video.title}
                       className="w-16 h-10 rounded-lg object-cover bg-gray-800 flex-shrink-0 hidden sm:block"
                       onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/analytics/video/${h.video.id}`}
                          className="text-white font-semibold text-sm hover:text-[#E50914] transition-colors truncate block">
                      {h.video.title}
                    </Link>
                    <p className="text-gray-500 text-xs mt-0.5 capitalize">{h.video.type}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E50914] rounded-full" style={{ width: `${Math.min(100, h.completionRate)}%` }} />
                    </div>
                    <span className="text-gray-500 text-xs w-8">{Math.round(h.completionRate)}%</span>
                  </div>
                  <span className="text-gray-400 font-mono text-xs flex-shrink-0">{formatSeconds(h.watchTimeSeconds)}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusCls}`}>{status}</span>
                  <span className="text-gray-600 text-xs flex-shrink-0 hidden md:block">
                    {h.lastWatchedAt ? new Date(h.lastWatchedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
