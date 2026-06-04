'use client';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import HeroBanner from '@/components/HeroBanner';
import ContentRow from '@/components/ContentGrid';
import ContentCard from '@/components/ContentCard';
import { SkeletonHero, SkeletonRow } from '@/components/SkeletonLoader';
import { Content } from '@/components/ContentCard';
import { fetchContent, recordVisit } from '@/lib/api';
import { getContinueWatching, WatchEntry } from '@/lib/auth';
import { getWatchlist } from '@/lib/watchlist';
import { FiShuffle, FiFilter } from 'react-icons/fi';

const MOODS = [
  { label: 'All',       value: '',          emoji: '🎬' },
  { label: 'Movies',    value: 'movie',     emoji: '🎥' },
  { label: 'Series',    value: 'series',    emoji: '📺' },
  { label: 'Action',    value: 'Action',    emoji: '💥' },
  { label: 'Comedy',    value: 'Comedy',    emoji: '😂' },
  { label: 'Drama',     value: 'Drama',     emoji: '🎭' },
  { label: 'Horror',    value: 'Horror',    emoji: '👻' },
  { label: 'Sci-Fi',    value: 'Sci-Fi',    emoji: '🚀' },
  { label: 'Romance',   value: 'Romance',   emoji: '❤️' },
  { label: 'Thriller',  value: 'Thriller',  emoji: '😱' },
  { label: 'Animation', value: 'Animation', emoji: '✨' },
];

