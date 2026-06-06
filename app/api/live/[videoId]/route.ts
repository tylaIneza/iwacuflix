export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { activeViewers } from '@/lib/activeSessions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId: rawId } = await params;
  const videoId = parseInt(rawId, 10);
  if (!Number.isInteger(videoId) || videoId < 1)
    return NextResponse.json({ count: 0 });

  return NextResponse.json({ count: activeViewers(videoId) });
}
