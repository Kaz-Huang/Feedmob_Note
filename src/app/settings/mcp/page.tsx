import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server-user';
import { McpSettings } from '@/components/settings/McpSettings';
export default async function McpSettingsPage() {
  if (!await getAuthenticatedUser()) redirect('/login?callbackUrl=/settings/mcp');
  return <McpSettings />;
}
