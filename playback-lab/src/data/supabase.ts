import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const extra = readExtra();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';
  return { url: url.trim(), anonKey: anonKey.trim() };
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}
