import React, { useState, useEffect } from 'react';
import type { Interview, InterviewQuestion } from '../services/supabase';
import { db } from '../services/supabase';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Cpu,
  Target,
  Download
} from 'lucide-react';

interface EvaluationProps {
  interviewId: string;
  onBackToDashboard: () => void;
}

export const Evaluation: React.FC<EvaluationProps> = ({
  interviewId,
  onBackToDashboard,
}) => {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    loadEvaluationData();
  }, [interviewId]);

  const loadEvaluationData = async () => {
    try {
      const iv = await db.getInterview(interviewId);
      setInterview(iv);

      const qList = await db.getInterviewQuestions(interviewId);
      setQuestions(qList);

      if (qList.length > 0) {
        setExpandedQuestionId(qList[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  const downloadReport = () => {
    if (!interview) return;
    let transcriptText = `AI MOCK INTERVIEW EVALUATION REPORT\n`;
    transcriptText += `Role: ${interview.role} (${interview.experience_level})\n`;
    transcriptText += `Round: ${interview.interview_style || 'Technical'} Round\n`;
    transcriptText += `Overall Score: ${interview.overall_score || 0}/100\n`;
    transcriptText += `Hiring Status: ${interview.passed ? 'PASSED / SELECTED' : 'NEEDS PREPARATION'}\n`;
    transcriptText += `Date: ${new Date(interview.created_at).toLocaleString()}\n\n`;
    transcriptText += `==========================================\n`;
    transcriptText += `EXECUTIVE SUMMARY & HIRING COMMITTEE FEEDBACK:\n`;
    transcriptText += `${interview.general_feedback || 'No feedback recorded.'}\n\n`;
    transcriptText += `==========================================\n`;
    transcriptText += `DETAILED QUESTION-BY-QUESTION TRANSCRIPT:\n\n`;

    questions.forEach((q, idx) => {
      transcriptText += `Q${idx + 1} [Depth: ${q.depth_level || 'medium'}]: ${q.question_text}\n`;
      transcriptText += `Candidate Answer: ${q.user_answer || '(No answer provided)'}\n`;
      transcriptText += `Score: ${q.score || 0}/100\n`;
      transcriptText += `Strengths: ${q.strengths || 'N/A'}\n`;
      transcriptText += `Weaknesses: ${q.weaknesses || 'N/A'}\n`;
      transcriptText += `Model Benchmark Answer:\n${q.better_answer || 'N/A'}\n\n`;
      transcriptText += `------------------------------------------\n`;
    });

    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Evaluation_${interview.role.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!interview) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-theme-tertiary">Compiling Comprehensive Evaluation Report...</p>
      </div>
    );
  }

  const overallScore = interview.overall_score || 0;
  const isPassed = interview.passed ?? overallScore >= 70;

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
    if (score >= 60) return 'text-blue-500 border-blue-500 bg-blue-500/10';
    return 'text-rose-500 border-rose-500 bg-rose-500/10';
  };

  const depthBadges: Record<string, string> = {
    low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    high: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs font-semibold text-theme-tertiary hover:text-theme-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadReport}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Session Log</span>
          </button>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-primary-color">
              {interview.interview_style ? `${interview.interview_style} round` : 'Mock Round'}
            </span>
            <p className="text-xs text-theme-secondary font-medium">
              {interview.role} ({interview.experience_level})
            </p>
          </div>
        </div>
      </div>

      {/* HIRING DECISION HERO BANNER */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all ${
          isPassed
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/60 dark:bg-black/30 backdrop-blur-sm">
              {isPassed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-300">Hiring Decision: Passed (Selected)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700 dark:text-rose-300">Hiring Decision: Needs Preparation</span>
                </>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isPassed
                ? 'Candidate Meets or Exceeds Company Hiring Bar'
                : 'Further Preparation Recommended Before Formal Onsite'}
            </h2>
            <p className="text-xs sm:text-sm opacity-90 max-w-2xl">
              {isPassed
                ? 'Strong performance demonstrated across communication, core technical fundamentals, and problem-solving.'
                : 'Clear potential identified, but key gaps in depth, technical precision, or communication structure need refinement.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 h-28 rounded-2xl bg-white dark:bg-slate-900 border border-theme shadow-md flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-theme-primary">{overallScore}</span>
              <span className="text-[10px] uppercase font-bold text-theme-tertiary">Overall Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-ATTRIBUTE SCORE METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Technical / Knowledge Score */}
        <div className="card p-5 border border-theme space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-tertiary flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-500" /> Technical Knowledge
            </span>
            <span className="text-base font-black text-theme-primary">
              {interview.technical_score ?? Math.min(100, overallScore + 2)}/100
            </span>
          </div>
          <div className="w-full h-2 bg-theme-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${interview.technical_score ?? overallScore}%` }}
            />
          </div>
          <p className="text-[11px] text-theme-secondary">
            Evaluation of domain algorithms, tool mastery, and system reasoning.
          </p>
        </div>

        {/* Communication Score */}
        <div className="card p-5 border border-theme space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-tertiary flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-500" /> Communication Clarity
            </span>
            <span className="text-base font-black text-theme-primary">
              {interview.communication_score ?? overallScore}/100
            </span>
          </div>
          <div className="w-full h-2 bg-theme-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${interview.communication_score ?? overallScore}%` }}
            />
          </div>
          <p className="text-[11px] text-theme-secondary">
            Conciseness, articulation structure, confidence, and voice delivery.
          </p>
        </div>

        {/* Problem Solving / Culture Score */}
        <div className="card p-5 border border-theme space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-tertiary flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-500" /> Problem Solving Fit
            </span>
            <span className="text-base font-black text-theme-primary">
              {interview.problem_solving_score ?? Math.max(0, overallScore - 2)}/100
            </span>
          </div>
          <div className="w-full h-2 bg-theme-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${interview.problem_solving_score ?? overallScore}%` }}
            />
          </div>
          <p className="text-[11px] text-theme-secondary">
            Scenario handling, architectural trade-offs, and critical judgment.
          </p>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY & GENERAL FEEDBACK */}
      <div className="card p-6 border border-theme space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-theme-primary-color" />
          <h3 className="text-base font-bold text-theme-primary">
            Hiring Committee Detailed Summary & Insights
          </h3>
        </div>
        <div className="text-theme-secondary text-sm leading-relaxed whitespace-pre-wrap bg-theme-surface-alt/50 p-4 rounded-xl border border-theme font-sans">
          {interview.general_feedback || 'Evaluation feedback compiled.'}
        </div>
      </div>

      {/* QUESTION-BY-QUESTION BREAKDOWN ACCORDION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-theme-primary-color" />
            <h3 className="text-base font-bold text-theme-primary">
              Question-by-Question Spoken Breakdown ({questions.length} Questions)
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;
            return (
              <div
                key={q.id}
                className={`card overflow-hidden transition-all border border-theme ${
                  isExpanded ? 'shadow-md ring-1 ring-theme-primary/20' : ''
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-theme-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3 pr-4 flex-1">
                    <span className="text-xs font-bold px-2.5 py-1 bg-theme-surface-alt text-theme-secondary rounded-lg">
                      Q{idx + 1}
                    </span>
                    {q.depth_level && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          depthBadges[q.depth_level] || depthBadges.medium
                        }`}
                      >
                        {q.depth_level}
                      </span>
                    )}
                    <h4 className="font-semibold text-theme-primary text-sm line-clamp-1 flex-1">
                      {q.question_text}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${scoreColor(
                        q.score || 0
                      )}`}
                    >
                      {q.score ?? 0}/100
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-theme-tertiary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-theme-tertiary" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-theme bg-theme-surface-alt/40 space-y-5">
                    {/* Spoken Question & Candidate Spoken Answer */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-theme-tertiary">
                          Interviewer Prompt
                        </span>
                        <p className="text-theme-primary text-sm font-semibold mt-1">
                          {q.question_text}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-theme-tertiary">
                          Candidate Spoken Transcript
                        </span>
                        <p className="text-theme-secondary text-xs sm:text-sm mt-1 whitespace-pre-wrap italic bg-theme-surface p-3.5 rounded-xl border border-theme">
                          "{q.user_answer || '(No response provided)'}"
                        </p>
                      </div>
                    </div>

                    {/* Strengths and Weaknesses Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl space-y-1.5 border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                          <CheckCircle className="w-4 h-4" />
                          <span>Key Strengths</span>
                        </div>
                        <p className="text-theme-secondary text-xs leading-relaxed">
                          {q.strengths || 'Covered essential baseline context.'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl space-y-1.5 border border-amber-500/30 bg-amber-500/5">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Missing Gaps & Areas to Improve</span>
                        </div>
                        <p className="text-theme-secondary text-xs leading-relaxed">
                          {q.weaknesses || 'Elaborate with concrete architectural examples.'}
                        </p>
                      </div>
                    </div>

                    {/* Model Benchmark Answer */}
                    <div className="p-4 bg-theme-primary-light/50 border border-theme-primary/20 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-theme-primary-color font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Hiring Committee Model Benchmark Answer</span>
                      </div>
                      <p className="text-theme-secondary text-xs leading-relaxed whitespace-pre-wrap italic">
                        {q.better_answer ||
                          'Demonstrate structured thinking by providing the core concept, practical trade-offs, and an industry example.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-center gap-3 pt-4 border-t border-theme">
        <button
          onClick={onBackToDashboard}
          className="btn-primary text-xs flex items-center gap-2 py-2 px-4"
        >
          <Layers className="w-4 h-4" />
          <span>Return to Preparation Dashboard</span>
        </button>
      </div>
    </div>
  );
};
