import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { writeFile } from 'fs/promises';
import { join, extname } from 'path';

export async function POST(req: NextRequest) {
  if (!verifyRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get('thumbnail') as File | null;
    if (!file) return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    if (!file.type.startsWith('image/'))
      return NextResponse.json({ message: 'Images only' }, { status: 400 });

    const ext      = extname(file.name) || '.jpg';
    const filename = `thumb_${Date.now()}${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());
    await writeFile(join(process.cwd(), 'public', 'uploads', filename), buffer);

    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return NextResponse.json({ url: `${proto}://${host}/uploads/${filename}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}
