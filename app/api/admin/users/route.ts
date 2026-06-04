import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyRequest } from '@/lib/server/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return NextResponse.json({ message: 'Email already in use' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), password: hashed, role: 'admin' },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
