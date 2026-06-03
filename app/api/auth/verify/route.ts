import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';

export function GET(req: NextRequest) {
  const user = verifyRequest(req);
  if (!user) return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
  return NextResponse.json({ valid: true, user });
}
