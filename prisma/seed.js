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

  console.log('👤 Creating default clean user...');
  const defaultUser = await prisma.user.create({
    data: {
      email: 'user@workspace.local',
      name: '当前用户',
      role: 'ADMIN',
      title: '主账号',
      avatar: null,
    },
  });

  console.log('✅ Clean database seed completed with 1 single user and 0 dummy user templates!');
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

