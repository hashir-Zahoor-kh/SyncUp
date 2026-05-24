/**
 * @jest-environment node
 *
 * Phase 4 RLS security tests.
 * Verifies that clients cannot bypass the Edge Function flow by inserting
 * directly into the connections or invites tables.
 *
 * Test matrix:
 *  1. Client cannot INSERT directly into connections (no client INSERT policy)
 *  2. Client cannot INSERT directly into invites (no client INSERT policy)
 *  3. User C (not in any connection) cannot read A-B connection row
 *  4. Authenticated user can read their own invite (SELECT via inviter_user_id)
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

async function signInAsUser(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAsUser(${email}) failed: ${error.message}`);
  return client;
}

describeIf('Phase 4 RLS Security Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `p4-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `p4-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userC = { email: `p4-c-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  let connectionABId = '';

  beforeAll(async () => {
    const createUser = async (email: string, password: string): Promise<string> => {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error !== null || data.user === null) {
        throw new Error(`createUser(${email}): ${error?.message ?? 'no user'}`);
      }
      return data.user.id;
    };

    userA.id = await createUser(userA.email, userA.password);
    userB.id = await createUser(userB.email, userB.password);
    userC.id = await createUser(userC.email, userC.password);

    // Create an A-B connection via service role to use in isolation tests.
    const { data: conn, error: connErr } = await adminClient
      .from('connections')
      .insert({ user_a_id: userA.id, user_b_id: userB.id, relationship_type: 'Friends' })
      .select('id')
      .single();
    if (connErr !== null || conn === null) {
      throw new Error(`create connection: ${connErr?.message ?? 'no data'}`);
    }
    connectionABId = conn.id;
  }, 30000);

  afterAll(async () => {
    for (const user of [userA, userB, userC]) {
      if (user.id) await adminClient.auth.admin.deleteUser(user.id);
    }
  }, 30000);

  // ── Test 1: No client INSERT into connections ──────────────────────────────
  it('Test 1 — authenticated client cannot INSERT directly into connections', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);

    const { error } = await clientA.from('connections').insert({
      user_a_id: userA.id,
      user_b_id: userC.id,
      relationship_type: 'Friends',
    });

    expect(error).not.toBeNull();
  });

  // ── Test 2: No client INSERT into invites ──────────────────────────────────
  it('Test 2 — authenticated client cannot INSERT directly into invites', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);

    const { error } = await clientA.from('invites').insert({
      token: crypto.randomUUID(),
      inviter_user_id: userA.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(error).not.toBeNull();
  });

  // ── Test 3: Connection isolation for non-members ───────────────────────────
  it('Test 3 — User C (not in A-B connection) cannot SELECT the A-B connections row', async () => {
    const clientC = await signInAsUser(userC.email, userC.password);

    const { data, error } = await clientC.from('connections').select('*').eq('id', connectionABId);

    // RLS: only connection members can SELECT. C is not a member → filtered out.
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── Test 4: Inviter can SELECT own invite ──────────────────────────────────
  it('Test 4 — inviter can SELECT their own invite row (positive sanity check)', async () => {
    // Seed an invite for A via service role.
    const token = crypto.randomUUID();
    await adminClient.from('invites').insert({
      token,
      inviter_user_id: userA.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const clientA = await signInAsUser(userA.email, userA.password);
    const { data, error } = await clientA.from('invites').select('token').eq('token', token);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]?.token).toBe(token);

    // Cleanup.
    await adminClient.from('invites').delete().eq('token', token);
  });
});
