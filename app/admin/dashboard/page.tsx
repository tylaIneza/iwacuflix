'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetchStats, adminFetchContent } from '@/lib/api';
import { Content } from '@/components/ContentCard';
import {
  FiFilm, FiTv, FiEye, FiEyeOff, FiUpload, FiLoader,
  FiUsers, FiTrendingUp, FiCalendar, FiBarChart2,
} from 'react-icons/fi';

interface Stats {
  total: number;
  movies: number;
  series: number;
  published: number;
  unpublished: number;
  totalVisitors: number;
  todayVisitors: number;
  totalViews: number;
  topContent: (Content & { views: number })[];
}

export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [content, setContent] = useState<(Content & { views: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminFetchStats(), adminFetchContent()])
      .then(([s, c]) => {
        setStats(s);
        setContent((c as (Content & { views: number })[]).slice(0, 20));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiLoader className="animate-spin text-[#E50914]" size={32} />
      </div>
    );
  }

  const overviewCards = [
    {
      label: 'Total Visitors',
      value: stats?.totalVisitors ?? 0,
      sub: `${stats?.todayVisitors ?? 0} today`,
      icon: FiUsers,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Total Views',
      value: stats?.totalViews ?? 0,
      sub: 'across all content',
      icon: FiTrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Published',
      value: stats?.published ?? 0,
      sub: `${stats?.unpublished ?? 0} drafts`,
      icon: FiEye,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    {
      label: 'Movies',
      value: stats?.movies ?? 0,
      sub: `${stats?.series ?? 0} series`,
      icon: FiFilm,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
  ];

  const topContent = stats?.topContent ?? [];
  const maxViews   = topContent[0]?.views || 1;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, Admin</p>
        </div>
        <Link
          href="/admin/upload"
          className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <FiUpload size={15} /> Upload Content
        </Link>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {overviewCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`border rounded-xl p-5 ${bg}`}>
            <div className="flex items-start justify-between mb-3">
              <Icon size={20} className={color} />
              <span className="text-gray-600 text-[11px]">{sub}</span>
            </div>
            <p className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Top content by views */}
        <div className="border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <FiBarChart2 className="text-[#E50914]" size={17} />
            <h2 className="text-white font-semibold text-sm">Most Viewed</h2>
          </div>

          {topContent.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">
              No views yet — share your content!
            </div>
          ) : (
            <div className="space-y-4">
              {topContent.map((item, i) => (
                <div key={item._id} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs font-bold w-5 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail} alt=""
                    className="w-12 h-7 rounded object-cover bg-gray-800 flex-shrink-0"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                    <div className="mt-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E50914] rounded-full transition-all"
                        style={{ width: `${Math.max(4, (item.views / maxViews) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <FiEye size={11} className="text-gray-500" />
                    <span className="text-gray-400 text-xs font-semibold">{item.views.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visitor breakdown */}
        <div className="border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <FiCalendar className="text-[#E50914]" size={17} />
            <h2 className="text-white font-semibold text-sm">Visitor Summary</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Total site visitors', value: stats?.totalVisitors ?? 0, color: 'bg-blue-500' },
              { label: 'Visitors today',       value: stats?.todayVisitors ?? 0, color: 'bg-green-500' },
              { label: 'Total content views',  value: stats?.totalViews ?? 0,   color: 'bg-[#E50914]' },
              { label: 'Total content',        value: stats?.total ?? 0,        color: 'bg-yellow-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e1e1e] last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-gray-400 text-sm">{label}</span>
                </div>
                <span className="text-white font-bold text-sm">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All content with view counts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FiEye size={15} className="text-gray-500" />
            Views per Content
          </h2>
          <Link href="/admin/manage" className="text-[#E50914] text-xs hover:underline">
            Manage all →
          </Link>
        </div>

        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide bg-white/[0.02]">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Views</th>
              </tr>
            </thead>
            <tbody>
              {content.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-600 py-10">
                    No content yet.{' '}
                    <Link href="/admin/upload" className="text-[#E50914] hover:underline">Upload now</Link>
                  </td>
                </tr>
              ) : (
                content.map((c) => (
                  <tr key={c._id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.thumbnail} alt=""
                          className="w-10 h-6 rounded object-cover bg-gray-800 hidden sm:block flex-shrink-0"
                          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                        />
                        <span className="text-white font-medium truncate max-w-[160px] md:max-w-[220px]">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell capitalize">{c.type}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{c.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                        c.isPublished ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}>
                        {c.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1.5">
                        <FiEye size={12} className="text-gray-600" />
                        <span className={`font-bold text-sm ${c.views > 0 ? 'text-white' : 'text-gray-600'}`}>
                          {(c.views ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
