const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Clearing existing database records...');
  await prisma.comment.deleteMany({});
  await prisma.reaction.deleteMany({});
  await prisma.tagOnLog.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.workLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});

  console.log('🏢 Creating Teams...');
  const techTeam = await prisma.team.create({
    data: {
      name: '技术研发组',
      slug: 'engineering',
      color: '#3b82f6',
    },
  });

  const growthTeam = await prisma.team.create({
    data: {
      name: '广告增长组',
      slug: 'growth',
      color: '#10b981',
    },
  });

  const productTeam = await prisma.team.create({
    data: {
      name: '产品设计组',
      slug: 'product',
      color: '#8b5cf6',
    },
  });

  console.log('👤 Creating Users...');
  const alex = await prisma.user.create({
    data: {
      email: 'alex@feedmob.com',
      name: 'Alex Chen',
      role: 'ADMIN',
      title: '系统架构师 / Tech Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      teamId: techTeam.id,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@feedmob.com',
      name: 'Sarah Lin',
      role: 'MEMBER',
      title: '资深前端工程师',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      teamId: techTeam.id,
    },
  });

  const kevin = await prisma.user.create({
    data: {
      email: 'kevin@feedmob.com',
      name: 'Kevin Zhang',
      role: 'MANAGER',
      title: '增长运营主管',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      teamId: growthTeam.id,
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: 'emma@feedmob.com',
      name: 'Emma Wang',
      role: 'MEMBER',
      title: '产品经理 (PM)',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      teamId: productTeam.id,
    },
  });

  console.log('🏷️ Creating Tags...');
  const tagTiktok = await prisma.tag.create({ data: { name: 'TikTok-Campaign', color: '#ec4899' } });
  const tagAuth = await prisma.tag.create({ data: { name: 'Auth-Refactor', color: '#3b82f6' } });
  const tagPerf = await prisma.tag.create({ data: { name: 'Performance', color: '#eab308' } });
  const tagStream = await prisma.tag.create({ data: { name: 'Stream-Map', color: '#10b981' } });

  console.log('📝 Creating WorkLogs...');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Sarah's Log (Today)
  const sarahLog = await prisma.workLog.create({
    data: {
      userId: sarah.id,
      date: todayStr,
      title: '完成 Block 编辑器 Slash 菜单重构 & 性能调优',
      hasBlocker: true,
      mood: '🚀',
      contentText: '今日产出: 1. 完成 Tiptap Slash 指令下拉交互; 2. 优化多图同时粘贴时的上传防抖; 明日计划: 对接 Mermaid 架构图渲染器; 阻塞与风险: TikTok OAuth 授权端点在某些地区有网络延迟，需要后端添加重试代理。',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '🚀 今日产出 (Today Accomplishments)' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成 Tiptap Slash 快捷菜单组件与光标精准定位' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '优化图片与截图剪贴板粘贴 (Ctrl+V) 自动上传逻辑' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '集成 Mermaid 动态渲染扩展' }] }],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '⚠️ 阻塞与卡点 (Blockers)' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '【Blocker】TikTok OAuth 授权在东南亚节点响应变慢（>3000ms），正在与运维对齐海外反向代理配置。',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '🎯 明日计划 (Tomorrow Plan)' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成 tldraw 白板嵌入 Block 测试' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '与 Kevin 对齐广告转化归因报表导出格式' }] }],
              },
            ],
          },
        ],
      }),
    },
  });

  // Attach Tags
  await prisma.tagOnLog.create({ data: { logId: sarahLog.id, tagId: tagTiktok.id } });
  await prisma.tagOnLog.create({ data: { logId: sarahLog.id, tagId: tagPerf.id } });

  // Reactions & Comments
  await prisma.reaction.create({
    data: { logId: sarahLog.id, userId: alex.id, emoji: '👍' },
  });
  await prisma.reaction.create({
    data: { logId: sarahLog.id, userId: kevin.id, emoji: '🚀' },
  });

  await prisma.comment.create({
    data: {
      logId: sarahLog.id,
      userId: alex.id,
      content: '海外代理已经配置完成，已在 Cloudflare 加上回源缓存路由，你稍后再测一下！',
    },
  });

  // Alex's Log (Today)
  const alexLog = await prisma.workLog.create({
    data: {
      userId: alex.id,
      date: todayStr,
      title: 'Feedmob 架构设计落地 & SQLite 数据持久化',
      hasBlocker: false,
      mood: '⚡',
      contentText: '今日产出: 1. 完成 Normalized RecordMap 数据 Schema 定义; 2. 输出团队周报聚合与多维视图投影设计; 明日计划: 审查团队成员 PR，准备进行内测发布。',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '⚡ 今日核心突破' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '确立了 Feedmob 专属日志系统的核心架构：统一 Block 状态树 + 毫秒级多维投影。' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成 Prisma Schema 设计 (User / Team / WorkLog / Tag)' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '设计无损 Markdown + YAML Frontmatter 双向转换器' }] }],
              },
            ],
          },
        ],
      }),
    },
  });
  await prisma.tagOnLog.create({ data: { logId: alexLog.id, tagId: tagStream.id } });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
