import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { Content } from '@/lib/models/content';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, movies, series, published, totalVisitors, todayVisitors, totalViews, topContent] =
      await Promise.all([
        Content.count(),
        Content.count({ type: 'movie' }),
        Content.count({ type: 'series' }),
        Content.count({ isPublished: true }),
        prisma.siteVisit.count(),
        prisma.siteVisit.count({ where: { visitedAt: { gte: todayStart } } }),
        Content.totalViews(),
        Content.topByViews(5),
      ]);

    return NextResponse.json({
      total, movies, series, published,
      unpublished: total - published,
      totalVisitors, todayVisitors, totalViews, topContent,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
