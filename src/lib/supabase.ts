import { createClient } from '@supabase/supabase-js';

const requiredEnv = (name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string => {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const supabaseUrl = requiredEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requiredEnv('VITE_SUPABASE_ANON_KEY');

try {
  // Validate URL early to fail fast on broken configuration.
  // eslint-disable-next-line no-new
  new URL(supabaseUrl);
} catch {
  throw new Error('VITE_SUPABASE_URL must be a valid URL');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
