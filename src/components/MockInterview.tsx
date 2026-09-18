import React, { useState, useEffect, useRef } from 'react';
import type {
  Interview,
  InterviewQuestion,
  Profile,
  ConversationTurn,
} from '../services/supabase';
import { db } from '../services/supabase';
import { groqService } from '../services/groq';
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
  Edit3,
  Lightbulb,
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

  // Conversational Turns History
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [activeHint, setActiveHint] = useState<string | null>(null);

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

  // Speech Recognition & Silence / Hesitation Detection
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const turnCompletionTimerRef = useRef<any>(null);
  const shouldListenRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    loadInterviewData();

    // Setup Web Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';
      rec.maxAlternatives = 3;

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const bestTranscript = res[0].transcript;
          if (res.isFinal) {
            final += bestTranscript + ' ';
          } else {
            interim += bestTranscript;
          }
        }

        if (final) {
          setSpokenTranscript((prev) => {
            const cleanedFinal = final.replace(/\s+/g, ' ').trim();
            const updated = prev ? `${prev} ${cleanedFinal}` : cleanedFinal;
            resetSilenceTimer(updated);
            return updated;
          });
        } else if (interim) {
          resetSilenceTimer();
        }
        setInterimText(interim);
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech recognition warning:', e?.error);
        }
      };

      rec.onend = () => {
        // Auto-restart recognition in conversational mode unless speaking or submitting
        if (shouldListenRef.current && !isSpeakingRef.current && !isSubmittingRef.current) {
          try {
            rec.start();
            setIsListening(true);
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      stopListening();
      stopSpeaking();
      clearSilenceTimer();
    };
  }, [interviewId]);

  // Session Timer Countdown
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

      const initialQ = qList[activeIndex]?.question_text || "Welcome! Let's get started. Could you briefly introduce yourself and your background?";
      const initialTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        speaker: 'ai',
        text: initialQ,
        category: 'greeting',
        timestamp: new Date().toISOString(),
      };

      setConversationTurns([initialTurn]);

      setTimeout(() => {
        speakText(initialQ);
      }, 600);
    } catch (e) {
      console.error(e);
    }
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (turnCompletionTimerRef.current) {
      clearTimeout(turnCompletionTimerRef.current);
      turnCompletionTimerRef.current = null;
    }
  };

  const resetSilenceTimer = (latestText?: string) => {
    clearSilenceTimer();
    const currentText = latestText || spokenTranscript;

    // In GD round, the user is given 5 uninterrupted minutes to talk non-stop.
    // Do NOT auto-submit on 3.2s pause; let them speak continuously until 5 mins finish or they manually end/submit.
    if (interview?.interview_style === 'gd') {
      return;
    }

    // In conversational mode for other rounds:
    // If candidate has spoken a meaningful response and pauses for 3.2 seconds -> automatically send response and continue
    if (interview?.interview_mode === 'conversational') {
      if (currentText.trim().split(/\s+/).length >= 5) {
        turnCompletionTimerRef.current = setTimeout(() => {
          if (!isSpeakingRef.current && !isSubmittingRef.current) {
            handleSendSpokenResponse(currentText);
          }
        }, 3200);
      } else {
        // If candidate hasn't spoken or only said a couple words and stays silent for 12s -> gentle encouragement
        silenceTimerRef.current = setTimeout(() => {
          if (!isSpeakingRef.current && !isSubmittingRef.current) {
            triggerGentlePauseEncouragement();
          }
        }, 12000);
      }
    }
  };

  const triggerGentlePauseEncouragement = async () => {
    if (isSpeaking || isSubmitting) return;

    try {
      const turn = await groqService.generateConversationalTurn(
        conversationTurns,
        spokenTranscript,
        questions[currentIdx]?.question_text || 'Current topic',
        interview?.role || 'Software Engineer',
        interview?.interview_style || 'technical',
        true // candidate hesitating/paused
      );

      if (turn.suggestedHint) {
        setActiveHint(turn.suggestedHint);
      }

      const aiTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        speaker: 'ai',
        text: turn.spokenResponse,
        category: 'encouragement',
        timestamp: new Date().toISOString(),
      };
      setConversationTurns((prev) => [...prev, aiTurn]);
      speakText(turn.spokenResponse);
    } catch {
      // fallback
    }
  };

  const requestHint = async () => {
    if (isSubmitting) return;
    try {
      const turn = await groqService.generateConversationalTurn(
        conversationTurns,
        spokenTranscript,
        questions[currentIdx]?.question_text || 'Interview topic',
        interview?.role || 'Software Engineer',
        interview?.interview_style || 'technical',
        true
      );

      const hintText = turn.suggestedHint || "Focus on the core algorithm, trade-offs, or real-life architectural examples from your projects.";
      setActiveHint(hintText);
      speakText(`Here is a quick pointer: ${hintText}`);
    } catch {
      setActiveHint("Think about the time & space complexity and how you'd scale this.");
    }
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel previous speech and resume in case paused by Chrome
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    setAiSpokenCaption(text);
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    // Clean markdown/symbols from text so speech synthesis sounds natural
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/Q\d+:/gi, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const assignVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice =
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Guy') || v.name.includes('Jenny'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }
    };

    assignVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = assignVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onEndCallback) onEndCallback();
      startListening();
      resetSilenceTimer();
    };

    utterance.onerror = (err) => {
      console.warn('TTS speech error:', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      startListening();
    };

    // Workaround for Chrome long speech garbage collection issue
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      shouldListenRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      resetSilenceTimer();
    } catch {
      // already active
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
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

  const handleSendSpokenResponse = async (textOverride?: string) => {
    const candidateAnswer = (textOverride || spokenTranscript + ' ' + interimText).trim();
    if (!candidateAnswer) {
      return;
    }

    stopListening();
    stopSpeaking();
    clearSilenceTimer();
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setActiveHint(null);

    const activeQuestion = questions[currentIdx];

    try {
      // Record candidate turn
      const candidateTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        speaker: 'candidate',
        text: candidateAnswer || '(Candidate continued)',
        category: 'answer',
        timestamp: new Date().toISOString(),
      };
      const newTurnHistory = [...conversationTurns, candidateTurn];
      setConversationTurns(newTurnHistory);

      // Evaluate the question answer
      if (activeQuestion) {
        const evalResult = await groqService.evaluateAnswer(
          activeQuestion.question_text,
          candidateAnswer,
          interview?.role || 'Software Engineer',
          interview?.interview_style || 'technical',
          activeQuestion.depth_level || 'medium'
        );

        await db.updateQuestionAnswer(activeQuestion.id, candidateAnswer, {
          score: evalResult.score,
          strengths: evalResult.strengths,
          weaknesses: evalResult.weaknesses,
          better_answer: evalResult.betterAnswer,
        });
      }

      setSpokenTranscript('');
      setInterimText('');

      // Check if more syllabus questions remain
      if (currentIdx + 1 < questions.length) {
        const nextQ = questions[currentIdx + 1];

        // Generate natural human conversational transition
        const turnResponse = await groqService.generateConversationalTurn(
          newTurnHistory,
          candidateAnswer,
          nextQ.question_text,
          interview?.role || 'Software Engineer',
          interview?.interview_style || 'technical',
          false
        );

        setCurrentIdx(currentIdx + 1);

        const aiFollowupTurn: ConversationTurn = {
          id: crypto.randomUUID(),
          speaker: 'ai',
          text: `${turnResponse.spokenResponse} ... ${nextQ.question_text}`,
          category: 'question',
          timestamp: new Date().toISOString(),
        };
        setConversationTurns([...newTurnHistory, aiFollowupTurn]);

        speakText(`${turnResponse.spokenResponse} ... ${nextQ.question_text}`);
      } else {
        // Complete interview
        await handleEndInterview(newTurnHistory);
      }
    } catch (e: any) {
      console.error(e);
      alert('Error during turn: ' + (e.message || e));
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleEndInterview = async (finalTurns?: ConversationTurn[]) => {
    stopListening();
    stopSpeaking();
    clearSilenceTimer();
    setIsSubmitting(true);

    const turnsToUse = finalTurns || conversationTurns;

    try {
      const qList = await db.getInterviewQuestions(interviewId);

      const finalReport = await groqService.generateFinalReport(
        qList,
        turnsToUse,
        interview?.role || 'Software Engineer',
        interview?.experience_level || 'Mid-Level',
        interview?.interview_style || 'technical'
      );

      await db.updateInterview(interviewId, {
        status: 'completed',
        overall_score: finalReport.overallScore,
        technical_score: finalReport.technicalScore,
        communication_score: finalReport.communicationScore,
        problem_solving_score: finalReport.problemSolvingScore,
        round_criteria: finalReport.roundCriteria,
        passed: finalReport.passed,
        general_feedback: finalReport.generalFeedback,
      });

      onInterviewComplete(interviewId);
    } catch (e: any) {
      console.error('Error finalizing report:', e);
      alert('Error compiling report: ' + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!interview || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <Loader className="w-8 h-8 text-theme-primary-color animate-spin mx-auto" />
        <p className="text-theme-tertiary">Connecting to AI Voice Hiring Room...</p>
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
      {/* Top Session Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-semibold text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Dashboard</span>
          </button>
          <div className="h-4 w-px bg-theme-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-theme-primary">{interview.role}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-theme-primary-light text-theme-primary-color border border-theme-primary/20">
              {interview.interview_style || 'Technical'} Round
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20">
              {interview.interview_mode === 'conversational' ? 'Conversational Flow' : 'Q&A Drill Mode'}
            </span>
          </div>
        </div>

        {/* Timer, Hint & End Interview Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={requestHint}
            disabled={isSpeaking || isSubmitting}
            className="flex items-center gap-1 px-3 py-1.5 bg-theme-surface border border-theme text-theme-secondary hover:text-theme-primary font-semibold text-xs rounded-xl shadow-sm transition-all"
            title="Ask AI interviewer for a hint"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Need a Hint?</span>
          </button>

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
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
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
            Topic {currentIdx + 1} of {questions.length}
          </span>
          {currentQuestion?.depth_level && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                depthColors[currentQuestion.depth_level] || depthColors.medium
              }`}
            >
              {currentQuestion.depth_level} Level
            </span>
          )}
          {currentQuestion?.question_text && (
            <span className="text-[11px] text-theme-tertiary hidden md:inline truncate max-w-md">
              • {currentQuestion.question_text}
            </span>
          )}
        </div>
        <div className="w-44 h-2 bg-theme-surface-alt rounded-full overflow-hidden border border-theme">
          <div
            className="h-full bg-theme-primary transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Active Hint Banner if candidate is paused / requested help */}
      {activeHint && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Lightbulb className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>Interviewer Hint: {activeHint}</span>
          </div>
          <button
            onClick={() => setActiveHint(null)}
            className="text-xs text-amber-600 hover:underline font-semibold"
          >
            Got it
          </button>
        </div>
      )}

      {/* SPLIT SCREEN INTERVIEW ROOM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* LEFT PANEL: AI INTERVIEWER */}
        <div className="card p-6 flex flex-col justify-between border border-theme shadow-md bg-gradient-to-b from-theme-surface to-theme-surface-alt/60 relative overflow-hidden">
          {/* Top AI Persona */}
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
                <h3 className="font-bold text-sm text-theme-primary">AI Hiring Manager</h3>
                <p className="text-xs text-theme-tertiary">
                  {interview.interview_style === 'managerial'
                    ? 'Engineering Director'
                    : interview.interview_style === 'hr'
                    ? 'Lead HR Business Partner'
                    : 'Principal Software Architect (DSA & Architecture Lead)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  isSpeaking
                    ? stopSpeaking()
                    : speakText(aiSpokenCaption || currentQuestion.question_text)
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
                {isSpeaking ? 'AI Interviewer Speaking...' : 'AI Listening Actively'}
              </span>
              <p className="text-xs text-theme-secondary max-w-sm mx-auto">
                {isSpeaking
                  ? 'Listen to the interviewer prompt. Feel free to ask for clarification or take a breath.'
                  : 'Take your time. Speak naturally through your thought process.'}
              </p>
            </div>
          </div>

          {/* AI Real-time Live Subtitles / Spoken Captions */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-theme shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-theme-primary-color flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Interviewer Spoken Dialogue
              </span>
              <span className="text-[10px] text-theme-tertiary font-mono">TTS Audio</span>
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
                <p className="text-xs text-theme-tertiary">
                  Targeting {interview.role}
                </p>
              </div>
            </div>

            {/* Mic & Manual Toggle */}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer ${
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
                        ? 'Speak into your microphone. Words stream live here.'
                        : 'Click "Start Talking" or unmute your mic to answer.'}
                    </p>
                    <p className="text-[11px] opacity-75">
                      Need time? Take a pause—the AI will coach you gently without rush.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <textarea
                  value={spokenTranscript}
                  onChange={(e) => setSpokenTranscript(e.target.value)}
                  placeholder="Type or edit your spoken response here..."
                  className="w-full p-3 bg-theme-surface border border-theme rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary h-36 resize-none"
                />
                <span className="text-[10px] text-theme-tertiary">
                  Manual typing mode active.
                </span>
              </div>
            )}
          </div>

          {/* Candidate Action / Mode Specific Controls */}
          {interview.interview_mode === 'conversational' ? (
            <div className="pt-2 flex items-center justify-between p-3.5 bg-theme-surface-alt/70 border border-theme rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  <span className={`absolute w-3 h-3 rounded-full ${isListening ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-theme-primary">
                    {interview.interview_style === 'gd'
                      ? 'GD Continuous Speaking — 5 Minutes Allotted'
                      : isSpeaking
                      ? 'AI Interviewer Speaking (Listening Paused)'
                      : isListening
                      ? 'Natural Voice Active — Speak Freely'
                      : 'Connecting Audio...'}
                  </h5>
                  <p className="text-[11px] text-theme-tertiary">
                    {interview.interview_style === 'gd'
                      ? 'Microphone is continuously recording. Speak non-stop covering Intro, For, Against, and Conclusion.'
                      : 'Hands-free dynamic conversation: AI detects when you finish and responds automatically.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isListening
                      ? 'bg-theme-surface border-theme text-theme-secondary hover:text-theme-primary'
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  }`}
                  title={isListening ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isListening ? <Mic className="w-4 h-4 text-emerald-500" /> : <MicOff className="w-4 h-4 text-rose-500" />}
                  <span className="hidden sm:inline">{isListening ? 'Mute' : 'Unmute'}</span>
                </button>
              </div>
            </div>
          ) : (
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
                    <span>Pause Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start Talking (Mic)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSendSpokenResponse()}
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3 px-4 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing Response...</span>
                  </>
                ) : currentIdx + 1 < questions.length ? (
                  <>
                    <span>Send & Continue</span>
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
          )}
        </div>
      </div>
    </div>
  );
};
