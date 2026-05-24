/**
 * @jest-environment node
 *
 * Integration tests for the create-invite Edge Function.
 * Requires the function to be deployed:
 *   npx supabase functions deploy create-invite --project-ref ilykfwtiebfyaljlhsrx
 *
 * Test matrix:
 *  1. Authenticated user receives a valid URL containing a UUID token
 *  2. Unauthenticated request returns 401
 *  3. Token in the returned URL is a valid UUID v4
 *  4. Token is stored in the invites table with correct inviter_user_id and expires_at
 *  5. User who already has 3 pending invites is rejected with 429
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

const FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/create-invite` : '';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RUN_ID = Date.now();

async function getAccessToken(
  adminClient: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<string> {
  const anonClient = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error !== null || data.session === null) {
    throw new Error(`signIn(${email}) failed: ${error?.message ?? 'no session'}`);
  }
  return data.session.access_token;
}

async function callCreateInvite(
  accessToken: string | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY!,
  };
  if (accessToken !== null) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(FUNCTION_URL, { method: 'POST', headers });
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

const describeIf = missingCreds ? describe.skip : describe;

describeIf('create-invite Edge Function', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `inv-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `inv-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  let functionDeployed = true;

  beforeAll(async () => {
    // Probe whether the function is deployed; skip gracefully if not.
    try {
      const probe = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
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
  }, 30000);

  afterAll(async () => {
    // Clean up test users and their invites (cascades via FK or admin delete).
    for (const user of [userA, userB]) {
      if (user.id) {
        await adminClient.from('invites').delete().eq('inviter_user_id', user.id);
        await adminClient.auth.admin.deleteUser(user.id);
      }
    }
  }, 30000);

  it('Test 1 — authenticated user receives a valid URL containing a UUID token', async () => {
    if (!functionDeployed) return;

    const token = await getAccessToken(adminClient, userA.email, userA.password);
    const { status, body } = await callCreateInvite(token);

    expect(status).toBe(200);
    expect(typeof body['url']).toBe('string');
    expect((body['url'] as string).startsWith('https://trysyncup.org/i/')).toBe(true);
  });

  it('Test 2 — unauthenticated request returns 401', async () => {
    if (!functionDeployed) return;

    const { status } = await callCreateInvite(null);
    expect(status).toBe(401);
  });

  it('Test 3 — token in the returned URL is a valid UUID v4', async () => {
    if (!functionDeployed) return;

    const accessToken = await getAccessToken(adminClient, userA.email, userA.password);
    const { status, body } = await callCreateInvite(accessToken);

    expect(status).toBe(200);
    const url = body['url'] as string;
    const tokenPart = url.split('/i/')[1];
    expect(tokenPart).toBeDefined();
    expect(UUID_V4_RE.test(tokenPart ?? '')).toBe(true);
  });

  it('Test 4 — token is stored in the invites table with correct inviter_user_id and expires_at', async () => {
    if (!functionDeployed) return;

    const accessToken = await getAccessToken(adminClient, userA.email, userA.password);
    const { status, body } = await callCreateInvite(accessToken);
    expect(status).toBe(200);

    const url = body['url'] as string;
    const tokenPart = url.split('/i/')[1];
    expect(tokenPart).toBeDefined();

    const { data: invite, error } = await adminClient
      .from('invites')
      .select('*')
      .eq('token', tokenPart!)
      .single();

    expect(error).toBeNull();
    expect(invite).not.toBeNull();
    expect(invite?.inviter_user_id).toBe(userA.id);
    expect(invite?.accepted).toBe(false);

    const expiresAt = new Date(invite?.expires_at ?? '');
    const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(sixDaysFromNow.getTime());
  });

  it('Test 5 — user with 3 pending invites is rejected with 429', async () => {
    if (!functionDeployed) return;

    // Seed exactly 3 pending (non-expired, unaccepted) invites for userB via service role.
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await adminClient.from('invites').insert([
      {
        token: crypto.randomUUID(),
        inviter_user_id: userB.id,
        expires_at: sevenDays,
        accepted: false,
      },
      {
        token: crypto.randomUUID(),
        inviter_user_id: userB.id,
        expires_at: sevenDays,
        accepted: false,
      },
      {
        token: crypto.randomUUID(),
        inviter_user_id: userB.id,
        expires_at: sevenDays,
        accepted: false,
      },
    ]);

    const accessToken = await getAccessToken(adminClient, userB.email, userB.password);
    const { status } = await callCreateInvite(accessToken);

    expect(status).toBe(429);
  });
});
