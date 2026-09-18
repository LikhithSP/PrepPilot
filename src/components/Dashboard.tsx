import React, { useState, useEffect } from 'react';
import type {
  Profile,
  Interview,
  InterviewStyle,
  InterviewMode,
} from '../services/supabase';
import { db } from '../services/supabase';
import { groqService, getGroqApiKey } from '../services/groq';
import { parsePdf } from '../utils/pdfParser';
import {
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  X,
  Briefcase,
  Users,
  Code2,
  Sliders,
  Check,
  Award,
  FolderGit2,
  Target,
  AlertTriangle,
  Lightbulb,
  Radio,
  ChevronRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  onStartInterview: (interviewId: string) => void;
  onViewEvaluation: (interviewId: string) => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartInterview,
  onViewEvaluation,
  onOpenSettings,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Session Setup Form States
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('technical');
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('conversational');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [questionCount] = useState(5);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const activeProfile = await db.getProfile();
      setProfile(activeProfile);
      if (activeProfile) {
        setTargetRole(activeProfile.target_role || 'Full Stack Software Engineer');
        setExperienceLevel(activeProfile.experience_level || 'Mid-Level');
      }
      const list = await db.getInterviews();
      setInterviews(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!getGroqApiKey()) {
      setUploadError('Please configure your Google Workspace / Groq API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await parsePdf(file);
      } else {
        text = await file.text();
      }

      await handleParseResumeText(text);
    } catch (err: any) {
      setUploadError(err.message || 'Error parsing file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    if (!getGroqApiKey()) {
      setUploadError('Please configure your Google Workspace / Groq API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await handleParseResumeText(pasteText);
      setShowPasteArea(false);
      setPasteText('');
    } catch (err: any) {
      setUploadError(err.message || 'Error processing resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleParseResumeText = async (text: string) => {
    setIsParsing(true);
    try {
      const parsed = await groqService.deepParseResume(text);

      const savedProfile = await db.saveProfile({
        name: 'Student Candidate',
        resume_text: text,
        skills: parsed.skills || [],
        target_role: parsed.targetRole || 'Software Engineer',
        experience_level: parsed.experienceLevel || 'Mid-Level',
        focus_areas: parsed.focusAreas || [],
        detailed_focus_areas: parsed.detailedFocusAreas || [],
        extracted_projects: parsed.extractedProjects || [],
        extracted_experience: parsed.extractedExperience || [],
        extracted_achievements: parsed.extractedAchievements || [],
      });

      setProfile(savedProfile);
      setTargetRole(savedProfile.target_role);
      setExperienceLevel(savedProfile.experience_level);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error analyzing resume with Google AI.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartSession = async () => {
    if (!profile) {
      setUploadError('Please upload or import your resume from Google Drive first to calibrate questions.');
      return;
    }

    if (!getGroqApiKey()) {
      setUploadError('Please configure your API Key in settings to proceed.');
      onOpenSettings();
      return;
    }

    setIsCreatingInterview(true);
    try {
      const finalDuration = interviewStyle === 'gd' ? 5 : durationMinutes;

      // 1. Create Interview session in DB
      const interview = await db.createInterview({
        profile_id: profile.id,
        role: targetRole || profile.target_role || 'Software Engineer',
        experience_level: experienceLevel,
        interview_style: interviewStyle,
        interview_mode: interviewStyle === 'gd' ? 'conversational' : interviewMode,
        duration_minutes: finalDuration,
      });

      // 2. Generate syllabus questions (or GD topic)
      const generatedQuestions = await groqService.generateQuestions(
        profile,
        targetRole,
        experienceLevel,
        interviewStyle,
        interviewStyle === 'gd' ? 1 : interviewMode === 'structured' ? questionCount : 5
      );

      // 3. Save interview questions to DB
      const questionsToSave = generatedQuestions.map((q) => ({
        interview_id: interview.id,
        question_text: q.question,
        depth_level: q.depthLevel,
        user_answer: null,
        score: null,
        strengths: null,
        weaknesses: null,
        better_answer: null,
      }));

      await db.addInterviewQuestions(questionsToSave);

      // 4. Navigate to live interview split screen
      onStartInterview(interview.id);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error generating tailored interview session.');
    } finally {
      setIsCreatingInterview(false);
    }
  };

  const interviewStylesList = [
    {
      id: 'technical' as InterviewStyle,
      name: 'Technical Round',
      subtitle: 'DSA, Code & System Architecture',
      icon: Code2,
      accentColor: '#1a73e8', // Google Blue
      badge: 'L4 / L5 SWE Bar',
      desc: 'Coding fundamentals, time/space trade-offs, architecture decisions from resume projects, and tech stack mechanics.',
    },
    {
      id: 'managerial' as InterviewStyle,
      name: 'Managerial Round',
      subtitle: 'Engineering Leadership & Trade-offs',
      icon: Users,
      accentColor: '#34a853', // Google Green
      badge: 'Director Persona',
      desc: 'Delivery deadlines, resolving cross-functional friction with PMs, technical debt versus speed, and code mentoring.',
    },
    {
      id: 'hr' as InterviewStyle,
      name: 'Googliness & Culture',
      subtitle: 'Values, Ethics & Collaboration',
      icon: Briefcase,
      accentColor: '#fbbc04', // Google Yellow
      badge: 'People Partner',
      desc: 'Googliness, navigating ambiguity, inclusive team collaboration, career motivation, and behavioral STAR situations.',
    },
    {
      id: 'gd' as InterviewStyle,
      name: 'Group Discussion (GD)',
      subtitle: '5-Min Structured Continuous Talk',
      icon: Radio,
      accentColor: '#ea4335', // Google Red
      badge: 'Campus & Campus Drives',
      desc: 'Trending contemporary topic. Uninterrupted 5-minute speech evaluating Introduction, Points For, Points Against, and Conclusion.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-google">
      {/* Google Workspace Alert Notification */}
      {uploadError && (
        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl animate-slide-up shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-google-red" />
            <span className="text-sm font-medium">{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Workspace Product Banner / Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-google-blue dark:text-blue-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Workspace • Hiring Simulation Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal text-theme-primary tracking-tight">
            Practice Real Voice Interviews with Google AI.
          </h1>
          <p className="text-sm sm:text-base text-theme-secondary leading-relaxed">
            Prepare for Google and top tech company hiring rounds. Calibrate DSA, system design, leadership trade-offs, and 5-minute group discussions with adaptive voice intelligence.
          </p>
        </div>

        {/* Google Drive / Meet Style Stats Card */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="p-4 rounded-2xl bg-theme-surface border border-theme shadow-2xs flex items-center gap-5">
            <div>
              <span className="text-xs text-theme-tertiary block font-medium">
                Practice Sessions
              </span>
              <span className="text-2xl font-normal text-theme-primary font-google">
                {interviews.length}
              </span>
            </div>
            <div className="h-8 w-px bg-theme-border" />
            <div>
              <span className="text-xs text-theme-tertiary block font-medium">
                Google Bar Score
              </span>
              <span className="text-2xl font-normal text-google-green dark:text-emerald-400 font-google">
                {interviews.length > 0
                  ? Math.round(
                      interviews.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) /
                        interviews.length
                    ) + '%'
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN SECTION: GOOGLE DRIVE RESUME IMPORT + CANDIDATE DOSSIER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: RESUME INGESTION (GOOGLE DRIVE STYLE) (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="google-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-google-blue">
                  <FileText className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-theme-primary">Google Drive & Document Import</h3>
                  <p className="text-xs text-theme-tertiary">Ingest your PDF or text resume</p>
                </div>
              </div>

              {profile && (
                <span className="google-chip bg-green-50 dark:bg-green-950/60 text-google-green border border-green-200 dark:border-green-800 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Calibrated</span>
                </span>
              )}
            </div>

            {/* Google Drive Dropzone */}
            <div className="relative group">
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-theme rounded-2xl bg-theme-surface-alt/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-google-blue transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  disabled={isUploading || isParsing}
                  className="sr-only"
                />
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-theme flex items-center justify-center text-google-blue shadow-2xs mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 stroke-[1.8]" />
                </div>
                <span className="text-sm font-medium text-theme-primary">
                  {isUploading || isParsing ? 'Analyzing with Google Gemini / LPU...' : 'Upload Resume Document'}
                </span>
                <span className="text-xs text-theme-tertiary mt-1 text-center">
                  Drag and drop PDF/TXT or import from Google Drive
                </span>
              </label>
            </div>

            {/* Plaintext Option */}
            <div className="pt-1">
              <button
                onClick={() => setShowPasteArea(!showPasteArea)}
                className="w-full py-2 px-3 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover rounded-xl border border-theme transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showPasteArea ? 'Hide Plaintext Box' : 'Or Paste Raw Resume Text'}</span>
              </button>

              {showPasteArea && (
                <form onSubmit={handleTextSubmit} className="mt-3 space-y-3 animate-slide-up">
                  <textarea
                    rows={5}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste resume or LinkedIn profile content here..."
                    className="w-full p-3 bg-theme-surface border border-theme rounded-xl text-xs focus:outline-none focus:border-google-blue"
                  />
                  <button
                    type="submit"
                    disabled={isUploading || isParsing || !pasteText.trim()}
                    className="w-full btn-google-primary text-xs py-2"
                  >
                    {isParsing ? 'Analyzing Content...' : 'Extract Experience & Skills'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Google Assessment Tip */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
              <Lightbulb className="w-4 h-4 text-google-yellow flex-shrink-0" />
              <span>Google Interview Tip</span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Google technical interviewers look for structured problem solving, clarifying questions before writing code, and clear discussion of time/space complexity tradeoffs.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: CANDIDATE PROFILE & DETECTED FOCUS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {profile ? (
            <div className="google-card p-6 space-y-6">
              {/* Profile Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-theme">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-google-blue text-white font-medium flex items-center justify-center text-base shadow-2xs">
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-theme-primary">{profile.name}</h3>
                    <p className="text-xs text-theme-tertiary">
                      Target Role: <span className="font-medium text-theme-primary">{profile.target_role}</span> • {profile.experience_level}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono px-3 py-1 rounded-full bg-theme-surface-alt border border-theme text-theme-secondary self-start sm:self-auto">
                  {profile.skills.length} Skills Verified
                </span>
              </div>

              {/* Skills Cloud */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-theme-tertiary block">
                  Identified Technical Stack
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-theme-surface-alt border border-theme text-theme-primary hover:border-google-blue transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ingested Resume Projects */}
              {profile.extracted_projects && profile.extracted_projects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-theme-tertiary flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-google-blue" />
                      <span>Resume Projects Ingested for Live Coding Discussion</span>
                    </span>
                    <span className="text-xs text-theme-tertiary font-mono">
                      {profile.extracted_projects.length} Projects
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.extracted_projects.slice(0, 4).map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-theme-surface-alt/70 border border-theme space-y-1.5"
                      >
                        <h4 className="text-xs font-medium text-theme-primary truncate">{p.name}</h4>
                        <p className="text-xs text-theme-secondary line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.technologies.slice(0, 3).map((t, ti) => (
                            <span
                              key={ti}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface border border-theme text-theme-tertiary"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Focus Areas */}
              {profile.detailed_focus_areas && profile.detailed_focus_areas.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-medium text-google-yellow flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Targeted Interview Focus Areas</span>
                  </span>

                  <div className="space-y-2">
                    {profile.detailed_focus_areas.slice(0, 3).map((area, ai) => (
                      <div
                        key={ai}
                        className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-theme-primary">{area.topic}</span>
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                            {area.category}
                          </span>
                        </div>
                        <p className="text-theme-secondary text-xs leading-relaxed">
                          {area.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[360px] google-card flex items-center justify-center text-center p-8">
              <div className="space-y-3 text-theme-tertiary max-w-sm">
                <div className="w-14 h-14 rounded-full bg-theme-surface-alt border border-theme flex items-center justify-center mx-auto text-theme-tertiary">
                  <Target className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-base font-medium text-theme-primary">No Candidate Resume Loaded</h4>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  Upload your resume on the left to extract your engineering background, verified skills, and customize your mock interview questions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GOOGLE CLASSROOM / FORMS STYLE SESSION LAUNCHER */}
      <div className="google-card p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme">
          <div>
            <span className="google-chip bg-blue-50 dark:bg-blue-950/50 text-google-blue border border-blue-200 dark:border-blue-800 mb-1">
              Select Round
            </span>
            <h2 className="text-xl font-normal text-theme-primary tracking-tight">
              Choose Interview Type & Assessment Parameters
            </h2>
            <p className="text-xs text-theme-secondary">
              Conduct technical, leadership, culture, or group discussion hiring rounds
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-tertiary">Target Role:</span>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Software Engineer (L4)"
              className="px-3 py-1.5 bg-theme-surface border border-theme rounded-lg text-xs font-medium text-theme-primary focus:outline-none focus:border-google-blue"
            />
          </div>
        </div>

        {/* 4 Specialized Google Round Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {interviewStylesList.map((st) => {
            const isSelected = interviewStyle === st.id;
            const Icon = st.icon;

            return (
              <div
                key={st.id}
                onClick={() => setInterviewStyle(st.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-google-blue shadow-xs'
                    : 'bg-theme-surface border-theme hover:bg-theme-surface-hover hover:border-theme-hover'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? st.accentColor : 'rgba(0,0,0,0.05)',
                        color: isSelected ? '#ffffff' : st.accentColor,
                      }}
                    >
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-theme-surface border border-theme text-theme-secondary">
                      {st.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-theme-primary">{st.name}</h4>
                    <p className="text-xs font-medium text-google-blue mt-0.5">
                      {st.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-theme-secondary leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-theme text-xs font-medium">
                  <span className={isSelected ? 'text-google-blue font-medium' : 'text-theme-tertiary'}>
                    {st.id === 'gd' ? '5 Mins Speech' : '5-6 Questions'}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-google-blue stroke-[2.5]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Parameters (Non-GD) */}
        {interviewStyle !== 'gd' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-theme">
            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-theme-tertiary block">
                Conversation Flow
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInterviewMode('conversational')}
                  className={`py-2 px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    interviewMode === 'conversational'
                      ? 'btn-google-primary'
                      : 'btn-google-outlined'
                  }`}
                >
                  Conversational
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewMode('structured')}
                  className={`py-2 px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    interviewMode === 'structured'
                      ? 'btn-google-primary'
                      : 'btn-google-outlined'
                  }`}
                >
                  Q&A Drill
                </button>
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-theme-tertiary block">
                Seniority Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full p-2.5 bg-theme-surface border border-theme rounded-xl text-xs font-medium text-theme-primary focus:outline-none focus:border-google-blue"
              >
                <option value="Junior (L3 / 0-2 yrs)">Junior (L3 / 0-2 yrs)</option>
                <option value="Mid-Level (L4 / 3-5 yrs)">Mid-Level (L4 / 3-5 yrs)</option>
                <option value="Senior (L5 / 5+ yrs)">Senior (L5 / 5+ yrs)</option>
                <option value="Staff / Lead (L6+)">Staff / Lead (L6+)</option>
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-theme-tertiary block">
                Session Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full p-2.5 bg-theme-surface border border-theme rounded-xl text-xs font-medium text-theme-primary focus:outline-none focus:border-google-blue"
              >
                <option value={10}>10 Minutes (Quick Screen)</option>
                <option value={15}>15 Minutes (Standard Mock)</option>
                <option value={30}>30 Minutes (Comprehensive Onsite)</option>
              </select>
            </div>
          </div>
        )}

        {/* Start Interview Google Button CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-theme">
          <div className="flex items-center gap-2 text-xs text-theme-secondary">
            <Sparkles className="w-4 h-4 text-google-blue" />
            <span>
              {interviewStyle === 'gd'
                ? 'AI generates 1 contemporary trending topic for a non-stop 5-minute speech.'
                : 'AI generates custom questions tailored to your skills and projects.'}
            </span>
          </div>

          <button
            onClick={handleStartSession}
            disabled={isCreatingInterview}
            className="btn-google-primary py-3 px-8 text-sm cursor-pointer group"
          >
            {isCreatingInterview ? (
              <span>Connecting to Google Meet Room...</span>
            ) : (
              <>
                <span>
                  Join {interviewStyle === 'gd' ? 'Group Discussion' : 'Google Interview'} Room
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* SESSION LOG / RECENT GOOGLE EVALUATION DOSSIERS */}
      {interviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-google-blue" />
              <h3 className="text-base font-medium text-theme-primary">Google Interview Evaluation History</h3>
            </div>
            <span className="text-xs text-theme-tertiary">
              {interviews.length} Sessions Logged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviews.map((iv) => (
              <div
                key={iv.id}
                onClick={() => onViewEvaluation(iv.id)}
                className="google-card p-5 flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="google-chip bg-blue-50 dark:bg-blue-950/50 text-google-blue text-xs">
                      {iv.interview_style || 'Technical'} Round
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

                  <h4 className="text-sm font-medium text-theme-primary">{iv.role}</h4>
                  <p className="text-xs text-theme-tertiary">
                    Level: {iv.experience_level} • {new Date(iv.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-theme text-xs font-medium text-google-blue">
                  <span>View Google Evaluation Dossier</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