// ── Inner component that uses useSearchParams ─────────────
function HomeContent() {
  const router  = useRouter();
  const params  = useSearchParams();

  const [all,      setAll]      = useState<Content[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [mood,     setMood]     = useState('');
  const [watching, setWatching] = useState<WatchEntry[]>([]);
  const [myList,   setMyList]   = useState<{ id: string }[]>([]);

  useEffect(() => {
    const t = params.get('type');
    if (t) setMood(t);
  }, [params]);

  useEffect(() => {
    recordVisit('/');
    fetchContent()
      .then(setAll)
      .catch(console.error)
      .finally(() => setLoading(false));

    setWatching(getContinueWatching());
    setMyList(getWatchlist());

    const sync = () => setMyList(getWatchlist());
    window.addEventListener('watchlist-change', sync);
    return () => window.removeEventListener('watchlist-change', sync);
  }, []);

  const watchMap = useMemo(
    () => Object.fromEntries(watching.map((w) => [w.id, w])),
    [watching]
  );

  const filtered = useMemo(() => {
    let list = all;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }
    if (mood) {
      if (mood === 'movie' || mood === 'series') list = list.filter((c) => c.type === mood);
      else list = list.filter((c) => c.category.toLowerCase() === mood.toLowerCase());
    }
    return list;
  }, [all, query, mood]);

  const movies = filtered.filter((c) => c.type === 'movie');
  const series = filtered.filter((c) => c.type === 'series');

  const movieByCategory = useMemo(() => {
    const map: Record<string, Content[]> = {};
    movies.forEach((m) => { (map[m.category] = map[m.category] || []).push(m); });
    return map;
  }, [movies]);

  const newReleases = useMemo(
    () => [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
    [all]
  );

  const myListContent = useMemo(
    () => myList.flatMap(({ id }) => all.filter((c) => c._id === id)).slice(0, 10),
    [myList, all]
  );

  const continueContent = useMemo(
    () => watching.flatMap(({ id }) => all.filter((c) => c._id === id)).slice(0, 10),
    [watching, all]
  );

  const randomPick = () => {
    if (!all.length) return;
    const pick = all[Math.floor(Math.random() * all.length)];
    router.push(`/watch/${pick._id}`);
  };

  const isSearching = !!query.trim();
  const isFiltering = !!mood;

  if (loading) {
    return (
      <>
        <Navbar />
        <SkeletonHero />
        <div className="mt-6"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      </>
    );
  }

  return (
    <>
      <Navbar onSearch={setQuery} />

      {/* Hero */}
      {!isSearching && !isFiltering && all.length > 0 && <HeroBanner items={all} />}

      {/* Mood / filter tabs */}
      <div className={`${!isSearching && !isFiltering ? '' : 'pt-24'} sticky top-[60px] z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5`}>
        <div className="flex items-center gap-1 px-4 md:px-10 overflow-x-auto py-3" style={{ scrollbarWidth: 'none' }}>
          {MOODS.map(({ label, value, emoji }) => (
            <button
              key={value}
              onClick={() => { setMood(mood === value ? '' : value); setQuery(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                mood === value
                  ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
          <div className="ml-auto flex-shrink-0 pl-3 border-l border-white/10">
            <button
              onClick={randomPick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all whitespace-nowrap"
            >
              <FiShuffle size={12} /> Surprise Me
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-28 md:pb-16">
        {/* Search results */}
        {isSearching && (
          <div className="px-4 md:px-10 py-8">
            <p className="text-gray-400 text-sm mb-6">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
              <span className="text-white font-semibold">"{query}"</span>
            </p>
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🔍</p>
                <p className="text-gray-500">Nothing matched — try a different search.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {filtered.map((c) => <ContentCard key={c._id} content={c} progress={watchMap[c._id]?.progress} />)}
              </div>
            )}
          </div>
        )}

        {/* Mood filter grid */}
        {isFiltering && !isSearching && (
          <div className="px-4 md:px-10 py-8">
            <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
              <FiFilter size={13} />
              {filtered.length} title{filtered.length !== 1 ? 's' : ''} found
            </p>
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🎬</p>
                <p className="text-gray-500">No content in this category yet.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {filtered.map((c) => <ContentCard key={c._id} content={c} progress={watchMap[c._id]?.progress} />)}
              </div>
            )}
          </div>
        )}

        {/* Default rows */}
        {!isSearching && !isFiltering && (
          <>
            {continueContent.length > 0 && (
              <ContentRow title="▶ Continue Watching" items={continueContent} watchMap={watchMap} accent />
            )}
            {myListContent.length > 0 && (
              <ContentRow title="🔖 My List" items={myListContent} watchMap={watchMap} />
            )}
            {newReleases.length > 0 && (
              <ContentRow title="✨ New Releases" items={newReleases} watchMap={watchMap} />
            )}
            {series.length > 0 && (
              <ContentRow title="📺 Series" items={series} watchMap={watchMap} />
            )}
            {Object.entries(movieByCategory).map(([cat, items]) => (
              <ContentRow key={cat} title={`🎬 ${cat}`} items={items} watchMap={watchMap} />
            ))}
            {movies.length > 0 && Object.keys(movieByCategory).length === 0 && (
              <ContentRow title="🎬 Movies" items={movies} watchMap={watchMap} />
            )}
          </>
        )}

        {all.length === 0 && (
          <div className="text-center py-28 fade-up">
            <p className="text-8xl mb-6">🎬</p>
            <h2 className="text-white text-2xl font-bold mb-2">Nothing here yet</h2>
            <p className="text-gray-500 text-sm">The admin hasn't published any content.</p>
          </div>
        )}
      </div>

      <footer className="border-t border-white/5 py-10 text-center">
        <p className="font-bebas text-3xl mb-2" style={{ color: '#E50914', letterSpacing: '0.15em' }}>IWACUFLIX</p>
        <p className="text-gray-700 text-xs">© {new Date().getFullYear()} Iwacuflix. All rights reserved.</p>
      </footer>
    </>
  );
}

// ── Default export with Suspense boundary ─────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Suspense fallback={
        <div className="min-h-screen bg-[#0a0a0a]">
          <SkeletonHero />
          <div className="mt-6"><SkeletonRow /><SkeletonRow /></div>
        </div>
      }>
        <HomeContent />
      </Suspense>
    </div>
  );
}
