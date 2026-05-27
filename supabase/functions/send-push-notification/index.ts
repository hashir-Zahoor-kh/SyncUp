// Edge Function: send-push-notification
// Triggered by Supabase DB webhooks on goals (UPDATE) and reactions (INSERT).
// Sends a push notification to the partner via Expo Push API.
// Payload contains NO goal text, display names, or emoji content.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate webhook secret
  const secret = Deno.env.get('SUPABASE_WEBHOOK_SECRET') ?? '';
  const incomingSecret = req.headers.get('x-webhook-secret') ?? '';
  if (!secret || incomingSecret !== secret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let recipientUserId: string | null = null;
  let pushTitle: string;
  let pushBody: string;

  if (
    payload.table === 'goals' &&
    payload.type === 'UPDATE' &&
    payload.old_record?.['completed_at'] === null &&
    payload.record?.['completed_at'] != null
  ) {
    // Goal completion event — notify the partner
    const connectionId = payload.record['connection_id'] as string;
    const goalOwnerId = payload.record['user_id'] as string;

    const { data: conn } = await adminClient
      .from('connections')
      .select('user_a_id, user_b_id')
      .eq('id', connectionId)
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no connection' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    recipientUserId = conn.user_a_id === goalOwnerId ? conn.user_b_id : conn.user_a_id;
    pushTitle = 'Your partner just completed a goal';
    pushBody = 'Open SyncUp to see what they did';
  } else if (payload.table === 'reactions' && payload.type === 'INSERT') {
    // Reaction event — notify the goal owner
    const goalId = payload.record?.['goal_id'] as string;

    const { data: goal } = await adminClient
      .from('goals')
      .select('user_id')
      .eq('id', goalId)
      .single();

    if (!goal) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no goal' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    recipientUserId = goal.user_id as string;
    pushTitle = 'Your partner reacted to your goal';
    pushBody = 'Open SyncUp to see';
  } else {
    return new Response(JSON.stringify({ ok: true, skipped: 'irrelevant event' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!recipientUserId) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no recipient' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up the recipient's push token
  const { data: tokenRow } = await adminClient
    .from('push_tokens')
    .select('token')
    .eq('user_id', recipientUserId)
    .single();

  if (!tokenRow?.token) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no push token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send to Expo Push API — payload contains NO PII
  const pushResponse = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: tokenRow.token,
      sound: 'default',
      title: pushTitle,
      body: pushBody,
    }),
  });

  if (!pushResponse.ok) {
    return new Response(JSON.stringify({ error: 'Push delivery failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
