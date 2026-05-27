// Edge Function: add-reaction
// Rate-limited reaction upsert. Max 60 per user per hour.
// Validates JWT, enforces self-reaction prevention, upserts (delete+insert) reaction.
// Self-contained — no _shared/ imports (deployed via Supabase Dashboard editor).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://trysyncup.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REACTION_RATE_LIMIT = 60;
const VALID_EMOJIS = ['🔥', '👏', '💛', '💪', '🎉', '❤️'] as const;

type ReactionEmoji = (typeof VALID_EMOJIS)[number];

interface AddReactionBody {
  goal_id: string;
  emoji: string;
}

interface GoalRecord {
  user_id: string;
  connection_id: string;
}

interface ConnectionRecord {
  user_a_id: string;
  user_b_id: string;
}

interface ReactionRow {
  id: string;
  goal_id: string;
  from_user_id: string;
  emoji: string;
  created_at: string;
}

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

  // Per-user rate limit: max 60 reactions per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await adminClient
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'add_reaction')
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);

  if (countError !== null) {
    return json({ error: 'Internal server error' }, 500);
  }

  if ((count ?? 0) >= REACTION_RATE_LIMIT) {
    return json({ error: 'Too many requests' }, 429);
  }

  let body: AddReactionBody;
  try {
    body = (await req.json()) as AddReactionBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { goal_id, emoji } = body;

  if (typeof goal_id !== 'string' || goal_id.length === 0) {
    return json({ error: 'Missing goal_id' }, 400);
  }
  if (!VALID_EMOJIS.includes(emoji as ReactionEmoji)) {
    return json({ error: 'Invalid emoji' }, 400);
  }

  // Look up goal to enforce self-reaction prevention and connection membership
  const { data: goalData, error: goalError } = await adminClient
    .from('goals')
    .select('user_id, connection_id')
    .eq('id', goal_id)
    .single();

  const goal = goalData as GoalRecord | null;
  if (goalError !== null || goal === null) {
    return json({ error: 'Goal not found' }, 404);
  }

  // Prevent self-reaction (service role bypasses RLS — enforce explicitly)
  if (goal.user_id === user.id) {
    return json({ error: 'Cannot react to own goal' }, 403);
  }

  // Verify user is a member of the goal's connection
  const { data: connData } = await adminClient
    .from('connections')
    .select('user_a_id, user_b_id')
    .eq('id', goal.connection_id)
    .single();

  const conn = connData as ConnectionRecord | null;
  if (conn === null || (conn.user_a_id !== user.id && conn.user_b_id !== user.id)) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Upsert: delete any existing reaction by this user on this goal, then insert
  await adminClient.from('reactions').delete().eq('goal_id', goal_id).eq('from_user_id', user.id);

  const { data: reactionData, error: insertError } = await adminClient
    .from('reactions')
    .insert({ goal_id, from_user_id: user.id, emoji })
    .select()
    .single();

  if (insertError !== null) {
    return json({ error: 'Failed to add reaction' }, 500);
  }

  // Log rate limit event (best-effort)
  await adminClient.from('rate_limit_events').insert({
    event_type: 'add_reaction',
    user_id: user.id,
    ip_address: req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for') ?? 'edge',
  });

  return json(reactionData as ReactionRow, 201);
});
