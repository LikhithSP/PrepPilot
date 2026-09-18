import React, { useState, useEffect, useRef } from 'react';
import type { Interview, InterviewQuestion, Profile } from '../services/supabase';
import { db } from '../services/supabase';
import { groqService, getGroqApiKey } from '../services/groq';
import { geminiService } from '../services/gemini';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Clock,
  User,
  Bot,
  CheckCircle2,
  Square,
  Edit3
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

  // Candidate Answer & Real-time Live STT Captions
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [manualEditMode, setManualEditMode] = useState(false);

  // AI Interviewer Voice & Captions
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiSpokenCaption, setAiSpokenCaption] = useState('');

  // Session State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    loadInterviewData();

    // Setup Web Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setSpokenTranscript((prev) => (prev ? prev + ' ' + final.trim() : final.trim()));
        }
        setInterimText(interim);
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition status:', e?.error);
        if (e.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      rec.onend = () => {
        // If user didn't explicitly toggle off, we can reflect state
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [interviewId]);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleEndInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeftSeconds]);

  const loadInterviewData = async () => {
    try {
      const activeProfile = await db.getProfile();
      setProfile(activeProfile);

      const iv = await db.getInterview(interviewId);
      setInterview(iv);

      if (iv?.duration_minutes) {
        setTimeLeftSeconds(iv.duration_minutes * 60);
      }
      setTimerActive(true);

      const qList = await db.getInterviewQuestions(interviewId);
      setQuestions(qList);

      const firstUnanswered = qList.findIndex((q) => q.user_answer === null);
      const activeIndex = firstUnanswered !== -1 ? firstUnanswered : 0;
      setCurrentIdx(activeIndex);

      if (qList[activeIndex]) {
        // Speak initial question automatically
        setTimeout(() => {
          speakText(qList[activeIndex].question_text);
        }, 500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setAiSpokenCaption(text);
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
      // Auto-start listening after question is asked if desired
      startListening();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      // Already running or permission
      console.warn('Speech rec error:', err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome/Edge or type your answers.');
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextOrSubmitAnswer = async () => {
    const currentAnswer = (spokenTranscript + ' ' + interimText).trim();
    if (!currentAnswer && !confirm('Submit question without candidate answer?')) {
      return;
    }

    stopListening();
    stopSpeaking();
    setIsSubmitting(true);

    const activeQuestion = questions[currentIdx];

    try {
      // 1. Evaluate this specific response
      let evalResult: { score: number; strengths: string; weaknesses: string; betterAnswer: string };

      if (getGroqApiKey()) {
        evalResult = await groqService.evaluateAnswer(
          activeQuestion.question_text,
          currentAnswer,
          interview?.role || 'Software Engineer',
          interview?.interview_style || 'technical',
          activeQuestion.depth_level || 'medium'
        );
      } else {
        const gemResult = await geminiService.evaluateAnswer(
          activeQuestion.question_text,
          currentAnswer,
          interview?.role || 'Software Engineer'
        );
        evalResult = {
          score: gemResult.score,
          strengths: gemResult.strengths,
          weaknesses: gemResult.weaknesses,
          betterAnswer: gemResult.betterAnswer,
        };
      }

      // 2. Persist answer to database
      const updatedQuestion = await db.updateQuestionAnswer(activeQuestion.id, currentAnswer, {
        score: evalResult.score,
        strengths: evalResult.strengths,
        weaknesses: evalResult.weaknesses,
        better_answer: evalResult.betterAnswer,
      });

      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx] = updatedQuestion;
      setQuestions(updatedQuestions);

      // 3. Conversational interviewer reaction
      if (currentIdx + 1 < questions.length) {
        const nextQ = questions[currentIdx + 1];
        let reaction = "Thank you for sharing that answer. Let's move on to the next question.";
        if (getGroqApiKey()) {
          try {
            reaction = await groqService.generateInterviewerReaction(
              activeQuestion.question_text,
              currentAnswer,
              nextQ.question_text
            );
          } catch {
            // fallback
          }
        }

        // Transition to next question
        setCurrentIdx(currentIdx + 1);
        setSpokenTranscript('');
        setInterimText('');

        // Speak reaction + next question seamlessly
        const fullSpokenTurn = `${reaction} ... ${nextQ.question_text}`;
        speakText(fullSpokenTurn);
      } else {
        // All questions finished! Complete interview
        await handleEndInterview(updatedQuestions);
      }
    } catch (e: any) {
      console.error(e);
      alert('Error recording response: ' + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndInterview = async (currentQList?: InterviewQuestion[]) => {
    stopListening();
    stopSpeaking();
    setIsSubmitting(true);

    const questionsToEvaluate = currentQList || questions;

    try {
      let finalReport: {
        overallScore: number;
        technicalScore?: number;
        communicationScore?: number;
        problemSolvingScore?: number;
        passed?: boolean;
        generalFeedback: string;
      };

      if (getGroqApiKey()) {
        finalReport = await groqService.generateFinalReport(
          questionsToEvaluate,
          interview?.role || 'Software Engineer',
          interview?.experience_level || 'Mid-Level',
          interview?.interview_style || 'technical'
        );
      } else {
        const geminiRep = await geminiService.generateFinalReport(
          questionsToEvaluate,
          interview?.role || 'Software Engineer',
          interview?.experience_level || 'Mid-Level'
        );
        finalReport = {
          overallScore: geminiRep.overallScore,
          technicalScore: geminiRep.overallScore,
          communicationScore: geminiRep.overallScore,
          problemSolvingScore: geminiRep.overallScore,
          passed: geminiRep.overallScore >= 70,
          generalFeedback: geminiRep.generalFeedback,
        };
      }

      await db.updateInterview(interviewId, {
        status: 'completed',
        overall_score: finalReport.overallScore,
        technical_score: finalReport.technicalScore,
        communication_score: finalReport.communicationScore,
        problem_solving_score: finalReport.problemSolvingScore,
        passed: finalReport.passed,
        general_feedback: finalReport.generalFeedback,
      });

      onInterviewComplete(interviewId);
    } catch (e: any) {
      console.error('Error generating final interview report:', e);
      alert('Error finalizing interview report: ' + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!interview || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <Loader className="w-8 h-8 text-theme-primary-color animate-spin mx-auto" />
        <p className="text-theme-tertiary">Initiating AI Voice Mock Session...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const depthColors: Record<string, string> = {
    low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    high: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  };

  const isLowTime = timeLeftSeconds < 120;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-fade-in">
      {/* Top Session Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-semibold text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-theme-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-theme-primary">{interview.role}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-theme-primary-light text-theme-primary-color border border-theme-primary/20">
              {interview.interview_style || 'Technical'} Round
            </span>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold transition-all ${
              isLowTime
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse'
                : 'bg-theme-surface-alt border-theme text-theme-primary'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => handleEndInterview()}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Progress & Depth Bar */}
      <div className="flex items-center justify-between text-xs text-theme-tertiary px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-theme-secondary">
            Question {currentIdx + 1} of {questions.length}
          </span>
          {currentQuestion?.depth_level && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                depthColors[currentQuestion.depth_level] || depthColors.medium
              }`}
            >
              {currentQuestion.depth_level} Depth Level
            </span>
          )}
        </div>
        <div className="w-48 h-2 bg-theme-surface-alt rounded-full overflow-hidden border border-theme">
          <div
            className="h-full bg-theme-primary transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* SPLIT SCREEN INTERVIEW ROOM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* LEFT PANEL: AI INTERVIEWER */}
        <div className="card p-6 flex flex-col justify-between border border-theme shadow-md bg-gradient-to-b from-theme-surface to-theme-surface-alt/60 relative overflow-hidden">
          {/* Top Interviewer Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-theme-primary-light flex items-center justify-center border border-theme-primary/30 shadow-sm">
                  <Bot className="w-6 h-6 text-theme-primary-color" />
                </div>
                {isSpeaking && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-primary" />
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-theme-primary">AI Hiring Lead</h3>
                <p className="text-xs text-theme-tertiary">
                  {interview.interview_style === 'managerial'
                    ? 'Engineering Director'
                    : interview.interview_style === 'hr'
                    ? 'Lead HR Recruiter'
                    : 'Principal Software Architect'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  isSpeaking
                    ? stopSpeaking()
                    : speakText(currentQuestion.question_text)
                }
                className="p-2 rounded-xl border border-theme hover:bg-theme-surface-hover text-theme-secondary transition-all"
                title={isSpeaking ? 'Mute AI' : 'Repeat Question'}
              >
                {isSpeaking ? (
                  <Volume2 className="w-4 h-4 text-theme-primary-color animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* AI Center Waveform Visualizer */}
          <div className="my-auto py-8 text-center space-y-6">
            <div className="flex items-center justify-center gap-1.5 h-16">
              {[0.4, 0.8, 1.2, 0.6, 1.0, 0.7, 1.4, 0.9, 0.5].map((scale, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-200 ${
                    isSpeaking
                      ? 'bg-theme-primary animate-pulse'
                      : 'bg-theme-surface-alt h-4'
                  }`}
                  style={{
                    height: isSpeaking ? `${Math.min(56, 18 * scale * 2.2)}px` : '12px',
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">
                {isSpeaking ? 'AI Interviewer Speaking...' : 'AI Listening to Candidate'}
              </span>
              <p className="text-xs text-theme-secondary max-w-sm mx-auto">
                {isSpeaking
                  ? 'Listen carefully to the question prompt or read the live captions below.'
                  : 'Respond clearly into your microphone when you are ready.'}
              </p>
            </div>
          </div>

          {/* AI Real-time Live Captions / Subtitles Box */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-theme shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-theme-primary-color flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Real-Time Interviewer Subtitle
              </span>
              <span className="text-[10px] text-theme-tertiary">Audio Captions (TTS)</span>
            </div>
            <p className="text-sm font-medium text-theme-primary leading-relaxed">
              "{aiSpokenCaption || currentQuestion?.question_text}"
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: STUDENT / CANDIDATE */}
        <div className="card p-6 flex flex-col justify-between border border-theme shadow-md bg-gradient-to-b from-theme-surface to-theme-surface-alt/60 relative overflow-hidden">
          {/* Top Candidate Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-theme-primary">
                  {profile?.name || 'Student Candidate'}
                </h3>
                <p className="text-xs text-theme-tertiary">Live Voice Candidate Session</p>
              </div>
            </div>

            {/* Mic Status Pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setManualEditMode(!manualEditMode)}
                className="p-2 rounded-xl border border-theme hover:bg-theme-surface-hover text-theme-secondary transition-all"
                title="Edit transcript manually"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleListening}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-theme-surface border border-theme text-theme-secondary hover:text-theme-primary'
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Mic Muted</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Student Spoken Captions & Live Transcription Box */}
          <div className="my-4 flex-1 flex flex-col justify-center space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-theme-tertiary flex items-center gap-1">
                <Mic className="w-3 h-3 text-theme-primary-color" /> Candidate Speech-to-Text (STT) Captions
              </span>
              {isListening && (
                <span className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Recording voice
                </span>
              )}
            </div>

            {!manualEditMode ? (
              <div className="p-4 rounded-2xl bg-theme-surface border border-theme min-h-[160px] max-h-[220px] overflow-y-auto space-y-2">
                {spokenTranscript || interimText ? (
                  <p className="text-sm text-theme-primary leading-relaxed whitespace-pre-wrap">
                    {spokenTranscript}{' '}
                    <span className="text-theme-tertiary italic">{interimText}</span>
                  </p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 text-theme-tertiary space-y-2">
                    <Mic className="w-6 h-6 stroke-1" />
                    <p className="text-xs">
                      {isListening
                        ? 'Speak into your microphone. Words will appear live here.'
                        : 'Click "Start Talking" or activate the microphone to answer.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <textarea
                  value={spokenTranscript}
                  onChange={(e) => setSpokenTranscript(e.target.value)}
                  placeholder="Type or adjust your answer here..."
                  className="w-full p-3 bg-theme-surface border border-theme rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary h-36 resize-none"
                />
                <span className="text-[10px] text-theme-tertiary">
                  Manual editing active. Click microphone to resume voice.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Candidate Action Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={toggleListening}
              className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isListening
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-theme-surface border border-theme text-theme-primary hover:bg-theme-surface-hover'
              }`}
            >
              {isListening ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Talking (Mic)</span>
                </>
              )}
            </button>

            <button
              onClick={handleNextOrSubmitAnswer}
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-3 px-4 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Analyzing Answer...</span>
                </>
              ) : currentIdx + 1 < questions.length ? (
                <>
                  <span>Submit & Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
