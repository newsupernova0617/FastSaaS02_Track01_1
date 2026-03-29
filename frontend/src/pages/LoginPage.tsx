// frontend/src/pages/LoginPage.tsx
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signInWithGoogle, signInWithKakao } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] gap-4 px-8 bg-[#f8f8fc]">
      <h1 className="text-2xl font-bold mb-8">가계부</h1>
      {/* OAuth 로그인 버튼들 (Google, Kakao) */}
      <button
        onClick={signInWithGoogle}
        className="w-full max-w-sm py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium flex items-center justify-center gap-3 shadow-sm"
      >
        Google로 로그인
      </button>
      <button
        onClick={signInWithKakao}
        className="w-full max-w-sm py-3 px-4 bg-[#FEE500] rounded-xl text-sm font-medium flex items-center justify-center gap-3"
      >
        카카오로 로그인
      </button>
    </div>
  );
}
