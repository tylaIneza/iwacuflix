import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = 'admin@iwacuflix.com';
const PASSWORD = 'Admin@1234';

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 10);

  const existing = await prisma.user.findFirst({ where: { role: 'admin' } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { email: EMAIL, password: hashed },
    });
    console.log('Admin credentials reset.');
  } else {
    await prisma.user.create({
      data: { email: EMAIL, password: hashed, role: 'admin' },
    });
    console.log('Admin account created.');
  }

  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
