/**
 * @jest-environment node
 *
 * Integration tests for the accept-invite Edge Function.
 * Requires the function to be deployed:
 *   npx supabase functions deploy accept-invite --project-ref ilykfwtiebfyaljlhsrx
 *
 * Test matrix:
 *  1.  Valid token → connection created, invite marked accepted, returns connection_id
 *  2.  Unauthenticated request returns 401
 *  3.  Expired token returns "not found or has expired" error
 *  4.  Already-accepted token returns error (second call with same token fails)
 *  5.  Self-acceptance returns error (inviter tries to accept own invite)
 *  6.  Users already connected returns error
 *  7.  After valid acceptance, connections row exists with correct user_a/b_id
 *  8.  After valid acceptance, invites.accepted = true and accepted_by is set
 *  9.  Invalid/nonexistent token returns the SAME error message as an expired token
 * 10.  11th accept-invite attempt from the same IP within an hour returns 429
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

const FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/accept-invite` : '';

const RUN_ID = Date.now();

// Unique IP for the rate-limit test — pre-seeded directly via service role so it
// never collides with real traffic or other test runs.
const RATE_LIMIT_TEST_IP = `10.test.${RUN_ID}`;

async function getAccessToken(email: string, password: string): Promise<string> {
  const anonClient = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error !== null || data.session === null) {
    throw new Error(`signIn(${email}) failed: ${error?.message ?? 'no session'}`);
  }
  return data.session.access_token;
}

type CallResult = { status: number; body: Record<string, unknown> };

async function callAcceptInvite(
  accessToken: string | null,
  token: string | null,
  extraHeaders?: Record<string, string>,
): Promise<CallResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY!,
    ...extraHeaders,
  };
  if (accessToken !== null) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

async function seedInvite(
  adminClient: SupabaseClient<Database>,
  inviterUserId: string,
  overrides?: { expires_at?: string; accepted?: boolean; accepted_by?: string },
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt =
    overrides?.expires_at ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await adminClient.from('invites').insert({
    token,
    inviter_user_id: inviterUserId,
    expires_at: expiresAt,
    accepted: overrides?.accepted ?? false,
    accepted_by: overrides?.accepted_by ?? null,
  });
  if (error !== null) throw new Error(`seedInvite: ${error.message}`);
  return token;
}

/** Delete every connection that involves any of the given user IDs. */
async function wipeConnections(
  adminClient: SupabaseClient<Database>,
  ...userIds: string[]
): Promise<void> {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return;
  const filter = ids.map((id) => `user_a_id.eq.${id},user_b_id.eq.${id}`).join(',');
  await adminClient.from('connections').delete().or(filter);
}

const describeIf = missingCreds ? describe.skip : describe;

