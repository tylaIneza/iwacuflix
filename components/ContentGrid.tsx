'use client';
import { useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ContentCard, { Content } from './ContentCard';
import { WatchEntry } from '@/lib/auth';

interface Props {
  title: string;
  items: Content[];
  watchMap?: Record<string, WatchEntry>;
  accent?: boolean;
}

export default function ContentRow({ title, items, watchMap, accent }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const scroll = (dir: 'l' | 'r') => {
    rowRef.current?.scrollBy({ left: dir === 'r' ? 340 : -340, behavior: 'smooth' });
  };

  return (
    <section className="mb-10 fade-up">
      {/* Row header */}
      <div className="flex items-center justify-between px-4 md:px-10 mb-3">
        <h2 className={`font-bold text-base md:text-lg ${accent ? 'text-[#E50914]' : 'text-white'}`}>
          {title}
          <span className="ml-2 text-gray-600 text-sm font-normal">{items.length}</span>
        </h2>
        <span className="text-gray-600 text-xs hidden md:block cursor-default select-none">
          Scroll or use arrows →
        </span>
      </div>

      {/* Scrollable row with arrow buttons */}
      <div className="relative group/row">
        <button
          onClick={() => scroll('l')}
          className="absolute left-1 top-1/2 -translate-y-6 z-20 w-8 h-8 glass rounded-full flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 hover:bg-white/20 transition-all shadow-xl"
        >
          <FiChevronLeft size={18} />
        </button>

        <div ref={rowRef} className="content-row px-4 md:px-10">
          {items.map((item) => (
            <ContentCard
              key={item._id}
              content={item}
              progress={watchMap?.[item._id]?.progress}
            />
          ))}
        </div>

        <button
          onClick={() => scroll('r')}
          className="absolute right-1 top-1/2 -translate-y-6 z-20 w-8 h-8 glass rounded-full flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 hover:bg-white/20 transition-all shadow-xl"
        >
          <FiChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
