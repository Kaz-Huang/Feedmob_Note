import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (userId) where.userId = userId;
    if (teamId) where.user = { teamId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const logs = await prisma.workLog.findMany({
      where,
      include: {
        user: { include: { team: true } },
        tags: { include: { tag: true } },
      },
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } },
      ],
    });

    // Generate Markdown Weekly Summary
    let markdown = `# 📋 Feedmob 团队工作周报汇总 (${startDate || '本周'} ~ ${endDate || '至今'})\n\n`;
    
    // Group by User
    const userGroups: Record<string, { user: any; logs: typeof logs }> = {};
    for (const log of logs) {
      if (!userGroups[log.userId]) {
        userGroups[log.userId] = { user: log.user, logs: [] };
      }
      userGroups[log.userId].logs.push(log);
    }

    for (const group of Object.values(userGroups)) {
      markdown += `## 👤 ${group.user.name} (${group.user.title || group.user.role})\n`;
      markdown += `* **所属部门**: ${group.user.team?.name || '未分配'}\n\n`;

      for (const log of group.logs) {
        markdown += `### 📅 日期: ${log.date} ${log.mood ? log.mood : ''}\n`;
        if (log.title) markdown += `**主题**: ${log.title}\n\n`;
        
        if (log.tags.length > 0) {
          markdown += `**标签**: ${log.tags.map(t => `#${t.tag.name}`).join(' ')}\n\n`;
        }

        if (log.hasBlocker) {
          markdown += `> ⚠️ **包含阻塞/卡点点**\n\n`;
        }

        // Add text snippet
        const lines = log.contentText.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
          markdown += `${line}\n`;
        }
        markdown += `\n---\n\n`;
      }
    }

    return NextResponse.json({ logs, markdown });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
