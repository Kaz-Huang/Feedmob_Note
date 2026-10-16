import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store' };
  try {
    const version = process.env.NODE_ENV === 'development' ? 'development'
      : (await readFile(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8')).trim();
    return NextResponse.json({ version }, { headers });
  } catch {
    return NextResponse.json({ error: 'Version unavailable' }, { status: 503, headers });
  }
}
