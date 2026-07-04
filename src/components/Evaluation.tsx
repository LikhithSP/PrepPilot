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

      // Expand the first question by default
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

  if (!interview) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400">Loading evaluation report...</p>
      </div>
    );
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/5';
  };

  const scoreText = (score: number) => {
    if (score >= 80) return 'Ready to Apply';
    if (score >= 60) return 'Almost Ready';
    return 'Need Preparation';
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="text-right">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Evaluation Report
          </span>
          <p className="text-slate-300 text-sm font-medium">
            {interview.role} ({interview.experience_level})
          </p>
        </div>
      </div>

      {/* Overview Block */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Overall Score Circle */}
        <div className="md:col-span-4 glass rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Overall Score
          </span>
          <div className="relative flex items-center justify-center">
            {/* Inner Ring */}
            <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${scoreColor(interview.overall_score || 0)}`}>
              <span className="text-4xl font-black text-white">
                {interview.overall_score || 0}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                out of 100
              </span>
            </div>
            <div className="absolute inset-0 w-32 h-32 rounded-full border border-indigo-500/10 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200 text-lg">
              {scoreText(interview.overall_score || 0)}
            </h4>
          </div>
        </div>

        {/* General Feedback / Recommendations */}
        <div className="md:col-span-8 glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-100">Interviewer Summary</h3>
          </div>
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {interview.general_feedback}
          </div>
        </div>
      </div>

      {/* Answer Breakdown Accordion */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-slate-100">Question-by-Question Breakdown</h3>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;
            return (
              <div
                key={q.id}
                className={`glass rounded-xl overflow-hidden border transition-all ${
                  isExpanded ? 'border-indigo-500/30' : 'border-slate-800'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-400 rounded-md">
                      Q{idx + 1}
                    </span>
                    <h4 className="font-bold text-slate-200 text-sm line-clamp-1">
                      {q.question_text}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      q.score !== null && scoreColor(q.score)
                    }`}>
                      {q.score || 0}/100
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Content */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800 bg-slate-900/20 space-y-6">
                    {/* Full Question & Answer */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Full Question
                        </span>
                        <p className="text-slate-100 text-sm font-medium mt-1">
                          {q.question_text}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Your Answer
                        </span>
                        <p className="text-slate-300 text-sm mt-1 whitespace-pre-wrap italic bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                          {q.user_answer || '(No answer provided)'}
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Feedback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                          <CheckCircle className="w-4 h-4" />
                          <span>Strengths</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {q.strengths || 'N/A'}
                        </p>
                      </div>

                      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Gaps / Weaknesses</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {q.weaknesses || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Model Answer */}
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Recommended Model Answer</span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap italic">
                        {q.better_answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Actions */}
      <div className="flex items-center justify-center gap-4 pt-6 border-t border-slate-800">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-6 py-3 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-md"
        >
          <Layers className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>
      </div>
    </div>
  );
};
