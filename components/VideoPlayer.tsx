'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { saveWatchProgress } from '@/lib/auth';
import {
  FiAlertTriangle, FiPlay, FiPause,
  FiMaximize, FiMinimize,
  FiVolume2, FiVolumeX, FiVolume1,
  FiSkipBack, FiSkipForward,
  FiSettings,
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

// ── Platform detector ──────────────────────────────────────
function getPlatform(url: string) {
  if (/youtu/i.test(url))              return { name: 'YouTube',     color: '#FF0000' };
  if (/vimeo/i.test(url))              return { name: 'Vimeo',       color: '#1AB7EA' };
  if (/drive\.google/i.test(url))      return { name: 'Iwacuflix',   color: '#E50914' };
  if (/dailymotion/i.test(url))        return { name: 'Dailymotion', color: '#0066DC' };
  return                                { name: 'Iwacuflix',          color: '#E50914' };
}

// ── URL resolver ───────────────────────────────────────────
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

  const driveId =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/docs\.google\.com\/[^/]+\/d\/([a-zA-Z0-9_-]+)/)?.[1];
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

// ── Helpers ────────────────────────────────────────────────
function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ── Component ──────────────────────────────────────────────
export default function VideoPlayer({
  url, content, startTime = 0,
  onEnded, onPlay, onPause, onTimeUpdate, onIframeLoad,
}: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef   = useRef<HTMLDivElement>(null);

  const [ready,        setReady]        = useState(false);
  const [errored,      setErrored]      = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currTime,     setCurrTime]     = useState(0);
  const [dur,          setDur]          = useState(0);
  const [buffered,     setBuffered]     = useState(0);
  const [volume,       setVolume]       = useState(1);
  const [muted,        setMuted]        = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [showSpeed,    setShowSpeed]    = useState(false);
  const [isFs,         setIsFs]         = useState(false);
  const [ctrlVisible,  setCtrlVisible]  = useState(true);
  const [seekDragging, setSeekDragging] = useState(false);
  const [hoverTime,    setHoverTime]    = useState<number | null>(null);
  const [hoverX,       setHoverX]       = useState(0);
  const [seekFlash,    setSeekFlash]    = useState<'back' | 'fwd' | null>(null);
  const [centerFlash,  setCenterFlash]  = useState<'play' | 'pause' | null>(null);

  const hideTimer    = useRef<ReturnType<typeof setTimeout>>();
  const isPlayingRef = useRef(false);
  const doubleTap    = useRef({ t: 0, side: '' });
  const prevVolRef   = useRef(1);

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
    const v = videoRef.current;
    const onIosEnter = () => setIsFs(true);
    const onIosExit  = () => setIsFs(false);
    v?.addEventListener('webkitbeginfullscreen', onIosEnter);
    v?.addEventListener('webkitendfullscreen',   onIosExit);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      v?.removeEventListener('webkitbeginfullscreen', onIosEnter);
      v?.removeEventListener('webkitendfullscreen',   onIosExit);
    };
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (v.paused) v.play().catch(() => {}); else v.pause();
          resetCtrls();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          flashSeek('back');
          resetCtrls();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          flashSeek('fwd');
          resetCtrls();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFs();
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(1, v.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, v.volume - 0.1));
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const seek = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const flashSeek = useCallback((dir: 'back' | 'fwd') => {
    setSeekFlash(dir);
    setTimeout(() => setSeekFlash(null), 700);
  }, []);

  // ── Volume ────────────────────────────────────────────
  const changeVolume = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, val));
    v.volume = clamped;
    setVolume(clamped);
    if (clamped > 0) {
      v.muted = false;
      setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      const restore = prevVolRef.current > 0 ? prevVolRef.current : 0.7;
      v.volume = restore;
      setVolume(restore);
      setMuted(false);
    } else {
      prevVolRef.current = v.volume;
      v.muted = true;
      setMuted(true);
    }
  }, []);

  // ── Playback speed ────────────────────────────────────
  const setPlaybackSpeed = useCallback((s: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setShowSpeed(false);
  }, []);

  // ── Fullscreen ────────────────────────────────────────
  const toggleFs = useCallback(async () => {
    const v  = videoRef.current;
    const el = containerRef.current;
    if (!el) return;
    const inFs = !!document.fullscreenElement || !!(v as any)?.webkitDisplayingFullscreen;
    if (!inFs) {
      if (!document.fullscreenEnabled && (v as any)?.webkitEnterFullscreen) {
        (v as any).webkitEnterFullscreen();
        return;
      }
      try { await el.requestFullscreen(); }
      catch {
        try { (el as any).webkitRequestFullscreen?.(); }
        catch { (v as any)?.webkitEnterFullscreen?.(); }
      }
    } else {
      if ((v as any)?.webkitExitFullscreen) (v as any).webkitExitFullscreen();
      else document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ── Picture in Picture ────────────────────────────────
  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* not supported */ }
  }, []);

  // ── Buffered progress ─────────────────────────────────
  const updateBuffered = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.buffered.length || isNaN(v.duration)) return;
    setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
  }, []);

  // ── Tap area: double-tap seek + show/hide controls ────
  const handleAreaTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect  = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const side  = xFrac < 0.35 ? 'l' : xFrac > 0.65 ? 'r' : 'c';
    const now   = Date.now();
    const dt    = doubleTap.current;

    if (now - dt.t < 400 && dt.side === side && side !== 'c') {
      const v = videoRef.current;
      if (v) {
        const delta = side === 'l' ? -10 : 10;
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
        flashSeek(side === 'l' ? 'back' : 'fwd');
      }
      dt.t = 0; dt.side = '';
      return;
    }

    dt.t = now; dt.side = side;

    setCtrlVisible(prev => {
      if (!prev) { if (isPlayingRef.current) scheduleHide(); return true; }
      if (side === 'c') {
        togglePlay();
        const v = videoRef.current;
        setCenterFlash(v?.paused ? 'play' : 'pause');
        setTimeout(() => setCenterFlash(null), 600);
      }
      if (isPlayingRef.current) scheduleHide();
      return true;
    });
  }, [scheduleHide, togglePlay, flashSeek]);

  // ── Seek bar ──────────────────────────────────────────
  const calcSeekFrac = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleSeekDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSeekDragging(true);
    const frac = calcSeekFrac(e);
    const v = videoRef.current;
    if (v && dur > 0) { v.currentTime = frac * dur; setCurrTime(frac * dur); }
    showCtrls();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur, showCtrls]);

  const handleSeekMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverX(e.clientX - rect.left);
    setHoverTime(dur > 0 ? frac * dur : null);
    if (!seekDragging) return;
    const v = videoRef.current;
    if (v && dur > 0) { v.currentTime = frac * dur; setCurrTime(frac * dur); }
  }, [seekDragging, dur]);

  const handleSeekUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const frac = calcSeekFrac(e);
    setSeekDragging(false);
    const v = videoRef.current;
    if (v && dur > 0) { v.currentTime = frac * dur; setCurrTime(frac * dur); }
    resetCtrls();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur, resetCtrls]);

  const handleSeekLeave = useCallback(() => setHoverTime(null), []);

  // ── Volume slider ─────────────────────────────────────
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    changeVolume(parseFloat(e.target.value));
  }, [changeVolume]);

  // ── Early return ──────────────────────────────────────
  if (!url?.trim()) {
    return (
      <PlayerShell>
        <div className="text-center">
          <p className="text-5xl mb-3">🎬</p>
          <p className="text-gray-500 text-sm">No video URL provided.</p>
        </div>
      </PlayerShell>
    );
  }

  const { kind, src } = resolveUrl(url, startTime);
  const platform      = getPlatform(url);
  const pct           = dur > 0 ? Math.min(100, (currTime / dur) * 100) : 0;
  const volIcon       = muted || volume === 0 ? FiVolumeX : volume < 0.5 ? FiVolume1 : FiVolume2;
  const VolIcon       = volIcon;
  const isDrive       = src.includes('drive.google.com');

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="video-shell relative w-full rounded-xl sm:rounded-2xl overflow-hidden select-none"
        style={{
          paddingBottom: '56.25%',
          background: '#000',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.9), 0 0 40px ${platform.color}15`,
        }}
        onMouseMove={kind === 'video' ? resetCtrls : undefined}
        onMouseLeave={kind === 'video' ? () => { if (isPlayingRef.current) scheduleHide(); } : undefined}
      >
        {/* ── Loading overlay ── */}
        {!ready && !errored && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ background: `radial-gradient(ellipse at center, ${platform.color} 0%, transparent 65%)` }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: platform.color, animationDuration: '0.85s' }}
                />
                <div
                  className="absolute inset-2 rounded-full border border-transparent animate-spin"
                  style={{ borderTopColor: `${platform.color}60`, animationDuration: '1.5s', animationDirection: 'reverse' }}
                />
              </div>
              <div className="text-center px-4">
                <p className="text-white text-sm font-semibold line-clamp-1 mb-0.5">{content.title}</p>
                <p className="text-gray-500 text-xs">Loading from {platform.name}…</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {errored && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0c0c0c] px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-1">
              <FiAlertTriangle size={22} className="text-yellow-400" />
            </div>
            <p className="text-gray-200 text-sm font-semibold">Video couldn&apos;t load</p>
            <p className="text-gray-500 text-xs max-w-xs leading-relaxed">
              This source blocks embedding. Try opening the video directly in your browser,
              then copy the <code className="text-[#E50914]">.mp4</code> or{' '}
              <code className="text-[#E50914]">m3u8</code> URL and paste it here.
            </p>
          </div>
        )}

        {/* ── Iframe ── */}
        {kind === 'iframe' && (
          <iframe
            key={src}
            src={src}
            title={content.title}
            style={{
              position: 'absolute',
              top: isDrive ? '-52px' : 0,
              left: 0,
              width: '100%',
              height: isDrive ? 'calc(100% + 52px + 55px)' : '100%',
              border: 'none',
              opacity: ready ? 1 : 0,
              transition: 'opacity 0.6s',
            }}
            allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => { setReady(true); onIframeLoad?.(); }}
            onError={() => { setReady(true); setErrored(true); }}
          />
        )}

        {/* ── Native video ── */}
        {kind === 'video' && (
          <>
            <video
              ref={videoRef}
              key={src}
              src={src}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.5s', background: '#000' }}
              onCanPlay={() => setReady(true)}
              onError={() => { setReady(true); setErrored(true); }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDur(v.duration);
                setVolume(v.volume);
              }}
              onPlay={() => {
                isPlayingRef.current = true;
                setIsPlaying(true);
                setCtrlVisible(true);
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
                updateBuffered();
                onTimeUpdate?.(v.currentTime, v.duration);
              }}
              onProgress={updateBuffered}
              onEnded={() => {
                isPlayingRef.current = false;
                setIsPlaying(false);
                showCtrls();
                saveProgress();
                onEnded?.();
              }}
              onVolumeChange={(e) => {
                const v = e.currentTarget;
                setVolume(v.volume);
                setMuted(v.muted);
              }}
            />

            {/* Tap zone (pointer-only — doesn't block controls row) */}
            <div
              className="absolute inset-0 z-10 touch-none"
              style={{ bottom: (ctrlVisible || !isPlaying) ? '72px' : 0, cursor: 'pointer' }}
              onPointerDown={handleAreaTap}
            />

            {/* Center play/pause flash */}
            {centerFlash && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div
                  className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                  style={{ animation: 'centerFlash 0.6s ease-out forwards' }}
                >
                  {centerFlash === 'play'
                    ? <FiPlay  size={28} className="text-white ml-1" fill="white" />
                    : <FiPause size={28} className="text-white" fill="white" />
                  }
                </div>
              </div>
            )}

            {/* Double-tap seek flash */}
            {seekFlash && (
              <div
                className={`absolute top-0 bottom-0 z-20 w-1/3 flex items-center justify-center pointer-events-none ${
                  seekFlash === 'back' ? 'left-0' : 'right-0'
                }`}
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-3 flex flex-col items-center gap-1">
                  <div className="flex gap-0.5">
                    {seekFlash === 'back'
                      ? [0,1,2].map(i => <span key={i} className="w-0 h-0 border-t-4 border-b-4 border-r-[7px] border-t-transparent border-b-transparent border-r-white opacity-80" style={{ opacity: 0.4 + i * 0.3 }} />)
                      : [2,1,0].map(i => <span key={i} className="w-0 h-0 border-t-4 border-b-4 border-l-[7px] border-t-transparent border-b-transparent border-l-white" style={{ opacity: 0.4 + (2-i) * 0.3 }} />)
                    }
                  </div>
                  <span className="text-white text-[11px] font-bold">10s</span>
                </div>
              </div>
            )}

            {/* Speed menu popup */}
            {showSpeed && (
              <div
                className="absolute bottom-20 right-3 sm:right-5 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`flex items-center justify-between gap-6 w-full px-4 py-2.5 text-sm transition-colors ${
                      speed === s
                        ? 'bg-[#E50914]/20 text-[#E50914] font-bold'
                        : 'text-gray-300 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span>{s === 1 ? 'Normal' : `${s}×`}</span>
                    {speed === s && <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />}
                  </button>
                ))}
              </div>
            )}

            {/* Controls overlay — always visible when paused, auto-hides when playing */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
                ctrlVisible || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              <div className="relative px-3 sm:px-5 pb-3 sm:pb-4 pt-10 sm:pt-14">

                {/* Seek bar */}
                <div className="relative mb-2.5 group/seek">
                  {/* Hover time tooltip */}
                  {hoverTime !== null && dur > 0 && (
                    <div
                      className="absolute -top-8 z-50 bg-black/90 text-white text-[11px] font-mono px-1.5 py-0.5 rounded pointer-events-none transform -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${hoverX}px` }}
                    >
                      {fmt(hoverTime)}
                    </div>
                  )}

                  <div
                    ref={seekBarRef}
                    className="relative h-5 flex items-center cursor-pointer touch-none"
                    onPointerDown={handleSeekDown}
                    onPointerMove={handleSeekMove}
                    onPointerUp={handleSeekUp}
                    onPointerLeave={handleSeekLeave}
                  >
                    {/* Track */}
                    <div className="w-full relative">
                      {/* Background */}
                      <div className="h-1 sm:h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                        {/* Buffered */}
                        <div
                          className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-[width] duration-300"
                          style={{ width: `${buffered}%` }}
                        />
                        {/* Progress */}
                        <div
                          className="absolute top-0 left-0 h-full rounded-full"
                          style={{ width: `${pct}%`, background: '#E50914' }}
                        />
                      </div>
                      {/* Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity"
                        style={{ left: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-1 sm:gap-2">

                  {/* Play/Pause */}
                  <CtrlBtn
                    onClick={() => { togglePlay(); resetCtrls(); }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    title={isPlaying ? 'Pause (K)' : 'Play (K)'}
                  >
                    {isPlaying
                      ? <FiPause size={16} fill="white" className="sm:hidden" />
                      : <FiPlay  size={16} fill="white" className="sm:hidden ml-px" />
                    }
                    {isPlaying
                      ? <FiPause size={20} fill="white" className="hidden sm:block" />
                      : <FiPlay  size={20} fill="white" className="hidden sm:block ml-px" />
                    }
                  </CtrlBtn>

                  {/* Skip back 10s */}
                  <CtrlBtn
                    onClick={() => { seek(-10); flashSeek('back'); resetCtrls(); }}
                    title="Rewind 10s (J)"
                  >
                    <FiSkipBack size={15} className="sm:hidden" />
                    <FiSkipBack size={18} className="hidden sm:block" />
                  </CtrlBtn>

                  {/* Skip forward 10s */}
                  <CtrlBtn
                    onClick={() => { seek(10); flashSeek('fwd'); resetCtrls(); }}
                    title="Forward 10s (L)"
                  >
                    <FiSkipForward size={15} className="sm:hidden" />
                    <FiSkipForward size={18} className="hidden sm:block" />
                  </CtrlBtn>

                  {/* Volume — mute button always visible, slider on sm+ */}
                  <div className="flex items-center gap-1 group/vol">
                    <CtrlBtn onClick={toggleMute} title="Mute (M)">
                      <VolIcon size={15} className="sm:hidden" />
                      <VolIcon size={18} className="hidden sm:block" />
                    </CtrlBtn>
                    {/* Volume slider — only on desktop */}
                    <div className="hidden sm:flex items-center w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200">
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={muted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider w-full h-1 cursor-pointer accent-white"
                        style={{ accentColor: '#E50914' }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <span className="text-white/80 text-[10px] sm:text-xs font-mono tabular-nums select-none ml-0.5">
                    {fmt(currTime)}<span className="text-white/30 mx-0.5">/</span>{fmt(dur)}
                  </span>

                  <div className="flex-1" />

                  {/* Speed */}
                  <CtrlBtn
                    onClick={() => { setShowSpeed(s => !s); resetCtrls(); }}
                    title="Playback speed"
                    className="hidden sm:flex"
                  >
                    <span className="text-white text-[11px] font-bold min-w-[2rem] text-center">
                      {speed === 1 ? '1×' : `${speed}×`}
                    </span>
                  </CtrlBtn>

                  {/* Settings (mobile speed) */}
                  <CtrlBtn
                    onClick={() => { setShowSpeed(s => !s); resetCtrls(); }}
                    title="Settings"
                    className="sm:hidden"
                  >
                    <FiSettings size={14} />
                  </CtrlBtn>

                  {/* PiP — only if supported */}
                  {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (document as any).pictureInPictureEnabled && (
                    <CtrlBtn onClick={togglePip} title="Picture in Picture" className="hidden sm:flex">
                      <PiPIcon size={17} />
                    </CtrlBtn>
                  )}

                  {/* Fullscreen */}
                  <CtrlBtn onClick={() => { toggleFs(); resetCtrls(); }} title={isFs ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
                    {isFs
                      ? <><FiMinimize size={14} className="sm:hidden" /><FiMinimize size={17} className="hidden sm:block" /></>
                      : <><FiMaximize size={14} className="sm:hidden" /><FiMaximize size={17} className="hidden sm:block" /></>
                    }
                  </CtrlBtn>

                </div>
              </div>
            </div>

            {/* Paused: big center play button */}
            {!isPlaying && ready && !errored && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <FiPlay size={22} fill="white" className="text-white ml-1 sm:hidden" />
                  <FiPlay size={26} fill="white" className="text-white ml-1 hidden sm:block" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes centerFlash {
          0%   { opacity: 1; transform: scale(1); }
          60%  { opacity: 0.8; transform: scale(1.3); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        .volume-slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ── Small helper components ────────────────────────────────
function CtrlBtn({
  children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`flex items-center justify-center text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/15 active:bg-white/25 transition-colors touch-none ${className}`}
    >
      {children}
    </button>
  );
}

function PiPIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="12" y="12" width="9" height="7" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ paddingBottom: '56.25%', background: '#0d0d0d', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
