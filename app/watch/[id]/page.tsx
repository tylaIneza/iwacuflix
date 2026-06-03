'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import ContentCard from '@/components/ContentCard';
import { Content } from '@/components/ContentCard';
import { fetchContentById, fetchContent, recordView, recordVisit } from '@/lib/api';
import { getWatchEntry } from '@/lib/auth';
import { isInWatchlist, toggleWatchlist } from '@/lib/watchlist';
import {
  FiArrowLeft, FiChevronRight, FiLoader, FiPlus, FiCheck,
  FiShare2, FiClock, FiFilm, FiTv,
} from 'react-icons/fi';

export default function WatchPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [content,   setContent]   = useState<Content | null>(null);
  const [related,   setRelated]   = useState<Content[]>([]);
  const [nextEp,    setNextEp]    = useState<Content | null>(null);
  const [episodes,  setEpisodes]  = useState<Content[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [startTime, setStartTime] = useState(0);
  const [inList,    setInList]    = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const load = useCallback(async (contentId: string) => {
    setLoading(true); setError('');
    try {
      const item: Content = await fetchContentById(contentId);
      setContent(item);
      recordView(contentId);
      recordVisit(`/watch/${contentId}`);
      setInList(isInWatchlist(contentId));

      const saved = getWatchEntry(contentId);
      setStartTime(saved && saved.progress < 95 ? saved.currentTime : 0);

      const allContent: Content[] = await fetchContent();

      if (item.type === 'series') {
        const eps = allContent
          .filter((c) => c.type === 'series' && c.category === item.category)
          .sort((a, b) => ((a.season ?? 0) * 1000 + (a.episode ?? 0)) - ((b.season ?? 0) * 1000 + (b.episode ?? 0)));
        setEpisodes(eps);
        const idx = eps.findIndex((c) => c._id === contentId);
        setNextEp(idx >= 0 && idx < eps.length - 1 ? eps[idx + 1] : null);
        setRelated(eps.filter((c) => c._id !== contentId).slice(0, 8));
      } else {
        setEpisodes([]);
        setNextEp(null);
        setRelated(allContent.filter((c) => c._id !== contentId && c.category === item.category).slice(0, 8));
      }
    } catch {
      setError('Content not found or unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(id); }, [id, load]);

  // Countdown to next episode
  const handleEnded = () => {
    if (!nextEp) return;
    setCountdown(8);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { router.push(`/watch/${nextEp!._id}`); return; }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, nextEp, router]);

  const handleList = () => {
    if (!content) return;
    const added = toggleWatchlist({
      id: content._id, title: content.title, thumbnail: content.thumbnail,
      type: content.type, category: content.category,
    });
    setInList(added);
    window.dispatchEvent(new Event('watchlist-change'));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <p className="text-8xl mb-2">😕</p>
        <p className="text-gray-400 text-lg">{error || 'Content not found.'}</p>
        <Link href="/" className="flex items-center gap-2 text-[#E50914] hover:underline text-sm">
          <FiArrowLeft /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="pt-20 max-w-7xl mx-auto px-4 md:px-8 pb-20">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mt-4 mb-5 transition-colors group"
        >
          <FiArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Browse
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: Player + Info ─────────────────────── */}
          <div className="lg:col-span-2 fade-up">
            {/* Player */}
            <VideoPlayer
              url={content.videoUrl}
              content={content}
              startTime={startTime}
              onEnded={handleEnded}
            />

            {/* Next episode countdown banner */}
            {countdown !== null && nextEp && (
              <div className="mt-3 flex items-center justify-between glass rounded-xl px-5 py-4 fade-up">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Up next in {countdown}s</p>
                  <p className="text-white font-semibold text-sm">{nextEp.title}</p>
                  {nextEp.season && nextEp.episode && (
                    <p className="text-gray-500 text-xs mt-0.5">S{nextEp.season} · E{nextEp.episode}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCountdown(null)}
                    className="px-4 py-2 border border-white/20 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <Link
                    href={`/watch/${nextEp._id}`}
                    className="flex items-center gap-1.5 bg-[#E50914] hover:bg-[#c40812] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Play Now <FiChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            {/* Content meta */}
            <div className="mt-6 fade-up">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="inline-flex items-center gap-1 text-xs text-[#E50914] border border-[#E50914]/40 px-2.5 py-0.5 rounded-full font-semibold">
                  {content.type === 'series' ? <FiTv size={11} /> : <FiFilm size={11} />}
                  {content.type === 'movie' ? 'Movie' : 'Series'}
                </span>
                <span className="text-gray-500 text-xs">{content.category}</span>
                {content.type === 'series' && content.season && content.episode && (
                  <span className="text-gray-500 text-xs">· Season {content.season} · Episode {content.episode}</span>
                )}
                {startTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                    <FiClock size={10} /> Resuming
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{content.title}</h1>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed max-w-2xl">{content.description}</p>

              {/* Action row */}
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <button
                  onClick={handleList}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    inList
                      ? 'bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30'
                      : 'glass hover:bg-white/10 text-white'
                  }`}
                >
                  {inList ? <FiCheck size={15} /> : <FiPlus size={15} />}
                  {inList ? 'In My List' : 'Add to List'}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 glass hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  <FiShare2 size={15} />
                  {copied ? 'Link Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* Episode list for series */}
            {episodes.length > 1 && (
              <div className="mt-10 fade-up">
                <h2 className="text-white font-bold text-base mb-3">All Episodes</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {episodes.map((ep) => {
                    const isCurrent = ep._id === content._id;
                    return (
                      <Link
                        key={ep._id} href={`/watch/${ep._id}`}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isCurrent
                            ? 'bg-[#E50914]/15 border border-[#E50914]/30'
                            : 'glass hover:bg-white/8'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ep.thumbnail} alt={ep.title}
                          className="w-20 aspect-video object-cover rounded-lg flex-shrink-0 bg-gray-800"
                          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                        />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#E50914]' : 'text-white'}`}>
                            {ep.title}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">S{ep.season} · E{ep.episode}</p>
                        </div>
                        {isCurrent && (
                          <span className="ml-auto flex-shrink-0 text-[10px] text-[#E50914] font-bold uppercase tracking-wide">Playing</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: More Like This ──────────────────── */}
          <div className="fade-up">
            <h2 className="text-white font-bold text-base mb-4">
              {content.type === 'series' ? 'Other Series' : 'More Like This'}
            </h2>
            {related.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="text-4xl mb-2">🎬</p>
                <p className="text-sm">No similar content yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {related.map((r) => (
                  <Link key={r._id} href={`/watch/${r._id}`} className="flex gap-3 group glass hover:bg-white/8 rounded-xl p-2.5 transition-all">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.thumbnail} alt={r.title}
                      className="w-24 aspect-video object-cover rounded-lg flex-shrink-0 bg-gray-800 group-hover:opacity-80 transition-opacity"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                    <div className="min-w-0 py-0.5">
                      <p className="text-white text-xs font-semibold truncate group-hover:text-[#E50914] transition-colors">
                        {r.title}
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">{r.category}</p>
                      {r.type === 'series' && r.season && r.episode && (
                        <p className="text-gray-600 text-[10px]">S{r.season} · E{r.episode}</p>
                      )}
                      <p className="text-gray-600 text-[10px] mt-1 clamp-2 leading-relaxed">{r.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
