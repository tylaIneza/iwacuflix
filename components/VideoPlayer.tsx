'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { saveWatchProgress } from '@/lib/auth';
import { FiAlertTriangle } from 'react-icons/fi';

interface Content {
  _id: string; title: string; thumbnail: string;
  type: 'movie' | 'series'; season?: number; episode?: number;
}
interface Props {
  url: string;
  content: Content;
  startTime?: number;
  onEnded?: () => void;
}

// ── Platform detector ─────────────────────────────────────
function getPlatform(url: string) {
  if (/youtu/i.test(url))            return { name: 'YouTube',    icon: '▶', color: '#FF0000' };
  if (/vimeo/i.test(url))            return { name: 'Vimeo',      icon: '◆', color: '#1AB7EA' };
  if (/cloudflare/i.test(url))       return { name: 'Iwacuflix',  icon: '▶', color: '#E50914' };
  if (/drive\.google/i.test(url))    return { name: 'Iwacuflix',  icon: '▶', color: '#E50914' };
  if (/dailymotion/i.test(url))      return { name: 'Dailymotion',icon: '◉', color: '#0066DC' };
  if (/ok\.ru/i.test(url))           return { name: 'Iwacuflix',  icon: '▶', color: '#E50914' };
  if (/facebook/i.test(url))         return { name: 'Iwacuflix',  icon: '▶', color: '#E50914' };
  if (/\.(mp4|webm|m3u8)/i.test(url)) return { name: 'Iwacuflix', icon: '▶', color: '#E50914' };
  return                               { name: 'Iwacuflix',        icon: '▶', color: '#E50914' };
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

  if (url.includes('facebook.com/') && url.includes('/videos/')) {
    return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true` };
  }

  if (url.includes('/embed') || url.includes('player.') || url.includes('/iframe'))
    return { kind: 'iframe', src: url };

  if (/\.(mp4|webm|ogg|m3u8|mkv|mov|avi)(\?.*)?$/i.test(url))
    return { kind: 'video', src: url };

  return { kind: 'iframe', src: url };
}

// ── Component ─────────────────────────────────────────────
export default function VideoPlayer({ url, content, startTime = 0, onEnded }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const [ready,    setReady]    = useState(false);
  const [errored,  setErrored]  = useState(false);

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

  // Reset loading state when URL changes
  useEffect(() => { setReady(false); setErrored(false); }, [url]);

  if (!url?.trim()) {
    return (
      <PlayerShell>
        <EmptyState />
      </PlayerShell>
    );
  }

  const { kind, src } = resolveUrl(url, startTime);
  const platform       = getPlatform(url);

  return (
    <div className="w-full">
      {/* ── Player shell ─── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          paddingBottom: '56.25%',
          background: '#000',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.07), 0 24px 60px rgba(0,0,0,0.8), 0 0 40px ${platform.color}22`,
        }}
      >
        {/* Loading overlay — shown until media fires onLoad / onCanPlay */}
        {!ready && !errored && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black">
            <div className="relative z-10 flex flex-col items-center gap-4">
              {/* Triple-ring spinner */}
              <div className="relative w-16 h-16">
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
                  <span className="text-base" style={{ color: platform.color }}>{platform.icon}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-semibold">{content.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">Loading from {platform.name}…</p>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {errored && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] px-6 text-center">
            <FiAlertTriangle size={30} className="text-yellow-500" />
            <p className="text-gray-300 text-sm font-semibold">Video couldn't load</p>
            <p className="text-gray-500 text-xs max-w-xs leading-relaxed">
              This site blocks embedding. Open the video page in your browser,
              press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white text-[10px]">F12</kbd> → Network tab → play the video → copy the <code className="text-[#E50914]">.mp4</code> or <code className="text-[#E50914]">m3u8</code> URL and paste it as the Video URL.
            </p>
          </div>
        )}

        {/* ── Iframe ── */}
        {kind === 'iframe' && (() => {
          const isYT    = src.includes('youtube.com') || src.includes('youtu.be');
          const isDrive = src.includes('drive.google.com');

          // YouTube: scale slightly to clip watermarks
          // Google Drive: shift up 52 px to clip the Drive toolbar/header bar;
          //   height is extended to compensate so the video fills the container.
          //   The parent's overflow:hidden does the actual clipping.
          const iframeStyle: React.CSSProperties = isYT
            ? { position: 'absolute', top: '-5%', left: '-3%', width: '106%', height: '110%', border: 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.7s' }
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
              onLoad={() => setReady(true)}
              onError={() => { setReady(true); setErrored(true); }}
            />
          );
        })()}

        {/* ── Native video ── */}
        {kind === 'video' && (
          <video
            ref={videoRef}
            key={src}
            src={src}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0, background: '#000' }}
            onCanPlay={() => setReady(true)}
            onError={() => { setReady(true); setErrored(true); }}
            onEnded={() => { saveProgress(); onEnded?.(); }}
          />
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
