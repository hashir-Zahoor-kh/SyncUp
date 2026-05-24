/**
 * @jest-environment node
 *
 * Profile integration tests — Phase 3.
 *
 * Test matrix:
 *  1. Trigger:    Creating a user auto-creates a profile stub (display_name = 'New User', onboarded_at = NULL)
 *  2. Own update: User can set their display name + avatar color; onboarded_at is stamped
 *  3. RLS:        User B cannot update User A's profile (0 rows affected, name unchanged)
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

describeIf('Profile Integration Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = { email: `prof-a-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };
  const userB = { email: `prof-b-${RUN_ID}@example.com`, password: 'TestPass123!', id: '' };

  beforeAll(async () => {
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
  }, 30000);

  afterAll(async () => {
    for (const user of [userA, userB]) {
      if (user.id) await adminClient.auth.admin.deleteUser(user.id);
    }
  }, 30000);

  // ── Test 1: Trigger ──────────────────────────────────────────────────────────
  it('Test 1 — trigger auto-creates profile stub with onboarded_at = NULL', async () => {
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userA.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.display_name).toBe('New User');
    expect(data?.onboarded_at).toBeNull();
    expect(data?.is_pro).toBe(false);
  });

  // ── Test 2: Own update ───────────────────────────────────────────────────────
  it('Test 2 — user can update own profile; onboarded_at is stamped', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const now = new Date().toISOString();

    const { error } = await clientA
      .from('profiles')
      .update({
        display_name: 'Alice',
        avatar_color: '#6C63FF',
        updated_at: now,
        onboarded_at: now,
      })
      .eq('id', userA.id);

    expect(error).toBeNull();

    const { data } = await adminClient
      .from('profiles')
      .select('display_name, onboarded_at')
      .eq('id', userA.id)
      .single();

    expect(data?.display_name).toBe('Alice');
    expect(data?.onboarded_at).not.toBeNull();
  });

  // ── Test 3: Cross-user RLS ───────────────────────────────────────────────────
  it("Test 3 — user B cannot update user A's profile (RLS blocks, 0 rows affected)", async () => {
    const clientB = await signInAsUser(userB.email, userB.password);

    const { data, error } = await clientB
      .from('profiles')
      .update({ display_name: 'Hacked' })
      .eq('id', userA.id);

    // Supabase returns no error — RLS silently filters to 0 rows.
    expect(error).toBeNull();
    expect(data).toBeNull();

    // Verify A's name is unchanged via admin.
    const { data: check } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', userA.id)
      .single();

    expect(check?.display_name).toBe('Alice');
  });
});
