import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`watch-start:${ip}`, 30, 60_000))
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });

  const payload = verifyRequest(req);
  if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: { videoId?: unknown; totalVideoSeconds?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }

  const videoId = Number(body.videoId);
  if (!Number.isInteger(videoId) || videoId < 1)
    return NextResponse.json({ message: 'Invalid videoId' }, { status: 400 });

  const totalVideoSeconds = Number(body.totalVideoSeconds) || 0;

  try {
    const record = await WatchHistory.ensureRecord(
      payload.userId,
      videoId,
      totalVideoSeconds > 0 ? totalVideoSeconds : undefined,
    );
    return NextResponse.json({ id: record.id, watchTimeSeconds: record.watchTimeSeconds });
  } catch (err) {
    console.error('[watch/start]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
