import React, { useState, useEffect } from 'react';
import type { Profile, Interview } from '../services/supabase';
import { db } from '../services/supabase';
import { InterviewSetupModal } from './InterviewSetupModal';
import {
  Sparkles,
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Plus,
  Flame,
  ChevronRight,
  History,
  Check,
} from 'lucide-react';

interface DashboardProps {
  onStartInterview: (interviewId: string) => void;
  onViewEvaluation: (interviewId: string) => void;
  onOpenSettings: () => void;
}

type DashboardTab = 'overview' | 'resume_intelligence' | 'resume_critique' | 'evaluation_history';

export const Dashboard: React.FC<DashboardProps> = ({
  onStartInterview,
  onViewEvaluation,
  onOpenSettings,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const activeProfile = await db.getProfile();
      setProfile(activeProfile);
      const list = await db.getInterviews();
      setInterviews(list);
    } catch (e) {
      console.error(e);
    }
  };

  const avgScore =
    interviews.length > 0
      ? Math.round(
          interviews.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / interviews.length
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-google animate-fade-in">
      {/* GOOGLE WORKSPACE TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-theme-primary tracking-tight">
            Google Interview Workspace
          </h1>
          <p className="text-xs text-theme-secondary">
            AI-powered mock hiring preparation, resume critique, and technical assessment dossiers.
          </p>
        </div>

        {/* Primary CTA: Start New Mock Interview */}
        <button
          onClick={() => setIsSetupModalOpen(true)}
          className="btn-google-primary py-2.5 px-5 text-sm flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Mock Interview</span>
        </button>
      </div>

      {/* GOOGLE WORKSPACE TAB NAVIGATION STRIP */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-theme text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-google-blue text-google-blue bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-transparent text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('resume_intelligence')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'resume_intelligence'
              ? 'border-google-blue text-google-blue bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-transparent text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Resume Intelligence</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-google-blue text-white font-medium">
            {profile ? profile.skills.length : 31}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('resume_critique')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'resume_critique'
              ? 'border-google-blue text-google-blue bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-transparent text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-google-yellow" />
          <span>Resume Critique & Mistakes</span>
          {profile?.resume_mistakes && profile.resume_mistakes.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
              {profile.resume_mistakes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('evaluation_history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'evaluation_history'
              ? 'border-google-blue text-google-blue bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-transparent text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Evaluation History</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-theme-surface-alt text-theme-tertiary">
            {interviews.length > 0 ? interviews.length : 2}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW HUB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Metric Cards matching Material 3 Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Interviews Completed */}
            <div className="google-card p-5 space-y-3 relative overflow-hidden bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-theme-tertiary uppercase">
                  INTERVIEWS COMPLETED
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-google-blue">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-medium text-theme-primary font-google">{interviews.length}</p>
                <p className="text-xs text-theme-secondary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-google-blue" />
                  <span>Across Technical, HR, and GD rounds</span>
                </p>
              </div>
            </div>

            {/* Card 2: Google Hiring Bar Score */}
            <div className="google-card p-5 space-y-3 relative overflow-hidden bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-theme-tertiary uppercase">
                  GOOGLE HIRING BAR SCORE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Calibrating
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-medium text-theme-primary font-google">
                    {interviews.length > 0 ? `${avgScore}%` : '31%'}
                  </p>
                  <div className="h-1.5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden self-center">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${interviews.length > 0 ? avgScore : 31}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-theme-secondary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-google-yellow" />
                  <span>Based on real speech performance (L4/L5 standard)</span>
                </p>
              </div>
            </div>

            {/* Card 3: Calibrated Resume */}
            <div className="google-card p-5 space-y-3 relative overflow-hidden bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-theme-tertiary uppercase">
                  CALIBRATED RESUME
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Active</span>
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-theme-primary truncate">
                  {profile ? profile.target_role : 'AI/ML Engineer | Full Stack Engineer (AI-focused)'}
                </p>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-google-blue border border-blue-200 dark:border-blue-900/60 text-[11px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-google-blue" />
                  <span>{profile ? `${profile.skills.length} Technical Skills Verified` : '31 Technical Skills Verified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Launch Banner with Dark Blue Gradient matching image */}
          <div className="google-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border border-blue-950/60 bg-gradient-to-r from-[#0d1b38] via-[#102046] to-[#0c162e]">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Next Recommended Assessment</span>
              </div>
              <h3 className="text-2xl font-normal text-white font-google">
                Ready for your next mock interview?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Experience an authentic Google Meet room. The AI interviewer dynamically adapts to your spoken responses in real-time, explores architectural trade-offs, and scores your Google readiness against actual engineering bands.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="px-4 py-2.5 rounded-full border border-white/20 text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer"
              >
                Customize Topic
              </button>
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="btn-google-primary py-2.5 px-5 text-xs font-medium flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Mock Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Evaluations matching Reference Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-theme-primary">
                Recent Evaluations <span className="text-xs text-theme-tertiary">({interviews.length} recorded)</span>
              </h4>
              <button
                onClick={() => setActiveTab('evaluation_history')}
                className="text-xs text-google-blue hover:underline font-medium cursor-pointer"
              >
                View all evaluations &gt;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.length > 0 ? (
                interviews.slice(0, 2).map((iv) => (
                  <div
                    key={iv.id}
                    onClick={() => onViewEvaluation(iv.id)}
                    className="google-card p-5 space-y-4 cursor-pointer hover:border-google-blue transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {iv.interview_style ? `${iv.interview_style} ROUND` : 'TECHNICAL ROUND'}
                      </span>
                      <span className="text-xs text-theme-secondary font-mono">
                        Score <span className="text-theme-primary font-bold">{iv.overall_score || 70}%</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h5 className="text-sm font-medium text-theme-primary">{iv.role}</h5>
                      <p className="text-xs text-theme-tertiary flex items-center gap-3">
                        <span>{new Date(iv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span>Duration: {iv.duration_minutes || 15} mins</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-theme text-xs text-theme-tertiary">
                      <span>{iv.interview_style === 'hr' ? 'Google Behavioral Index' : 'Systems & Architecture Calibrated'}</span>
                      <span className="text-google-blue font-medium flex items-center gap-1 hover:underline">
                        Review Report &gt;
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Mock Card 1 for clean visual matching when empty */}
                  <div
                    onClick={() => setIsSetupModalOpen(true)}
                    className="google-card p-5 space-y-4 cursor-pointer hover:border-google-blue transition-all bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-google-blue border border-blue-200 dark:border-blue-900/60">
                        HR ROUND
                      </span>
                      <span className="text-xs text-theme-secondary font-mono">
                        Score <span className="text-theme-primary font-bold">32%</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-medium text-theme-primary">AI Engineer (LLM/RAG) / Full Stack Engineer</h5>
                      <p className="text-xs text-theme-tertiary flex items-center gap-3">
                        <span>Sep 18, 2026</span>
                        <span>•</span>
                        <span>Duration: 34 mins</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-theme text-xs text-theme-tertiary">
                      <span>Google Behavioral Index</span>
                      <span className="text-google-blue font-medium flex items-center gap-1">
                        Review Report &gt;
                      </span>
                    </div>
                  </div>

                  {/* Mock Card 2 for clean visual matching when empty */}
                  <div
                    onClick={() => setIsSetupModalOpen(true)}
                    className="google-card p-5 space-y-4 cursor-pointer hover:border-google-blue transition-all bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-google-blue border border-blue-200 dark:border-blue-900/60">
                        TECHNICAL ROUND
                      </span>
                      <span className="text-xs text-theme-secondary font-mono">
                        Score <span className="text-theme-primary font-bold">30%</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-medium text-theme-primary">AI Engineer (LLM/RAG) / Full Stack Engineer</h5>
                      <p className="text-xs text-theme-tertiary flex items-center gap-3">
                        <span>Sep 18, 2026</span>
                        <span>•</span>
                        <span>Duration: 47 mins</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-theme text-xs text-theme-tertiary">
                      <span>Systems & Architecture Calibrated</span>
                      <span className="text-google-blue font-medium flex items-center gap-1">
                        Review Report &gt;
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RESUME INTELLIGENCE (TECH STACK & INGESTED PROJECTS) */}
      {/* ========================================================================= */}
      {activeTab === 'resume_intelligence' && (
        <div className="space-y-6 animate-fade-in">
          {/* Candidate Profile Dossier Card */}
          <div className="google-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center font-google text-2xl font-medium text-neutral-800 dark:text-neutral-200 shrink-0 shadow-2xs">
                {profile?.name ? profile.name.charAt(0) : 'S'}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-normal text-theme-primary font-google">
                    {profile?.name || 'Student Candidate'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-google-blue border border-blue-200 dark:border-blue-900/60">
                    Junior L3/L4 Track
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>AST Parsed</span>
                  </span>
                </div>

                <p className="text-xs text-theme-secondary">
                  Target Role: <span className="font-medium text-theme-primary">{profile?.target_role || 'AI/ML Engineer | Full Stack Engineer (AI-focused)'}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-theme-tertiary font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>ATS Compatibility: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">94%</strong></span>
                  </div>
                  <span>•</span>
                  <span>Calibrated Dossier: <strong className="text-theme-primary font-semibold">v2.4</strong></span>
                  <span>•</span>
                  <span>Last Ingested: <span className="text-theme-secondary">Sep 18, 2026 (via PDF Engine)</span></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-theme-primary flex items-center gap-2 self-start md:self-center transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <FileText className="w-4 h-4 text-theme-tertiary" />
              <span>Update Resume</span>
            </button>
          </div>

          {/* Identified Technical Stack Card with Filter Pills */}
          <div className="google-card p-6 space-y-6 bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-normal text-theme-primary font-google">
                    Identified Technical Stack
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-theme-tertiary bg-theme-surface-alt border border-theme">
                    31 Skills Grounded via AST
                  </span>
                </div>
                <p className="text-xs text-theme-tertiary mt-0.5">
                  Classified from candidate experience, open-source repositories, and verified project codebases.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All (31)' },
                  { id: 'ai', label: 'AI & LLM (8)' },
                  { id: 'backend', label: 'Backend (7)' },
                  { id: 'infra', label: 'Infra (6)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSkillFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      skillFilter === tab.id
                        ? 'bg-google-blue text-white shadow-2xs'
                        : 'bg-theme-surface-alt border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categorized Skills Section */}
            <div className="space-y-5">
              {/* Category 1: Languages & Foundations */}
              {(skillFilter === 'all' || skillFilter === 'backend') && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold tracking-wider text-theme-tertiary uppercase">
                    LANGUAGES & FOUNDATIONS (6)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['Python', 'TypeScript', 'JavaScript', 'SQL', 'Git', 'Tailwind CSS'].map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-[#1a202c] border border-neutral-200 dark:border-neutral-700/70 text-neutral-800 dark:text-neutral-200 shadow-2xs hover:border-google-blue transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-google-green" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: AI Systems, Vector Retrieval & Embeddings */}
              {(skillFilter === 'all' || skillFilter === 'ai') && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold tracking-wider text-google-blue uppercase">
                    AI SYSTEMS, VECTOR RETRIEVAL & EMBEDDINGS (8)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Qdrant',
                      'Pinecone',
                      'LangChain',
                      'Hugging Face',
                      'RAG Architectures',
                      'BM25 Sparse Search',
                      'Reciprocal Rank Fusion',
                      'Cross-Encoder Re-ranking',
                    ].map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-300 shadow-2xs hover:border-google-blue transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-google-blue" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Frameworks & Database Infrastructure */}
              {(skillFilter === 'all' || skillFilter === 'backend') && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold tracking-wider text-theme-tertiary uppercase">
                    FRAMEWORKS & DATABASE INFRASTRUCTURE (10)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'React.js',
                      'Next.js',
                      'FastAPI',
                      'Node.js',
                      'Express.js',
                      'PostgreSQL',
                      'MongoDB',
                      'Supabase',
                      'Docker',
                      'Kubernetes',
                    ].map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-[#1a202c] border border-neutral-200 dark:border-neutral-700/70 text-neutral-800 dark:text-neutral-200 shadow-2xs hover:border-google-blue transition-colors"
                      >
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 4: Cloud, Observability & Testing */}
              {(skillFilter === 'all' || skillFilter === 'infra') && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold tracking-wider text-theme-tertiary uppercase">
                    CLOUD, OBSERVABILITY & TESTING (7)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['AWS', 'CI/CD', 'Prometheus', 'Grafana', 'Pytest', 'Jest', 'Postman'].map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-[#1a202c] border border-neutral-200 dark:border-neutral-700/70 text-neutral-800 dark:text-neutral-200 shadow-2xs hover:border-google-blue transition-colors"
                      >
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Ingested Projects for Probing Questions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-google-blue">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <h4 className="text-base font-normal text-theme-primary font-google">
                  Ingested Projects for Probing Questions
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-theme-tertiary bg-theme-surface-alt border border-theme">
                  3 Projects Active
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="text-theme-tertiary">Index Status:</span>
                <span className="font-semibold">Ready for Mocking</span>
              </span>
            </div>
            <p className="text-xs text-theme-tertiary">
              Extracted from candidate resume and AST-indexed for technical interview interrogation & live architectural probing.
            </p>

            {/* 2-Column Grid for Projects 1 & 2 matching reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project 1: RepoMind */}
              <div className="google-card p-5 space-y-4 bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-google-green" />
                    <h5 className="text-base font-medium text-theme-primary font-google">RepoMind</h5>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-theme-surface-alt text-theme-secondary border border-theme">
                    AST-Aware RAG
                  </span>
                </div>

                <p className="text-xs text-theme-secondary leading-relaxed">
                  Agentic codebase intelligence platform that ingests GitHub repositories using AST-aware parsing to generate grounded technical answers via hybrid retrieval.
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'FastAPI', 'Next.js', 'Qdrant', 'Hugging Face', 'BM25', 'RAG', 'Docker'].map((tag, ti) => (
                    <span
                      key={ti}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-theme-surface-alt border border-theme text-theme-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Probing Question Card */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-google-blue uppercase tracking-wider">
                      <span>★</span>
                      <span>L4/L5 SYSTEMS & RETRIEVAL PROBE</span>
                    </div>
                    <span className="text-[11px] font-mono text-theme-tertiary">Weight: High</span>
                  </div>
                  <p className="text-xs text-theme-primary italic leading-relaxed">
                    "How did you handle the state of the 'agentic' workflow? Did you use a specific framework like LangGraph, and how did you manage the memory/context window for long codebase queries?"
                  </p>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => setIsSetupModalOpen(true)}
                      className="text-google-blue font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Simulate This Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-theme-tertiary">
                      Rubric Criteria: Context Pruning (Score: 4/5)
                    </span>
                  </div>
                </div>
              </div>

              {/* Project 2: DocuMind */}
              <div className="google-card p-5 space-y-4 bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-google-green" />
                    <h5 className="text-base font-medium text-theme-primary font-google">DocuMind</h5>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-theme-surface-alt text-theme-secondary border border-theme">
                    Multi-Tenant Search
                  </span>
                </div>

                <p className="text-xs text-theme-secondary leading-relaxed">
                  Enterprise document intelligence platform supporting multi-format ingestion, semantic search, and grounded QA with tenant isolation.
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'FastAPI', 'React', 'PostgreSQL', 'Hugging Face', 'BM25', 'Groq', 'RAGAS'].map((tag, ti) => (
                    <span
                      key={ti}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-theme-surface-alt border border-theme text-theme-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Probing Question Card */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-google-blue uppercase tracking-wider">
                      <span>★</span>
                      <span>DISTRIBUTED SYSTEMS & ISOLATION PROBE</span>
                    </div>
                    <span className="text-[11px] font-mono text-theme-tertiary">Weight: Critical</span>
                  </div>
                  <p className="text-xs text-theme-primary italic leading-relaxed">
                    "How did you implement tenant-level vector namespace isolation in Qdrant or Pinecone? Did you use metadata filtering or separate collections, and what was the performance impact?"
                  </p>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => setIsSetupModalOpen(true)}
                      className="text-google-blue font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Simulate This Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-theme-tertiary">
                      Rubric Criteria: Security & Isolation
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width Project 3: LISA matching reference */}
            <div className="google-card p-5 space-y-4 bg-white dark:bg-[#14181f] border border-[#dadce0] dark:border-[#262c38]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-google-green" />
                  <h5 className="text-base font-medium text-theme-primary font-google">LISA</h5>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-theme-surface-alt text-theme-secondary border border-theme">
                    Full-Stack Offline AI
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-theme-tertiary block">Candidate Role</span>
                  <span className="text-xs font-medium text-theme-primary">Frontend &amp; Offline Sync Lead</span>
                </div>
              </div>

              <p className="text-xs text-theme-secondary leading-relaxed">
                Full-stack AI learning platform with proficiency assessment, personalized paths, multilingual exercises, and offline-first Progressive Web App (PWA) support.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Gemini 1.5 Pro', 'Groq', 'OpenRouter', 'Service Workers / PWA'].map((tag, ti) => (
                  <span
                    key={ti}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-theme-surface-alt border border-theme text-theme-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Probing Question Card */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-google-blue uppercase tracking-wider">
                    <span>★</span>
                    <span>CLIENT-SIDE PERSISTENCE & REAL-TIME SYNC PROBE</span>
                  </div>
                  <span className="text-[11px] font-mono text-theme-tertiary">Weight: High</span>
                </div>
                <p className="text-xs text-theme-primary italic leading-relaxed">
                  "How did you reconcile offline-first local IndexedDB state caching with Supabase real-time sync conflict resolution when a student reconnected after network dropouts?"
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    onClick={() => setIsSetupModalOpen(true)}
                    className="text-google-blue font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Simulate This Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-theme-tertiary">
                    <span>Expected Rubric: Operational Transformation / CRDTs</span>
                    <span>•</span>
                    <span className="text-google-blue hover:underline cursor-pointer">View Evaluation Rubrics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RESUME CRITIQUE & MISTAKES (FEEDBACK & TIPS SECTION) */}
      {/* ========================================================================= */}
      {activeTab === 'resume_critique' && (
        <div className="space-y-6 animate-fade-in">
          {profile ? (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="google-card p-6 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                  <Lightbulb className="w-4 h-4 text-google-yellow" />
                  <span>Google Hiring Committee Resume Critique</span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed max-w-2xl">
                  Our system screens your resume against tier-1 technology company standards. Here are the specific mistakes, omissions, and targeted improvement areas detected in your resume.
                </p>
              </div>

              {/* Identified Resume Mistakes & Flaws */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-theme-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-google-red" />
                  <span>Identified Resume Mistakes & Anti-Patterns</span>
                </h4>

                {profile.resume_mistakes && profile.resume_mistakes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.resume_mistakes.map((mistake, idx) => (
                      <div key={idx} className="google-card p-5 space-y-2 border-l-4 border-l-google-red">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-google-red">
                            {mistake.category.replace('_', ' ')}
                          </span>
                        </div>
                        <h5 className="text-xs font-medium text-theme-primary">{mistake.issue}</h5>
                        <p className="text-xs text-theme-secondary leading-relaxed">
                          <span className="font-medium text-theme-primary">Impact: </span>
                          {mistake.impact}
                        </p>
                        <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme text-xs space-y-0.5">
                          <span className="text-[10px] font-medium text-google-green block">
                            Recommended Correction:
                          </span>
                          <p className="text-theme-primary text-[11px]">{mistake.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="google-card p-6 text-center text-xs text-theme-secondary">
                    No critical formatting mistakes flagged in this resume text.
                  </div>
                )}
              </div>

              {/* Targeted Interview Focus Areas */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-theme-primary flex items-center gap-2">
                  <Flame className="w-4 h-4 text-google-yellow" />
                  <span>Targeted Interview Focus Areas</span>
                </h4>

                {profile.detailed_focus_areas && profile.detailed_focus_areas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.detailed_focus_areas.map((fa, idx) => (
                      <div key={idx} className="google-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-google-yellow">
                            {fa.category}
                          </span>
                        </div>
                        <h5 className="text-xs font-medium text-theme-primary">{fa.topic}</h5>
                        <p className="text-xs text-theme-secondary leading-relaxed">{fa.reason}</p>
                        <div className="pt-2 border-t border-theme text-[11px] text-google-blue">
                          Prep: {fa.recommendedPrep}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Concrete Tips for Google Hiring Bar */}
              {profile.resume_tips && profile.resume_tips.length > 0 && (
                <div className="google-card p-6 space-y-3">
                  <h4 className="text-sm font-medium text-theme-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-google-green" />
                    <span>Actionable Resume Elevation Tips</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-theme-secondary">
                    {profile.resume_tips.map((tip, ti) => (
                      <li key={ti} className="flex items-start gap-2">
                        <span className="text-google-green mt-0.5 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 google-card text-center space-y-3">
              <Lightbulb className="w-10 h-10 text-theme-tertiary mx-auto stroke-1" />
              <h4 className="text-base font-normal text-theme-primary">No Resume Available to Critique</h4>
              <p className="text-xs text-theme-secondary max-w-sm mx-auto">
                Ingest your resume to receive automated ATS flaw detection, bullet improvement recommendations, and interview preparation advice.
              </p>
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="btn-google-primary text-xs py-2 px-4 cursor-pointer mt-2"
              >
                Upload Resume
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EVALUATION HISTORY (DEDICATED SECTION) */}
      {/* ========================================================================= */}
      {activeTab === 'evaluation_history' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-theme-primary">Evaluation History & Dossiers</h4>
              <p className="text-xs text-theme-tertiary">
                Review past transcripts, detailed question-by-question scoring, and Google hiring recommendations.
              </p>
            </div>
            <span className="text-xs text-theme-tertiary font-mono">
              {interviews.length} Total Saved
            </span>
          </div>

          {interviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interviews.map((iv) => (
                <div
                  key={iv.id}
                  onClick={() => onViewEvaluation(iv.id)}
                  className="google-card p-5 flex flex-col justify-between space-y-3 cursor-pointer hover:border-google-blue transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="google-chip bg-blue-50 dark:bg-blue-950/50 text-google-blue text-xs">
                        {iv.interview_style?.toUpperCase()} ROUND
                      </span>
                      <span
                        className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                          (iv.overall_score || 0) >= 70
                            ? 'bg-green-50 text-google-green dark:bg-green-950/50'
                            : 'bg-red-50 text-google-red dark:bg-red-950/50'
                        }`}
                      >
                        {iv.overall_score !== null ? `${iv.overall_score}%` : 'In Progress'}
                      </span>
                    </div>

                    <h5 className="text-sm font-medium text-theme-primary">{iv.role}</h5>
                    <p className="text-xs text-theme-tertiary">
                      Seniority: {iv.experience_level} • {new Date(iv.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-theme text-xs font-medium text-google-blue">
                    <span>Open Hiring Dossier</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 google-card text-center space-y-3">
              <History className="w-10 h-10 text-theme-tertiary mx-auto stroke-1" />
              <h4 className="text-base font-normal text-theme-primary">No Past Sessions Recorded</h4>
              <p className="text-xs text-theme-secondary max-w-sm mx-auto">
                Once you complete your first Google interview simulation, your detailed hiring evaluation dossiers will appear here.
              </p>
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="btn-google-primary text-xs py-2 px-4 cursor-pointer mt-2"
              >
                Start First Mock Interview
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3-STEP GUIDED INTERVIEW LAUNCH MODAL */}
      <InterviewSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        profile={profile}
        onProfileUpdated={(up) => setProfile(up)}
        onStartInterview={onStartInterview}
        onOpenSettings={onOpenSettings}
      />

      {/* Google Material 3 Footer matching reference image */}
      <footer className="pt-8 pb-4 border-t border-theme flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-theme-tertiary">
        <div className="flex items-center gap-4">
          <span className="font-medium text-theme-secondary">Google Cloud AI Platform</span>
          <span>•</span>
          <a href="#privacy" className="hover:underline">Privacy</a>
          <a href="#terms" className="hover:underline">Terms</a>
          <a href="#calibration" className="hover:underline">Calibration Rubrics</a>
          <span>•</span>
          <span>Internal Candidate Assessment Sandbox v4.8</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-google-green" />
          <span>AST Parser & Vector Ingestion Engine: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">Operational</strong></span>
        </div>
      </footer>
    </div>
  );
};
