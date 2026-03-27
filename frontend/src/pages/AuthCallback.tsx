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
    if (!session || synced.current) return;
    synced.current = true;

    const user = session.user;
    const provider = user.app_metadata.provider ?? 'unknown';

    async function sync() {
      let attempts = 0;
      while (attempts < 2) {
        try {
          const res = await fetch(`${BASE}/api/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session!.access_token}`,
            },
            body: JSON.stringify({
              email: user.email ?? null,
              name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
              provider,
            }),
          });
          if (res.ok) {
            navigate('/record', { replace: true });
            return;
          }
        } catch { /* retry */ }
        attempts++;
      }
      // Both attempts failed — sign out and return to login
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
