import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import { prisma } from './prisma';

/** Resolve identity and role from the signed session and database on every request. */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const existing = await prisma.user.findUnique({ where: { email }, include: { team: true } });
  if (existing) return existing;
  return prisma.user.upsert({
    where: { email }, update: {},
    create: { email, name: session?.user?.name?.trim() || email.split('@')[0], avatar: session?.user?.image || null, role: 'MEMBER' },
    include: { team: true },
  });
}

export async function requireUser() {
  return await getAuthenticatedUser() ?? NextResponse.json({ error: '请先登录。' }, { status: 401 });
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: '只有管理员可以执行此操作。' }, { status: 403 });
  return user;
}

export const forbiddenIdentity = () => NextResponse.json({ error: '只能以当前登录账号执行操作。' }, { status: 403 });
