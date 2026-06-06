import { NextRequest, NextResponse } from 'next/server';
import { WatchHistory } from '@/lib/models/watchHistory';
import { checkRateLimit } from '@/lib/rateLimit';
import { emitWatchUpdate } from '@/lib/broadcast';
import { heartbeat } from '@/lib/activeSessions';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`watch-update:${ip}`, 60, 60_000))
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });

  let body: { videoId?: unknown; sessionId?: unknown; watchTimeDelta?: unknown; totalVideoSeconds?: unknown; completionRate?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }

  const videoId        = Number(body.videoId);
  const sessionId      = String(body.sessionId ?? '').trim().slice(0, 64);
  const watchTimeDelta = Number(body.watchTimeDelta ?? 0);
  const completionRate = Math.min(100, Math.max(0, Number(body.completionRate ?? 0)));
  const totalVideoSecs = Number(body.totalVideoSeconds) || 0;

  if (!Number.isInteger(videoId) || videoId < 1)
    return NextResponse.json({ message: 'Invalid videoId' }, { status: 400 });
  if (!sessionId)
    return NextResponse.json({ message: 'sessionId required' }, { status: 400 });
  if (!Number.isFinite(watchTimeDelta) || watchTimeDelta < 0)
    return NextResponse.json({ message: 'Invalid watchTimeDelta' }, { status: 400 });

  try {
    await WatchHistory.addWatchTime({
      sessionId,
      videoId,
      watchTimeDelta:    Math.floor(watchTimeDelta),
      totalVideoSeconds: totalVideoSecs > 0 ? totalVideoSecs : undefined,
      completionRate,
    });
    heartbeat(sessionId, videoId);
    emitWatchUpdate({ videoId, sessionId, watchTimeDelta: Math.floor(watchTimeDelta) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[watch/update]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
