import { createStore } from 'zustand/vanilla';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  initialized: boolean;
  loading: boolean;
  session: Session | null;
  email: string;
  password: string;
  error: string | null;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setSession: (session: Session | null) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setError: (value: string | null) => void;
};

export const authStore = createStore<AuthState>((set) => ({
  initialized: false,
  loading: false,
  session: null,
  email: '',
  password: '',
  error: null,
  setInitialized: (initialized) => set({ initialized }),
  setLoading: (loading) => set({ loading }),
  setSession: (session) => set({ session }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setError: (error) => set({ error }),
}));
