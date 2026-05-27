/**
 * @jest-environment node
 *
 * Integration tests for Phase 6C per-user rate limiting.
 * Requires create-goal and add-reaction Edge Functions to be deployed.
 *
 * Test matrix:
 *  1. 31st goal creation in an hour returns 429
 *  2. 61st reaction in an hour returns 429
 *  3. Rate limit resets after 1 hour — events older than 1h are not counted
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from '../../src/types/database';

function loadEnv(): void {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line: string) => {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0 && !line.startsWith('#')) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim();
        if (key && val) process.env[key] = val;
      }
    });
  } catch {
    // .env not present — CI uses actual env vars
  }
}

loadEnv();

// eslint-disable-next-line expo/no-dynamic-env-var
const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'];
// eslint-disable-next-line expo/no-dynamic-env-var
const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
// eslint-disable-next-line expo/no-dynamic-env-var
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

const missingCreds =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !SERVICE_ROLE_KEY ||
  SERVICE_ROLE_KEY === 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY';

const CREATE_GOAL_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/create-goal` : '';
const ADD_REACTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/add-reaction` : '';

const describeIf = missingCreds ? describe.skip : describe;

const RUN_ID = Date.now().toString(36);

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]!;
}

async function getAccessToken(client: SupabaseClient<Database>): Promise<string> {
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error('No session — ensure user is signed in');
  return data.session.access_token;
}

describeIf('Rate Limiting Integration Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `rl-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `rl-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let connectionId = '';
  let goalId = '';
  let createGoalDeployed = true;
  let addReactionDeployed = true;

  const weekStart = getCurrentWeekStart();

  beforeAll(async () => {
    // Probe create-goal
    try {
      const probe = await fetch(CREATE_GOAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY! },
      });
      if (probe.status === 404) createGoalDeployed = false;
    } catch {
      createGoalDeployed = false;
    }

    // Probe add-reaction
    try {
      const probe = await fetch(ADD_REACTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY! },
      });
      if (probe.status === 404) addReactionDeployed = false;
    } catch {
      addReactionDeployed = false;
    }

    if (!createGoalDeployed && !addReactionDeployed) return;

    for (const u of [userA, userB]) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error !== null || data.user === null) {
        throw new Error(`createUser(${u.email}): ${error?.message ?? 'no user'}`);
      }
      u.id = data.user.id;
    }

    const { data: conn, error: connErr } = await adminClient
      .from('connections')
      .insert({ user_a_id: userA.id, user_b_id: userB.id, relationship_type: 'Friends' })
      .select()
      .single();
    if (connErr !== null || conn === null) {
      throw new Error(`createConnection: ${connErr?.message ?? 'no conn'}`);
    }
    connectionId = conn.id;

    // Insert a goal via service role for reaction tests
    const { data: goal, error: goalErr } = await adminClient
      .from('goals')
      .insert({
        user_id: userA.id,
        connection_id: connectionId,
        text: 'Rate limit test goal',
        tag: 'Health',
        week_start: weekStart,
      })
      .select()
      .single();
    if (goalErr !== null || goal === null) {
      throw new Error(`createGoal: ${goalErr?.message ?? 'no goal'}`);
    }
    goalId = goal.id;

    // Sign in both users
    clientA = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    await clientA.auth.signInWithPassword({ email: userA.email, password: userA.password });

    clientB = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    await clientB.auth.signInWithPassword({ email: userB.email, password: userB.password });
  }, 60000);

  afterAll(async () => {
    if (!userA.id) return;
    // Clean up rate_limit_events for test users
    await adminClient
      .from('rate_limit_events')
      .delete()
      .in('user_id', [userA.id, userB.id].filter(Boolean));
    await adminClient.from('reactions').delete().eq('goal_id', goalId);
    await adminClient.from('goals').delete().eq('id', goalId);
    await adminClient.from('connections').delete().eq('id', connectionId);
    for (const u of [userA, userB]) {
      if (u.id) await adminClient.auth.admin.deleteUser(u.id);
    }
  }, 30000);

  // ── Test 1 ────────────────────────────────────────────────────────────────
  it('Test 1 — 31st goal creation in an hour returns 429', async () => {
    if (!createGoalDeployed) return;

    // Seed 30 create_goal events within the last hour for userA
    const events = Array.from({ length: 30 }, (_, i) => ({
      event_type: 'create_goal',
      user_id: userA.id,
      ip_address: 'test',
      created_at: new Date(Date.now() - (i + 1) * 1000).toISOString(),
    }));
    await adminClient.from('rate_limit_events').insert(events);

    const token = await getAccessToken(clientA);
    const res = await fetch(CREATE_GOAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: 'Should be rate limited',
        tag: 'Health',
        connection_id: connectionId,
        week_start: weekStart,
      }),
    });

    expect(res.status).toBe(429);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body['error']).toBe('Too many requests');

    // Cleanup seeded events so later tests are not affected
    await adminClient
      .from('rate_limit_events')
      .delete()
      .eq('event_type', 'create_goal')
      .eq('user_id', userA.id);
  }, 30000);

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it('Test 2 — 61st reaction in an hour returns 429', async () => {
    if (!addReactionDeployed) return;

    // Seed 60 add_reaction events within the last hour for userB
    const events = Array.from({ length: 60 }, (_, i) => ({
      event_type: 'add_reaction',
      user_id: userB.id,
      ip_address: 'test',
      created_at: new Date(Date.now() - (i + 1) * 1000).toISOString(),
    }));
    await adminClient.from('rate_limit_events').insert(events);

    const token = await getAccessToken(clientB);
    const res = await fetch(ADD_REACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ goal_id: goalId, emoji: '🔥' }),
    });

    expect(res.status).toBe(429);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body['error']).toBe('Too many requests');

    // Cleanup
    await adminClient
      .from('rate_limit_events')
      .delete()
      .eq('event_type', 'add_reaction')
      .eq('user_id', userB.id);
  }, 30000);

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it('Test 3 — rate limit resets after 1 hour (expired events not counted)', async () => {
    if (!createGoalDeployed) return;

    // Seed 30 events timestamped 61 minutes ago — outside the 1-hour window
    const expiredTime = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    const events = Array.from({ length: 30 }, () => ({
      event_type: 'create_goal',
      user_id: userA.id,
      ip_address: 'test',
      created_at: expiredTime,
    }));
    await adminClient.from('rate_limit_events').insert(events);

    const token = await getAccessToken(clientA);
    const res = await fetch(CREATE_GOAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: 'Expired events should not block this',
        tag: 'Focus',
        connection_id: connectionId,
        week_start: weekStart,
      }),
    });

    // Should succeed — all 30 events are older than 1 hour
    expect(res.status).toBe(201);

    // Cleanup inserted goal and rate_limit_events
    if (res.status === 201) {
      const created = (await res.json()) as { id?: string };
      if (created.id) {
        await adminClient.from('goals').delete().eq('id', created.id);
      }
    }
    await adminClient
      .from('rate_limit_events')
      .delete()
      .eq('event_type', 'create_goal')
      .eq('user_id', userA.id);
  }, 30000);
});
