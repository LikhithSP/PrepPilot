import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { MockInterview } from './components/MockInterview';
import { Evaluation } from './components/Evaluation';
import { SettingsModal } from './components/SettingsModal';
import { Settings, Sun, Moon, Compass } from 'lucide-react';

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
      {/* Official PrepPilot App Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#0d1014] border-b border-theme transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* PrepPilot Brand Identity & Workspace Product Logo */}
            <div 
              onClick={() => setPage('dashboard')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              {/* PrepPilot Mark */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Compass className="w-5 h-5 text-white" />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xl font-normal text-theme-primary tracking-tight font-google">
                  PrepPilot
                </span>
                <span className="text-xl font-normal text-theme-secondary font-google">
                  Interview
                </span>
              </div>
            </div>

            {/* Right Action Suite with LPU Status Pill */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* PrepPilot LPU Connected status pill */}
              <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-theme-surface-alt border border-theme text-[11px] sm:text-xs text-theme-secondary shadow-2xs">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-google-green" />
                <span className="font-medium text-theme-primary">LPU Active</span>
                <span className="text-theme-tertiary hidden sm:inline">•</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-theme-tertiary hidden sm:inline">Groq</span>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1.5">
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors cursor-pointer"
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
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors cursor-pointer"
                  title="Settings & PrepPilot API"
                >
                  <Settings className="w-4 h-4 stroke-[1.8]" />
                </button>

                {/* Profile Picture with zoom-in focus */}
                <div 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-xs select-none cursor-pointer ring-2 ring-blue-500/20 ml-1 flex-shrink-0 relative"
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

      {/* Main PrepPilot Application View */}
      <main className="animate-fade-in pb-16">
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
            onInterviewComplete={completeInterview}
            onBackToDashboard={() => setPage('dashboard')}
          />
        )}
        {page === 'evaluation' && activeInterviewId && (
          <Evaluation
            interviewId={activeInterviewId}
            onBackToDashboard={() => setPage('dashboard')}
          />
        )}
      </main>

      {/* PrepPilot Preferences Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
