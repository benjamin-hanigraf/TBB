'use client';
import { createClient } from '@supabase/supabase-js';
// The owner's session lives in its own storage slot, so it never mixes with a customer logged in to the shop on the same browser.
let client;
export function adminClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { lock: async (_name, _timeout, fn) => fn(), storageKey: 'tbb-admin-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}
