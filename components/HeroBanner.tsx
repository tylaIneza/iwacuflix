'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Content } from './ContentCard';
import { isInWatchlist, toggleWatchlist } from '@/lib/watchlist';
import { FiPlay, FiPlus, FiCheck, FiChevronLeft, FiChevronRight, FiInfo } from 'react-icons/fi';

export default function HeroBanner({ items }: { items: Content[] }) {
  const featured  = items.slice(0, 6);
  const [idx,     setIdx]     = useState(0);
  const [inList,  setInList]  = useState(false);
  const [fading,  setFading]  = useState(false);
  const [paused,  setPaused]  = useState(false);

  const go = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => { setIdx(next); setFading(false); }, 500);
  }, []);

  const prev = () => go((idx - 1 + featured.length) % featured.length);
  const next = () => go((idx + 1) % featured.length);

  useEffect(() => {
    if (paused || featured.length <= 1) return;
    const t = setInterval(() => go((idx + 1) % featured.length), 9000);
    return () => clearInterval(t);
  }, [idx, paused, featured.length, go]);

  useEffect(() => {
    if (featured[idx]) setInList(isInWatchlist(featured[idx]._id));
  }, [idx, featured]);

  if (!featured.length) return null;
  const item = featured[idx];

  const handleList = () => {
    const added = toggleWatchlist({
      id: item._id, title: item.title, thumbnail: item.thumbnail,
      type: item.type, category: item.category,
    });
    setInList(added);
    window.dispatchEvent(new Event('watchlist-change'));
  };

  const isNew = new Date(item.createdAt).getTime() > Date.now() - 7 * 86400000;

  return (
    <div
      className="relative h-[85vh] sm:h-screen min-h-[520px] max-h-[900px] overflow-hidden noise select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* BG image */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover scale-105 transition-transform duration-[10s] hover:scale-100" />
        {/* Cinematic gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col justify-end h-full pb-32 sm:pb-28 md:pb-36 px-5 sm:px-6 md:px-16 max-w-3xl transition-all duration-500 ${fading ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'}`}>
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {isNew && (
            <span className="text-[10px] font-black uppercase tracking-widest bg-[#E50914] text-white px-2.5 py-0.5 rounded-sm glow-pulse">
              New
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#E50914] font-bold border border-[#E50914]/50 px-2.5 py-0.5 rounded-sm">
            {item.type === 'series' ? 'Series' : 'Film'}
          </span>
          <span className="text-gray-400 text-xs">{item.category}</span>
          {item.type === 'series' && item.season && item.episode && (
            <span className="text-gray-500 text-xs">· S{item.season} E{item.episode}</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-3 sm:mb-4 drop-shadow-2xl gradient-text">
          {item.title}
        </h1>

        {/* Description */}
        <p className="text-gray-300 text-sm md:text-base max-w-xl mb-5 sm:mb-7 clamp-2 sm:clamp-3 leading-relaxed">
          {item.description}
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href={`/watch/${item._id}`}
            className="flex items-center gap-2 sm:gap-2.5 bg-white text-black font-black px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl hover:bg-gray-100 transition-all text-sm shadow-2xl hover:scale-105 active:scale-95"
          >
            <FiPlay fill="black" size={16} /> Play Now
          </Link>
          <button
            onClick={handleList}
            className="flex items-center gap-2 glass text-white font-semibold px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl hover:bg-white/15 transition-all text-sm"
          >
            {inList ? <FiCheck size={16} className="text-green-400" /> : <FiPlus size={16} />}
            {inList ? 'In My List' : 'My List'}
          </button>
          <Link
            href={`/watch/${item._id}`}
            className="hidden sm:flex items-center gap-2 glass text-white font-semibold px-5 py-3.5 rounded-xl hover:bg-white/15 transition-all text-sm"
          >
            <FiInfo size={16} /> More Info
          </Link>
        </div>
      </div>

      {/* Prev / Next arrows */}
      {featured.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 glass w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-50 hover:opacity-100 active:scale-90">
            <FiChevronLeft size={18} />
          </button>
          <button onClick={next} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 glass w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-50 hover:opacity-100 active:scale-90">
            <FiChevronRight size={18} />
          </button>
        </>
      )}

      {/* Progress dots */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {featured.map((_, i) => (
            <button
              key={i} onClick={() => go(i)}
              className={`rounded-full transition-all duration-300 ${
                i === idx ? 'bg-[#E50914] w-5 h-1.5' : 'bg-white/30 w-1.5 h-1.5 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Slide counter */}
      <div className="absolute bottom-8 sm:bottom-10 right-5 sm:right-8 z-20 text-gray-500 text-xs tabular-nums">
        {String(idx + 1).padStart(2, '0')} / {String(featured.length).padStart(2, '0')}
      </div>
    </div>
  );
}
