// Edge Function: accept-invite
// Validates an invite token and atomically creates the connection via a Postgres RPC.
// IP-based rate limit: 10 attempts per IP per hour (prevents token enumeration).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { Database } from '../_shared/database-types.ts';

const MAX_ATTEMPTS_PER_IP_PER_HOUR = 10;

// UUID v4 regex — tokens that don't match this are rejected before any DB lookup.
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  // Verify user's JWT.
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

  // Extract client IP — prefer Cloudflare's header (not client-spoofable in production),
  // fall back to X-Forwarded-For first entry (used in integration tests with known IPs).
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  // IP-based rate limit: count attempts in the last hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: attemptCount, error: countError } = await adminClient
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'accept_invite')
    .eq('ip_address', ip)
    .gt('created_at', oneHourAgo);

  if (countError !== null) {
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if ((attemptCount ?? 0) >= MAX_ATTEMPTS_PER_IP_PER_HOUR) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log this attempt before processing (counts regardless of outcome).
  await adminClient
    .from('rate_limit_events')
    .insert({ event_type: 'accept_invite', ip_address: ip });

  // Best-effort cleanup of old rate limit events (non-blocking).
  adminClient
    .rpc('purge_old_rate_limit_events')
    .then(() => {})
    .catch(() => {});

  // Parse and validate the token from the request body.
  let token: string;
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token !== 'string' || body.token.length === 0) {
      return new Response(JSON.stringify({ error: 'Invite not found or has expired' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    token = body.token;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Reject malformed tokens before any DB lookup (enumeration prevention).
  if (!UUID_V4_RE.test(token)) {
    return new Response(JSON.stringify({ error: 'Invite not found or has expired' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Call the atomic RPC — all validations and writes happen in one transaction.
  const { data: rpcResult, error: rpcError } = await adminClient.rpc('accept_invite_atomic', {
    p_token: token,
    p_accepter_user_id: user.id,
  });

  if (rpcError !== null || rpcResult === null) {
    return new Response(JSON.stringify({ error: 'Failed to process invite' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = rpcResult as {
    result: 'success' | 'invalid_token' | 'self_accept' | 'already_connected';
    connection_id: string | null;
    partner_name: string | null;
    partner_avatar_color: string | null;
  };

  switch (result.result) {
    case 'invalid_token':
      // Covers: nonexistent, expired, and already-accepted — same message prevents enumeration.
      return new Response(JSON.stringify({ error: 'Invite not found or has expired' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    case 'self_accept':
      return new Response(JSON.stringify({ error: 'You cannot accept your own invite' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    case 'already_connected':
      return new Response(JSON.stringify({ error: 'Already connected' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    case 'success':
      return new Response(
        JSON.stringify({
          connection_id: result.connection_id,
          partner_name: result.partner_name,
          partner_avatar_color: result.partner_avatar_color,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );

    default:
      return new Response(JSON.stringify({ error: 'Failed to process invite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
});
