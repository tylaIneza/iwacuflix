import { NextRequest, NextResponse } from 'next/server';
import { WatchHistory } from '@/lib/models/watchHistory';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`watch-start:${ip}`, 30, 60_000))
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });

  let body: { videoId?: unknown; sessionId?: unknown; totalVideoSeconds?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }

  const videoId        = Number(body.videoId);
  const sessionId      = String(body.sessionId ?? '').trim().slice(0, 64);
  const totalVideoSecs = Number(body.totalVideoSeconds) || 0;

  if (!Number.isInteger(videoId) || videoId < 1)
    return NextResponse.json({ message: 'Invalid videoId' }, { status: 400 });
  if (!sessionId)
    return NextResponse.json({ message: 'sessionId required' }, { status: 400 });

  try {
    const record = await WatchHistory.ensureRecord(
      sessionId,
      videoId,
      totalVideoSecs > 0 ? totalVideoSecs : undefined,
    );
    return NextResponse.json({ id: record.id, watchTimeSeconds: record.watchTimeSeconds });
  } catch (err) {
    console.error('[watch/start]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
