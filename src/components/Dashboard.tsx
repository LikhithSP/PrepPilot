import React, { useState, useEffect } from 'react';
import type { Profile, Interview } from '../services/supabase';
import { db } from '../services/supabase';
import { geminiService, getGeminiApiKey } from '../services/gemini';
import { parsePdf } from '../utils/pdfParser';
import {
  Upload,
  Settings,
  Brain,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
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

  // Setup options
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

      // Generate Questions
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
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Brain className="w-8 h-8 text-indigo-400" />
            <span className="text-gradient">Antigravity Prep</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-powered Mock Interviews and Resume Skill Evaluation
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Config</span>
        </button>
      </div>

      {uploadError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-sm underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column - Resume Parsing / Profile */}
        <div className="lg:col-span-7 space-y-8">
          {!profile && !isUploading && !isParsing ? (
            // Empty State / Uploader
            <div className="glass rounded-2xl p-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-50">Upload Your Resume</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
                  Upload your CV to extract your skills, evaluate experience, and start receiving customized interview questions.
                </p>
              </div>

              {!showPasteArea ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg cursor-pointer transition-all">
                    <FileText className="w-4 h-4" />
                    <span>Select PDF/Text File</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowPasteArea(true)}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Paste Text Instead
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTextSubmit} className="space-y-4 text-left">
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste the full text of your resume here..."
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPasteArea(false)}
                      className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!pasteText.trim()}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
                    >
                      Process Resume
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : isUploading || isParsing ? (
            // Loading State
            <div className="glass rounded-2xl p-12 text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-50">
                  {isUploading ? 'Uploading file...' : 'Analyzing resume skills...'}
                </h3>
                <p className="text-slate-400 text-sm mt-2">
                  Gemini AI is parsing and processing your skills profile. This will take a few seconds.
                </p>
              </div>
            </div>
          ) : (
            // Profile Overview Page
            <div className="glass rounded-2xl p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => setProfile(null)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Profile</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Candidate Profile
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-50 mt-0.5">
                    {profile?.target_role}
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    {profile?.experience_level}
                  </span>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">Identified Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {profile?.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700/60 rounded-lg hover:border-slate-600 transition-all"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Focus Areas */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">Recommended Focus Areas</h4>
                <ul className="space-y-1.5">
                  {profile?.focus_areas.map((area, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-slate-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 flex-shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Past Interviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-200">Past Mock Interviews</h3>
            {interviews.length === 0 ? (
              <div className="text-slate-500 text-sm italic p-4 glass rounded-xl text-center">
                No past mock interviews found. Start your first session!
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="glass glass-hover p-4 rounded-xl flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-100">{iv.role}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-full">
                          {iv.experience_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {new Date(iv.created_at).toLocaleDateString()}
                        </span>
                        {iv.overall_score !== null && (
                          <span className="flex items-center gap-1 font-semibold text-indigo-300">
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
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-md"
                        >
                          <span>Resume</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onViewEvaluation(iv.id)}
                          className="flex items-center gap-1 px-3 py-1.5 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600/20 text-xs font-semibold rounded-lg transition-all"
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
          <div className={`glass rounded-2xl p-6 space-y-6 ${!profile ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-50">Setup Mock Interview</h3>
            </div>

            <div className="space-y-4">
              {/* Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="e.g., Senior React Developer"
                />
              </div>

              {/* Experience Level */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Junior">Junior (0-2 years)</option>
                  <option value="Mid-Level">Mid-Level (2-5 years)</option>
                  <option value="Senior">Senior (5-8 years)</option>
                  <option value="Lead">Lead (8+ years)</option>
                </select>
              </div>

              {/* Question Count */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Questions Count
                </label>
                <div className="flex gap-2">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`flex-1 py-1.5 text-center text-sm font-semibold rounded-lg border transition-all ${
                        questionCount === num
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200"
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
