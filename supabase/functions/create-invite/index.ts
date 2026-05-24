// Edge Function: create-invite
// Generates a server-side UUID invite token for the authenticated user.
// Returns { url: "https://trysyncup.org/i/<token>" } — token only, never user ID.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { Database } from '../_shared/database-types.ts';

const MAX_PENDING_INVITES = 3;
const INVITE_EXPIRY_DAYS = 7;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Verify the user's JWT via the anon client.
  const userClient = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError !== null || user === null) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

  // Rate limit: reject if user already has MAX_PENDING_INVITES non-expired, unaccepted invites.
  const now = new Date().toISOString();
  const { count, error: countError } = await adminClient
    .from('invites')
    .select('id', { count: 'exact', head: true })
    .eq('inviter_user_id', user.id)
    .eq('accepted', false)
    .gt('expires_at', now);

  if (countError !== null) {
    return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if ((count ?? 0) >= MAX_PENDING_INVITES) {
    return new Response(JSON.stringify({ error: 'Too many pending invites' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate token server-side — client cannot supply its own token.
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await adminClient.from('invites').insert({
    token,
    inviter_user_id: user.id,
    expires_at: expiresAt,
    accepted: false,
  });

  if (insertError !== null) {
    return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = `https://trysyncup.org/i/${token}`;

  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
