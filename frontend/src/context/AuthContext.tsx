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

// OAuth 리다이렉트 URL 결정 (모바일 vs 웹)
function getRedirectUrl(): string {
  // 모바일 앱: deep link 스킴 사용 (native 앱으로 돌아옴)
  // 웹: 현재 도메인의 /auth/callback 페이지로 리다이렉트
  return Capacitor.isNativePlatform()
    ? 'com.fastsaas02.app://auth/callback'
    : `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 세션 불러오고, 인증 상태 변화를 구독
  useEffect(() => {
    // 1. 저장된 세션이 있는지 확인 (로컬스토리지/쿠키에서)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // 토큰을 api.ts의 전역 변수에 저장해서 모든 API 요청에 자동으로 붙임
      setAuthToken(session?.access_token ?? null);
      setLoading(false);
    });

    // 2. Supabase 인증 상태 변화를 실시간으로 감시
    // 로그인/로그아웃 시 자동으로 session 업데이트
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthToken(session?.access_token ?? null);
    });

    // 3. 컴포넌트 언마운트 시 구독 취소 (메모리 누수 방지)
    return () => subscription.unsubscribe();
  }, []);

  // 모바일 앱에서만: OAuth 브라우저 리다이렉트 후 deep link 처리
  // Capacitor의 Browser.open()으로 외부 브라우저에서 OAuth를 처리하고
  // 완료되면 앱으로 돌아올 때(appUrlOpen 이벤트) 토큰을 저장하는 로직
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;  // 모바일만 실행

    const listenerPromise = App.addListener('appUrlOpen', async ({ url }) => {
      // 리다이렉트 URL이 auth/callback인지 확인 (OAuth 완료)
      if (!url.includes('auth/callback')) return;

      // URL 프래그먼트(#)에서 토큰 추출 (OAuth는 # 뒤에 매개변수 전달)
      // 예: com.fastsaas02.app://auth/callback#access_token=xyz&refresh_token=abc
      const fragment = url.split('#')[1];
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      // 토큰을 받으면 Supabase 세션에 저장 (로그인 완료)
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // 브라우저 창 닫기 (원래 앱으로 돌아옴)
        await Browser.close();
      }
    });

    // 언마운트 시 이벤트 리스너 정리
    return () => { listenerPromise.then(l => l.remove()); };
  }, []);

  // OAuth 로그인 (Google, Kakao)
  // 모바일과 웹의 플로우가 다름:
  // - 웹: 리다이렉트만으로 처리
  // - 모바일: 외부 브라우저에서 처리 후 deep link로 돌아옴
  async function signInWithProvider(provider: 'google' | 'kakao') {
    if (Capacitor.isNativePlatform()) {
      // 모바일 앱
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
          skipBrowserRedirect: true  // 자동 리다이렉트 방지, 우리가 수동으로 처리
        },
      });
      if (error || !data.url) return;
      // Capacitor의 Browser로 외부 브라우저에서 OAuth 완료 (native 웹뷰 아님)
      await Browser.open({ url: data.url });
    } else {
      // 웹 브라우저
      // 자동 리다이렉트로 처리 (OAuth 완료 후 /auth/callback 페이지로 이동)
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
