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
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-theme-tertiary">Loading evaluation report...</p>
      </div>
    );
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-theme-success border-theme-success bg-theme-success';
    if (score >= 60) return 'text-theme-warning border-theme-warning bg-theme-warning';
    return 'text-theme-danger border-theme-danger bg-theme-danger';
  };

  const scoreText = (score: number) => {
    if (score >= 80) return 'Ready to Apply';
    if (score >= 60) return 'Almost Ready';
    return 'Need Preparation';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-4 border-theme">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-sm font-medium text-theme-tertiary hover:text-theme-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="text-right">
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-primary-color">
            Evaluation Report
          </span>
          <p className="text-theme-secondary text-sm font-medium">
            {interview.role} ({interview.experience_level})
          </p>
        </div>
      </div>

      {/* Overview Block */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Overall Score Circle */}
        <div className="md:col-span-4 card p-6 flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">
            Overall Score
          </span>
          <div className="relative flex items-center justify-center">
            <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${scoreColor(interview.overall_score || 0)}`}>
              <span className="text-4xl font-black text-theme-primary">
                {interview.overall_score || 0}
              </span>
              <span className="text-[10px] text-theme-tertiary font-semibold uppercase tracking-wider">
                out of 100
              </span>
            </div>
            <div className="absolute inset-0 w-32 h-32 rounded-full border border-theme-primary-light animate-pulse" />
          </div>
          <div>
            <h4 className="font-semibold text-theme-primary text-lg">
              {scoreText(interview.overall_score || 0)}
            </h4>
          </div>
        </div>

        {/* General Feedback / Recommendations */}
        <div className="md:col-span-8 card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-theme-primary-color" />
            <h3 className="text-lg font-semibold text-theme-primary">Interviewer Summary</h3>
          </div>
          <div className="text-theme-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {interview.general_feedback}
          </div>
        </div>
      </div>

      {/* Answer Breakdown Accordion */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-theme-primary-color" />
          <h3 className="text-lg font-semibold text-theme-primary">Question-by-Question Breakdown</h3>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;
            return (
              <div
                key={q.id}
                className={`card overflow-hidden transition-all ${
                  isExpanded ? 'border-theme shadow-sm' : 'border-theme'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-theme-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-theme-surface-alt text-theme-secondary rounded-md">
                      Q{idx + 1}
                    </span>
                    <h4 className="font-semibold text-theme-primary text-sm line-clamp-1">
                      {q.question_text}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                      q.score !== null && scoreColor(q.score)
                    }`}>
                      {q.score || 0}/100
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-theme-tertiary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-theme-tertiary" />
                    )}
                  </div>
                </button>

                {/* Content */}
                {isExpanded && (
                  <div className="p-5 border-t border-theme bg-theme-surface-alt/50 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">
                          Full Question
                        </span>
                        <p className="text-theme-primary text-sm font-medium mt-1">
                          {q.question_text}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">
                          Your Answer
                        </span>
                        <p className="text-theme-secondary text-sm mt-1 whitespace-pre-wrap italic bg-theme-surface p-3 rounded-lg border-theme">
                          {q.user_answer || '(No answer provided)'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-xl space-y-2 border ${scoreColor(q.strengths ? 80 : 0)}`}>
                        <div className="flex items-center gap-1.5 text-theme-success font-bold text-xs uppercase tracking-wider">
                          <CheckCircle className="w-4 h-4" />
                          <span>Strengths</span>
                        </div>
                        <p className="text-theme-secondary text-xs leading-relaxed">
                          {q.strengths || 'N/A'}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl space-y-2 border ${scoreColor(q.weaknesses ? 50 : 0)}`}>
                        <div className="flex items-center gap-1.5 text-theme-warning font-bold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Gaps / Weaknesses</span>
                        </div>
                        <p className="text-theme-secondary text-xs leading-relaxed">
                          {q.weaknesses || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-theme-primary-light border-theme rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-theme-primary-color font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Recommended Model Answer</span>
                      </div>
                      <p className="text-theme-secondary text-xs leading-relaxed whitespace-pre-wrap italic">
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
      <div className="flex items-center justify-center gap-4 pt-6 border-theme">
        <button
          onClick={onBackToDashboard}
          className="btn-secondary"
        >
          <Layers className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>
      </div>
    </div>
  );
};
