import { NextRequest, NextResponse } from 'next/server';
import { Content } from '@/lib/models/content';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await Content.recordView(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
