'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getWatchlist, removeFromWatchlist, WatchlistItem } from '@/lib/watchlist';
import { fetchContent } from '@/lib/api';
import { Content } from '@/components/ContentCard';
import { FiTrash2, FiPlay, FiBookmark } from 'react-icons/fi';

export default function MyListPage() {
  const [list,    setList]    = useState<WatchlistItem[]>([]);
  const [all,     setAll]     = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const sync = () => setList(getWatchlist());

  useEffect(() => {
    sync();
    fetchContent().then(setAll).catch(console.error).finally(() => setLoading(false));
    window.addEventListener('watchlist-change', sync);
    return () => window.removeEventListener('watchlist-change', sync);
  }, []);

  const items = useMemo(
    () => list.map((entry) => ({ entry, content: all.find((c) => c._id === entry.id) }))
      .filter((x) => x.content),
    [list, all]
  );

  const remove = (id: string) => {
    removeFromWatchlist(id);
    sync();
    window.dispatchEvent(new Event('watchlist-change'));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="pt-28 pb-20 px-4 md:px-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-white text-3xl font-black flex items-center gap-3">
              <FiBookmark className="text-[#E50914]" /> My List
            </h1>
            <p className="text-gray-500 text-sm mt-1">{list.length} saved title{list.length !== 1 ? 's' : ''}</p>
          </div>
          {list.length > 0 && (
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              ← Browse more
            </Link>
          )}
        </div>

        {/* Empty state */}
        {!loading && list.length === 0 && (
          <div className="text-center py-28 fade-up">
            <p className="text-8xl mb-6">🔖</p>
            <h2 className="text-white text-xl font-bold mb-2">Your list is empty</h2>
            <p className="text-gray-500 text-sm mb-6">Add movies and series by clicking the + button on any title.</p>
            <Link href="/" className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
              Browse Content
            </Link>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map(({ entry, content }) => (
            <div key={entry.id} className="group relative fade-up">
              {/* Thumbnail */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content!.thumbnail} alt={content!.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Link
                    href={`/watch/${entry.id}`}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-xl"
                  >
                    <FiPlay className="text-black ml-0.5" fill="black" size={16} />
                  </Link>
                  <button
                    onClick={() => remove(entry.id)}
                    className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-xl"
                  >
                    <FiTrash2 className="text-white" size={15} />
                  </button>
                </div>
                <span className="absolute top-2 left-2 text-[9px] font-black uppercase bg-[#E50914] text-white px-1.5 py-0.5 rounded-sm">
                  {content!.type}
                </span>
              </div>

              {/* Info */}
              <div className="mt-2.5">
                <p className="text-white text-xs font-semibold truncate">{content!.title}</p>
                <p className="text-gray-500 text-[11px]">{content!.category}</p>
                <p className="text-gray-700 text-[10px] mt-0.5">
                  Added {new Date(entry.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