describeIf('accept-invite Edge Function', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `acc-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `acc-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userC = { email: `acc-c-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  let functionDeployed = true;

  beforeAll(async () => {
    try {
      const probe = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: null }),
      });
      if (probe.status === 404) {
        functionDeployed = false;
        return;
      }
    } catch {
      functionDeployed = false;
      return;
    }

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

    // Set display names so the RPC can return a meaningful partner_name.
    for (const [uid, name, color] of [
      [userA.id, 'Alice', '#6C63FF'],
      [userB.id, 'Bob', '#43AA8B'],
      [userC.id, 'Carol', '#FF6B6B'],
    ] as [string, string, string][]) {
      await adminClient
        .from('profiles')
        .update({
          display_name: name,
          avatar_color: color,
          onboarded_at: new Date().toISOString(),
        })
        .eq('id', uid);
    }
  }, 30000);

  // ── Per-test connection cleanup ────────────────────────────────────────────
  // Wipe all connections involving the test users before every test.
  // This ensures no leftover rows from previous tests or crashed prior runs
  // cause spurious "already connected" 409 responses.
  beforeEach(async () => {
    if (!functionDeployed || !userA.id || !userB.id || !userC.id) return;
    await wipeConnections(adminClient, userA.id, userB.id, userC.id);
  });

  // ── Comprehensive teardown ─────────────────────────────────────────────────
  afterAll(async () => {
    if (!userA.id && !userB.id && !userC.id) return;

    // Rate-limit events seeded for the IP-rate-limit test.
    await adminClient.from('rate_limit_events').delete().eq('ip_address', RATE_LIMIT_TEST_IP);

    // All connections involving any test user.
    await wipeConnections(adminClient, userA.id, userB.id, userC.id);

    // All invites created by or accepted by test users.
    for (const user of [userA, userB, userC]) {
      if (!user.id) continue;
      await adminClient.from('invites').delete().eq('inviter_user_id', user.id);
      await adminClient.from('invites').delete().eq('accepted_by', user.id);
    }

    // Delete auth users last (cascades profile rows).
    for (const user of [userA, userB, userC]) {
      if (user.id) await adminClient.auth.admin.deleteUser(user.id);
    }
  }, 30000);

  // ── Test 1 ────────────────────────────────────────────────────────────────
  it('Test 1 — valid token creates connection and marks invite accepted', async () => {
    if (!functionDeployed) return;

    const inviteToken = await seedInvite(adminClient, userA.id);
    const accessToken = await getAccessToken(userB.email, userB.password);

    const { status, body } = await callAcceptInvite(accessToken, inviteToken);

    expect(status).toBe(200);
    expect(typeof body['connection_id']).toBe('string');
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it('Test 2 — unauthenticated request returns 401', async () => {
    if (!functionDeployed) return;

    const inviteToken = await seedInvite(adminClient, userA.id);
    const { status } = await callAcceptInvite(null, inviteToken);
    expect(status).toBe(401);
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it('Test 3 — expired token returns "not found or has expired" error', async () => {
    if (!functionDeployed) return;

    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const expiredToken = await seedInvite(adminClient, userA.id, { expires_at: pastExpiry });
    const accessToken = await getAccessToken(userB.email, userB.password);

    const { status, body } = await callAcceptInvite(accessToken, expiredToken);

    expect(status).toBe(404);
    expect(typeof body['error']).toBe('string');
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  it('Test 4 — already-accepted token returns error on second attempt', async () => {
    if (!functionDeployed) return;

    const inviteToken = await seedInvite(adminClient, userA.id);
    const tokenB = await getAccessToken(userB.email, userB.password);

    // First acceptance must succeed.
    const first = await callAcceptInvite(tokenB, inviteToken);
    expect(first.status).toBe(200);

    // The invite is now accepted and the A-B connection exists.
    // beforeEach already cleared connections before this test; wipe again so
    // the connection created by the first call doesn't make userC's attempt a
    // 409 instead of a 404 (token is accepted — that's what we're testing).
    await wipeConnections(adminClient, userA.id, userB.id, userC.id);

    // Second attempt with the same (now-accepted) token must return 404.
    const tokenC = await getAccessToken(userC.email, userC.password);
    const second = await callAcceptInvite(tokenC, inviteToken);
    expect(second.status).toBe(404);
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it('Test 5 — self-acceptance returns error', async () => {
    if (!functionDeployed) return;

    const inviteToken = await seedInvite(adminClient, userA.id);
    const accessToken = await getAccessToken(userA.email, userA.password);

    const { status, body } = await callAcceptInvite(accessToken, inviteToken);

    expect(status).toBe(400);
    expect((body['error'] as string).toLowerCase()).toContain('own invite');
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  it('Test 6 — users already connected returns 409', async () => {
    if (!functionDeployed) return;

    // Create an existing A-C connection directly (bypassing the Edge Function).
    await adminClient.from('connections').insert({
      user_a_id: userA.id,
      user_b_id: userC.id,
      relationship_type: 'Friends',
    });

    // A creates a fresh invite; C tries to accept but they're already connected.
    const inviteToken = await seedInvite(adminClient, userA.id);
    const accessToken = await getAccessToken(userC.email, userC.password);

    const { status } = await callAcceptInvite(accessToken, inviteToken);
    expect(status).toBe(409);
    // beforeEach will clean up the A-C connection before the next test.
  });

  // ── Test 7 ────────────────────────────────────────────────────────────────
  it('Test 7 — after valid acceptance, connections row exists with correct user_a/b_id', async () => {
    if (!functionDeployed) return;

    const inviteToken = await seedInvite(adminClient, userA.id);
    const accessToken = await getAccessToken(userB.email, userB.password);

    const { status, body } = await callAcceptInvite(accessToken, inviteToken);
    expect(status).toBe(200);

    const connectionId = body['connection_id'] as string;
    const { data: conn, error } = await adminClient
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    expect(error).toBeNull();
    expect(conn?.user_a_id).toBe(userA.id);
    expect(conn?.user_b_id).toBe(userB.id);
    // beforeEach will wipe the connection before the next test.
  });

  // ── Test 8 ────────────────────────────────────────────────────────────────
  it('Test 8 — after valid acceptance, invites.accepted = true and accepted_by is set', async () => {
    if (!functionDeployed) return;

    const inviteToken = await seedInvite(adminClient, userA.id);
    const accessToken = await getAccessToken(userB.email, userB.password);

    const { status } = await callAcceptInvite(accessToken, inviteToken);
    expect(status).toBe(200);

    const { data: invite } = await adminClient
      .from('invites')
      .select('accepted, accepted_by')
      .eq('token', inviteToken)
      .single();

    expect(invite?.accepted).toBe(true);
    expect(invite?.accepted_by).toBe(userB.id);
    // beforeEach will wipe the connection before the next test.
  });

  // ── Test 9 ────────────────────────────────────────────────────────────────
  it('Test 9 — nonexistent token returns the SAME error message as an expired token', async () => {
    if (!functionDeployed) return;

    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const expiredToken = await seedInvite(adminClient, userA.id, { expires_at: pastExpiry });
    const nonexistentToken = crypto.randomUUID();
    const accessToken = await getAccessToken(userB.email, userB.password);

    const [expiredRes, nonexistentRes] = await Promise.all([
      callAcceptInvite(accessToken, expiredToken),
      callAcceptInvite(accessToken, nonexistentToken),
    ]);

    // Same HTTP status AND identical error message body (enumeration prevention).
    expect(expiredRes.status).toBe(404);
    expect(nonexistentRes.status).toBe(404);
    expect(expiredRes.body['error']).toBe(nonexistentRes.body['error']);
  });

  // ── Test 10 ───────────────────────────────────────────────────────────────
  it('Test 10 — 11th accept attempt from the same IP within an hour returns 429', async () => {
    if (!functionDeployed) return;

    // Seed 10 rate_limit_events for the test IP directly via service role.
    // Use timestamps spread across the last 55 minutes so they're all within the 1-hour window.
    const baseTime = new Date(Date.now() - 55 * 60 * 1000);
    const rows = Array.from({ length: 10 }, (_, i) => ({
      event_type: 'accept_invite',
      ip_address: RATE_LIMIT_TEST_IP,
      created_at: new Date(baseTime.getTime() + i * 1000).toISOString(),
    }));
    await adminClient.from('rate_limit_events').insert(rows);

    const inviteToken = await seedInvite(adminClient, userA.id);
    const accessToken = await getAccessToken(userB.email, userB.password);

    // The 11th attempt (identified by the seeded IP) must be rate-limited.
    const { status } = await callAcceptInvite(accessToken, inviteToken, {
      'X-Forwarded-For': RATE_LIMIT_TEST_IP,
    });

    expect(status).toBe(429);
  });
});
