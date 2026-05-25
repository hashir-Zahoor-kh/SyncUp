/**
 * @jest-environment node
 *
 * Integration tests for Phase 5A avatar overhaul.
 *
 * Test matrix:
 *  1. Profile update with avatar_emoji saves correctly to DB
 *  2. Profile update with avatar_url saves correctly to DB
 *  3. User cannot upload to another user's storage path (RLS blocks)
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

describeIf('Avatar Integration Tests', () => {
  const adminClient = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const userA = {
    email: `avatar-a-${RUN_ID}@example.com`,
    password: 'TestPass123!',
    id: '',
  };

  beforeAll(async () => {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: userA.email,
      password: userA.password,
      email_confirm: true,
    });
    if (error ?? !data.user) throw new Error(`createUser failed: ${error?.message ?? 'no user'}`);
    userA.id = data.user.id;
  }, 30000);

  afterAll(async () => {
    if (userA.id) await adminClient.auth.admin.deleteUser(userA.id);
  }, 30000);

  it('Test 1 — profile update with avatar_emoji saves correctly to DB', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const now = new Date().toISOString();

    const { error } = await clientA
      .from('profiles')
      .update({
        avatar_emoji: '🌟',
        avatar_color: null,
        avatar_url: null,
        display_name: 'Avatar Emoji User',
        updated_at: now,
        onboarded_at: now,
      })
      .eq('id', userA.id);

    expect(error).toBeNull();

    const { data } = await clientA
      .from('profiles')
      .select('avatar_emoji, avatar_color, avatar_url')
      .eq('id', userA.id)
      .single();

    expect(data?.avatar_emoji).toBe('🌟');
    expect(data?.avatar_color).toBeNull();
    expect(data?.avatar_url).toBeNull();
  });

  it('Test 2 — profile update with avatar_url saves correctly to DB', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const fakeUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${userA.id}/avatar.jpg`;
    const now = new Date().toISOString();

    const { error } = await clientA
      .from('profiles')
      .update({
        avatar_url: fakeUrl,
        avatar_emoji: null,
        avatar_color: null,
        display_name: 'Avatar Photo User',
        updated_at: now,
        onboarded_at: now,
      })
      .eq('id', userA.id);

    expect(error).toBeNull();

    const { data } = await clientA
      .from('profiles')
      .select('avatar_emoji, avatar_color, avatar_url')
      .eq('id', userA.id)
      .single();

    expect(data?.avatar_url).toBe(fakeUrl);
    expect(data?.avatar_emoji).toBeNull();
    expect(data?.avatar_color).toBeNull();
  });

  it('Test 3 — user cannot upload to another user storage path (RLS blocks)', async () => {
    const clientA = await signInAsUser(userA.email, userA.password);
    const otherUserId = '00000000-0000-0000-0000-000000000001';
    const path = `${otherUserId}/avatar.jpg`;

    const buffer = Buffer.from('fake-image-data');
    const { error } = await clientA.storage.from('avatars').upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

    expect(error).not.toBeNull();
  });
});
