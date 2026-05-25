/**
 * Manual Realtime verification script.
 *
 * Supabase Realtime WebSocket tests cannot run inside Jest (globalThis.WebSocket
 * is undefined in the vm.createContext() sandbox on Node.js 22+). This script
 * runs outside Jest and confirms end-to-end delivery.
 *
 * Usage:
 *   npx ts-node scripts/verify-realtime.ts
 *
 * Requires .env with EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
 * and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from '../src/types/database';

function loadEnv(): void {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
    content.split('\n').forEach((line) => {
      const eq = line.indexOf('=');
      if (eq > 0 && !line.startsWith('#')) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim();
        if (k && v) process.env[k] = v;
      }
    });
  } catch {
    // already in env
  }
}

loadEnv();

const URL = process.env['EXPO_PUBLIC_SUPABASE_URL']!;
const ANON = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']!;
const SVC = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

if (!URL || !ANON || !SVC) {
  console.error('Missing env vars. Check .env file.');
  process.exit(1);
}

const RUN = Date.now().toString(36);
const WEEK_START = (() => {
  const now = new Date();
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().split('T')[0]!;
})();

async function run(): Promise<void> {
  const admin = createClient<Database>(URL, SVC);

  // Create two ephemeral test users
  const { data: da } = await admin.auth.admin.createUser({
    email: `rt-verify-a-${RUN}@example.com`,
    password: 'TestPass123!',
    email_confirm: true,
  });
  const { data: db } = await admin.auth.admin.createUser({
    email: `rt-verify-b-${RUN}@example.com`,
    password: 'TestPass123!',
    email_confirm: true,
  });
  const userA = da?.user;
  const userB = db?.user;
  if (!userA || !userB) throw new Error('Failed to create test users');

  // Create A-B connection
  const { data: conn } = await admin
    .from('connections')
    .insert({ user_a_id: userA.id, user_b_id: userB.id, relationship_type: 'Friends' })
    .select()
    .single();
  if (!conn) throw new Error('Failed to create connection');

  // Sign in as A and B
  const clientA = createClient<Database>(URL, ANON);
  await clientA.auth.signInWithPassword({
    email: `rt-verify-a-${RUN}@example.com`,
    password: 'TestPass123!',
  });
  const clientB = createClient<Database>(URL, ANON);
  await clientB.auth.signInWithPassword({
    email: `rt-verify-b-${RUN}@example.com`,
    password: 'TestPass123!',
  });

  console.log('Users created and signed in. Subscribing B to Realtime…');

  // Subscribe B and wait for event
  const insertReceived = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      console.error('FAIL — INSERT event not received within 5s');
      resolve(false);
    }, 5000);

    const channel = clientB
      .channel(`verify-insert-${RUN}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goals',
          filter: `connection_id=eq.${conn.id}`,
        },
        (payload) => {
          console.log('INSERT received:', (payload.new as { text: string }).text);
          clearTimeout(timeout);
          void clientB.removeChannel(channel);
          resolve(true);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscription active. A is inserting goal…');
          void clientA.from('goals').insert({
            user_id: userA.id,
            connection_id: conn.id,
            text: 'Realtime verify goal',
            tag: 'Health',
            week_start: WEEK_START,
          });
        }
      });
  });

  // Subscribe B and wait for UPDATE event
  const { data: goals } = await clientA
    .from('goals')
    .select('id')
    .eq('connection_id', conn.id)
    .limit(1);
  const goalId = goals?.[0]?.id;

  const updateReceived = goalId
    ? await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.error('FAIL — UPDATE event not received within 5s');
          resolve(false);
        }, 5000);

        const channel = clientB
          .channel(`verify-update-${RUN}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'goals',
              filter: `connection_id=eq.${conn.id}`,
            },
            () => {
              console.log('UPDATE received');
              clearTimeout(timeout);
              void clientB.removeChannel(channel);
              resolve(true);
            },
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Subscription active. A is completing goal…');
              void clientA
                .from('goals')
                .update({ completed_at: new Date().toISOString() })
                .eq('id', goalId);
            }
          });
      })
    : false;

  // Cleanup
  await admin.from('goals').delete().eq('connection_id', conn.id);
  await admin.from('connections').delete().eq('id', conn.id);
  await admin.auth.admin.deleteUser(userA.id);
  await admin.auth.admin.deleteUser(userB.id);

  const pass = insertReceived && updateReceived;
  console.log(
    `\n${pass ? '✓ PASS' : '✗ FAIL'} — INSERT: ${insertReceived ? 'OK' : 'FAIL'}, UPDATE: ${updateReceived ? 'OK' : 'FAIL'}`,
  );
  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
