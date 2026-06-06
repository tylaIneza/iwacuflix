'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { adminFetchAnalytics, adminExportAnalytics } from '@/lib/api';
import { formatSeconds, getWatchStatus, type WatchHistoryItem, type AnalyticsStats, type DailyWatchData } from '@/types/analytics';
import {
  WatchTimeLine, DailyViewsLine, TopVideosBar, TopUsersBar, CompletionPie,
} from '@/components/admin/analytics/AnalyticsCharts';
import {
  FiLoader, FiClock, FiTrendingUp, FiUsers, FiCheckCircle,
  FiSearch, FiDownload, FiChevronLeft, FiChevronRight,
  FiArrowUp, FiArrowDown, FiBarChart2, FiEye,
} from 'react-icons/fi';

// ── Types ────────────────────────────────────────────────────
interface AllUser {
  id:               number;
  email:            string;
  createdAt:        string;
  watchTimeSeconds: number;
  videosWatched:    number;
  avgCompletion:    number;
  lastActivity:     string | null;
}

// ── Status Badge ─────────────────────────────────────────────
function StatusBadge({ item }: { item: WatchHistoryItem }) {
  const s = getWatchStatus(item);
  const cls =
    s === 'Completed'   ? 'bg-green-500/15 text-green-400' :
    s === 'In Progress' ? 'bg-yellow-500/15 text-yellow-400' :
                          'bg-red-500/15 text-red-400';
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>{s}</span>;
}

