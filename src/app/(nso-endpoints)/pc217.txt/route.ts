import { serveNsoServerList } from '@/lib/nso-builder/server-list';
export const dynamic = 'force-dynamic';
export async function GET() { return serveNsoServerList('pc217.txt'); }
