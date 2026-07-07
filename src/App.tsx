import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { MockInterview } from './components/MockInterview';
import { Evaluation } from './components/Evaluation';
import { SettingsModal } from './components/SettingsModal';
import { Brain, Settings, Sun, Moon } from 'lucide-react';

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
    <div className="min-h-screen bg-theme-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-theme-surface/80 backdrop-blur-md border-theme">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-theme-primary tracking-tight">
                Interview Prep
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface-hover rounded-lg transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface-hover rounded-lg transition-colors"
                title="Configuration"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Router */}
      <main>
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

      {/* Configuration Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
