import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { MockInterview } from './components/MockInterview';
import { Evaluation } from './components/Evaluation';
import { SettingsModal } from './components/SettingsModal';

type Page = 'dashboard' | 'interview' | 'evaluation';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <div className="relative min-h-screen pb-12">
      {/* Background blobs for premium look */}
      <div
        className="gradient-blob bg-indigo-500 w-[500px] h-[500px] top-[-10%] left-[-10%]"
      />
      <div
        className="gradient-blob bg-purple-500 w-[600px] h-[600px] bottom-[-20%] right-[-10%]"
      />

      {/* Main Content Router */}
      <main className="relative z-10">
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