// ── Stat Card ────────────────────────────────────────────────
interface CardDef { label: string; value: string; sub: string; color: string; bg: string; Icon: React.ElementType }
function StatCard({ label, value, sub, color, bg, Icon }: CardDef) {
  return (
    <div className={`border rounded-xl p-5 ${bg}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon size={20} className={color} />
        <span className="text-gray-600 text-[11px]">{sub}</span>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}

// ── Sort header ───────────────────────────────────────────────
function SortTh({ label, field, sortBy, sortDir, onSort }: {
  label: string; field: string;
  sortBy: string; sortDir: string;
  onSort: (f: string) => void;
}) {
  const active = sortBy === field;
  return (
    <th
      className="text-left px-4 py-3 cursor-pointer select-none hover:text-white transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />
        ) : (
          <span className="opacity-20"><FiArrowDown size={11} /></span>
        )}
      </span>
    </th>
  );
}

export default function AnalyticsPage() {
  const [stats,      setStats]      = useState<AnalyticsStats | null>(null);
  const [history,    setHistory]    = useState<WatchHistoryItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [daily,      setDaily]      = useState<DailyWatchData[]>([]);
  const [topVideos,  setTopVideos]  = useState<{ title: string; watchTimeMinutes: number; views: number }[]>([]);
  const [topUsers,   setTopUsers]   = useState<{ email: string; watchTimeMinutes: number }[]>([]);
  const [compDist,   setCompDist]   = useState<{ name: string; value: number }[]>([]);
  const [allUsers,   setAllUsers]   = useState<AllUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tblLoading, setTblLoading] = useState(false);
  const [search,     setSearch]     = useState('');
  const [searchInput,setSearchInput]= useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [sortBy,     setSortBy]     = useState('lastWatchedAt');
  const [sortDir,    setSortDir]    = useState<'asc'|'desc'>('desc');
  const PAGE_SIZE = 20;

  const fetchHistory = useCallback(async (p: number) => {
    setTblLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), pageSize: String(PAGE_SIZE), sortBy, sortDir };
      if (search)    params.search    = search;
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const res = await adminFetchAnalytics(params);
      setHistory(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch { /* silent */ }
    finally { setTblLoading(false); }
  }, [search, startDate, endDate, sortBy, sortDir]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetchAnalytics({ action: 'stats' }),
      adminFetchAnalytics({ action: 'daily', days: '30' }),
      adminFetchAnalytics({ action: 'topVideos' }),
      adminFetchAnalytics({ action: 'topUsers' }),
      adminFetchAnalytics({ action: 'completionDist' }),
      adminFetchAnalytics({ action: 'allUsers' }),
    ]).then(([s, d, tv, tu, cd, au]) => {
      setStats(s);
      setDaily(d);
      setTopVideos(tv);
      setTopUsers(tu);
      setCompDist(cd);
      setAllUsers(au);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHistory(page); }, [fetchHistory, page]);
  useEffect(() => { setPage(1); }, [search, startDate, endDate, sortBy, sortDir]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleSearch = () => setSearch(searchInput.trim());

  const exportParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = startDate;
    if (endDate)   p.endDate   = endDate;
    return p;
  }, [startDate, endDate]);

  const cards: CardDef[] = !stats ? [] : [
    { label: 'Watch Time Today',    value: formatSeconds(stats.watchTime.today),   sub: 'last 24h',        color: 'text-[#E50914]', bg: 'bg-[#E50914]/10 border-[#E50914]/20', Icon: FiClock },
    { label: 'Watch Time This Week', value: formatSeconds(stats.watchTime.week),   sub: 'last 7 days',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   Icon: FiClock },
    { label: 'Watch Time This Month',value: formatSeconds(stats.watchTime.month),  sub: 'last 30 days',    color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20',Icon: FiClock },
    { label: 'All-Time Watch Time',  value: formatSeconds(stats.watchTime.allTime),sub: 'total',           color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20',Icon: FiClock },
    { label: 'Total Videos Watched', value: stats.totalVideosWatched.toLocaleString(), sub: 'unique views',color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  Icon: FiEye },
    { label: 'Avg Completion Rate',  value: `${stats.avgCompletionRate}%`,          sub: 'across all views',color: 'text-teal-400',  bg: 'bg-teal-500/10 border-teal-500/20',    Icon: FiCheckCircle },
    { label: 'Active Users Today',   value: stats.activeUsers.today.toLocaleString(),sub: 'watching today',color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',Icon: FiUsers },
    { label: 'Active Users (Month)', value: stats.activeUsers.month.toLocaleString(),sub: 'last 30 days',  color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20',    Icon: FiTrendingUp },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Video Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Watch time and engagement insights</p>
        </div>
        <button
          onClick={() => adminExportAnalytics(exportParams)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-[#2a2a2a] text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(c => <StatCard key={c.label} {...c} />)}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Watch Time Over Time" icon={FiTrendingUp}>
          {loading ? <Skeleton className="h-52" /> : <WatchTimeLine data={daily} />}
        </ChartCard>
        <ChartCard title="Daily Views" icon={FiEye}>
          {loading ? <Skeleton className="h-52" /> : <DailyViewsLine data={daily} />}
        </ChartCard>
        <ChartCard title="Most Watched Videos" icon={FiBarChart2}>
          {loading ? <Skeleton className="h-52" /> : <TopVideosBar data={topVideos} />}
        </ChartCard>
        <ChartCard title="Top Active Users" icon={FiUsers}>
          {loading ? <Skeleton className="h-52" /> : <TopUsersBar data={topUsers} />}
        </ChartCard>
        <ChartCard title="Completion Rate Distribution" icon={FiCheckCircle}>
          {loading ? <Skeleton className="h-52" /> : <CompletionPie data={compDist} />}
        </ChartCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-1 min-w-48 items-center gap-2 bg-white/5 border border-[#2a2a2a] rounded-lg px-3">
          <FiSearch size={14} className="text-gray-500 flex-shrink-0" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search user or video…"
            className="bg-transparent text-sm text-white placeholder-gray-600 outline-none py-2 w-full"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} className="text-gray-500 hover:text-white">×</button>
          )}
        </div>
        <input
          type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="bg-white/5 border border-[#2a2a2a] text-gray-400 text-sm rounded-lg px-3 py-2 outline-none"
        />
        <input
          type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="bg-white/5 border border-[#2a2a2a] text-gray-400 text-sm rounded-lg px-3 py-2 outline-none"
        />
        <button
          onClick={handleSearch}
          className="bg-[#E50914] hover:bg-[#c40812] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Search
        </button>
      </div>

      {/* Watch History Table */}
      <div className="border border-[#2a2a2a] rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <FiEye size={15} className="text-gray-500" /> Watch History
          </h2>
          <span className="text-gray-500 text-xs">{total.toLocaleString()} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide bg-white/[0.02]">
                <SortTh label="User"         field="userId"        {...{ sortBy, sortDir, onSort: handleSort }} />
                <SortTh label="Video"        field="videoId"       {...{ sortBy, sortDir, onSort: handleSort }} />
                <SortTh label="Watch Time"   field="watchTimeSeconds" {...{ sortBy, sortDir, onSort: handleSort }} />
                <SortTh label="Completion"   field="completionRate" {...{ sortBy, sortDir, onSort: handleSort }} />
                <SortTh label="Last Watched" field="lastWatchedAt" {...{ sortBy, sortDir, onSort: handleSort }} />
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tblLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-600 py-14">
                    <p className="text-4xl mb-2">📊</p>
                    <p className="text-sm">No watch history yet.</p>
                    <p className="text-xs mt-1 text-gray-700">Watch time is tracked when logged-in users play videos.</p>
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item.id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/analytics/user/${item.user.id}`} className="text-blue-400 hover:underline text-xs">
                        {item.user.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.video.thumbnail} alt="" className="w-10 h-6 rounded object-cover bg-gray-800 hidden sm:block flex-shrink-0"
                             onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
                        <Link href={`/admin/analytics/video/${item.video.id}`} className="text-white hover:text-[#E50914] transition-colors truncate max-w-[140px]">
                          {item.video.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{formatSeconds(item.watchTimeSeconds)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#E50914] rounded-full" style={{ width: `${Math.min(100, item.completionRate)}%` }} />
                        </div>
                        <span className="text-gray-400 text-xs">{Math.round(item.completionRate)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.lastWatchedAt ? new Date(item.lastWatchedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge item={item} /></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex gap-2">
                        <Link href={`/admin/analytics/video/${item.video.id}`}
                              className="text-[11px] text-[#E50914] hover:underline">Video</Link>
                        <Link href={`/admin/analytics/user/${item.user.id}`}
                              className="text-[11px] text-blue-400 hover:underline">User</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2a2a]">
            <span className="text-gray-500 text-xs">Page {page} of {pages} · {total.toLocaleString()} records</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors">
                <FiChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pages - 4));
                const n = start + i;
                return (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                      n === page ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}>{n}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors">
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Users Overview ─────────────────────────────────── */}
      <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <FiUsers size={16} className="text-[#E50914]" />
            <h2 className="text-white font-semibold text-sm">All Users</h2>
            <span className="text-gray-500 text-xs">({allUsers.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Watch Time</th>
                <th className="px-4 py-3 font-medium">Videos</th>
                <th className="px-4 py-3 font-medium">Avg Completion</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
                <th className="px-4 py-3 font-medium">Member Since</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {allUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-600 text-sm">No users found</td>
                </tr>
              ) : (
                allUsers.map(u => (
                  <tr key={u.id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/analytics/user/${u.id}`} className="text-white hover:text-[#E50914] transition-colors truncate max-w-[200px] block">
                        {u.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{formatSeconds(u.watchTimeSeconds)}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{u.videosWatched}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#E50914] rounded-full" style={{ width: `${u.avgCompletion}%` }} />
                        </div>
                        <span className="text-gray-400 text-xs">{u.avgCompletion}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : <span className="text-gray-700">Never</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/analytics/user/${u.id}`}
                            className="text-[11px] text-blue-400 hover:underline">Details</Link>
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

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[#E50914]" />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}
