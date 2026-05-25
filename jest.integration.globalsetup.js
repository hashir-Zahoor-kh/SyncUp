// Clears accumulated rate_limit_events before the integration suite runs.
// Without this, accept-invite tests eventually hit the 10/hour IP limit from
// prior test runs and start returning 429 where they expect 200.
const fs = require('fs');
const path = require('path');

function loadEnv() {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
    content.split('\n').forEach((line) => {
      const eq = line.indexOf('=');
      if (eq > 0 && !line.startsWith('#')) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim();
        if (k && v) process.env[k] = v;
      }
    });
  } catch {
    // .env not present — CI uses actual env vars
  }
}

module.exports = async function globalSetup() {
  loadEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc || svc === 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY') return;

  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(url, svc);
  await admin.from('rate_limit_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};
