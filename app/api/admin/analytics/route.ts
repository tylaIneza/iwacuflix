export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action   = searchParams.get('action') ?? 'history';
  const page     = parseInt(searchParams.get('page')     ?? '1',  10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
  const search   = searchParams.get('search') ?? undefined;
  const videoId  = searchParams.get('videoId') ? parseInt(searchParams.get('videoId')!, 10) : undefined;
  const sortBy   = searchParams.get('sortBy')  ?? 'lastWatchedAt';
  const sortDir  = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc';

  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
  const endDate   = searchParams.get('endDate')   ? new Date(searchParams.get('endDate')!)   : undefined;

  try {
    if (action === 'stats') {
      return NextResponse.json(await WatchHistory.stats());
    }

    if (action === 'daily') {
      const days = parseInt(searchParams.get('days') ?? '30', 10);
      return NextResponse.json(await WatchHistory.dailyData(days));
    }

    if (action === 'topVideos') {
      return NextResponse.json(await WatchHistory.topVideos());
    }

    if (action === 'topVideosByViews') {
      return NextResponse.json(await WatchHistory.topVideosByViews());
    }

    if (action === 'completionDist') {
      return NextResponse.json(await WatchHistory.completionDistribution());
    }

    // default: history table
    const result = await WatchHistory.findAll({
      page, pageSize, search, videoId,
      startDate, endDate, sortBy,
      sortDir: sortDir === 'asc' ? 'asc' : 'desc',
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('[admin/analytics]', err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
