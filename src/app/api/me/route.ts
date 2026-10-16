import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;
  const email = sessionUser?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const name = sessionUser?.name?.trim() || email.split('@')[0];
  const avatar = sessionUser?.image || null;

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, avatar },
    create: {
      email,
      name,
      avatar,
      role: 'MEMBER',
    },
    include: { team: true },
  });

  return NextResponse.json(user);
}
