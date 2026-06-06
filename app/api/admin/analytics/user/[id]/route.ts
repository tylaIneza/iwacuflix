export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (!Number.isInteger(userId) || userId < 1)
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 });

  try {
    const [user, stats] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, email: true, createdAt: true },
      }),
      WatchHistory.userStats(userId),
    ]);

    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    return NextResponse.json({
      user,
      totalWatchSeconds: stats.totalWatchSecs,
      videosWatched:     stats.videosWatched,
      avgCompletionRate: stats.avgCompletion,
      completedVideos:   stats.completedVideos,
      lastActivity:      stats.lastActivity,
      history:           stats.history,
    });
  } catch (err) {
    console.error('[analytics/user]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
