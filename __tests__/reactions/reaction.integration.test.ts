/**
 * @jest-environment node
 *
 * Integration + security tests for Phase 6A Reactions.
 *
 * Test matrix:
 *  5. User B can react to User A's goal → row created in DB
 *  6. User A cannot react to own goal → RLS blocks
 *  7. Duplicate reaction blocked by unique constraint; DELETE+INSERT correctly replaces emoji
 *  8. User B removes own reaction → row deleted from DB
 *  9. Emoji outside allowed list → DB constraint error
 *  10. User C cannot insert reaction on goal in A-B connection (RLS blocks)
 *  11. User C cannot read reactions on goals in A-B connection (RLS filters to empty)
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

async function signInAsUser(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAsUser(${email}) failed: ${error.message}`);
  return client;
}

describeIf('Reaction Integration + Security Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `react-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `react-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userC = { email: `react-c-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  let connectionId = '';
  let goalId = '';
  const weekStart = getCurrentWeekStart();

  beforeAll(async () => {
    for (const u of [userA, userB, userC]) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error ?? !data.user)
        throw new Error(`createUser(${u.email}): ${error?.message ?? 'no user'}`);
      u.id = data.user.id;
    }

    const { data: conn, error: connErr } = await adminClient
      .from('connections')
      .insert({ user_a_id: userA.id, user_b_id: userB.id, relationship_type: 'Friends' })
      .select()
      .single();
    if (connErr ?? !conn) throw new Error(`createConnection: ${connErr?.message ?? 'no conn'}`);
    connectionId = conn.id;

    // Insert goal via service role (bypasses rate limiting)
    const { data: goal, error: goalErr } = await adminClient
      .from('goals')
      .insert({
        user_id: userA.id,
        connection_id: connectionId,
        text: 'Reaction test goal',
        tag: 'Health',
        week_start: weekStart,
      })
      .select()
      .single();
    if (goalErr ?? !goal) throw new Error(`createGoal: ${goalErr?.message ?? 'no goal'}`);
    goalId = goal.id;
  }, 60000);

  afterAll(async () => {
    await adminClient.from('reactions').delete().eq('goal_id', goalId);
    await adminClient.from('goals').delete().eq('id', goalId);
    await adminClient.from('connections').delete().eq('id', connectionId);
    for (const u of [userA, userB, userC]) {
      if (u.id) await adminClient.auth.admin.deleteUser(u.id);
    }
  }, 30000);

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it("Test 5 — User B can react to User A's goal", async () => {
    const clientB = await signInAsUser(userB.email, userB.password);
    const { data, error } = await clientB
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userB.id, emoji: '🔥' })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.emoji).toBe('🔥');
    expect(data?.from_user_id).toBe(userB.id);
    expect(data?.goal_id).toBe(goalId);
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  it('Test 6 — User A cannot react to own goal (RLS blocks INSERT)', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const { error } = await clientA
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userA.id, emoji: '👏' });
    expect(error).not.toBeNull();
  });

  // ── Test 7 ────────────────────────────────────────────────────────────────
  it('Test 7 — duplicate reaction blocked; DELETE+INSERT correctly replaces emoji', async () => {
    const clientB = await signInAsUser(userB.email, userB.password);

    // 🔥 already exists from Test 5 — second INSERT should fail
    const { error: dupError } = await clientB
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userB.id, emoji: '👏' });
    expect(dupError).not.toBeNull();

    // App approach: DELETE then INSERT
    await clientB.from('reactions').delete().eq('goal_id', goalId).eq('from_user_id', userB.id);
    const { data, error } = await clientB
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userB.id, emoji: '👏' })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.emoji).toBe('👏');
  });

  // ── Test 8 ────────────────────────────────────────────────────────────────
  it('Test 8 — User B removes own reaction', async () => {
    const clientB = await signInAsUser(userB.email, userB.password);
    const { error } = await clientB
      .from('reactions')
      .delete()
      .eq('goal_id', goalId)
      .eq('from_user_id', userB.id);
    expect(error).toBeNull();

    const { data } = await clientB
      .from('reactions')
      .select('*')
      .eq('goal_id', goalId)
      .eq('from_user_id', userB.id);
    expect(data).toHaveLength(0);
  });

  // ── Test 9 ────────────────────────────────────────────────────────────────
  it('Test 9 — emoji outside allowed list rejected by DB constraint', async () => {
    const clientB = await signInAsUser(userB.email, userB.password);
    const { error } = await clientB
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userB.id, emoji: '🙄' });
    expect(error).not.toBeNull();
  });

  // ── Test 10 ───────────────────────────────────────────────────────────────
  it('Test 10 — User C cannot insert reaction on A-B goal (RLS blocks)', async () => {
    const clientC = await signInAsUser(userC.email, userC.password);
    const { error } = await clientC
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userC.id, emoji: '🔥' });
    expect(error).not.toBeNull();
  });

  // ── Test 11 ───────────────────────────────────────────────────────────────
  it('Test 11 — User C cannot read reactions on A-B goals (RLS returns empty)', async () => {
    // Ensure there is a reaction to NOT see
    await adminClient
      .from('reactions')
      .insert({ goal_id: goalId, from_user_id: userB.id, emoji: '💛' });

    const clientC = await signInAsUser(userC.email, userC.password);
    const { data } = await clientC.from('reactions').select('*').eq('goal_id', goalId);
    expect(data).toHaveLength(0);

    // Cleanup
    await adminClient.from('reactions').delete().eq('goal_id', goalId).eq('from_user_id', userB.id);
  });
});
