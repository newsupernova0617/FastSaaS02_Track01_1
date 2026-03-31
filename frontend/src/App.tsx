// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import RecordPage from './pages/RecordPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';

// 인증이 필요한 페이지를 보호하는 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;  // 세션 로딩 중이면 아무것도 표시하지 않음
  if (!session) return <Navigate to="/login" replace />;  // 로그인되지 않았으면 로그인 페이지로 리다이렉트
  return <>{children}</>;  // 로그인되었으면 요청한 페이지 렌더링
}

function AppRoutes() {
  const { session, loading } = useAuth();
  // 로그인되었을 때만 하단 네비게이션 표시
  const showNav = !loading && !!session;

  return (
    <BrowserRouter>
      <div className={`max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-[#f8f8fc] ${showNav ? 'pb-[100px]' : ''}`}>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* 루트(/)에 접근하면 /record로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/record" replace />} />
            {/* 로그인 필요한 페이지들 */}
            <Route path="/record" element={<ProtectedRoute><RecordPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          </Routes>
        </main>
        {showNav && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
