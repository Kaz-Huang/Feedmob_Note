import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-user';
import { hashToken, MCP_SCOPES, sameOrigin } from '@/lib/mcp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const select = { id: true, name: true, prefix: true, scopes: true, createdAt: true, expiresAt: true, revokedAt: true, lastUsedAt: true };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const createSchema = z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(z.enum(MCP_SCOPES)).min(1).max(4), expiresInDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30) }).strict();
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return json(await prisma.mcpToken.findMany({ where: { userId: user.id }, select, orderBy: { createdAt: 'desc' } }));
}
export async function POST(req: Request) {
  if (!sameOrigin(req) || !req.headers.get('content-type')?.startsWith('application/json')) return json({ error: '请求来源无效。' }, 403);
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!user.email.toLowerCase().endsWith('@feedmob.com')) return json({ error: '请使用公司账号。' }, 403);
  const input = createSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: '请填写名称、权限和有效期。' }, 400);
  const secret = `mw_${randomBytes(32).toString('base64url')}`;
  const result = await prisma.$transaction(async tx => {
    // Bound stored history and active credentials for each account.
    await tx.mcpToken.deleteMany({ where: { userId: user.id, OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: new Date() } }] } });
    if (await tx.mcpToken.count({ where: { userId: user.id } }) >= 10) return null;
    return tx.mcpToken.create({ data: { userId: user.id, name: input.data.name, scopes: [...new Set([...input.data.scopes, ...(input.data.scopes.some(scope => scope === 'logs:write' || scope === 'tags:write') ? ['logs:read'] : [])])].join(' '), tokenHash: hashToken(secret), prefix: secret.slice(0, 11), expiresAt: new Date(Date.now() + input.data.expiresInDays * 86400_000) }, select });
  });
  return result ? json({ ...result, token: secret }, 201) : json({ error: '最多保留 10 个有效密钥，请先撤销旧密钥。' }, 409);
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req) || !req.headers.get('content-type')?.startsWith('application/json')) return json({ error: '请求来源无效。' }, 403);
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const body = z.object({ id: z.string().uuid() }).strict().safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: '密钥编号无效。' }, 400);
  const result = await prisma.mcpToken.updateMany({ where: { id: body.data.id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return result.count ? json({ ok: true }) : json({ error: '密钥不存在。' }, 404);
}
