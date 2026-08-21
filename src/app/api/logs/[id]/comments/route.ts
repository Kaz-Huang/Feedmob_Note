import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId, content, blockId } = body;

    if (!userId || !content) {
      return NextResponse.json({ error: 'userId and content are required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        logId: id,
        userId,
        content: content.trim(),
        blockId: blockId || null,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
