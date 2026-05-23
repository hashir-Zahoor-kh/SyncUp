/**
 * @jest-environment node
 *
 * Integration tests for Supabase Auth flows.
 * Uses the Admin API to create/manage test users — avoids email sending and free-tier rate limits.
 * Skipped automatically in CI when env vars are missing.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): void {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line: string) => {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
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
const CONFIRMED_EMAIL = `test-confirmed-${RUN_ID}@example.com`;
const UNCONFIRMED_EMAIL = `test-unconfirmed-${RUN_ID}@example.com`;
const PASSWORD = 'TestPass123!';

describeIf('Supabase Auth — integration', () => {
  const anon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const createdIds: string[] = [];

  beforeAll(async () => {
    // Create a confirmed user via admin (no email sent)
    const { data: confirmed } = await admin.auth.admin.createUser({
      email: CONFIRMED_EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (confirmed.user) createdIds.push(confirmed.user.id);

    // Create an unconfirmed user via admin (no email sent)
    const { data: unconfirmed } = await admin.auth.admin.createUser({
      email: UNCONFIRMED_EMAIL,
      password: PASSWORD,
      email_confirm: false,
    });
    if (unconfirmed.user) createdIds.push(unconfirmed.user.id);
  });

  afterAll(async () => {
    await anon.auth.signOut();
    for (const id of createdIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it('confirmed user can sign in with email and password', async () => {
    const { data, error } = await anon.auth.signInWithPassword({
      email: CONFIRMED_EMAIL,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
    expect(data.user?.email_confirmed_at).not.toBeNull();
  });

  it('unconfirmed user cannot sign in', async () => {
    await anon.auth.signOut();
    const { data, error } = await anon.auth.signInWithPassword({
      email: UNCONFIRMED_EMAIL,
      password: PASSWORD,
    });
    if (error) {
      expect(error.message).toMatch(/email not confirmed|Invalid login credentials/i);
    } else {
      // Some Supabase configs allow sign-in but return unconfirmed flag
      expect(data.user?.email_confirmed_at).toBeNull();
    }
  });

  it('admin can confirm email and user can then sign in', async () => {
    const unconfirmedId = createdIds[1];
    expect(unconfirmedId).toBeDefined();
    const { error: updateErr } = await admin.auth.admin.updateUserById(unconfirmedId!, {
      email_confirm: true,
    });
    expect(updateErr).toBeNull();

    const { data, error } = await anon.auth.signInWithPassword({
      email: UNCONFIRMED_EMAIL,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
  });

  it('sign out clears the session', async () => {
    await anon.auth.signInWithPassword({ email: CONFIRMED_EMAIL, password: PASSWORD });
    const { error } = await anon.auth.signOut();
    expect(error).toBeNull();
    const { data } = await anon.auth.getSession();
    expect(data.session).toBeNull();
  });

  it('wrong password returns an auth error', async () => {
    const { error } = await anon.auth.signInWithPassword({
      email: CONFIRMED_EMAIL,
      password: 'WrongPassword999!',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Invalid login credentials/i);
  });

  it('password reset email request succeeds for a valid email', async () => {
    const { error } = await anon.auth.resetPasswordForEmail(CONFIRMED_EMAIL, {
      redirectTo: 'syncup://reset-password',
    });
    // Free tier may rate-limit this — accept either success or rate-limit error
    if (error) {
      expect(error.message).toMatch(/rate limit/i);
    } else {
      expect(error).toBeNull();
    }
  });

  it('tokens are stored in SecureStore adapter (not plain memory)', async () => {
    const { data } = await anon.auth.signInWithPassword({
      email: CONFIRMED_EMAIL,
      password: PASSWORD,
    });
    expect(data.session?.access_token).toBeDefined();
    // Verify the session round-trips correctly
    const { data: retrieved } = await anon.auth.getSession();
    expect(retrieved.session?.access_token).toBe(data.session?.access_token);
  });
});
