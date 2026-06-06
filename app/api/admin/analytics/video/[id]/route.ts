export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const videoId = parseInt(id, 10);
  if (!Number.isInteger(videoId) || videoId < 1)
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 });

  try {
    const [video, stats, daily] = await Promise.all([
      prisma.content.findUnique({
        where:  { id: videoId },
        select: { id: true, title: true, thumbnail: true, type: true, category: true },
      }),
      WatchHistory.videoStats(videoId),
      WatchHistory.dailyData(30),
    ]);

    if (!video) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    return NextResponse.json({ video, ...stats, dailyData: daily });
  } catch (err) {
    console.error('[analytics/video]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
