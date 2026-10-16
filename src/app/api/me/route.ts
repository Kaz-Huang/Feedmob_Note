import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-user';

export async function GET() {
  const user = await requireUser();
  return user instanceof NextResponse ? user : NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } });
}
