import type { Metadata } from 'next';

import { createAdminClient } from '@/lib/supabase/admin';
import type { NsoBuilderSettings, NsoBuildVersion, NsoPlatformChannel, NsoPlatformOffer } from '@/lib/types/database';
import NsoBuilderAdminClient from './NsoBuilderAdminClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Build Ninja School | Admin' };

export default async function NsoBuilderAdminPage() {
  const admin = createAdminClient();
  const [{ data: settings }, { data: versions }, { data: jobs }, { data: channels }, { data: offers }, { data: accesses }] = await Promise.all([
    admin.from('nso_builder_settings').select('*').eq('id', true).single(),
    admin.from('nso_build_versions').select('*').order('sort_order'),
    admin.from('nso_build_jobs').select('id,user_id,version_code,server_name,server_host,server_port,price,output_kind,status,output_name,output_size,built_at,created_at,updated_at').order('created_at', { ascending: false }).limit(100),
    admin.from('nso_platform_channels').select('*').order('sort_order'),
    admin.from('nso_platform_offers').select('*').order('sort_order'),
    admin.from('nso_server_access').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  const userIds = Array.from(new Set([...(jobs || []).map((job) => job.user_id), ...(accesses || []).map((access) => access.user_id)]));
  const { data: profiles } = userIds.length
    ? await admin.from('user_profiles').select('id,email,display_name').in('id', userIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const channelMap = new Map((channels || []).map((channel) => [channel.id, channel]));
  const enrichedJobs = (jobs || []).map((job) => ({ ...job, customer: profileMap.get(job.user_id) || null }));
  const enrichedAccesses = (accesses || []).map((access) => ({
    ...access,
    customer: profileMap.get(access.user_id) || null,
    channel: channelMap.get(access.channel_id) || null,
  }));

  return (
    <NsoBuilderAdminClient
      initialSettings={settings as NsoBuilderSettings}
      initialVersions={(versions || []) as NsoBuildVersion[]}
      initialChannels={(channels || []) as NsoPlatformChannel[]}
      initialOffers={(offers || []) as NsoPlatformOffer[]}
      jobs={enrichedJobs}
      accesses={enrichedAccesses}
    />
  );
}
