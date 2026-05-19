import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://uqvnepemplsdkkawbmdc.supabase.co';
const fallbackSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdm5lcGVtcGxzZGtrYXdibWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODE5MTQsImV4cCI6MjA5MDE1NzkxNH0.X_zFEwbdSwSWNkkhgGRGp_VnmiJvhXZG1D-h45FovTQ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? fallbackSupabaseAnonKey;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export async function signInWithPassword(email: string, password: string): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    callback(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
