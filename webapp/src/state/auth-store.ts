import { createStore } from 'zustand/vanilla';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  initialized: boolean;
  loading: boolean;
  session: Session | null;
  mode: 'sign-in' | 'sign-up';
  error: string | null;
  notice: string | null;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setSession: (session: Session | null) => void;
  setMode: (value: 'sign-in' | 'sign-up') => void;
  setError: (value: string | null) => void;
  setNotice: (value: string | null) => void;
};

export const authStore = createStore<AuthState>((set) => ({
  initialized: false,
  loading: false,
  session: null,
  mode: 'sign-in',
  error: null,
  notice: null,
  setInitialized: (initialized) => set({ initialized }),
  setLoading: (loading) => set({ loading }),
  setSession: (session) => set({ session }),
  setMode: (mode) => set({ mode }),
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
}));
