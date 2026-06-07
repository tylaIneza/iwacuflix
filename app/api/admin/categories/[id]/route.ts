import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { Category } from '@/lib/models/category';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    await Category.delete(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[categories DELETE]', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
