import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateMcp, mcpOrigin, sameOrigin } from '@/lib/mcp/auth';
import { createMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(req: Request) {
  const noStore = { 'Cache-Control': 'no-store' };
  if (!sameOrigin(req) || req.headers.get('host') !== new URL(mcpOrigin(req)).host) return Response.json({ error: 'Invalid origin or host' }, { status: 403, headers: noStore });
  const actor = await authenticateMcp(req);
  if (!actor) return Response.json({ error: '请在 Minework → 账号设置 → MCP 连接生成个人密钥，以 Authorization: Bearer <token> 连接。' }, { status: 401, headers: { ...noStore, 'WWW-Authenticate': 'Bearer realm="Minework MCP"' } });
  // Stateless JSON responses need no long-lived event stream or session deletion.
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { ...noStore, Allow: 'POST' } });
  const server = createMcpServer(actor);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 256 * 1024 });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } finally { await server.close(); }
}
export const POST = handle;
export const GET = handle;
export const DELETE = handle;
