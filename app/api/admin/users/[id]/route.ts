import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyRequest } from '@/lib/server/auth';
import prisma from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const caller = verifyRequest(req);
  if (!caller) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { password } = await req.json();
  if (!password || password.length < 6)
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: Number(id) }, data: { password: hashed } });
  return NextResponse.json({ message: 'Password updated' });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const caller = verifyRequest(req);
  if (!caller) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (caller.userId === Number(id))
    return NextResponse.json({ message: 'Cannot delete your own account' }, { status: 400 });

  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ message: 'Deleted' });
}
