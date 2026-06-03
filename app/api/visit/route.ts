import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const path = (body.path || '/').slice(0, 255);
    const ip   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await prisma.siteVisit.create({ data: { path, ip } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
