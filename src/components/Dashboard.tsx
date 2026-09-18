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
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  ArrowRight,
  X,
  Clock,
  Briefcase,
  Users,
  Code2,
  Sliders,
  Check,
  Award,
  BarChart2,
  MessageSquare,
  ListOrdered,
  FolderGit2,
  Target,
  AlertTriangle,
  Lightbulb,
  Building2,
  Trophy,
  Radio,
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

  // Setup Form States
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('technical');
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('conversational');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [questionCount, setQuestionCount] = useState(5);
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
      setUploadError('Please configure your Groq API Key in settings first.');
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
      setUploadError('Please configure your Groq API Key in settings first.');
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
      console.error('Resume parsing failed:', err);
      setUploadError(err.message || 'Failed to analyze resume.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartInterview = async () => {
    if (!profile) return;

    if (!getGroqApiKey()) {
      setUploadError('Please configure your Groq API Key in settings to proceed.');
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
      name: 'Technical Round (DSA, Projects & Stack)',
      icon: Code2,
      desc: 'Coding, Data Structures & Algorithms, candidate project architecture, and tech stack internals.',
    },
    {
      id: 'managerial' as InterviewStyle,
      name: 'Managerial & Architecture Round',
      icon: Users,
      desc: 'Project ownership, system trade-offs, cross-functional conflicts, and engineering prioritization.',
    },
    {
      id: 'hr' as InterviewStyle,
      name: 'HR & Culture Fit Round',
      icon: Briefcase,
      desc: 'Behavioral STAR scenarios, company culture alignment, career vision, and communication style.',
    },
    {
      id: 'gd' as InterviewStyle,
      name: 'Group Discussion (GD) Round - 5 Mins',
      icon: Radio,
      desc: 'Contemporary trending GD topic. Deliver a 5-minute structured speech (Intro, For, Against, Conclusion). Non-stop talk.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Error Alert */}
      {uploadError && (
        <div className="flex items-center justify-between p-4 bg-theme-danger border border-theme-danger text-theme-danger rounded-xl animate-slide-up shadow-sm">
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-sm font-medium text-theme-danger hover:opacity-80 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="card p-8 bg-gradient-to-br from-theme-surface via-theme-surface to-theme-surface-alt border border-theme shadow-sm relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-theme-primary-light text-theme-primary-color border border-theme-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Voice Mock Interview Platform (Groq Powered)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-theme-primary">
            Master Technical, DSA, and Project Hiring Interviews
          </h1>
          <p className="text-sm text-theme-secondary leading-relaxed">
            Experience authentic corporate interviews with conversational AI that adapts to your answers, probes your real resume projects, checks DSA fundamentals, and gently coaches you through natural pauses.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Resume Deep Scan & Analytics */}
        <div className="lg:col-span-7 space-y-6">
          {!profile && !isUploading && !isParsing ? (
            <div className="card p-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-theme-primary-light rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-theme-primary-color" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-theme-primary">Upload Resume for Deep AI Scan</h3>
                <p className="text-xs sm:text-sm text-theme-secondary max-w-md mx-auto">
                  Groq scans projects, tech stacks, and highlights critical technical gaps (DSA, architecture, edge cases) tailored for hiring.
                </p>
              </div>

              {!showPasteArea ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white font-medium rounded-xl cursor-pointer transition-all shadow-sm">
                    <FileText className="w-4 h-4" />
                    <span>Upload Resume (PDF, TXT)</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowPasteArea(true)}
                    className="w-full sm:w-auto px-5 py-2.5 border border-theme text-theme-secondary rounded-xl hover:bg-theme-surface-hover font-medium text-sm transition-colors"
                  >
                    Paste Text
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTextSubmit} className="space-y-3">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste resume content here..."
                    className="w-full h-40 p-3 bg-theme-surface-alt border border-theme rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteArea(false)}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!pasteText.trim()}
                      className="btn-primary text-xs"
                    >
                      Start Deep Scan
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : isUploading || isParsing ? (
            <div className="card p-12 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h4 className="font-semibold text-theme-primary">Performing Deep Resume & Project Scan...</h4>
              <p className="text-xs text-theme-tertiary">
                Extracting projects, architecture details, tech stack nuances, and identifying key DSA/system gaps with Groq AI.
              </p>
            </div>
          ) : (
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-theme-primary-light rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-theme-primary-color" />
                  </div>
                  <div>
                    <h3 className="font-bold text-theme-primary text-base">Candidate Profile & Projects Scanned</h3>
                    <p className="text-xs text-theme-tertiary">
                      Target Role: <span className="font-semibold text-theme-secondary">{profile?.target_role}</span> ({profile?.experience_level})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setProfile(null)}
                  className="flex items-center gap-1 text-xs text-theme-tertiary hover:text-theme-primary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rescan Resume</span>
                </button>
              </div>

              {/* Extracted Projects Section */}
              {profile?.extracted_projects && profile.extracted_projects.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-theme-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-blue-500" /> Extracted Resume Projects (Targeted for Interview)
                  </span>
                  <div className="space-y-2">
                    {profile.extracted_projects.map((proj, idx) => (
                      <div key={idx} className="p-3 bg-theme-surface-alt/60 border border-theme rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-theme-primary">{proj.name}</h5>
                          <div className="flex gap-1 flex-wrap">
                            {proj.technologies.slice(0, 4).map((tech, tIdx) => (
                              <span key={tIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-theme-surface border border-theme text-theme-secondary font-mono">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-theme-secondary leading-snug">{proj.description}</p>
                        {proj.potentialQuestions && proj.potentialQuestions.length > 0 && (
                          <div className="pt-1 text-[10px] text-theme-tertiary italic">
                            Expected prompt: "{proj.potentialQuestions[0]}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Work Experience Section */}
              {profile?.extracted_experience && profile.extracted_experience.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-theme-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Extracted Work Experience & Roles
                  </span>
                  <div className="space-y-2">
                    {profile.extracted_experience.map((exp, idx) => (
                      <div key={idx} className="p-3 bg-theme-surface-alt/60 border border-theme rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-theme-primary">
                            {exp.role} • <span className="font-normal text-theme-secondary">{exp.company}</span>
                          </h5>
                          {exp.duration && (
                            <span className="text-[10px] text-theme-tertiary font-mono">
                              {exp.duration}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-theme-secondary leading-snug">{exp.description}</p>
                        {exp.keyContributions && exp.keyContributions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {exp.keyContributions.map((kc, kIdx) => (
                              <span key={kIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-theme-surface border border-theme text-theme-tertiary">
                                • {kc}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Achievements Section */}
              {profile?.extracted_achievements && profile.extracted_achievements.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-theme-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Standout Achievements & Accolades
                  </span>
                  <div className="space-y-2">
                    {profile.extracted_achievements.map((ach, idx) => (
                      <div key={idx} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-0.5">
                        <h5 className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                          <span>🏆</span> {ach.title}
                        </h5>
                        <p className="text-[11px] text-theme-secondary leading-snug">{ach.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Tags */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-theme-tertiary uppercase tracking-wider">
                  Extracted Core Tech Stacks
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile?.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-theme-surface-alt border border-theme text-theme-secondary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* HIGH PRIORITY FOCUS AREAS & CRITICAL GAPS */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-theme-tertiary uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Targeted Interview Focus Areas & Critical Gaps
                </span>

                {profile?.detailed_focus_areas && profile.detailed_focus_areas.length > 0 ? (
                  <div className="space-y-2">
                    {profile.detailed_focus_areas.map((gap, idx) => (
                      <div key={idx} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" /> {gap.topic}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {gap.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-theme-secondary">{gap.reason}</p>
                        <p className="text-[11px] text-theme-tertiary flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-500" /> Prep Advice: {gap.recommendedPrep}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-theme-surface-alt rounded-xl text-xs text-theme-secondary">
                    {profile?.focus_areas.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Past Mock Interviews Dashboard History */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-theme-primary-color" />
                <h3 className="text-base font-bold text-theme-primary">Interview Performance History</h3>
              </div>
              <span className="text-xs text-theme-tertiary">
                {interviews.length} sessions
              </span>
            </div>

            {interviews.length === 0 ? (
              <div className="text-xs sm:text-sm text-theme-tertiary italic p-6 bg-theme-surface-alt border border-theme border-dashed rounded-2xl text-center">
                No mock interviews completed yet. Configure and launch your first AI interview!
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((iv) => {
                  const isPassed = iv.passed ?? (iv.overall_score ? iv.overall_score >= 70 : null);
                  return (
                    <div
                      key={iv.id}
                      className="card card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-theme"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-theme-primary text-sm">{iv.role}</h4>
                          <span className="px-2 py-0.5 text-[11px] font-semibold text-theme-secondary bg-theme-surface-alt border border-theme rounded-full">
                            {iv.experience_level}
                          </span>
                          {iv.interview_style && (
                            <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-theme-primary-light text-theme-primary-color border border-theme-primary/20">
                              {iv.interview_style}
                            </span>
                          )}
                          {iv.interview_mode === 'conversational' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              Conversational
                            </span>
                          )}
                          {iv.status === 'completed' && isPassed !== null && (
                            <span
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                                isPassed
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              }`}
                            >
                              {isPassed ? '✓ Passed' : '✗ Needs Prep'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-theme-tertiary flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(iv.created_at).toLocaleDateString()}
                          </span>
                          {iv.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {iv.duration_minutes} mins
                            </span>
                          )}
                          {iv.overall_score !== null && (
                            <span className="flex items-center gap-1 font-bold text-theme-primary-color">
                              <Award className="w-3.5 h-3.5" />
                              Score: {iv.overall_score}/100
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {iv.status === 'in_progress' ? (
                          <button
                            onClick={() => onStartInterview(iv.id)}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            <span>Resume</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onViewEvaluation(iv.id)}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            <span>View Full Report</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Setup Mock Interview Configurator */}
        <div className="lg:col-span-5">
          <div className={`card p-6 space-y-6 border border-theme shadow-md ${!profile ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-theme-primary-light rounded-xl flex items-center justify-center">
                  <Play className="w-4 h-4 text-theme-primary-color" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-theme-primary">Configure Mock Interview</h3>
                  <p className="text-[11px] text-theme-tertiary">Select mode & round parameters</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* INTERVIEW MODE SELECTOR (Natural Human vs Structured Drill) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary">
                  Interview Experience Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewMode('conversational')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      interviewMode === 'conversational'
                        ? 'bg-theme-primary-light border-theme-primary ring-1 ring-theme-primary'
                        : 'bg-theme-surface border-theme hover:border-theme-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-theme-primary-color" />
                      <span className="text-xs font-bold text-theme-primary">Natural Voice Flow</span>
                    </div>
                    <p className="text-[10px] text-theme-secondary mt-1">
                      Human interviewer, handles pauses ("take your time"), gives hints if off-topic.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewMode('structured')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      interviewMode === 'structured'
                        ? 'bg-theme-primary-light border-theme-primary ring-1 ring-theme-primary'
                        : 'bg-theme-surface border-theme hover:border-theme-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-theme-primary-color" />
                      <span className="text-xs font-bold text-theme-primary">Q&A Drill Mode</span>
                    </div>
                    <p className="text-[10px] text-theme-secondary mt-1">
                      Targeted question count, step-by-step scoring, structured exam style.
                    </p>
                  </button>
                </div>
              </div>

              {/* Target Role Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary">
                  Target Company Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g., Senior Full Stack Developer"
                />
              </div>

              {/* Experience Level */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary">
                  Candidate Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="Junior">Junior (0 - 2 years)</option>
                  <option value="Mid-Level">Mid-Level (2 - 5 years)</option>
                  <option value="Senior">Senior (5 - 8 years)</option>
                  <option value="Lead">Lead / Principal (8+ years)</option>
                </select>
              </div>

              {/* Interview Round Styles (Technical covers DSA, projects, stack) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary">
                  Interview Round Syllabus
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {interviewStylesList.map((style) => {
                    const Icon = style.icon;
                    const isSelected = interviewStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setInterviewStyle(style.id)}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-theme-primary-light border-theme-primary ring-1 ring-theme-primary'
                            : 'bg-theme-surface border-theme hover:border-theme-hover'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg mt-0.5 ${
                            isSelected ? 'bg-theme-primary text-white' : 'bg-theme-surface-alt text-theme-secondary'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-theme-primary">{style.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-theme-primary-color" />}
                          </div>
                          <p className="text-[11px] text-theme-secondary leading-tight">{style.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration & Questions (Conditioned on Mode & Style) */}
              {interviewStyle === 'gd' ? (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 5-Minute Non-Stop Speech</span>
                    <span className="bg-blue-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono">Timed GD</span>
                  </div>
                  <p className="text-[11px] text-theme-secondary">
                    AI presents 1 contemporary GD topic. You speak continuously for 5 minutes covering Intro, For, Against, and Conclusion. AI performs a multi-criteria evaluation at the end.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Duration
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[5, 10, 15, 20].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDurationMinutes(mins)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            durationMinutes === mins
                              ? 'bg-theme-primary text-white border-theme-primary'
                              : 'bg-theme-surface border-theme text-theme-secondary hover:bg-theme-surface-hover'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {interviewMode === 'structured' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5" /> Questions
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[3, 5, 8].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setQuestionCount(num)}
                            className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              questionCount === num
                                ? 'bg-theme-primary text-white border-theme-primary'
                                : 'bg-theme-surface border-theme text-theme-secondary hover:bg-theme-surface-hover'
                            }`}
                          >
                            {num} Qs
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col justify-center">
                      <label className="block text-xs font-bold uppercase tracking-wider text-theme-secondary">
                        Flow Pacing
                      </label>
                      <div className="p-2 rounded-lg bg-theme-surface-alt border border-theme text-[11px] text-theme-secondary">
                        Adaptive Conversational Pacing (Dynamic AI Follow-ups)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleStartInterview}
              disabled={!profile || isCreatingInterview}
              className="w-full flex items-center justify-center gap-2 py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isCreatingInterview ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Tailored Interview...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Live Voice Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
