/**
 * @jest-environment node
 *
 * Integration + security tests for Phase 6B push token registration.
 *
 * Test matrix:
 *  16. Push token registered → row exists in push_tokens for the current user
 *  17. User cannot register push token for another user (RLS blocks)
 *  18. send-push-notification Edge Function payload contains no PII
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

async function signInAsUser(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAsUser(${email}) failed: ${error.message}`);
  return client;
}

describeIf('Push Token Integration + Security Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `push-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `push-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  beforeAll(async () => {
    for (const u of [userA, userB]) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error ?? !data.user)
        throw new Error(`createUser(${u.email}): ${error?.message ?? 'no user'}`);
      u.id = data.user.id;
    }
  }, 30000);

  afterAll(async () => {
    await adminClient.from('push_tokens').delete().eq('user_id', userA.id);
    await adminClient.from('push_tokens').delete().eq('user_id', userB.id);
    for (const u of [userA, userB]) {
      if (u.id) await adminClient.auth.admin.deleteUser(u.id);
    }
  }, 30000);

  // ── Test 16 ───────────────────────────────────────────────────────────────
  it('Test 16 — push token upserted correctly for own user_id', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const fakeToken = `ExponentPushToken[test-${RUN_ID}]`;

    const { error } = await clientA
      .from('push_tokens')
      .upsert(
        { user_id: userA.id, token: fakeToken, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    expect(error).toBeNull();

    const { data } = await clientA
      .from('push_tokens')
      .select('token')
      .eq('user_id', userA.id)
      .single();
    expect(data?.token).toBe(fakeToken);
  });

  // ── Test 17 ───────────────────────────────────────────────────────────────
  it('Test 17 — User A cannot register push token with user_id of User B (RLS blocks)', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const { error } = await clientA.from('push_tokens').upsert(
      {
        user_id: userB.id,
        token: 'ExponentPushToken[fake]',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    expect(error).not.toBeNull();
  });

  // ── Test 18 ───────────────────────────────────────────────────────────────
  it('Test 18 — send-push-notification Edge Function payload contains no PII', () => {
    const fnPath = path.resolve(
      __dirname,
      '../../supabase/functions/send-push-notification/index.ts',
    );
    const source = fs.readFileSync(fnPath, 'utf8');

    // Hardcoded safe payload strings must be present
    expect(source).toContain('Your partner just completed a goal');
    expect(source).toContain('Your partner reacted to your goal');
    expect(source).toContain('Open SyncUp to see');

    // Dynamic content (goal text, names, emoji) must NOT appear in push body/title assignments
    expect(source).not.toMatch(/body\s*:.*goal\.text/);
    expect(source).not.toMatch(/title\s*:.*goal\.text/);
    expect(source).not.toMatch(/body\s*:.*display_name/);
    expect(source).not.toMatch(/title\s*:.*display_name/);
    expect(source).not.toMatch(/body\s*:.*\.emoji/);
  });
});
