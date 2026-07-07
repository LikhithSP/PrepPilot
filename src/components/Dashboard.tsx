import React, { useState, useEffect } from 'react';
import type { Profile, Interview } from '../services/supabase';
import { db } from '../services/supabase';
import { geminiService, getGeminiApiKey } from '../services/gemini';
import { parsePdf } from '../utils/pdfParser';
import {
  Upload,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  Check,
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

  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
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
        setTargetRole(activeProfile.target_role);
        setExperienceLevel(activeProfile.experience_level);
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

    const unsupportedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'image/bmp', 'image/tiff'
    ];
    if (unsupportedTypes.includes(file.type)) {
      setUploadError(
        'Image files are not supported. Please upload a PDF or text-based resume file (PDF, TXT, MD).'
      );
      return;
    }

    if (!getGeminiApiKey()) {
      setUploadError('Please configure your Gemini API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await parsePdf(file);
      } else if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md')) {
        text = await file.text();
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

    if (!getGeminiApiKey()) {
      setUploadError('Please configure your Gemini API Key in settings first.');
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
      const parsed = await geminiService.parseResume(text);
      const savedProfile = await db.saveProfile({
        name: 'Developer Profile',
        resume_text: text,
        skills: parsed.skills,
        target_role: parsed.targetRole,
        experience_level: parsed.experienceLevel,
        focus_areas: parsed.focusAreas,
      });
      setProfile(savedProfile);
      setTargetRole(savedProfile.target_role);
      setExperienceLevel(savedProfile.experience_level);
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartInterview = async () => {
    if (!profile) return;

    if (!getGeminiApiKey()) {
      setUploadError('Please configure your Gemini API Key in settings first.');
      onOpenSettings();
      return;
    }

    setIsCreatingInterview(true);
    try {
      const interview = await db.createInterview({
        profile_id: profile.id,
        role: targetRole,
        experience_level: experienceLevel,
      });

      const questionsText = await geminiService.generateQuestions(
        profile,
        targetRole,
        experienceLevel,
        questionCount
      );

      const questionsToSave = questionsText.map((q) => ({
        interview_id: interview.id,
        question_text: q,
        user_answer: null,
        score: null,
        strengths: null,
        weaknesses: null,
        better_answer: null,
      }));

      await db.addInterviewQuestions(questionsToSave);
      onStartInterview(interview.id);
    } catch (err: any) {
      setUploadError(err.message || 'Error preparing interview.');
    } finally {
      setIsCreatingInterview(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Error Banner */}
      {uploadError && (
        <div className="flex items-center justify-between p-4 bg-theme-danger border-theme-danger text-theme-danger rounded-xl animate-slide-up">
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

      {/* Hero / Header */}
      <div className="text-center space-y-2 py-6">
        <h1 className="page-title">AI Interview Preparation</h1>
        <p className="page-subtitle max-w-2xl mx-auto">
          Upload your resume, generate tailored questions, and practice with AI-powered mock interviews.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column - Resume Parsing / Profile */}
        <div className="lg:col-span-7 space-y-6">
          {!profile && !isUploading && !isParsing ? (
            <div className="card p-8">
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="w-14 h-14 bg-theme-primary-light rounded-xl flex items-center justify-center">
                  <Upload className="w-7 h-7 text-theme-primary-color" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-theme-primary">Upload Your Resume</h3>
                  <p className="text-sm text-theme-secondary max-w-md mx-auto leading-relaxed">
                    Upload your CV to extract skills, evaluate experience, and receive customized interview questions.
                  </p>
                </div>

                {!showPasteArea ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg">
                    <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white font-medium rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md">
                      <FileText className="w-4 h-4" />
                      <span>Select PDF or Text File</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setShowPasteArea(true)}
                      className="w-full sm:w-auto px-5 py-2.5 border border-theme text-theme-secondary rounded-lg hover:bg-theme-surface-hover transition-colors font-medium text-sm"
                    >
                      Paste Text Instead
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTextSubmit} className="space-y-4 text-left w-full">
                    <textarea
                      rows={8}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste the full text of your resume here..."
                      className="input-field resize-none"
                    />
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPasteArea(false)}
                        className="px-4 py-2 text-theme-tertiary hover:text-theme-primary transition-colors text-sm font-medium"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!pasteText.trim()}
                        className="btn-primary"
                      >
                        Process Resume
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : isUploading || isParsing ? (
            <div className="card p-12 text-center space-y-5">
              <div className="w-14 h-14 mx-auto bg-theme-primary-light rounded-xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-theme-primary-color animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-theme-primary">
                  {isUploading ? 'Uploading file...' : 'Analyzing resume skills...'}
                </h3>
                <p className="text-sm text-theme-secondary max-w-sm mx-auto leading-relaxed">
                  Gemini AI is parsing and processing your skills profile. This will take a few seconds.
                </p>
              </div>
            </div>
          ) : (
            <div className="card p-6 space-y-6 relative">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setProfile(null)}
                  className="flex items-center gap-1.5 text-xs font-medium text-theme-primary-color hover:text-theme-primary-hover transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Profile</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-theme-primary-light rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-theme-primary-color" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-primary-color">
                    Candidate Profile
                  </span>
                  <h3 className="text-xl font-bold text-theme-primary mt-0.5">
                    {profile?.target_role}
                  </h3>
                  <span className="inline-block mt-1.5 px-2.5 py-0.5 text-xs font-semibold text-theme-primary-color bg-theme-primary-light border-theme rounded-full">
                    {profile?.experience_level}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="section-title">Identified Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {profile?.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 text-xs font-medium text-theme-secondary bg-theme-surface-alt border-theme rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="section-title">Recommended Focus Areas</h4>
                <ul className="space-y-2">
                  {profile?.focus_areas.map((area, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-theme-secondary">
                      <Check className="w-4 h-4 text-theme-success mt-0.5 flex-shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Past Interviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-theme-primary">Past Mock Interviews</h3>
            {interviews.length === 0 ? (
              <div className="text-sm text-theme-tertiary italic p-6 bg-theme-surface-alt border-theme border-dashed rounded-xl text-center">
                No past mock interviews found. Start your first session!
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="card card-hover p-4 flex items-center justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-theme-primary">{iv.role}</h4>
                        <span className="px-2 py-0.5 text-xs font-semibold text-theme-secondary bg-theme-surface-alt border-theme rounded-full">
                          {iv.experience_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-theme-tertiary">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-theme-tertiary" />
                          {new Date(iv.created_at).toLocaleDateString()}
                        </span>
                        {iv.overall_score !== null && (
                          <span className="flex items-center gap-1 font-semibold text-theme-primary-color">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Score: {iv.overall_score}/100
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {iv.status === 'in_progress' ? (
                        <button
                          onClick={() => onStartInterview(iv.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <span>Resume</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onViewEvaluation(iv.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 border border-theme text-theme-primary-color hover:bg-theme-primary-light text-sm font-semibold rounded-lg transition-all"
                        >
                          <span>Evaluation</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Setup Mock Interview */}
        <div className="lg:col-span-5">
          <div className={`card p-6 space-y-6 ${!profile ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-theme-primary-light rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-theme-primary-color" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary">Setup Mock Interview</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-secondary">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Senior React Developer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-secondary">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="input-field"
                >
                  <option value="Junior">Junior (0-2 years)</option>
                  <option value="Mid-Level">Mid-Level (2-5 years)</option>
                  <option value="Senior">Senior (5-8 years)</option>
                  <option value="Lead">Lead (8+ years)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-secondary">
                  Questions Count
                </label>
                <div className="flex gap-2">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg border transition-all ${
                        questionCount === num
                          ? 'bg-theme-primary border-theme-primary text-white shadow-sm'
                          : 'bg-theme-surface border-theme text-theme-secondary hover:border-theme-hover hover:bg-theme-surface-hover'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={!profile || isCreatingInterview}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200"
            >
              {isCreatingInterview ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Generating Custom Interview...</span>
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5" />
                  <span>Start Mock Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
