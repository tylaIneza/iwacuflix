import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function verifyRequest(req: NextRequest): JwtPayload | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}
