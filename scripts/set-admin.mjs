// Operator-only bootstrap. Run explicitly on the server for an existing SSO user.
import { PrismaClient } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();
const domain = (process.env.ALLOWED_EMAIL_DOMAIN || 'feedmob.com').toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+$/.test(email) || !email.endsWith('@' + domain)) {
  throw new Error('Provide the existing administrator’s corporate login email.');
}
const prisma = new PrismaClient();
try {
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { email } });
    if (!user) throw new Error('The account must sign in before it can be made an administrator.');
    await tx.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    const legacy = await tx.user.updateMany({ where: { role: 'ADMIN', email: { endsWith: '@workspace.local' } }, data: { role: 'MEMBER' } });
    return { email, role: 'ADMIN', legacyAdministratorsRemoved: legacy.count };
  });
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
