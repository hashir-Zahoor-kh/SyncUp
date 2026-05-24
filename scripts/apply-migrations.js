#!/usr/bin/env node
/**
 * Applies all SQL migrations in supabase/migrations/ to the Supabase Postgres database.
 * Requires DATABASE_URL in .env (direct Postgres connection, NOT the REST API URL).
 *
 * Get the connection string from:
 *   Supabase Dashboard → Settings → Database → Connection String → URI
 *   Format: postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0 && !line.startsWith('#')) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim();
        if (key && val && !process.env[key]) process.env[key] = val;
      }
    });
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || DATABASE_URL.includes('REPLACE_WITH')) {
  console.error(
    '\nERROR: DATABASE_URL is not set in .env\n' +
      'Add it now:\n' +
      '  DATABASE_URL=postgresql://postgres:[DB_PASSWORD]@db.ilykfwtiebfyaljlhsrx.supabase.co:5432/postgres\n' +
      'Get your DB password from: Supabase Dashboard → Settings → Database → Database Password\n',
  );
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase Postgres.\n');

  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // timestamps ensure correct order

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Applying: ${file} ...`);
    try {
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file} — ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('\nAll migrations applied successfully.');
}

run().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
