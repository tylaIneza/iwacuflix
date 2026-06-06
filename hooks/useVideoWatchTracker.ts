'use client';
import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|m3u8|mkv|mov|avi)(\?.*)?$/i.test(url.trim());
}

// Persistent anonymous session ID — survives page reloads, one per browser
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'iwacu_sid';
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

interface Options {
  videoId:  string;   // content._id
  videoUrl: string;   // used to detect iframe vs native video
}

export function useVideoWatchTracker({ videoId, videoUrl }: Options) {
  const isIframe      = !isDirectVideoUrl(videoUrl);
  const sessionId     = useRef(getSessionId());
  const isPlaying     = useRef(false);
  const watchedSecs   = useRef(0);
  const committedSecs = useRef(0);
  const duration      = useRef(0);
  const started       = useRef(false);
  const lastSent      = useRef(0);
  const pendingRef    = useRef(false);
  const mountedRef    = useRef(true);

  const sendUpdate = useCallback(async (finish = false) => {
    if (!sessionId.current || !started.current || pendingRef.current) return;
    const delta = watchedSecs.current - committedSecs.current;
    if (delta <= 0 && !finish) return;
    const now = Date.now();
    if (!finish && now - lastSent.current < 9_000) return;
    pendingRef.current = true;
    lastSent.current   = now;
    const d     = Math.max(0, delta);
    const total = Math.round(duration.current);
    const rate  = total > 0 ? Math.round(Math.min(100, (watchedSecs.current / total) * 100)) : 0;
    try {
      const endpoint = finish ? '/api/watch/finish' : '/api/watch/update';
      await api.post(endpoint, {
        videoId:          Number(videoId),
        sessionId:        sessionId.current,
        watchTimeDelta:   d,
        totalVideoSeconds: total,
        completionRate:   rate,
      });
      committedSecs.current = watchedSecs.current;
    } catch { /* silent */ }
    finally { pendingRef.current = false; }
  }, [videoId]);

  const startTracking = useCallback(async () => {
    if (!sessionId.current || started.current) return;
    started.current = true;
    try {
      await api.post('/api/watch/start', {
        videoId:           Number(videoId),
        sessionId:         sessionId.current,
        totalVideoSeconds: Math.round(duration.current),
      });
    } catch { /* silent */ }
  }, [videoId]);

  const tick = useCallback(() => {
    if (isPlaying.current && !document.hidden) {
      watchedSecs.current += 1;
    }
  }, []);

  const periodicSend = useCallback(() => {
    if (mountedRef.current) sendUpdate(false);
  }, [sendUpdate]);

  useEffect(() => {
    mountedRef.current = true;
    const tickIv = setInterval(tick,         1_000);
    const sendIv = setInterval(periodicSend, 10_000);

    return () => {
      mountedRef.current = false;
      clearInterval(tickIv);
      clearInterval(sendIv);
      const delta = watchedSecs.current - committedSecs.current;
      if (started.current && delta > 0) {
        const total = Math.round(duration.current);
        const rate  = total > 0 ? Math.round(Math.min(100, (watchedSecs.current / total) * 100)) : 0;
        api.post('/api/watch/update', {
          videoId:           Number(videoId),
          sessionId:         sessionId.current,
          watchTimeDelta:    delta,
          totalVideoSeconds: total,
          completionRate:    rate,
        }).catch(() => {});
      }
    };
  }, [tick, periodicSend, videoId]);

  const handlePlay = useCallback(() => {
    isPlaying.current = true;
    startTracking();
  }, [startTracking]);

  const handlePause = useCallback(() => {
    isPlaying.current = false;
  }, []);

  const handleEnded = useCallback(() => {
    isPlaying.current = false;
    if (started.current) sendUpdate(true);
  }, [sendUpdate]);

  const handleTimeUpdate = useCallback((currentTime: number, dur: number) => {
    if (dur > 0) duration.current = dur;
    if (!isPlaying.current && currentTime > 0) {
      isPlaying.current = true;
      startTracking();
    }
  }, [startTracking]);

  const handleIframeReady = useCallback(() => {
    isPlaying.current = true;
    startTracking();
  }, [startTracking]);

  return { handlePlay, handlePause, handleEnded, handleTimeUpdate, handleIframeReady, isIframe };
}
