import React, { useState, useEffect } from 'react';
import type { Interview, InterviewQuestion } from '../services/supabase';
import { db } from '../services/supabase';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  XCircle,
  Download,
  FileCheck2,
  BarChart3,
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
    let transcriptText = `GOOGLE INTERVIEW ASSESSMENT DOSSIER\n`;
    transcriptText += `Role: ${interview.role} (${interview.experience_level})\n`;
    transcriptText += `Round: ${interview.interview_style || 'Technical'} Round\n`;
    transcriptText += `Overall Score: ${interview.overall_score || 0}%\n`;
    transcriptText += `Hiring Recommendation: ${interview.passed ? 'HIRE / PROCEED' : 'NO HIRE / PREPARE'}\n`;
    transcriptText += `Date: ${new Date(interview.created_at).toLocaleString()}\n\n`;
    transcriptText += `==========================================\n`;
    transcriptText += `GOOGLE HIRING COMMITTEE SUMMARY:\n`;
    transcriptText += `${interview.general_feedback || 'No feedback recorded.'}\n\n`;
    transcriptText += `==========================================\n`;
    transcriptText += `TRANSCRIPT & ANSWER EVALUATION:\n\n`;

    questions.forEach((q, idx) => {
      transcriptText += `Q${idx + 1} [Depth: ${q.depth_level || 'medium'}]: ${q.question_text}\n`;
      transcriptText += `Candidate Answer: ${q.user_answer || '(No answer provided)'}\n`;
      transcriptText += `Score: ${q.score || 0}/100\n`;
      transcriptText += `Strengths: ${q.strengths || 'N/A'}\n`;
      transcriptText += `Weaknesses: ${q.weaknesses || 'N/A'}\n`;
      transcriptText += `Google Benchmark Answer:\n${q.better_answer || 'N/A'}\n\n`;
      transcriptText += `------------------------------------------\n`;
    });

    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Google_Interview_Dossier_${interview.role.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!interview) {
    return (
      <div className="max-w-2xl mx-auto py-32 text-center space-y-4 font-google">
        <div className="w-8 h-8 border-3 border-google-blue border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium text-theme-tertiary">
          Generating Google Hiring Committee Dossier...
        </p>
      </div>
    );
  }

  const overallScore = interview.overall_score || 0;
  const isPassed = interview.passed ?? overallScore >= 70;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-google">
      {/* Top Google Workspace Document Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Google Interview Workspace</span>
          </button>
          <div className="h-4 w-px bg-theme-border" />
          <span className="text-xs text-theme-tertiary">
            Document ID: #{interviewId.slice(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadReport}
            className="btn-google-tonal text-xs flex items-center gap-1.5 py-2 px-4"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to Google Docs / TXT</span>
          </button>
        </div>
      </div>

      {/* HIRING DECISION HERO (GOOGLE WORKSPACE CARD) */}
      <div className="google-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium">
              {isPassed ? (
                <span className="google-chip bg-green-50 dark:bg-green-950/60 text-google-green border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Google Hiring Committee Decision: Pass (Recommend Hire)</span>
                </span>
              ) : (
                <span className="google-chip bg-red-50 dark:bg-red-950/60 text-google-red border border-red-200 dark:border-red-800">
                  <XCircle className="w-4 h-4" />
                  <span>Google Hiring Committee Decision: Needs Preparation</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-normal text-theme-primary tracking-tight">
              {isPassed
                ? 'Candidate Meets or Exceeds Google Hiring Bar'
                : 'Further Preparation Recommended Before Onsite'}
            </h2>
            <p className="text-xs sm:text-sm text-theme-secondary max-w-2xl leading-relaxed">
              {isPassed
                ? 'Strong analytical clarity demonstrated across problem formulation, data structures, trade-offs, and Googliness.'
                : 'Demonstrated solid fundamentals; refinement needed in time pacing, structural articulation, and edge case coverage.'}
            </p>
          </div>

          {/* Google Score Circle */}
          <div className="p-6 rounded-2xl bg-theme-surface-alt border border-theme text-center min-w-[140px]">
            <span className="text-xs text-theme-tertiary block font-medium">
              Overall Rating
            </span>
            <span className="text-4xl font-normal text-theme-primary font-google">
              {overallScore}%
            </span>
            <span className="text-[11px] font-medium text-google-blue block mt-1">
              {overallScore >= 80 ? 'Exceptional' : overallScore >= 70 ? 'Proficient' : 'Developing'}
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC 4-CRITERIA GOOGLE SCORECARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-google-blue" />
            <h3 className="text-sm font-medium text-theme-primary">
              {interview.interview_style === 'gd'
                ? 'Group Discussion 5-Minute Criteria Breakdown'
                : interview.interview_style === 'managerial'
                ? 'Leadership & Architectural Trade-offs Breakdown'
                : interview.interview_style === 'hr'
                ? 'Googliness & Cultural Fit Breakdown'
                : 'Google Technical Competencies Breakdown'}
            </h3>
          </div>
          <span className="text-xs font-mono text-theme-tertiary">
            Round: {interview.interview_style?.toUpperCase() || 'TECHNICAL'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {interview.round_criteria && interview.round_criteria.length > 0 ? (
            interview.round_criteria.map((crit, idx) => (
              <div
                key={idx}
                className="google-card p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase text-theme-tertiary block">
                    Criteria #{idx + 1}
                  </span>
                  <h4 className="text-xs font-medium text-theme-primary line-clamp-2">
                    {crit.name}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between font-google">
                    <span className="text-2xl font-normal text-theme-primary">
                      {crit.score}%
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        crit.score >= 80
                          ? 'text-google-green'
                          : crit.score >= 65
                          ? 'text-google-blue'
                          : 'text-google-yellow'
                      }`}
                    >
                      {crit.score >= 80 ? 'Mastery' : crit.score >= 65 ? 'Adequate' : 'Needs Focus'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-theme-surface-alt rounded-full overflow-hidden">
                    <div
                      className="h-full bg-google-blue transition-all duration-300"
                      style={{ width: `${crit.score}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-theme-secondary leading-relaxed pt-2 border-t border-theme">
                  {crit.description}
                </p>
              </div>
            ))
          ) : (
            <>
              <div className="google-card p-4 text-center">
                <span className="text-xs text-theme-tertiary">Technical Rigor</span>
                <p className="text-2xl font-normal text-theme-primary mt-1">
                  {interview.technical_score ?? overallScore}%
                </p>
              </div>
              <div className="google-card p-4 text-center">
                <span className="text-xs text-theme-tertiary">Communication</span>
                <p className="text-2xl font-normal text-theme-primary mt-1">
                  {interview.communication_score ?? overallScore}%
                </p>
              </div>
              <div className="google-card p-4 text-center">
                <span className="text-xs text-theme-tertiary">Problem Solving</span>
                <p className="text-2xl font-normal text-theme-primary mt-1">
                  {interview.problem_solving_score ?? overallScore}%
                </p>
              </div>
              <div className="google-card p-4 text-center">
                <span className="text-xs text-theme-tertiary">Delivery</span>
                <p className="text-2xl font-normal text-theme-primary mt-1">
                  {overallScore}%
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* GOOGLE HIRING COMMITTEE SUMMARY FEEDBACK */}
      <div className="google-card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-theme">
          <Sparkles className="w-4 h-4 text-google-blue" />
          <h3 className="text-sm font-medium text-theme-primary">
            Google Hiring Committee Feedback Memo
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-theme-secondary leading-relaxed whitespace-pre-line space-y-2">
          {interview.general_feedback || 'No written feedback recorded.'}
        </div>
      </div>

      {/* TRANSCRIPT & BENCHMARK QUESTION BREAKDOWN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-google-blue" />
            <h3 className="text-sm font-medium text-theme-primary">
              Interview Questions & Candidate Answers
            </h3>
          </div>
          <span className="text-xs text-theme-tertiary font-mono">
            {questions.length} Questions Evaluated
          </span>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;
            return (
              <div
                key={q.id}
                className="google-card overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-theme-surface-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 text-google-blue flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-medium text-theme-primary">
                        {q.question_text}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-theme-surface-alt text-theme-tertiary">
                          {q.depth_level || 'Medium'} Depth
                        </span>
                        <span className="text-xs font-medium text-google-blue">
                          Score: {q.score ?? 75}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-5 border-t border-theme bg-theme-surface-alt/40 space-y-4 text-xs animate-slide-up">
                    {/* Candidate Answer */}
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-theme-tertiary">
                        Candidate Answer
                      </span>
                      <p className="p-3.5 rounded-xl bg-theme-surface border border-theme text-theme-primary leading-relaxed whitespace-pre-wrap">
                        {q.user_answer || '(No recorded speech input)'}
                      </p>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {q.strengths && (
                        <div className="p-3.5 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 space-y-1">
                          <span className="text-xs font-medium text-google-green">
                            Demonstrated Strengths
                          </span>
                          <p className="text-theme-secondary leading-relaxed">
                            {q.strengths}
                          </p>
                        </div>
                      )}
                      {q.weaknesses && (
                        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                          <span className="text-xs font-medium text-google-yellow">
                            Areas for Improvement
                          </span>
                          <p className="text-theme-secondary leading-relaxed">
                            {q.weaknesses}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Model Answer */}
                    {q.better_answer && (
                      <div className="space-y-1 pt-1">
                        <span className="text-xs font-medium text-google-blue flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Google Benchmark Answer
                        </span>
                        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-theme-primary leading-relaxed whitespace-pre-wrap">
                          {q.better_answer}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
