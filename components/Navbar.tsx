'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiBookmark, FiHome, FiFilm, FiTv } from 'react-icons/fi';
import { getWatchlist } from '@/lib/watchlist';

interface Props { onSearch?: (q: string) => void }

const NAV = [
  { href: '/',             label: 'Home',    icon: 'home'     },
  { href: '/?type=movie',  label: 'Movies',  icon: 'film'     },
  { href: '/?type=series', label: 'Series',  icon: 'tv'       },
  { href: '/list',         label: 'My List', icon: 'bookmark' },
];

export default function Navbar({ onSearch }: Props) {
  const pathname    = usePathname();
  const [scrolled,  setScrolled]  = useState(false);
  const [searchOn,  setSearchOn]  = useState(false);
  const [listCount, setListCount] = useState(0);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const syncCount = () => setListCount(getWatchlist().length);
  useEffect(() => {
    syncCount();
    window.addEventListener('watchlist-change', syncCount);
    return () => window.removeEventListener('watchlist-change', syncCount);
  }, []);

  useEffect(() => { if (searchOn) inputRef.current?.focus(); }, [searchOn]);

  const closeSearch = () => { setSearchOn(false); onSearch?.(''); };

  const getIcon = (icon: string, active: boolean) => {
    const cls = `transition-colors duration-200 ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`;
    if (icon === 'home')     return <FiHome     size={22} className={cls} />;
    if (icon === 'film')     return <FiFilm     size={22} className={cls} />;
    if (icon === 'tv')       return <FiTv       size={22} className={cls} />;
    if (icon === 'bookmark') return <FiBookmark size={22} className={cls} />;
  };

  return (
    <>
      {/* ── Top bar ───────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl shadow-black/40'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}>
        <div className="flex items-center justify-between px-4 md:px-10 py-3 md:py-4 gap-3">

          {/* Logo — hidden on mobile when search is open */}
          <div className={`flex items-center gap-6 md:gap-8 flex-shrink-0 ${searchOn ? 'hidden md:flex' : ''}`}>
            <Link
              href="/"
              className="logo-wrap overflow-hidden flex-shrink-0 block"
              style={{ width: '9rem' }}
              title="Iwacuflix — Home"
            >
              <div className="logo-track select-none">
                {['IWACUFLIX · ', 'IWACUFLIX · '].map((text, i) => (
                  <span
                    key={i}
                    className="font-bebas text-2xl md:text-3xl"
                    style={{ color: '#E50914', textShadow: '0 0 18px rgba(229,9,20,0.55)', whiteSpace: 'nowrap' }}
                  >
                    {text}
                  </span>
                ))}
              </div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV.map(({ href, label }) => {
                const active = label === 'Home'
                  ? pathname === '/'
                  : label === 'My List'
                  ? pathname === '/list'
                  : false;
                return (
                  <Link
                    key={href} href={href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
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

          {/* Search — full-width on mobile when open */}
          <div className={`flex items-center gap-2 md:gap-3 ${searchOn ? 'flex-1' : ''}`}>
            {onSearch && (
              searchOn ? (
                <div className="flex items-center gap-2 glass px-3 py-2 rounded-xl w-full">
                  <FiSearch className="text-gray-400 flex-shrink-0" size={15} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search movies, series…"
                    onChange={(e) => onSearch(e.target.value)}
                    className="bg-transparent text-white text-sm outline-none flex-1 min-w-0 placeholder-gray-500"
                  />
                  <button onClick={closeSearch} className="text-gray-500 hover:text-white flex-shrink-0 p-0.5">
                    <FiX size={16} />
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
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom nav — hidden on watch pages ─── */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0a]/96 backdrop-blur-xl border-t border-white/[0.08] ${
        pathname.startsWith('/watch') ? 'hidden' : ''
      }`}>
        <div className="flex items-stretch justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {NAV.map(({ href, label, icon }) => {
            const active = label === 'Home'
              ? pathname === '/'
              : label === 'My List'
              ? pathname === '/list'
              : false;
            const isMyList = label === 'My List';
            return (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center justify-center gap-1 flex-1 pt-2.5 pb-2 relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#E50914] rounded-full" />
                )}
                <div className="relative">
                  {getIcon(icon, active)}
                  {isMyList && listCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#E50914] text-white text-[9px] rounded-full flex items-center justify-center font-black px-0.5">
                      {listCount > 9 ? '9+' : listCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? 'text-white' : 'text-gray-500'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
