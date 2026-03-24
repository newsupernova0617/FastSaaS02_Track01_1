import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import RecordPage from './pages/RecordPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-[#f8f8fc] pb-[100px]">
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/record" replace />} />
            <Route path="/record" element={<RecordPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
