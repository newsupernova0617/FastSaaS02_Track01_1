import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '../lib/supabase';
import { setAuthToken } from '../api';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getRedirectUrl(): string {
  return Capacitor.isNativePlatform()
    ? 'com.fastsaas02.app://auth/callback'
    : `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial session and subscribe to changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthToken(session?.access_token ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mobile: handle deep-link callback (appUrlOpen fires after OAuth redirect)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = App.addListener('appUrlOpen', async ({ url }) => {
      if (!url.includes('auth/callback')) return;
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        await Browser.close();
      }
    });
    return () => { listenerPromise.then(l => l.remove()); };
  }, []);

  async function signInWithProvider(provider: 'google' | 'kakao') {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getRedirectUrl(), skipBrowserRedirect: true },
      });
      if (error || !data.url) return;
      await Browser.open({ url: data.url });
    } else {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getRedirectUrl() },
      });
    }
  }

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      signInWithGoogle: () => signInWithProvider('google'),
      signInWithKakao: () => signInWithProvider('kakao'),
      signOut: () => supabase.auth.signOut().then(() => {}),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
