import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`watch-update:${ip}`, 60, 60_000))
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });

  const payload = verifyRequest(req);
  if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: { videoId?: unknown; watchTimeDelta?: unknown; totalVideoSeconds?: unknown; completionRate?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }

  const videoId        = Number(body.videoId);
  const watchTimeDelta = Number(body.watchTimeDelta ?? 0);
  const completionRate = Math.min(100, Math.max(0, Number(body.completionRate ?? 0)));
  const totalVideoSecs = Number(body.totalVideoSeconds) || 0;

  if (!Number.isInteger(videoId) || videoId < 1)
    return NextResponse.json({ message: 'Invalid videoId' }, { status: 400 });
  if (!Number.isFinite(watchTimeDelta) || watchTimeDelta < 0)
    return NextResponse.json({ message: 'Invalid watchTimeDelta' }, { status: 400 });

  try {
    await WatchHistory.addWatchTime({
      userId:            payload.userId,
      videoId,
      watchTimeDelta:    Math.floor(watchTimeDelta),
      totalVideoSeconds: totalVideoSecs > 0 ? totalVideoSecs : undefined,
      completionRate,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[watch/update]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
