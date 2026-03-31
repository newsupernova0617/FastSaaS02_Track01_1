// frontend/src/pages/AuthCallback.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export default function AuthCallback() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const synced = useRef(false);

  useEffect(() => {
    // synced.current로 중복 실행 방지 (React StrictMode에서 useEffect가 2번 실행될 수 있음)
    if (!session || synced.current) return;
    synced.current = true;

    const user = session.user;
    const provider = user.app_metadata.provider ?? 'unknown';

    async function sync() {
      // 최대 2번 시도 (네트워크 오류 등의 일시적 실패에 대응)
      let attempts = 0;
      while (attempts < 2) {
        try {
          // 백엔드의 /api/users/sync 엔드포인트에 사용자 정보 저장
          // 처음 로그인이면 INSERT, 기존 사용자면 UPDATE (upsert)
          const res = await fetch(`${BASE}/api/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Supabase JWT를 Authorization 헤더로 전달
              // 백엔드의 authMiddleware에서 검증해서 userId 추출
              'Authorization': `Bearer ${session!.access_token}`,
            },
            body: JSON.stringify({
              email: user.email ?? null,
              // full_name이 있으면 쓰고, 없으면 name 필드 사용
              name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
              provider,
            }),
          });
          // 성공하면 기록 페이지로 이동
          if (res.ok) {
            navigate('/record', { replace: true });
            return;
          }
        } catch { /* 네트워크 오류 등 - 재시도 */ }
        attempts++;
      }
      // 2번 시도 모두 실패했으면 로그아웃해서 로그인 페이지로 돌아가기
      // (서버 문제로 동기화 실패한 경우)
      await signOut();
      navigate('/login', { replace: true });
    }

    sync();
  }, [session, navigate, signOut]);

  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      로그인 중...
    </div>
  );
}
