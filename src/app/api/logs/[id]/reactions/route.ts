import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, forbiddenIdentity } from '@/lib/server-user';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireUser();
    if (actor instanceof NextResponse) return actor;
    const { id } = await params;
    const body = await req.json();
    const { emoji } = body;

    if (body.userId !== undefined && body.userId !== actor.id) return forbiddenIdentity();
    const userId = actor.id;

    if (!userId || !emoji) {
      return NextResponse.json({ error: 'userId and emoji are required' }, { status: 400 });
    }

    // Toggle reaction: if already exists, delete it; if not, create it
    const existing = await prisma.reaction.findUnique({
      where: {
        logId_userId_emoji: {
          logId: id,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ action: 'removed', id: existing.id });
    } else {
      const reaction = await prisma.reaction.create({
        data: {
          logId: id,
          userId,
          emoji,
        },
        include: {
          user: true,
        },
      });
      return NextResponse.json({ action: 'added', reaction });
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
