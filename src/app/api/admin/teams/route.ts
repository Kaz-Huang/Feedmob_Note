import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-user';

async function saveTeam(req: Request, creating: boolean) {
  const actor = await requireAdmin();
  if (actor instanceof NextResponse) return actor;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const color = body?.color || '#00b2aa';
  if (!name || name.length > 100 || typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) return NextResponse.json({ error: '请填写有效的团队名称和颜色。' }, { status: 400 });
  if (creating) return NextResponse.json(await prisma.team.create({ data: { name, color, slug: randomUUID() } }), { status: 201 });
  if (typeof body.id !== 'string' || !await prisma.team.findUnique({ where: { id: body.id } })) return NextResponse.json({ error: '团队不存在。' }, { status: 404 });
  return NextResponse.json(await prisma.team.update({ where: { id: body.id }, data: { name, color } }));
}

export async function POST(req: Request) { return saveTeam(req, true); }
export async function PATCH(req: Request) { return saveTeam(req, false); }
