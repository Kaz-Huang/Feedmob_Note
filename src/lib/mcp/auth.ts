import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const MCP_SCOPES = ['logs:read', 'logs:write', 'team:read', 'tags:write'] as const;
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const mcpOrigin = (req: Request) => new URL(process.env.NEXTAUTH_URL || req.url).origin;
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return !origin || origin === mcpOrigin(req);
}

export async function authenticateMcp(req: Request) {
  const header = req.headers.get('authorization') || '';
  if (!/^Bearer mw_[A-Za-z0-9_-]{43}$/.test(header)) return null;
  const token = await prisma.mcpToken.findUnique({ where: { tokenHash: hashToken(header.slice(7)) }, include: { user: { include: { team: true } } } });
  if (!token || token.revokedAt || token.expiresAt <= new Date() || !token.user.email.toLowerCase().endsWith('@feedmob.com')) return null;
  if (!token.lastUsedAt || Date.now() - token.lastUsedAt.getTime() > 60_000) {
    await prisma.mcpToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  }
  return { user: token.user, scopes: token.scopes.split(' '), tokenId: token.id };
}
export type McpActor = NonNullable<Awaited<ReturnType<typeof authenticateMcp>>>;
