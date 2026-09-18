import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { MockInterview } from './components/MockInterview';
import { Evaluation } from './components/Evaluation';
import { SettingsModal } from './components/SettingsModal';
import { Settings, Sun, Moon } from 'lucide-react';

type Page = 'dashboard' | 'interview' | 'evaluation';
type Theme = 'light' | 'dark';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const startInterview = (id: string) => {
    setActiveInterviewId(id);
    setPage('interview');
  };

  const viewEvaluation = (id: string) => {
    setActiveInterviewId(id);
    setPage('evaluation');
  };

  const completeInterview = (id: string) => {
    setActiveInterviewId(id);
    setPage('evaluation');
  };

  return (
    <div className="min-h-screen bg-theme-background text-theme-primary">
      {/* Official Google Workspace App Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#0d1014] border-b border-theme transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Google Brand Identity & Workspace Product Logo */}
            <div 
              onClick={() => setPage('dashboard')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              {/* Google Multicolored 'G' Mark */}
              <div className="w-9 h-9 flex items-center justify-center">
                <svg viewBox="0 0 48 48" className="w-8 h-8">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xl font-normal text-theme-primary tracking-tight font-google">
                  Google
                </span>
                <span className="text-xl font-normal text-theme-secondary font-google">
                  Interview
                </span>
              </div>
            </div>

            {/* Right Action Suite with LPU Status Pill */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Google Cloud LPU Connected status pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-theme-surface-alt border border-theme text-xs text-theme-secondary shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-google-green animate-pulse" />
                <span className="font-medium text-theme-primary">LPU Active</span>
                <span className="text-theme-tertiary">•</span>
                <span className="text-[11px] font-mono text-theme-tertiary">Groq</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors cursor-pointer"
                  title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                >
                  {theme === 'light' ? (
                    <Moon className="w-4 h-4 stroke-[1.8]" />
                  ) : (
                    <Sun className="w-4 h-4 stroke-[1.8]" />
                  )}
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors cursor-pointer"
                  title="Settings & Google Workspace API"
                >
                  <Settings className="w-4 h-4 stroke-[1.8]" />
                </button>

                {/* Profile Picture with zoom-in focus */}
                <div 
                  className="w-9 h-9 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-xs select-none cursor-pointer ring-2 ring-blue-500/20 ml-1.5 flex-shrink-0 relative"
                  title="Profile Account"
                >
                  <img
                    src="https://img.magnific.com/free-vector/man-profile-account-picture_24908-81754.jpg?semt=ais_hybrid&w=740&q=80"
                    alt="Profile"
                    className="w-full h-full object-cover scale-150 object-center transition-transform"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Google Application View */}
      <main className="pb-16">
        {page === 'dashboard' && (
          <Dashboard
            onStartInterview={startInterview}
            onViewEvaluation={viewEvaluation}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {page === 'interview' && activeInterviewId && (
          <MockInterview
            interviewId={activeInterviewId}
            onBackToDashboard={() => setPage('dashboard')}
            onInterviewComplete={completeInterview}
          />
        )}

        {page === 'evaluation' && activeInterviewId && (
          <Evaluation
            interviewId={activeInterviewId}
            onBackToDashboard={() => setPage('dashboard')}
          />
        )}
      </main>

      {/* Google Preferences Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
