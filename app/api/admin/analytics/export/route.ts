export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';
import { formatSeconds } from '@/types/analytics';

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n'))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
  const endDate   = searchParams.get('endDate')   ? new Date(searchParams.get('endDate')!)   : undefined;

  try {
    const { items } = await WatchHistory.findAll({ pageSize: 10_000, startDate, endDate, sortBy: 'lastWatchedAt', sortDir: 'desc' });

    const header = ['Session ID', 'Video Title', 'Video Type', 'Watch Time', 'Completion %', 'Status', 'Started At', 'Last Watched'];
    const rows   = items.map(r => {
      const status = r.completed ? 'Completed' : r.watchTimeSeconds >= 30 ? 'In Progress' : 'Abandoned';
      return [
        esc(r.sessionId),
        esc(r.video.title),
        esc(r.video.type),
        esc(formatSeconds(r.watchTimeSeconds)),
        esc(Math.round(r.completionRate)),
        esc(status),
        esc(r.startedAt ? new Date(r.startedAt).toISOString() : ''),
        esc(r.lastWatchedAt ? new Date(r.lastWatchedAt).toISOString() : ''),
      ].join(',');
    });

    const csv      = [header.join(','), ...rows].join('\n');
    const filename = `watch-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[analytics/export]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
