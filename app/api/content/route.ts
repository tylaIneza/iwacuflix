import { NextRequest, NextResponse } from 'next/server';
import { Content } from '@/lib/models/content';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const items = await Content.findAll({
      isPublished: true,
      ...(searchParams.get('type')     && { type:     searchParams.get('type')!     }),
      ...(searchParams.get('category') && { category: searchParams.get('category')! }),
      ...(searchParams.get('search')   && { search:   searchParams.get('search')!   }),
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
