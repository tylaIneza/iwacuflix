import prisma from '@/lib/db';

function toApi(row: Record<string, unknown> | null) {
  if (!row) return null;
  const { id, ...rest } = row as { id: number; [key: string]: unknown };
  return { _id: String(id), ...rest, views: Number((rest.views as number) ?? 0) };
}

export const Content = {
  async findAll(filter: { isPublished?: boolean; type?: string; category?: string; search?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filter.isPublished !== undefined) where.isPublished = filter.isPublished;
    if (filter.type)     where.type     = filter.type;
    if (filter.category) where.category = { contains: filter.category };
    if (filter.search) {
      where.OR = [
        { title:       { contains: filter.search } },
        { description: { contains: filter.search } },
        { category:    { contains: filter.search } },
      ];
    }
    const rows = await prisma.content.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map(toApi);
  },

  async findById(id: string) {
    const row = await prisma.content.findUnique({ where: { id: parseInt(id) } });
    return toApi(row as Record<string, unknown> | null);
  },

  async create(data: Record<string, unknown>) {
    const row = await prisma.content.create({
      data: {
        title:       data.title as string,
        description: data.description as string,
        thumbnail:   data.thumbnail as string,
        videoUrl:    data.videoUrl as string,
        type:        data.type as 'movie' | 'series',
        category:    data.category as string,
        season:      (data.season as number) ?? null,
        episode:     (data.episode as number) ?? null,
        isPublished: !!(data.isPublished),
      },
    });
    return toApi(row as unknown as Record<string, unknown>);
  },

  async update(id: string, data: Record<string, unknown>) {
    const allowed = ['title','description','thumbnail','videoUrl','type','category','season','episode','isPublished'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = key === 'isPublished' ? !!(data[key]) : (data[key] ?? null);
      }
    }
    if (!Object.keys(updateData).length) return this.findById(id);
    const row = await prisma.content.update({ where: { id: parseInt(id) }, data: updateData });
    return toApi(row as unknown as Record<string, unknown>);
  },

  async togglePublish(id: string) {
    const current = await prisma.content.findUnique({ where: { id: parseInt(id) } });
    if (!current) return null;
    const row = await prisma.content.update({
      where: { id: parseInt(id) },
      data:  { isPublished: !current.isPublished },
    });
    return toApi(row as unknown as Record<string, unknown>);
  },

  async delete(id: string) {
    try {
      await prisma.content.delete({ where: { id: parseInt(id) } });
      return true;
    } catch { return false; }
  },

  async recordView(id: string) {
    const row = await prisma.content.update({
      where: { id: parseInt(id) },
      data:  { views: { increment: 1 } },
    });
    return toApi(row as unknown as Record<string, unknown>);
  },

  async topByViews(limit = 10) {
    const rows = await prisma.content.findMany({
      where:   { isPublished: true },
      orderBy: { views: 'desc' },
      take:    limit,
    });
    return rows.map(toApi);
  },

  async count(filter: { isPublished?: boolean; type?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filter.isPublished !== undefined) where.isPublished = filter.isPublished;
    if (filter.type) where.type = filter.type;
    return prisma.content.count({ where });
  },

  async totalViews() {
    const result = await prisma.content.aggregate({ _sum: { views: true } });
    return Number(result._sum.views ?? 0);
  },
};
