// Additive and repeatable; never resets application data.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try {
  await db.$transaction([
    db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "McpToken" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL, "prefix" TEXT NOT NULL, "scopes" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" DATETIME NOT NULL,
      "revokedAt" DATETIME, "lastUsedAt" DATETIME,
      CONSTRAINT "McpToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`),
    db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "McpToken_tokenHash_key" ON "McpToken"("tokenHash")'),
    db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "McpToken_userId_idx" ON "McpToken"("userId")'),
  ]);
  console.log('MCP token schema ready.');
} finally { await db.$disconnect(); }
