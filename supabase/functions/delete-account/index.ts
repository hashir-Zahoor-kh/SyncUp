// Edge Function: delete-account
// Permanently deletes the authenticated user's account and all associated data.
// Apple App Store Guideline 5.1.1(v) requires in-app account deletion.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://trysyncup.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Validate JWT using the user-scoped client
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError !== null || user === null) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Rate limit: 1 deletion attempt per user per 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingRequest } = await adminClient
    .from('deletion_requests')
    .select('id')
    .eq('user_id', user.id)
    .gte('requested_at', since)
    .limit(1)
    .maybeSingle();

  if (existingRequest !== null) {
    return json(
      { error: 'A deletion request was already submitted recently. Please wait 24 hours.' },
      429,
    );
  }

  // Insert deletion request record (processing state)
  const { error: insertError } = await adminClient.from('deletion_requests').insert({
    user_id: user.id,
    processed_status: 'processing',
  });

  if (insertError !== null) {
    return json({ error: 'Failed to initiate deletion. Please try again.' }, 500);
  }

  // Run the atomic deletion function (SECURITY DEFINER, bypasses RLS safely)
  const { data: deletionResult, error: deletionError } = await adminClient.rpc(
    'process_account_deletion',
    { p_user_id: user.id },
  );

  if (deletionError !== null) {
    // Mark request as failed
    await adminClient
      .from('deletion_requests')
      .update({ processed_status: 'failed' })
      .eq('user_id', user.id)
      .gte('requested_at', since);
    return json({ error: 'Deletion failed. Please contact support@trysyncup.org.' }, 500);
  }

  const result = deletionResult as { success: boolean; partner_id: string | null };

  // Delete the auth user via admin API
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (authDeleteError !== null) {
    return json({ error: 'Deletion failed. Please contact support@trysyncup.org.' }, 500);
  }

  // Mark deletion completed
  await adminClient
    .from('deletion_requests')
    .update({ processed_status: 'completed', processed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .gte('requested_at', since);

  // Notify partner if one existed — no PII in payload
  if (result.partner_id !== null) {
    const { data: tokenRow } = await adminClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', result.partner_id)
      .maybeSingle();

    if (tokenRow?.token) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          to: tokenRow.token,
          sound: 'default',
          title: 'A connection has ended',
          body: 'Open SyncUp to see your board',
        }),
      });
    }
  }

  return json({ success: true }, 200);
});
