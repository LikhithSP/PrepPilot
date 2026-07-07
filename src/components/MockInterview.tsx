import React, { useState, useEffect } from 'react';
import type { Interview, InterviewQuestion, Profile } from '../services/supabase';
import { db } from '../services/supabase';
import { geminiService } from '../services/gemini';
import {
  Mic,
  MicOff,
  Volume2,
  Loader,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface MockInterviewProps {
  interviewId: string;
  onBackToDashboard: () => void;
  onInterviewComplete: (interviewId: string) => void;
}

export const MockInterview: React.FC<MockInterviewProps> = ({
  interviewId,
  onBackToDashboard,
  onInterviewComplete,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    loadInterviewData();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setAnswer((prev) => prev + finalTranscript);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [interviewId]);

  const loadInterviewData = async () => {
    try {
      const activeProfile = await db.getProfile();
      setProfile(activeProfile);

      const iv = await db.getInterview(interviewId);
      setInterview(iv);

      const qList = await db.getInterviewQuestions(interviewId);
      setQuestions(qList);

      const firstUnanswered = qList.findIndex((q) => q.user_answer === null);
      if (firstUnanswered !== -1) {
        setCurrentIdx(firstUnanswered);
      } else if (qList.length > 0) {
        setCurrentIdx(qList.length - 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome/Edge or type your response.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleSpeakQuestion = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const questionText = questions[currentIdx]?.question_text;
    if (!questionText) return;

    const utterance = new SpeechSynthesisUtterance(questionText);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !interview || !profile) return;

    if (isListening && recognition) {
      recognition.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setIsSubmitting(true);
    const activeQuestion = questions[currentIdx];

    try {
      const evaluation = await geminiService.evaluateAnswer(
        activeQuestion.question_text,
        answer,
        interview.role
      );

      const updatedQuestion = await db.updateQuestionAnswer(
        activeQuestion.id,
        answer,
        {
          score: evaluation.score,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          better_answer: evaluation.betterAnswer,
        }
      );

      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx] = updatedQuestion;
      setQuestions(updatedQuestions);

      setAnswer('');

      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        const finalReport = await geminiService.generateFinalReport(
          updatedQuestions,
          interview.role,
          interview.experience_level
        );

        await db.updateInterview(interview.id, {
          status: 'completed',
          overall_score: finalReport.overallScore,
          general_feedback: finalReport.generalFeedback,
        });

        onInterviewComplete(interview.id);
      }
    } catch (e) {
      console.error(e);
      alert('Error evaluating answer: ' + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!interview || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <Loader className="w-8 h-8 text-theme-primary-color animate-spin mx-auto" />
        <p className="text-theme-tertiary">Loading interview details...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progressPercent = Math.round(((currentIdx) / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-theme">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-sm font-medium text-theme-tertiary hover:text-theme-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Interview</span>
        </button>

        <div className="text-right">
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-primary-color">
            {interview.role}
          </span>
          <p className="text-theme-secondary text-sm font-medium">
            Question {currentIdx + 1} of {questions.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-theme-surface-alt rounded-full overflow-hidden">
        <div
          className="h-full bg-theme-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main card */}
      <div className="space-y-6">
        {/* Question Panel */}
        <div className="card p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-theme-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-theme-primary-color" />
            </div>
            <div className="space-y-2 flex-grow">
              <span className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">
                Interviewer Question
              </span>
              <h2 className="text-xl font-semibold text-theme-primary leading-relaxed">
                {currentQuestion.question_text}
              </h2>
            </div>
            <button
              onClick={handleSpeakQuestion}
              className={`p-2.5 rounded-lg border transition-all flex-shrink-0 ${
                isSpeaking
                  ? 'bg-theme-primary border-theme-primary text-white'
                  : 'bg-theme-surface border-theme text-theme-tertiary hover:text-theme-primary hover:border-theme-hover'
              }`}
              title="Speak Question"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Answer Panel */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-theme-secondary">
              Your Response
            </span>
            {recognition && (
              <button
                onClick={toggleListening}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  isListening
                    ? 'bg-theme-danger border-theme-danger text-white'
                    : 'bg-theme-surface border-theme text-theme-secondary hover:bg-theme-surface-hover'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 animate-pulse" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Answer with Speech</span>
                  </>
                )}
              </button>
            )}
          </div>

          <textarea
            rows={8}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isSubmitting}
            placeholder="Type your structured answer here, or click 'Answer with Speech' to record..."
            className="input-field resize-none"
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-theme-tertiary">
              Tip: Use the STAR method (Situation, Task, Action, Result) for behavioral answers.
            </p>
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || !answer.trim()}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Evaluating answer...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
