'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiBookmark } from 'react-icons/fi';
import { getWatchlist } from '@/lib/watchlist';

interface Props { onSearch?: (q: string) => void }

const NAV = [
  { href: '/',        label: 'Home' },
  { href: '/?type=movie',  label: 'Movies' },
  { href: '/?type=series', label: 'Series' },
  { href: '/list',    label: 'My List' },
];

export default function Navbar({ onSearch }: Props) {
  const pathname   = usePathname();
  const [scrolled, setScrolled]     = useState(false);
  const [searchOn, setSearchOn]     = useState(false);
  const [listCount,setListCount]    = useState(0);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sync watchlist badge
  const syncCount = () => setListCount(getWatchlist().length);
  useEffect(() => {
    syncCount();
    window.addEventListener('watchlist-change', syncCount);
    return () => window.removeEventListener('watchlist-change', syncCount);
  }, []);

  useEffect(() => { if (searchOn) inputRef.current?.focus(); }, [searchOn]);

  const closeSearch = () => { setSearchOn(false); onSearch?.(''); };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl shadow-black/40' : 'bg-gradient-to-b from-black/80 to-transparent'
    }`}>
      <div className="flex items-center justify-between px-4 md:px-10 py-3 md:py-4">

        {/* Logo — scrolling marquee with Bebas Neue */}
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            href="/"
            className="logo-wrap overflow-hidden flex-shrink-0 block"
            style={{ width: '9rem' }}
            title="Iwacuflix — Home"
          >
            <div className="logo-track select-none">
              {/* Duplicate the text so the loop is seamless */}
              {['IWACUFLIX · ', 'IWACUFLIX · '].map((text, i) => (
                <span
                  key={i}
                  className="font-bebas text-2xl md:text-3xl"
                  style={{
                    color: '#E50914',
                    textShadow: '0 0 18px rgba(229,9,20,0.55)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {text}
                </span>
              ))}
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const active = label === 'Home' ? pathname === '/' : pathname === href;
              return (
                <Link
                  key={href} href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                  {label === 'My List' && listCount > 0 && (
                    <span className="ml-1.5 bg-[#E50914] text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                      {listCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Search */}
          {onSearch && (
            searchOn ? (
              <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg">
                <FiSearch className="text-gray-400 flex-shrink-0" size={15} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search…"
                  onChange={(e) => onSearch(e.target.value)}
                  className="bg-transparent text-white text-sm outline-none w-36 md:w-52 placeholder-gray-500"
                />
                <button onClick={closeSearch} className="text-gray-500 hover:text-white flex-shrink-0">
                  <FiX size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOn(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
              >
                <FiSearch size={19} />
              </button>
            )
          )}

          {/* My List icon (mobile) */}
          <Link href="/list" className="md:hidden p-2 text-gray-400 hover:text-white relative">
            <FiBookmark size={19} />
            {listCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#E50914] rounded-full" />
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
