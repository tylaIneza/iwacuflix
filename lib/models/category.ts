import prisma from '@/lib/db';

const DEFAULTS = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary', 'Fantasy'];

export const Category = {
  async findAll() {
    const rows = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    // Seed defaults if table is empty
    if (rows.length === 0) {
      await prisma.category.createMany({
        data: DEFAULTS.map((name) => ({ name })),
        skipDuplicates: true,
      });
      return prisma.category.findMany({ orderBy: { name: 'asc' } });
    }
    return rows;
  },

  async create(name: string) {
    return prisma.category.create({ data: { name: name.trim() } });
  },

  async delete(id: number) {
    return prisma.category.delete({ where: { id } });
  },
};
