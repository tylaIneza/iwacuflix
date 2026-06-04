import prisma from '@/lib/db';

export const User = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },
  async findByRole(role: 'admin') {
    return prisma.user.findFirst({ where: { role } });
  },
  async create({ email, password, role = 'admin' as const }: { email: string; password: string; role?: 'admin' }) {
    return prisma.user.create({ data: { email: email.toLowerCase(), password, role } });
  },
};
