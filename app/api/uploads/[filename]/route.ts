import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname, basename } from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  const safe = basename(filename);

  try {
    const filePath = join(process.cwd(), 'data', 'uploads', safe);
    const buffer = await readFile(filePath);

    const ext = extname(safe).toLowerCase();
    const mime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime[ext] ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
}
