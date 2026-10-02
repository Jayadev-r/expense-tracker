import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav';
import ChatPage from './pages/ChatPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system';
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (saved === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        <main className="page-content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
