'use client';
import { useEffect, useRef, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|m3u8|mkv|mov|avi)(\?.*)?$/i.test(url.trim());
}

interface Options {
  videoId: string;   // content._id (string representation of Int)
  videoUrl: string;  // used to detect iframe vs native video
}

export function useVideoWatchTracker({ videoId, videoUrl }: Options) {
  const isIframe     = !isDirectVideoUrl(videoUrl);
  const isPlaying    = useRef(false);
  const watchedSecs  = useRef(0);
  const duration     = useRef(0);
  const started      = useRef(false);
  const lastSent     = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef   = useRef(false);
  const mountedRef   = useRef(true);

  const isAuthed = useCallback(() => !!getToken(), []);

  const sendUpdate = useCallback(async (finish = false) => {
    if (!isAuthed() || !started.current || pendingRef.current) return;
    const now = Date.now();
    if (!finish && now - lastSent.current < 9_000) return; // debounce 10s
    pendingRef.current = true;
    lastSent.current   = now;
    const secs  = watchedSecs.current;
    const total = Math.round(duration.current);
    try {
      const endpoint = finish ? '/api/watch/finish' : '/api/watch/update';
      await api.post(endpoint, { videoId: Number(videoId), watchTimeSeconds: secs, totalVideoSeconds: total });
    } catch { /* silent — non-admin visitors get 401 which is expected */ }
    finally { pendingRef.current = false; }
  }, [videoId, isAuthed]);

  const startTracking = useCallback(async () => {
    if (!isAuthed() || started.current) return;
    started.current = true;
    try {
      await api.post('/api/watch/start', {
        videoId: Number(videoId),
        totalVideoSeconds: Math.round(duration.current),
      });
    } catch { /* silent */ }
  }, [videoId, isAuthed]);

  // 1-second tick — only counts while isPlaying and page visible
  const tick = useCallback(() => {
    if (isPlaying.current && !document.hidden) {
      watchedSecs.current += 1;
    }
  }, []);

  // Send update every 10 seconds
  const periodicSend = useCallback(() => {
    if (mountedRef.current) sendUpdate(false);
  }, [sendUpdate]);

  useEffect(() => {
    mountedRef.current = true;
    const tickIv   = setInterval(tick,         1_000);
    const sendIv   = setInterval(periodicSend, 10_000);
    intervalRef.current = sendIv;

    const onVisible = () => { if (!document.hidden && isPlaying.current) { /* resume — tick handles it */ } };
    const onHidden  = () => { /* pause — tick won't count when hidden */ };
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      mountedRef.current = false;
      clearInterval(tickIv);
      clearInterval(sendIv);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('visibilitychange', onHidden);
      // Send final update on unmount
      if (started.current && watchedSecs.current > 0) {
        api.post('/api/watch/update', {
          videoId: Number(videoId),
          watchTimeSeconds:  watchedSecs.current,
          totalVideoSeconds: Math.round(duration.current),
        }).catch(() => {});
      }
    };
  }, [tick, periodicSend, videoId]);

  // Exposed callbacks — wire these up in VideoPlayer/watch page

  const handlePlay = useCallback(() => {
    if (!isAuthed()) return;
    isPlaying.current = true;
    startTracking();
  }, [isAuthed, startTracking]);

  const handlePause = useCallback(() => {
    isPlaying.current = false;
  }, []);

  const handleEnded = useCallback(() => {
    isPlaying.current = false;
    if (isAuthed() && started.current) sendUpdate(true);
  }, [isAuthed, sendUpdate]);

  const handleTimeUpdate = useCallback((currentTime: number, dur: number) => {
    if (dur > 0) duration.current = dur;
    // For native video we also confirm playing
    if (!isPlaying.current && currentTime > 0) {
      isPlaying.current = true;
      startTracking();
    }
  }, [startTracking]);

  // For iframes: called when iframe finishes loading (autoplay assumed)
  const handleIframeReady = useCallback(() => {
    if (!isAuthed()) return;
    isPlaying.current = true;
    startTracking();
  }, [isAuthed, startTracking]);

  return { handlePlay, handlePause, handleEnded, handleTimeUpdate, handleIframeReady, isIframe };
}
