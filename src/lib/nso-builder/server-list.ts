import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function serveNsoServerList(endpointSlug: string) {
  const admin = createAdminClient();
  const { data: channel, error: channelError } = await admin.from('nso_platform_channels')
    .select('id').eq('endpoint_slug', endpointSlug).maybeSingle();

  if (channelError || !channel) {
    if (channelError) console.error(`[NSO Endpoint] Could not load ${endpointSlug}`, channelError);
    return new Response('', { status: channelError ? 500 : 200, headers: textHeaders() });
  }

  const { data, error } = await admin.from('nso_server_access')
    .select('server_name,server_host,server_port')
    .eq('channel_id', channel.id).eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: true });
  if (error) {
    console.error(`[NSO Endpoint] Could not render ${endpointSlug}`, error);
    return new Response('', { status: 500, headers: textHeaders() });
  }

  const uniqueServers = Array.from(new Set((data || []).map((server) =>
    `${server.server_name}:${server.server_host}:${server.server_port}:0:0`,
  )));
  return new Response(uniqueServers.join(','), { status: 200, headers: textHeaders() });
}

function textHeaders() {
  return {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  };
}

