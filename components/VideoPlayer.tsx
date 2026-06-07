'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { saveWatchProgress } from '@/lib/auth';
import {
  FiAlertTriangle, FiPlay, FiPause,
  FiMaximize, FiMinimize, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';

interface Content {
  _id: string; title: string; thumbnail: string;
  type: 'movie' | 'series'; season?: number; episode?: number;
}
interface Props {
  url: string;
  content: Content;
  startTime?: number;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onIframeLoad?: () => void;
}

// ── Platform detector ─────────────────────────────────────
function getPlatform(url: string) {
  if (/youtu/i.test(url))             return { name: 'YouTube',     icon: '▶', color: '#FF0000' };
  if (/vimeo/i.test(url))             return { name: 'Vimeo',       icon: '◆', color: '#1AB7EA' };
  if (/cloudflare/i.test(url))        return { name: 'Iwacuflix',   icon: '▶', color: '#E50914' };
  if (/drive\.google/i.test(url))     return { name: 'Iwacuflix',   icon: '▶', color: '#E50914' };
  if (/dailymotion/i.test(url))       return { name: 'Dailymotion', icon: '◉', color: '#0066DC' };
  if (/ok\.ru/i.test(url))            return { name: 'Iwacuflix',   icon: '▶', color: '#E50914' };
  if (/facebook/i.test(url))          return { name: 'Iwacuflix',   icon: '▶', color: '#E50914' };
  if (/\.(mp4|webm|m3u8)/i.test(url)) return { name: 'Iwacuflix',  icon: '▶', color: '#E50914' };
  return                                { name: 'Iwacuflix',         icon: '▶', color: '#E50914' };
}

// ── URL resolver ──────────────────────────────────────────
interface Resolved { kind: 'iframe' | 'video'; src: string }

function resolveUrl(raw: string, startTime = 0): Resolved {
  const url = raw.trim();

  const ytId = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )?.[1];
  if (ytId) {
    const t = startTime > 0 ? `&start=${Math.floor(startTime)}` : '';
    return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&color=white${t}` };
  }
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/'))
    return { kind: 'iframe', src: url };

  const vimeoId = !url.includes('player.vimeo.com') && url.match(/vimeo\.com\/(\d+)/)?.[1];
  if (vimeoId) {
    const t = startTime > 0 ? `#t=${Math.floor(startTime)}s` : '';
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&color=E50914${t}` };
  }
  if (url.includes('player.vimeo.com')) return { kind: 'iframe', src: url };

  if (url.includes('cloudflarestream.com') || url.includes('videodelivery.net')) {
    if (url.includes('iframe.cloudflarestream.com')) return { kind: 'iframe', src: url };
    const cfId = url.match(/(?:cloudflarestream\.com|videodelivery\.net)\/([a-f0-9]+)/)?.[1];
    if (cfId) {
      const t = startTime > 0 ? `&startTime=${Math.floor(startTime)}` : '';
      return { kind: 'iframe', src: `https://iframe.cloudflarestream.com/${cfId}?preload=true${t}` };
    }
    return { kind: 'iframe', src: url };
  }
  if (/^[0-9a-f]{32}$/.test(url))
    return { kind: 'iframe', src: `https://iframe.cloudflarestream.com/${url}` };

  const driveId = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (driveId) return { kind: 'iframe', src: `https://drive.google.com/file/d/${driveId}/preview` };

  const dmId = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/)?.[1];
  if (dmId) return { kind: 'iframe', src: `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1` };

  const okId = url.match(/ok\.ru\/video\/(\d+)/)?.[1];
  if (okId) return { kind: 'iframe', src: `https://ok.ru/videoembed/${okId}` };

  if (url.includes('facebook.com/') && url.includes('/videos/'))
    return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true` };

  if (url.includes('/embed') || url.includes('player.') || url.includes('/iframe'))
    return { kind: 'iframe', src: url };

  if (/\.(mp4|webm|ogg|m3u8|mkv|mov|avi)(\?.*)?$/i.test(url))
    return { kind: 'video', src: url };

  return { kind: 'iframe', src: url };
}

// ── Time formatter ────────────────────────────────────────
function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────
export default function VideoPlayer({
  url, content, startTime = 0,
  onEnded, onPlay, onPause, onTimeUpdate, onIframeLoad,
}: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Base state
  const [ready,   setReady]   = useState(false);
  const [errored, setErrored] = useState(false);

  // Custom controls state
  const [ctrlVisible,  setCtrlVisible]  = useState(true);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currTime,     setCurrTime]     = useState(0);
  const [dur,          setDur]          = useState(0);
  const [seekDragging, setSeekDragging] = useState(false);
  const [seekFlash,    setSeekFlash]    = useState<'back' | 'fwd' | null>(null);
  const [isFs,         setIsFs]         = useState(false);

  // Mutable refs (avoid stale closures)
  const hideTimer    = useRef<ReturnType<typeof setTimeout>>();
  const isPlayingRef = useRef(false);
  const doubleTap    = useRef({ t: 0, side: '' });

  // ── Watch-progress saving ─────────────────────────────
  const saveProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v || isNaN(v.duration)) return;
    saveWatchProgress(content, v.currentTime, v.duration);
  }, [content]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (startTime > 0) v.currentTime = startTime;
    const iv = setInterval(saveProgress, 5000);
    v.addEventListener('ended', saveProgress);
    return () => { clearInterval(iv); v.removeEventListener('ended', saveProgress); };
  }, [saveProgress, startTime]);

  useEffect(() => { setReady(false); setErrored(false); }, [url]);

  // ── Fullscreen listener ───────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ── Controls visibility ───────────────────────────────
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVisible(false), 3000);
  }, []);

  const showCtrls = useCallback(() => {
    setCtrlVisible(true);
    clearTimeout(hideTimer.current);
  }, []);

  const resetCtrls = useCallback(() => {
    setCtrlVisible(true);
    clearTimeout(hideTimer.current);
    if (isPlayingRef.current) scheduleHide();
  }, [scheduleHide]);

  // ── Playback ──────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);

  // ── Fullscreen ────────────────────────────────────────
  const toggleFs = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try { await el.requestFullscreen(); }
      catch {
        try { (el as any).webkitRequestFullscreen(); }
        catch { (videoRef.current as any)?.webkitEnterFullscreen?.(); }
      }
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ── Tap area: double-tap seek + show/hide controls ────
  const handleAreaTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect  = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const side  = xFrac < 0.35 ? 'l' : xFrac > 0.65 ? 'r' : 'c';

    const now = Date.now();
    const dt  = doubleTap.current;

    // Double-tap on left or right zone → seek ±10s
    if (now - dt.t < 300 && dt.side === side && side !== 'c') {
      const v = videoRef.current;
      if (v) {
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (side === 'l' ? -10 : 10)));
        setSeekFlash(side === 'l' ? 'back' : 'fwd');
        setTimeout(() => setSeekFlash(null), 700);
      }
      dt.t = 0; dt.side = '';
      return;
    }

    dt.t = now; dt.side = side;

    // Single tap: show controls if hidden; toggle play if center & visible
    setCtrlVisible(prev => {
      if (!prev) { if (isPlayingRef.current) scheduleHide(); return true; }
      if (side === 'c') togglePlay();
      if (isPlayingRef.current) scheduleHide();
      return true;
    });
  }, [scheduleHide, togglePlay]);

  // ── Seek bar (pointer capture for reliable drag) ──────
  const doSeek = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v    = videoRef.current;
    if (v && dur > 0) { v.currentTime = frac * dur; setCurrTime(frac * dur); }
  }, [dur]);

  const handleSeekDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSeekDragging(true);
    doSeek(e);
    showCtrls();
  }, [doSeek, showCtrls]);

  const handleSeekMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!seekDragging) return;
    doSeek(e);
  }, [seekDragging, doSeek]);

  const handleSeekUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setSeekDragging(false);
    doSeek(e);
    resetCtrls();
  }, [doSeek, resetCtrls]);

  // ── Early returns ─────────────────────────────────────
  if (!url?.trim()) {
    return (
      <PlayerShell>
        <EmptyState />
      </PlayerShell>
    );
  }

  const { kind, src } = resolveUrl(url, startTime);
  const platform      = getPlatform(url);
  const pct           = dur > 0 ? Math.min(100, (currTime / dur) * 100) : 0;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="video-shell relative w-full rounded-xl sm:rounded-2xl overflow-hidden"
        style={{
          paddingBottom: '56.25%',
          background: '#000',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.07), 0 16px 48px rgba(0,0,0,0.85), 0 0 32px ${platform.color}1a`,
        }}
      >
        {/* ── Loading overlay ── */}
        {!ready && !errored && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black">
            <div
              className="absolute inset-0 opacity-10"
              style={{ background: `radial-gradient(ellipse at center, ${platform.color} 0%, transparent 70%)` }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: platform.color, animationDuration: '0.9s' }}
                />
                <div
                  className="absolute inset-2 rounded-full border border-transparent animate-spin"
                  style={{ borderTopColor: `${platform.color}80`, animationDuration: '1.4s', animationDirection: 'reverse' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm" style={{ color: platform.color }}>{platform.icon}</span>
                </div>
              </div>
              <div className="text-center px-4">
                <p className="text-white text-sm font-semibold line-clamp-1">{content.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">Loading from {platform.name}…</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {errored && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] px-6 text-center">
            <FiAlertTriangle size={30} className="text-yellow-500" />
            <p className="text-gray-300 text-sm font-semibold">Video couldn&apos;t load</p>
            <p className="text-gray-500 text-xs max-w-xs leading-relaxed">
              This site blocks embedding. Open the video page in your browser,
              press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white text-[10px]">F12</kbd> → Network tab → play the video → copy the{' '}
              <code className="text-[#E50914]">.mp4</code> or{' '}
              <code className="text-[#E50914]">m3u8</code> URL and paste it as the Video URL.
            </p>
          </div>
        )}

        {/* ── Iframe ── */}
        {kind === 'iframe' && (() => {
          const isYT    = src.includes('youtube.com') || src.includes('youtu.be');
          const isDrive = src.includes('drive.google.com');

          const iframeStyle: React.CSSProperties = isYT
            ? { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.7s' }
            : isDrive
            ? { position: 'absolute', top: '-52px', left: 0, width: '100%', height: 'calc(100% + 52px)', border: 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.7s' }
            : { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.7s' };

          return (
            <iframe
              key={src}
              src={src}
              title={content.title}
              style={iframeStyle}
              allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => { setReady(true); onIframeLoad?.(); }}
              onError={() => { setReady(true); setErrored(true); }}
            />
          );
        })()}

        {/* ── Native video with custom controls ── */}
        {kind === 'video' && (
          <>
            <video
              ref={videoRef}
              key={src}
              src={src}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
              style={{ opacity: ready ? 1 : 0, background: '#000' }}
              onCanPlay={() => setReady(true)}
              onError={() => { setReady(true); setErrored(true); }}
              onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
              onPlay={() => {
                isPlayingRef.current = true;
                setIsPlaying(true);
                scheduleHide();
                onPlay?.();
              }}
              onPause={() => {
                isPlayingRef.current = false;
                setIsPlaying(false);
                showCtrls();
                onPause?.();
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (!seekDragging) setCurrTime(v.currentTime);
                onTimeUpdate?.(v.currentTime, v.duration);
              }}
              onEnded={() => {
                isPlayingRef.current = false;
                saveProgress();
                setIsPlaying(false);
                showCtrls();
                onEnded?.();
              }}
            />

            {/* Tap area — double-tap seek zones + show/hide toggle */}
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={handleAreaTap}
            />

            {/* Double-tap seek flash */}
            {seekFlash && (
              <div
                className={`absolute top-0 bottom-0 z-10 w-1/3 flex items-center justify-center pointer-events-none ${
                  seekFlash === 'back' ? 'left-0' : 'right-0'
                }`}
              >
                <div className="bg-white/15 backdrop-blur-sm rounded-full p-3.5 sm:p-4 flex flex-col items-center gap-0.5">
                  {seekFlash === 'back'
                    ? <FiChevronsLeft  size={22} className="text-white" />
                    : <FiChevronsRight size={22} className="text-white" />
                  }
                  <span className="text-white text-[10px] font-semibold">10s</span>
                </div>
              </div>
            )}

            {/* Controls overlay */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
                ctrlVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

              <div className="relative px-3 sm:px-4 pb-2.5 sm:pb-3.5 pt-8 sm:pt-10">
                {/* Seek bar — tall touch target, thin visual track */}
                <div
                  className="relative h-7 sm:h-6 flex items-center cursor-pointer touch-none mb-1"
                  onPointerDown={handleSeekDown}
                  onPointerMove={handleSeekMove}
                  onPointerUp={handleSeekUp}
                >
                  <div className="w-full h-1 bg-white/25 rounded-full">
                    <div
                      className="h-full bg-[#E50914] rounded-full relative"
                      style={{ width: `${pct}%` }}
                    >
                      {/* Thumb */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-md" />
                    </div>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Play / Pause */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); resetCtrls(); }}
                    className="flex items-center justify-center text-white p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <FiPause size={20} fill="white" />
                      : <FiPlay  size={20} fill="white" className="ml-px" />
                    }
                  </button>

                  {/* Time */}
                  <span className="text-white/85 text-xs font-mono tabular-nums select-none">
                    {fmt(currTime)}<span className="text-white/35 mx-0.5">/</span>{fmt(dur)}
                  </span>

                  <div className="flex-1" />

                  {/* Fullscreen */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFs(); }}
                    className="flex items-center justify-center text-white p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                    aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFs ? <FiMinimize size={17} /> : <FiMaximize size={17} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ paddingBottom: '56.25%', background: '#0d0d0d', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center">
      <p className="text-4xl mb-3">🎬</p>
      <p className="text-gray-500 text-sm">No video URL provided.</p>
    </div>
  );
}
