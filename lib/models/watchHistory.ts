import prisma from '@/lib/db';

function periodStart(period: 'today' | 'week' | 'month'): Date {
  const d = new Date();
  if (period === 'today')  { d.setHours(0, 0, 0, 0); return d; }
  if (period === 'week')   { d.setDate(d.getDate() - 7); return d; }
  d.setDate(d.getDate() - 30);
  return d;
}

export const WatchHistory = {
  async upsert(data: {
    userId: number;
    videoId: number;
    watchTimeSeconds: number;
    totalVideoSeconds?: number;
    completed?: boolean;
  }) {
    const total = data.totalVideoSeconds ?? 0;
    const rate  = total > 0 ? Math.min(100, (data.watchTimeSeconds / total) * 100) : 0;
    const done  = data.completed || rate >= 90;
    const now   = new Date();

    return prisma.videoWatchHistory.upsert({
      where:  { userId_videoId: { userId: data.userId, videoId: data.videoId } },
      create: {
        userId:            data.userId,
        videoId:           data.videoId,
        watchTimeSeconds:  data.watchTimeSeconds,
        totalVideoSeconds: total,
        completionRate:    rate,
        completed:         done,
        startedAt:         now,
        lastWatchedAt:     now,
      },
      update: {
        watchTimeSeconds:  data.watchTimeSeconds,
        ...(total > 0 && { totalVideoSeconds: total }),
        completionRate:    rate,
        completed:         done,
        lastWatchedAt:     now,
      },
    });
  },

  async findAll(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    userId?: number;
    videoId?: number;
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const page     = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const skip     = (page - 1) * pageSize;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (opts.userId)  where.userId  = opts.userId;
    if (opts.videoId) where.videoId = opts.videoId;
    if (opts.startDate || opts.endDate) {
      where.createdAt = {
        ...(opts.startDate && { gte: opts.startDate }),
        ...(opts.endDate   && { lte: opts.endDate }),
      };
    }
    if (opts.search) {
      where.OR = [
        { user:  { email: { contains: opts.search } } },
        { video: { title: { contains: opts.search } } },
      ];
    }

    const VALID_SORT = new Set(['watchTimeSeconds', 'completionRate', 'lastWatchedAt', 'startedAt', 'createdAt']);
    const dir = opts.sortDir ?? 'desc';
    const col = VALID_SORT.has(opts.sortBy ?? '') ? opts.sortBy! : 'lastWatchedAt';
    const orderBy: Record<string, 'asc' | 'desc'> = { [col]: dir };

    const [items, total] = await Promise.all([
      prisma.videoWatchHistory.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          user:  { select: { id: true, email: true } },
          video: { select: { id: true, title: true, thumbnail: true, type: true } },
        },
      }),
      prisma.videoWatchHistory.count({ where }),
    ]);

    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
  },

  async stats() {
    const [todayStart, weekStart, monthStart] = [
      periodStart('today'), periodStart('week'), periodStart('month'),
    ];

    const [allAgg, todayAgg, weekAgg, monthAgg, totalVideos, avgRate, activeToday, activeMonth] =
      await Promise.all([
        prisma.videoWatchHistory.aggregate({ _sum: { watchTimeSeconds: true } }),
        prisma.videoWatchHistory.aggregate({ where: { lastWatchedAt: { gte: todayStart } }, _sum: { watchTimeSeconds: true } }),
        prisma.videoWatchHistory.aggregate({ where: { lastWatchedAt: { gte: weekStart  } }, _sum: { watchTimeSeconds: true } }),
        prisma.videoWatchHistory.aggregate({ where: { lastWatchedAt: { gte: monthStart } }, _sum: { watchTimeSeconds: true } }),
        prisma.videoWatchHistory.count(),
        prisma.videoWatchHistory.aggregate({ _avg: { completionRate: true } }),
        prisma.videoWatchHistory.groupBy({ by: ['userId'], where: { lastWatchedAt: { gte: todayStart } } }).then(r => r.length),
        prisma.videoWatchHistory.groupBy({ by: ['userId'], where: { lastWatchedAt: { gte: monthStart } } }).then(r => r.length),
      ]);

    return {
      watchTime: {
        today:   todayAgg._sum.watchTimeSeconds ?? 0,
        week:    weekAgg._sum.watchTimeSeconds  ?? 0,
        month:   monthAgg._sum.watchTimeSeconds ?? 0,
        allTime: allAgg._sum.watchTimeSeconds   ?? 0,
      },
      totalVideosWatched: totalVideos,
      avgCompletionRate:  Math.round(avgRate._avg.completionRate ?? 0),
      activeUsers: { today: activeToday, month: activeMonth },
    };
  },

  async videoStats(videoId: number) {
    const [rows, agg] = await Promise.all([
      prisma.videoWatchHistory.findMany({
        where: { videoId },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { watchTimeSeconds: 'desc' },
      }),
      prisma.videoWatchHistory.aggregate({
        where: { videoId },
        _sum: { watchTimeSeconds: true },
        _avg: { watchTimeSeconds: true, completionRate: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalViews:      agg._count.id,
      totalWatchSecs:  agg._sum.watchTimeSeconds  ?? 0,
      avgWatchSecs:    Math.round(agg._avg.watchTimeSeconds  ?? 0),
      avgCompletion:   Math.round(agg._avg.completionRate ?? 0),
      completedCount:  rows.filter(r => r.completed).length,
      uniqueViewers:   rows.length,
      topViewers:      rows.slice(0, 10).map(r => ({
        userId:          r.userId,
        email:           r.user.email,
        watchTimeSeconds: r.watchTimeSeconds,
        completionRate:  Math.round(r.completionRate),
      })),
    };
  },

  async userStats(userId: number) {
    const [rows, agg] = await Promise.all([
      prisma.videoWatchHistory.findMany({
        where: { userId },
        include: { video: { select: { id: true, title: true, thumbnail: true, type: true } } },
        orderBy: { lastWatchedAt: 'desc' },
      }),
      prisma.videoWatchHistory.aggregate({
        where: { userId },
        _sum: { watchTimeSeconds: true },
        _avg: { completionRate: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalWatchSecs:  agg._sum.watchTimeSeconds ?? 0,
      videosWatched:   agg._count.id,
      avgCompletion:   Math.round(agg._avg.completionRate ?? 0),
      completedVideos: rows.filter(r => r.completed).length,
      lastActivity:    rows[0]?.lastWatchedAt ?? null,
      history:         rows,
    };
  },

  async dailyData(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.videoWatchHistory.findMany({
      where:   { createdAt: { gte: since } },
      select:  { createdAt: true, watchTimeSeconds: true, completionRate: true },
    });

    const map = new Map<string, { watchSecs: number; count: number; rateSum: number }>();
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { watchSecs: 0, count: 0, rateSum: 0 };
      cur.watchSecs += r.watchTimeSeconds;
      cur.count     += 1;
      cur.rateSum   += r.completionRate;
      map.set(key, cur);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        watchTimeMinutes: Math.round(d.watchSecs / 60),
        views:            d.count,
        completionRate:   Math.round(d.rateSum / d.count),
      }));
  },

  async topVideos(limit = 10) {
    const rows = await prisma.videoWatchHistory.groupBy({
      by: ['videoId'],
      _sum: { watchTimeSeconds: true },
      _count: { id: true },
      orderBy: { _sum: { watchTimeSeconds: 'desc' } },
      take: limit,
    });

    const ids    = rows.map(r => r.videoId);
    const videos = await prisma.content.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    const vmap   = new Map(videos.map(v => [v.id, v.title]));

    return rows.map(r => ({
      videoId:         r.videoId,
      title:           vmap.get(r.videoId) ?? `Video #${r.videoId}`,
      watchTimeMinutes: Math.round((r._sum.watchTimeSeconds ?? 0) / 60),
      views:           r._count.id,
    }));
  },

  async topUsers(limit = 10) {
    const rows = await prisma.videoWatchHistory.groupBy({
      by: ['userId'],
      _sum: { watchTimeSeconds: true },
      _count: { id: true },
      orderBy: { _sum: { watchTimeSeconds: 'desc' } },
      take: limit,
    });

    const ids   = rows.map(r => r.userId);
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
    const umap  = new Map(users.map(u => [u.id, u.email]));

    return rows.map(r => ({
      userId:           r.userId,
      email:            umap.get(r.userId) ?? `User #${r.userId}`,
      watchTimeMinutes: Math.round((r._sum.watchTimeSeconds ?? 0) / 60),
      videos:           r._count.id,
    }));
  },

  async completionDistribution() {
    const [d0, d25, d50, d75, d90] = await Promise.all([
      prisma.videoWatchHistory.count({ where: { completionRate: { lt: 25 } } }),
      prisma.videoWatchHistory.count({ where: { completionRate: { gte: 25, lt: 50 } } }),
      prisma.videoWatchHistory.count({ where: { completionRate: { gte: 50, lt: 75 } } }),
      prisma.videoWatchHistory.count({ where: { completionRate: { gte: 75, lt: 90 } } }),
      prisma.videoWatchHistory.count({ where: { completionRate: { gte: 90 } } }),
    ]);
    return [
      { name: '0–25%',  value: d0  },
      { name: '25–50%', value: d25 },
      { name: '50–75%', value: d50 },
      { name: '75–90%', value: d75 },
      { name: '90–100%',value: d90 },
    ];
  },
};
