import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { Category } from '@/lib/models/category';

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await Category.findAll();
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[categories GET]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    const row = await Category.create(name);
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    console.error('[categories POST]', err);
    const isUnique = (err as { code?: string })?.code === 'P2002';
    if (isUnique) return NextResponse.json({ message: 'Category already exists' }, { status: 409 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
