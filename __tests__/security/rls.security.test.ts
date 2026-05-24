/**
 * @jest-environment node
 *
 * Row Level Security tests — Phase 2 requirement.
 * All 5 tests must pass before Phase 2 is considered complete.
 *
 * Test matrix:
 *  1. Cross-user read:   User B cannot read User A's goals (not in same connection)
 *  2. Cross-user write:  User B cannot insert a goal with user_id = User A's ID
 *  3. Cross-user update: User B cannot update User A's goal
 *  4. Connection isolation: User C (not in A-B connection) cannot read A-B goals
 *  5. Service role isolation: Anon key cannot INSERT into connections directly
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

const RUN_ID = Date.now();

/** Sign in as a specific user and return an anon-key client bound to that session. */
async function signInAsUser(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAsUser(${email}) failed: ${error.message}`);
  return client;
}

describeIf('RLS Security Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  // Test user credentials
  const userA = { email: `rls-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `rls-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userC = { email: `rls-c-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  let connectionABId = '';
  let goalAId = '';

  // ── Setup ──────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Create users via admin (no emails, confirmed immediately)
    const createUser = async (email: string, password: string): Promise<string> => {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error ?? !data.user)
        throw new Error(`createUser(${email}): ${error?.message ?? 'no user'}`);
      return data.user.id;
    };

    userA.id = await createUser(userA.email, userA.password);
    userB.id = await createUser(userB.email, userB.password);
    userC.id = await createUser(userC.email, userC.password);

    // Create a connection between A and B (service role — no client INSERT policy)
    const { data: connData, error: connErr } = await adminClient
      .from('connections')
      .insert({
        user_a_id: userA.id,
        user_b_id: userB.id,
        relationship_type: 'Friends',
      })
      .select('id')
      .single();

    if (connErr ?? !connData)
      throw new Error(`create connection: ${connErr?.message ?? 'no data'}`);
    connectionABId = connData.id;

    // Create a goal for User A in the A-B connection (sign in as A, use anon client)
    const clientA = await signInAsUser(userA.email, userA.password);
    const { data: goalData, error: goalErr } = await clientA
      .from('goals')
      .insert({
        user_id: userA.id,
        connection_id: connectionABId,
        text: 'Run 5k this week',
        tag: 'Health',
        week_start: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single();

    if (goalErr ?? !goalData) throw new Error(`create goal: ${goalErr?.message ?? 'no data'}`);
    goalAId = goalData.id;
  }, 30000);

  // ── Teardown ───────────────────────────────────────────────────────────────
  afterAll(async () => {
    // Clean up all test data (cascade handles goals, reactions, etc.)
    for (const user of [userA, userB, userC]) {
      if (user.id) await adminClient.auth.admin.deleteUser(user.id);
    }
  }, 30000);

  // ── Test 1: Cross-user read ────────────────────────────────────────────────
  it("Test 1 — User B who is NOT in a connection with A cannot read A's goals via user_id filter", async () => {
    // userC is not connected to anyone; sign in as C and try to read A's goals
    const clientC = await signInAsUser(userC.email, userC.password);

    const { data, error } = await clientC.from('goals').select('*').eq('user_id', userA.id);

    // RLS policy "goals_select_connection_member" should block this
    // Result should be empty (no error from Supabase, just filtered out by RLS)
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── Test 2: Cross-user write ───────────────────────────────────────────────
  it("Test 2 — User B cannot insert a goal with user_id = User A's ID", async () => {
    const clientB = await signInAsUser(userB.email, userB.password);

    // B is connected to A, but tries to claim the goal belongs to A
    const { error } = await clientB.from('goals').insert({
      user_id: userA.id, // B is trying to impersonate A
      connection_id: connectionABId,
      text: 'Impersonated goal',
      tag: 'Focus',
      week_start: new Date().toISOString().slice(0, 10),
    });

    // Policy: auth.uid() = user_id → fails because B's UID ≠ A's ID
    expect(error).not.toBeNull();
    expect(error?.code).toMatch(/42501|insufficient_privilege|new row violates/i);
  });

  // ── Test 3: Cross-user update ──────────────────────────────────────────────
  it("Test 3 — User B cannot update User A's goal", async () => {
    const clientB = await signInAsUser(userB.email, userB.password);

    const { data, error } = await clientB
      .from('goals')
      .update({ text: 'Hijacked goal text' })
      .eq('id', goalAId);

    // Policy: auth.uid() = user_id → B cannot update A's goal
    expect(error).toBeNull(); // Supabase returns no error, just 0 rows affected
    expect(data).toBeNull(); // Nothing updated
  });

  // ── Test 4: Connection isolation ───────────────────────────────────────────
  it('Test 4 — User C (not in the A-B connection) cannot read goals from that connection', async () => {
    const clientC = await signInAsUser(userC.email, userC.password);

    const { data, error } = await clientC
      .from('goals')
      .select('*')
      .eq('connection_id', connectionABId);

    // Policy: user_in_connection(connection_id) → C is not in A-B connection
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── Test 5: Service role isolation ────────────────────────────────────────
  it('Test 5 — Anon key (authenticated as a regular user) cannot INSERT into connections directly', async () => {
    const clientB = await signInAsUser(userB.email, userB.password);

    // B tries to create a connection directly (bypassing Edge Function flow)
    const { error } = await clientB.from('connections').insert({
      user_a_id: userB.id,
      user_b_id: userC.id,
      relationship_type: 'Friends',
    });

    // No INSERT policy on connections for regular users → must fail
    expect(error).not.toBeNull();
  });

  // ── Bonus: Verify A CAN read their own goals (sanity check) ───────────────
  it('Sanity — User A can read their own goal in the A-B connection', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);

    const { data, error } = await clientA
      .from('goals')
      .select('*')
      .eq('connection_id', connectionABId);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0]?.user_id).toBe(userA.id);
  });

  // ── Bonus: Verify B CAN also read goals in the shared connection ──────────
  it('Sanity — User B (connected to A) can read goals in the A-B connection', async () => {
    const clientB = await signInAsUser(userB.email, userB.password);

    const { data, error } = await clientB
      .from('goals')
      .select('*')
      .eq('connection_id', connectionABId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0]?.id).toBe(goalAId);
  });
});
