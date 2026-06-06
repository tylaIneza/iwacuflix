'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminFetchVideoAnalytics } from '@/lib/api';
import { formatSeconds } from '@/types/analytics';
import { WatchTimeLine, CompletionTrendLine, DailyViewsLine } from '@/components/admin/analytics/AnalyticsCharts';
import { FiArrowLeft, FiLoader, FiClock, FiUsers, FiCheckCircle, FiEye, FiTrendingUp } from 'react-icons/fi';

interface VideoData {
  video:            { id: number; title: string; thumbnail: string; type: string; category: string };
  totalViews:       number;
  totalWatchSecs:   number;
  avgWatchSecs:     number;
  avgCompletion:    number;
  completedCount:   number;
  uniqueViewers:    number;
  topViewers:       { userId: number; email: string; watchTimeSeconds: number; completionRate: number }[];
  dailyData:        { date: string; watchTimeMinutes: number; views: number; completionRate: number }[];
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}

export default function VideoAnalyticsPage() {
  const { id }  = useParams<{ id: string }>();
  const [data,    setData]    = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminFetchVideoAnalytics(id)
      .then(setData)
      .catch(() => setError('Failed to load video analytics.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <FiLoader className="animate-spin text-[#E50914]" size={32} />
    </div>
  );

  if (error || !data) return (
    <div className="p-10 text-center text-gray-500">
      <p className="text-4xl mb-3">📊</p>
      <p>{error || 'No data found.'}</p>
      <Link href="/admin/analytics" className="text-[#E50914] text-sm hover:underline mt-2 inline-block">← Back to Analytics</Link>
    </div>
  );

  const { video, dailyData, topViewers } = data;

  const cards = [
    { label: 'Total Views',          value: data.totalViews.toLocaleString(),     sub: 'unique sessions', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     Icon: FiEye },
    { label: 'Total Watch Time',      value: formatSeconds(data.totalWatchSecs),  sub: 'cumulative',      color: 'text-[#E50914]',  bg: 'bg-[#E50914]/10 border-[#E50914]/20',   Icon: FiClock },
    { label: 'Avg Watch Duration',    value: formatSeconds(data.avgWatchSecs),    sub: 'per viewer',      color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', Icon: FiClock },
    { label: 'Avg Completion Rate',   value: `${data.avgCompletion}%`,            sub: 'of viewers',      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',   Icon: FiCheckCircle },
    { label: 'Unique Viewers',        value: data.uniqueViewers.toLocaleString(), sub: 'distinct users',  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', Icon: FiUsers },
    { label: 'Completed Views',       value: data.completedCount.toLocaleString(),sub: '≥90% watched',   color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',     Icon: FiTrendingUp },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors group">
        <FiArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Analytics
      </Link>

      {/* Video header */}
      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail} alt={video.title}
             className="w-20 h-12 rounded-lg object-cover bg-gray-800 flex-shrink-0"
             onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
        <div>
          <h1 className="text-white text-xl font-bold">{video.title}</h1>
          <p className="text-gray-500 text-sm capitalize">{video.type} · {video.category}</p>
        </div>
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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <FiTrendingUp size={15} className="text-[#E50914]" /> Daily Watch Time
          </h3>
          <WatchTimeLine data={dailyData} />
        </div>
        <div className="border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <FiEye size={15} className="text-blue-400" /> Daily Views
          </h3>
          <DailyViewsLine data={dailyData} />
        </div>
        <div className="border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <FiCheckCircle size={15} className="text-green-400" /> Completion Rate Trend
          </h3>
          <CompletionTrendLine data={dailyData} />
        </div>
      </div>

      {/* Top Viewers */}
      {topViewers.length > 0 && (
        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2a2a]">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <FiUsers size={15} className="text-yellow-400" /> Most Active Viewers
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide bg-white/[0.02]">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Watch Time</th>
                <th className="text-left px-4 py-3">Completion</th>
              </tr>
            </thead>
            <tbody>
              {topViewers.map((v, i) => (
                <tr key={v.userId} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs font-bold">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/analytics/user/${v.userId}`} className="text-blue-400 hover:underline text-xs">
                      {v.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{formatSeconds(v.watchTimeSeconds)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E50914] rounded-full" style={{ width: `${Math.min(100, v.completionRate)}%` }} />
                      </div>
                      <span className="text-gray-400 text-xs">{v.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
