'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiPlay, FiPlus, FiCheck, FiClock } from 'react-icons/fi';
import { isInWatchlist, toggleWatchlist } from '@/lib/watchlist';

export interface Content {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  type: 'movie' | 'series';
  category: string;
  season?: number;
  episode?: number;
  isPublished: boolean;
  createdAt: string;
}

interface Props {
  content: Content;
  progress?: number;
}

export default function ContentCard({ content, progress }: Props) {
  const [imgErr,  setImgErr]  = useState(false);
  const [inList,  setInList]  = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setInList(isInWatchlist(content._id));
    const handler = () => setInList(isInWatchlist(content._id));
    window.addEventListener('watchlist-change', handler);
    return () => window.removeEventListener('watchlist-change', handler);
  }, [content._id]);

  const isNew = new Date(content.createdAt).getTime() > Date.now() - 7 * 86400000;

  const handleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist({
      id: content._id, title: content.title, thumbnail: content.thumbnail,
      type: content.type, category: content.category,
    });
    setInList(!inList);
    window.dispatchEvent(new Event('watchlist-change'));
  };

  const subtitle =
    content.type === 'series' && content.season && content.episode
      ? `S${content.season} · E${content.episode}`
      : content.category;

  return (
    <Link
      href={`/watch/${content._id}`}
      className="block flex-shrink-0 w-40 md:w-48 card-scale group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a]">
        {!imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.thumbnail} alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🎬</div>
        )}

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
            <FiPlay className="text-black ml-0.5" size={18} fill="black" />
          </div>
        </div>

        {/* Badges — top left */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {isNew && (
            <span className="text-[9px] font-black uppercase bg-[#E50914] text-white px-1.5 py-0.5 rounded-sm tracking-wider">
              New
            </span>
          )}
          <span className="text-[9px] font-bold uppercase bg-black/60 backdrop-blur-sm text-gray-300 px-1.5 py-0.5 rounded-sm">
            {content.type === 'series' ? 'Series' : 'Film'}
          </span>
        </div>

        {/* Watchlist button — top right */}
        <button
          onClick={handleList}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
            ${hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
            ${inList ? 'bg-green-500 text-white' : 'bg-black/60 backdrop-blur-sm text-white hover:bg-white/20'}
          `}
          title={inList ? 'Remove from list' : 'Add to list'}
        >
          {inList ? <FiCheck size={13} /> : <FiPlus size={13} />}
        </button>

        {/* Progress bar */}
        {progress !== undefined && progress > 0 && progress < 98 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-[#E50914]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2.5 px-0.5">
        <p className="text-white text-xs font-semibold truncate group-hover:text-[#E50914] transition-colors">
          {content.title}
        </p>
        <p className="text-gray-500 text-[11px] mt-0.5 flex items-center gap-1 truncate">
          {progress !== undefined && progress > 0 && <FiClock size={9} />}
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
