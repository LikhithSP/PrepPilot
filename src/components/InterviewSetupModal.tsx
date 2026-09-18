import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Profile, InterviewStyle, InterviewMode } from '../services/supabase';
import { db } from '../services/supabase';
import { groqService, getGroqApiKey } from '../services/groq';
import { parsePdf } from '../utils/pdfParser';
import {
  X,
  Upload,
  FileText,
  Code2,
  Users,
  Briefcase,
  Radio,
  Check,
  ArrowRight,
  ArrowLeft,
  Sliders,
  AlertTriangle,
  Video,
} from 'lucide-react';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdated: (updatedProfile: Profile) => void;
  onStartInterview: (interviewId: string) => void;
  onOpenSettings: () => void;
}

export const InterviewSetupModal: React.FC<InterviewSetupModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onStartInterview,
  onOpenSettings,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [targetRole, setTargetRole] = useState(profile?.target_role || 'Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || 'Mid-Level');
  const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('technical');
  const [interviewMode] = useState<InterviewMode>('conversational');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!getGroqApiKey()) {
      setErrorMsg('Please configure your Groq API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await parsePdf(file);
      } else {
        text = await file.text();
      }

      await parseAndSave(text);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    if (!getGroqApiKey()) {
      setErrorMsg('Please configure your Groq API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      await parseAndSave(pasteText);
      setShowPaste(false);
      setPasteText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const parseAndSave = async (text: string) => {
    setIsParsing(true);
    try {
      const parsed = await groqService.deepParseResume(text);

      const saved = await db.saveProfile({
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
        resume_mistakes: parsed.resumeMistakes || [],
        resume_tips: parsed.resumeTips || [],
      });

      onProfileUpdated(saved);
      setTargetRole(saved.target_role);
      setExperienceLevel(saved.experience_level);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error extracting resume data with AI.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleLaunchMeetRoom = async () => {
    if (!profile) {
      setErrorMsg('Please upload a resume first.');
      setStep(1);
      return;
    }

    if (!getGroqApiKey()) {
      setErrorMsg('Please configure your Groq API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsCreatingInterview(true);
    setErrorMsg(null);

    try {
      const finalDuration = interviewStyle === 'gd' ? 5 : durationMinutes;

      const interview = await db.createInterview({
        profile_id: profile.id,
        role: targetRole || profile.target_role || 'Software Engineer',
        experience_level: experienceLevel,
        interview_style: interviewStyle,
        interview_mode: interviewStyle === 'gd' ? 'conversational' : interviewMode,
        duration_minutes: finalDuration,
      });

      const generatedQuestions = await groqService.generateQuestions(
        profile,
        targetRole,
        experienceLevel,
        interviewStyle,
        interviewStyle === 'gd' ? 1 : interviewMode === 'structured' ? 5 : 5
      );

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

      onClose();
      onStartInterview(interview.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google Meet interview room.');
    } finally {
      setIsCreatingInterview(false);
    }
  };

  const rounds = [
    {
      id: 'technical' as InterviewStyle,
      title: 'Technical Round',
      subtitle: 'DSA & System Architecture',
      color: '#1a73e8',
      icon: Code2,
      desc: 'Coding problem solving, algorithms, resume project internals, and scalability.',
    },
    {
      id: 'managerial' as InterviewStyle,
      title: 'Managerial Round',
      subtitle: 'Leadership & Trade-offs',
      color: '#34a853',
      icon: Users,
      desc: 'Project ownership, cross-functional alignment with PMs, and technical debt decisions.',
    },
    {
      id: 'hr' as InterviewStyle,
      title: 'Googliness & Culture',
      subtitle: 'Values & Behavioral STAR',
      color: '#fbbc04',
      icon: Briefcase,
      desc: 'Navigating ambiguity, team collaboration, motivation, and ethical situations.',
    },
    {
      id: 'gd' as InterviewStyle,
      title: 'Group Discussion (GD)',
      subtitle: '5-Minute Continuous Speech',
      color: '#ea4335',
      icon: Radio,
      desc: 'Trending contemporary topic. Continuous 5-min talk covering Intro, For, Against, and Conclusion.',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in font-google">
      <div className="google-card w-full max-w-2xl bg-theme-surface shadow-2xl overflow-hidden animate-scale-up border border-theme flex flex-col max-h-[92vh]">
        {/* Google Step Progress Header (Fixed Top) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-theme bg-theme-surface-alt/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-google-blue">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-theme-primary">Google Interview Setup</h3>
              <p className="text-xs text-theme-tertiary">
                Step {step} of 3: {step === 1 ? 'Resume Ingestion' : step === 2 ? 'Select Assessment Round' : 'Ready to Join Meet'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface-hover rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Pills (Fixed Subheader) */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-theme-surface-alt/40 border-b border-theme text-xs font-medium text-center shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-1.5 rounded-full transition-all cursor-pointer ${step === 1 ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue font-semibold shadow-2xs' : 'text-theme-tertiary hover:text-theme-secondary'}`}
          >
            1. Resume Ingestion
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-1.5 rounded-full transition-all cursor-pointer ${step === 2 ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue font-semibold shadow-2xs' : 'text-theme-tertiary hover:text-theme-secondary'}`}
          >
            2. Choose Round
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-1.5 rounded-full transition-all cursor-pointer ${step === 3 ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue font-semibold shadow-2xs' : 'text-theme-tertiary hover:text-theme-secondary'}`}
          >
            3. Join Meet Room
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-google-red text-xs rounded-xl flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Content Body with Custom Scrollbar */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: RESUME INGESTION */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1">
                <h4 className="text-base font-normal text-theme-primary">Ingest Resume Document</h4>
                <p className="text-xs text-theme-secondary">
                  Google AI reads your actual projects, skills, and work history to formulate authentic interview questions.
                </p>
              </div>

              {profile ? (
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-google-blue text-white flex items-center justify-center font-medium">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-theme-primary">Active Calibrated Profile</h5>
                      <p className="text-xs text-theme-secondary">
                        {profile.skills.length} skills • {profile.target_role} • {profile.experience_level}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="btn-google-primary text-xs py-2 px-4 cursor-pointer"
                  >
                    <span>Use Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}

              {/* Upload Dropzone */}
              <div className="relative">
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-theme rounded-2xl bg-theme-surface-alt/50 hover:bg-blue-50/30 hover:border-google-blue transition-all cursor-pointer text-center">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    disabled={isUploading || isParsing}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-theme flex items-center justify-center text-google-blue shadow-2xs mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-theme-primary">
                    {isUploading || isParsing ? 'Analyzing Resume with Google AI...' : 'Upload PDF or Plaintext Resume'}
                  </span>
                  <span className="text-[11px] text-theme-tertiary mt-1">
                    Drag and drop or select file from your computer
                  </span>
                </label>
              </div>

              {/* Toggle Plaintext Box */}
              <div>
                <button
                  onClick={() => setShowPaste(!showPaste)}
                  className="w-full py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary rounded-xl border border-theme flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showPaste ? 'Hide Text Box' : 'Or Paste Raw Resume Text'}</span>
                </button>

                {showPaste && (
                  <form onSubmit={handlePasteSubmit} className="mt-3 space-y-2.5">
                    <textarea
                      rows={5}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste resume content here..."
                      className="w-full p-3 bg-theme-surface border border-theme rounded-xl text-xs focus:outline-none focus:border-google-blue"
                    />
                    <button
                      type="submit"
                      disabled={isUploading || isParsing || !pasteText.trim()}
                      className="w-full btn-google-primary text-xs py-2 cursor-pointer"
                    >
                      {isParsing ? 'Analyzing...' : 'Ingest & Proceed'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE INTERVIEW TYPE */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h4 className="text-base font-normal text-theme-primary">Select Interview Round</h4>
                <p className="text-xs text-theme-secondary">
                  Choose the interview style you want to simulate today.
                </p>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rounds.map((r) => {
                  const isSelected = interviewStyle === r.id;
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setInterviewStyle(r.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/50 border-google-blue ring-1 ring-google-blue shadow-2xs'
                          : 'bg-theme-surface border-theme hover:border-theme-hover hover:bg-theme-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: isSelected ? r.color : 'rgba(128,128,128,0.12)',
                            color: isSelected ? '#ffffff' : r.color,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-google-blue stroke-[2.5]" />}
                      </div>

                      <div>
                        <h5 className="text-xs font-medium text-theme-primary">{r.title}</h5>
                        <p className="text-[11px] text-google-blue font-medium">{r.subtitle}</p>
                        <p className="text-[11px] text-theme-secondary mt-1 line-clamp-2">{r.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seniority & Duration Parameters */}
              {interviewStyle !== 'gd' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-theme">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-theme-tertiary">Seniority Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full p-2 bg-theme-surface border border-theme rounded-lg text-xs font-medium text-theme-primary focus:outline-none focus:border-google-blue"
                    >
                      <option value="Junior (L3 / 0-2 yrs)">Junior (L3 / 0-2 yrs)</option>
                      <option value="Mid-Level (L4 / 3-5 yrs)">Mid-Level (L4 / 3-5 yrs)</option>
                      <option value="Senior (L5 / 5+ yrs)">Senior (L5 / 5+ yrs)</option>
                      <option value="Staff / Lead (L6+)">Staff / Lead (L6+)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-theme-tertiary">Duration</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full p-2 bg-theme-surface border border-theme rounded-lg text-xs font-medium text-theme-primary focus:outline-none focus:border-google-blue"
                    >
                      <option value={10}>10 Minutes (Quick Screen)</option>
                      <option value={15}>15 Minutes (Standard Mock)</option>
                      <option value={30}>30 Minutes (Deep Dive Onsite)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: READY TO JOIN GOOGLE MEET */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in text-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-google-blue flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-lg font-normal text-theme-primary">Your Google Meet Room is Ready</h4>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  Interview Round: <span className="font-medium text-google-blue">{interviewStyle.toUpperCase()}</span> for{' '}
                  <span className="font-medium text-theme-primary">{targetRole}</span> ({experienceLevel}).
                </p>
                <p className="text-xs text-theme-tertiary">
                  {interviewStyle === 'gd'
                    ? '5 minutes of uninterrupted continuous speech. Microphone will remain active.'
                    : 'The Google AI Interviewer will open with an introduction and adapt to your spoken voice.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Fixed Bottom Navigation Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-theme bg-theme-surface-alt/90 flex items-center justify-between shrink-0">
          {step === 1 ? (
            <div></div>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3)}
              className="btn-google-outlined text-xs py-2 px-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {step === 1 && profile && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-google-primary text-xs py-2 px-5 cursor-pointer ml-auto"
            >
              <span>Choose Round</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-google-primary text-xs py-2 px-5 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleLaunchMeetRoom}
              disabled={isCreatingInterview}
              className="btn-google-primary text-sm py-2.5 px-7 cursor-pointer"
            >
              {isCreatingInterview ? (
                <span>Launching Google Meet Room...</span>
              ) : (
                <>
                  <span>Join Call Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
