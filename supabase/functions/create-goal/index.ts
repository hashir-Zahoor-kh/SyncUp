// Edge Function: create-goal
// Rate-limited goal creation. Max 30 per user per hour.
// Validates JWT, checks per-user rate limit, validates input, inserts goal via service role.
// Self-contained — no _shared/ imports (deployed via Supabase Dashboard editor).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://trysyncup.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOAL_RATE_LIMIT = 30;
const VALID_TAGS = ['Health', 'Focus', 'Life', 'Custom'] as const;
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/u;
const HTML_TAG_RE = /<[^>]*>/u;

type GoalTag = (typeof VALID_TAGS)[number];

interface CreateGoalBody {
  text: string;
  tag: string;
  connection_id: string;
  week_start: string;
}

interface GoalRow {
  id: string;
  user_id: string;
  connection_id: string;
  text: string;
  tag: GoalTag;
  completed_at: string | null;
  week_start: string;
  created_at: string;
}

interface ConnectionRow {
  user_a_id: string;
  user_b_id: string;
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

  // Per-user rate limit: max 30 goal creations per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await adminClient
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'create_goal')
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);

  if (countError !== null) {
    return json({ error: 'Internal server error' }, 500);
  }

  if ((count ?? 0) >= GOAL_RATE_LIMIT) {
    return json({ error: 'Too many requests' }, 429);
  }

  let body: CreateGoalBody;
  try {
    body = (await req.json()) as CreateGoalBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { text, tag, connection_id, week_start } = body;

  // Input validation
  if (typeof text !== 'string' || text.length === 0 || text.length > 140) {
    return json({ error: 'Goal text must be 1–140 characters' }, 400);
  }
  if (CONTROL_CHAR_RE.test(text) || HTML_TAG_RE.test(text)) {
    return json({ error: 'Goal contains invalid characters' }, 400);
  }
  if (!VALID_TAGS.includes(tag as GoalTag)) {
    return json({ error: 'Invalid tag' }, 400);
  }
  if (typeof connection_id !== 'string' || connection_id.length === 0) {
    return json({ error: 'Missing connection_id' }, 400);
  }
  if (typeof week_start !== 'string' || week_start.length === 0) {
    return json({ error: 'Missing week_start' }, 400);
  }

  // Verify user is a member of the provided connection (service role bypasses RLS)
  const { data: connection, error: connError } = await adminClient
    .from('connections')
    .select('user_a_id, user_b_id')
    .eq('id', connection_id)
    .single();

  const conn = connection as ConnectionRow | null;
  if (connError !== null || conn === null) {
    return json({ error: 'Connection not found' }, 404);
  }
  if (conn.user_a_id !== user.id && conn.user_b_id !== user.id) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Insert goal via service role
  const { data: goal, error: insertError } = await adminClient
    .from('goals')
    .insert({
      user_id: user.id,
      connection_id,
      text,
      tag: tag as GoalTag,
      week_start,
    })
    .select()
    .single();

  if (insertError !== null) {
    return json({ error: 'Failed to create goal' }, 500);
  }

  // Log rate limit event (best-effort — never block the response)
  await adminClient.from('rate_limit_events').insert({
    event_type: 'create_goal',
    user_id: user.id,
    ip_address: req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for') ?? 'edge',
  });

  return json(goal as GoalRow, 201);
});
