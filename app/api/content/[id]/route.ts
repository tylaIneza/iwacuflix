import { NextRequest, NextResponse } from 'next/server';
import { Content } from '@/lib/models/content';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await Content.findById(id);
    if (!item || !(item as Record<string, unknown>).isPublished)
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
