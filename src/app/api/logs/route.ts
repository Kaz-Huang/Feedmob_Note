import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const teamId = searchParams.get('teamId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tag = searchParams.get('tag');
    const hasBlocker = searchParams.get('hasBlocker');
    const keyword = searchParams.get('keyword');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (teamId) {
      where.user = { teamId };
    }

    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (hasBlocker !== null && hasBlocker !== undefined && hasBlocker !== '') {
      where.hasBlocker = hasBlocker === 'true';
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { contentText: { contains: keyword } },
      ];
    }

    const logs = await prisma.workLog.findMany({
      where,
      include: {
        user: {
          include: {
            team: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        reactions: {
          include: {
            user: true,
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, date, title, contentJson, contentText, mood, tagNames } = body;

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    // Auto-detect blocker from text content
    const textToCheck = (contentText || '') + ' ' + (title || '');
    const hasBlocker = /【Blocker】|blocker|卡点|阻塞|风险|阻碍/i.test(textToCheck);

    // Upsert the WorkLog
    const workLog = await prisma.workLog.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        title: title || null,
        contentJson: typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson),
        contentText: contentText || '',
        hasBlocker,
        mood: mood || null,
      },
      create: {
        userId,
        date,
        title: title || null,
        contentJson: typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson),
        contentText: contentText || '',
        hasBlocker,
        mood: mood || '🚀',
      },
    });

    // Handle Tags association if provided
    if (Array.isArray(tagNames)) {
      // Clear existing tags
      await prisma.tagOnLog.deleteMany({
        where: { logId: workLog.id },
      });

      for (const tagName of tagNames) {
        if (!tagName) continue;
        const tag = await prisma.tag.upsert({
          where: { name: tagName.trim() },
          update: {},
          create: { name: tagName.trim() },
        });

        await prisma.tagOnLog.create({
          data: {
            logId: workLog.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Return the updated log with relations
    const fullLog = await prisma.workLog.findUnique({
      where: { id: workLog.id },
      include: {
        user: { include: { team: true } },
        tags: { include: { tag: true } },
        reactions: { include: { user: true } },
        comments: { include: { user: true } },
      },
    });

    return NextResponse.json(fullLog);
  } catch (error) {
    console.error('Error saving log:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}
