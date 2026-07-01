import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase URL and Anon Key must be configured in src/constants/config.ts'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
