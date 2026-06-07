import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { Content } from '@/lib/models/content';

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const items = await Content.findAll({
      ...(searchParams.get('type')   && { type:   searchParams.get('type')!   }),
      ...(searchParams.get('search') && { search: searchParams.get('search')! }),
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const required = ['title', 'description', 'thumbnail', 'videoUrl', 'type', 'category'];
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ message: `${f} is required` }, { status: 400 });
    }
    const item = await Content.create(body);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[content POST]', err);
    const detail = (err as { message?: string })?.message ?? 'Unknown error';
    return NextResponse.json({ message: `Server error: ${detail}` }, { status: 500 });
  }
}
