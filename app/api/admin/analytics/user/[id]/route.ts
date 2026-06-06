export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  // id is now a sessionId (string UUID), not a numeric userId
  const sessionId = decodeURIComponent(id).trim();
  if (!sessionId)
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 });

  try {
    const stats = await WatchHistory.userStats(sessionId);

    return NextResponse.json({
      session:           sessionId,
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
