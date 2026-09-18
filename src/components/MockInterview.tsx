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
  Clock,
  User,
  PhoneOff,
  Edit3,
  Lightbulb,
  Hand,
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
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

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

      const initialQ =
        qList[activeIndex]?.question_text ||
        "Hello! Welcome to your Google interview round. Could you briefly introduce yourself and walk me through your engineering background?";
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

    // In GD round, user speaks continuously for 5 uninterrupted minutes
    if (interview?.interview_style === 'gd') {
      return;
    }

    if (interview?.interview_mode === 'conversational') {
      if (currentText.trim().split(/\s+/).length >= 5) {
        turnCompletionTimerRef.current = setTimeout(() => {
          if (!isSpeakingRef.current && !isSubmittingRef.current) {
            handleSendSpokenResponse(currentText);
          }
        }, 3200);
      } else {
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
        true
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

      const hintText =
        turn.suggestedHint ||
        "Consider discussing the time/space complexity tradeoffs and how you would scale this service.";
      setActiveHint(hintText);
      speakText(`Here is a quick pointer: ${hintText}`);
    } catch {
      setActiveHint("Consider the time/space complexity tradeoffs and edge cases.");
    }
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    setAiSpokenCaption(text);
    setIsSpeaking(true);
    isSpeakingRef.current = true;

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
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Google') ||
                v.name.includes('Natural') ||
                v.name.includes('Samantha') ||
                v.name.includes('Guy'))
          ) ||
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
      alert('Speech Recognition is not supported in this browser. Please use Chrome/Edge.');
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
      const candidateTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        speaker: 'candidate',
        text: candidateAnswer || '(Candidate continued)',
        category: 'answer',
        timestamp: new Date().toISOString(),
      };
      const newTurnHistory = [...conversationTurns, candidateTurn];
      setConversationTurns(newTurnHistory);

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

      if (currentIdx + 1 < questions.length) {
        const nextQ = questions[currentIdx + 1];

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
      <div className="max-w-2xl mx-auto py-32 text-center space-y-4 font-google">
        <Loader className="w-8 h-8 text-google-blue animate-spin mx-auto" />
        <p className="text-sm font-medium text-theme-secondary">
          Joining Google Meet Hiring Room...
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 animate-fade-in font-google">
      {/* Google Meet Top Info Bar */}
      <div className="flex items-center justify-between px-2 py-1 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Call</span>
          </button>
          <div className="h-4 w-px bg-theme-border" />
          <div className="flex items-center gap-2">
            <span className="font-medium text-theme-primary">
              Google Meet | {interview.role} ({interview.interview_style?.toUpperCase()} ROUND)
            </span>
            <span className="text-[11px] font-mono text-theme-tertiary">
              meet.google.com/mock-{interviewId.slice(0, 6)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-theme-secondary font-mono">
          <Clock className="w-3.5 h-3.5 text-google-blue" />
          <span className="font-medium">{formatTimer(timeLeftSeconds)} Remaining</span>
        </div>
      </div>

      {/* Active Hint Banner */}
      {activeHint && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
            <Lightbulb className="w-4 h-4 text-google-yellow flex-shrink-0" />
            <span>Interviewer Hint: {activeHint}</span>
          </div>
          <button
            onClick={() => setActiveHint(null)}
            className="text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GOOGLE MEET VIDEO TILES STAGE (SPLIT SCREEN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[460px]">
        {/* TILE 1: GOOGLE AI INTERVIEWER */}
        <div className="p-6 flex flex-col justify-between relative bg-white dark:bg-[#0f141c] text-neutral-900 dark:text-white min-h-[400px] border border-[#dadce0] dark:border-white/10 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden transition-colors">
          {/* Top Google Meet Header Badge */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-neutral-100 dark:bg-black/50 text-neutral-800 dark:text-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5 border border-neutral-200 dark:border-white/10 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-google-blue animate-pulse" />
                <span>Google Hiring Committee</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-white/5 hidden sm:inline-block">
                Principal Architect
              </span>
            </div>

            <button
              onClick={() =>
                isSpeaking
                  ? stopSpeaking()
                  : speakText(aiSpokenCaption || currentQuestion.question_text)
              }
              className="p-2 rounded-full bg-neutral-100 dark:bg-black/40 hover:bg-neutral-200 dark:hover:bg-black/60 text-neutral-700 dark:text-white transition-all cursor-pointer border border-neutral-200 dark:border-white/10"
              title={isSpeaking ? 'Mute AI Audio' : 'Repeat Question'}
            >
              {isSpeaking ? (
                <Volume2 className="w-4 h-4 text-google-blue animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-neutral-400 dark:text-slate-400" />
              )}
            </button>
          </div>

          {/* Center Stage: Animated Person Avatar (Eyes Blinking & Mouth Moving when Speaking) */}
          <div className="my-auto py-4 text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              {/* Outer Glow Halo when speaking */}
              <div 
                className={`absolute -inset-4 rounded-full transition-all duration-300 pointer-events-none ${
                  isSpeaking 
                    ? 'bg-blue-500/20 blur-xl scale-110' 
                    : 'bg-transparent'
                }`} 
              />

              {/* Glowing ring borders */}
              {isSpeaking && (
                <div className="absolute -inset-2 rounded-full border border-blue-400/40 animate-ping opacity-60 pointer-events-none" />
              )}

              {/* Person Avatar Face Container */}
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-2 border-blue-500/40 p-1 flex items-center justify-center shadow-2xl relative overflow-hidden animate-person-sway">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background radial gradient */}
                  <defs>
                    <radialGradient id="faceGrad" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#ffd8b3" />
                      <stop offset="100%" stopColor="#f3b482" />
                    </radialGradient>
                    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2c3e50" />
                      <stop offset="100%" stopColor="#1a252f" />
                    </linearGradient>
                    <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a8a" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                  </defs>

                  {/* Shoulders / Professional Suit */}
                  <path
                    d="M20 115 C20 95 38 88 60 88 C82 88 100 95 100 115 Z"
                    fill="url(#suitGrad)"
                  />
                  {/* White Collar & Tie */}
                  <polygon points="60,88 52,100 68,100" fill="#ffffff" />
                  <polygon points="60,98 56,115 64,115" fill="#3b82f6" />

                  {/* Neck */}
                  <rect x="52" y="70" width="16" height="20" rx="3" fill="#e59866" />

                  {/* Head / Face */}
                  <ellipse cx="60" cy="56" rx="26" ry="30" fill="url(#faceGrad)" />

                  {/* Hair Style */}
                  <path
                    d="M33 52 C31 32 40 22 60 22 C80 22 89 32 87 52 C82 38 75 32 60 32 C45 32 38 38 33 52 Z"
                    fill="url(#hairGrad)"
                  />
                  {/* Side Hair */}
                  <path d="M33 50 C33 42 36 34 40 30 C36 40 35 50 36 58 Z" fill="url(#hairGrad)" />
                  <path d="M87 50 C87 42 84 34 80 30 C84 40 85 50 84 58 Z" fill="url(#hairGrad)" />

                  {/* Eyebrows (Smart subtle arch) */}
                  <path
                    d="M44 45 Q50 43 55 45"
                    stroke="#2c3e50"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M65 45 Q70 43 76 45"
                    stroke="#2c3e50"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Eyes (With blinking animation) */}
                  <g className="animate-eye-blink">
                    {/* Left Eye */}
                    <ellipse cx="49" cy="51" rx="4" ry="4" fill="#ffffff" />
                    <circle cx="49.5" cy="51" r="2.4" fill="#1e293b" />
                    <circle cx="48.5" cy="50" r="0.8" fill="#ffffff" />

                    {/* Right Eye */}
                    <ellipse cx="71" cy="51" rx="4" ry="4" fill="#ffffff" />
                    <circle cx="70.5" cy="51" r="2.4" fill="#1e293b" />
                    <circle cx="69.5" cy="50" r="0.8" fill="#ffffff" />
                  </g>

                  {/* Subtle Glasses (Tech Engineer look) */}
                  <rect
                    x="42"
                    y="46"
                    width="14"
                    height="10"
                    rx="3"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    opacity="0.85"
                  />
                  <rect
                    x="64"
                    y="46"
                    width="14"
                    height="10"
                    rx="3"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    opacity="0.85"
                  />
                  <line x1="56" y1="51" x2="64" y2="51" stroke="#3b82f6" strokeWidth="1.2" />

                  {/* Nose */}
                  <path
                    d="M60 52 L58 61 L62 61"
                    stroke="#d38b5d"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Mouth: When Speaking -> Animated subtle talk, when listening -> Warm smile */}
                  {isSpeaking ? (
                    <g className="animate-mouth-talk">
                      {/* Natural subtle speaking mouth */}
                      <ellipse cx="60" cy="70.5" rx="3.8" ry="2.2" fill="#4a151b" />
                      {/* Upper teeth hint */}
                      <rect x="58" y="69.2" width="4" height="1.1" rx="0.5" fill="#ffffff" />
                      {/* Lower lip hint */}
                      <path d="M57 71.5 Q60 73 63 71.5" stroke="#b95d43" strokeWidth="1" strokeLinecap="round" fill="none" />
                    </g>
                  ) : (
                    /* Gentle Closed Smile */
                    <path
                      d="M55 69.5 Q60 73 65 69.5"
                      stroke="#873e23"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Google Voice Spectrum Waveform */}
            <div className="flex items-center justify-center gap-1.5 h-8">
              {[0.4, 0.9, 0.6, 1.4, 0.8, 1.3, 0.5, 1.1, 0.7].map((s, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isSpeaking 
                      ? 'bg-google-blue dark:bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(26,115,232,0.6)]' 
                      : 'bg-neutral-300 dark:bg-slate-700 h-1.5'
                  }`}
                  style={{
                    height: isSpeaking ? `${Math.min(32, 10 * s * 2.4)}px` : '5px',
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Google Meet Participant Bottom Label & Spoken Caption */}
          <div className="z-10 space-y-2">
            {captionsEnabled && (
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-black/70 text-neutral-800 dark:text-slate-100 border border-neutral-200 dark:border-white/15 text-xs font-medium leading-relaxed shadow-xs dark:shadow-lg">
                "{aiSpokenCaption || currentQuestion?.question_text}"
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-white">Google AI Interviewer</span>
                <span className="text-[11px] text-neutral-500 dark:text-slate-400">• Principal Systems Architect</span>
              </div>
              {isSpeaking ? (
                <span className="text-google-blue dark:text-blue-400 font-medium flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60">
                  <span className="w-2 h-2 rounded-full bg-google-blue dark:bg-blue-400 animate-pulse" />
                  Speaking
                </span>
              ) : (
                <span className="text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-slate-500" />
                  Listening
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TILE 2: CANDIDATE (YOU) */}
        <div className="p-6 flex flex-col justify-between relative bg-white dark:bg-[#0b0f17] text-neutral-900 dark:text-white min-h-[400px] border border-[#dadce0] dark:border-white/10 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden transition-colors">
          {/* Candidate Top Status */}
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-medium bg-neutral-100 dark:bg-black/50 text-neutral-800 dark:text-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5 border border-neutral-200 dark:border-white/10 shadow-2xs">
              <User className="w-3.5 h-3.5 text-google-green" />
              <span>You</span>
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-slate-400">
                LIVE STT
              </span>
              <button
                onClick={() => setManualEditMode(!manualEditMode)}
                className="p-1.5 rounded-full bg-neutral-100 dark:bg-black/40 hover:bg-neutral-200 dark:hover:bg-black/60 text-neutral-600 dark:text-slate-300 transition-colors border border-neutral-200 dark:border-white/10"
                title="Edit transcript"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Speech Stream or Avatar */}
          <div className="my-auto py-4 flex flex-col justify-center space-y-3">
            {!manualEditMode ? (
              <div className="p-4 sm:p-5 rounded-xl bg-neutral-50 dark:bg-slate-900/90 border border-neutral-200 dark:border-white/10 min-h-[170px] max-h-[220px] overflow-y-auto space-y-2 text-xs shadow-inner">
                {spokenTranscript || interimText ? (
                  <p className="text-neutral-800 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap">
                    {spokenTranscript}{' '}
                    <span className="text-neutral-500 dark:text-slate-400 italic">{interimText}</span>
                  </p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6 text-neutral-500 dark:text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-neutral-200/70 dark:bg-white/5 border border-neutral-300 dark:border-white/10 flex items-center justify-center text-neutral-600 dark:text-slate-400">
                      <Mic className="w-5 h-5 stroke-1 text-neutral-500 dark:text-slate-400" />
                    </div>
                    <p className="text-xs font-medium text-neutral-700 dark:text-slate-300">
                      {isListening
                        ? 'Microphone active. Start speaking to answer.'
                        : 'Unmute microphone below to talk.'}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-slate-500 max-w-xs">
                      {interview.interview_style === 'gd'
                        ? '5-minute non-stop group discussion speech.'
                        : 'Speak naturally. Google AI responds when you pause.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={spokenTranscript}
                onChange={(e) => setSpokenTranscript(e.target.value)}
                placeholder="Type or edit your response..."
                className="w-full p-3 bg-neutral-50 dark:bg-slate-900 border border-neutral-300 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-google-blue h-36 resize-none"
              />
            )}
          </div>

          {/* Candidate Bottom Label */}
          <div className="z-10 flex items-center justify-between text-xs text-neutral-600 dark:text-slate-300">
            <span className="font-medium text-neutral-900 dark:text-white">{profile?.name || 'Candidate (You)'}</span>
            {isListening ? (
              <span className="text-emerald-700 dark:text-google-green font-medium flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-google-green animate-ping" />
                Mic On
              </span>
            ) : (
              <span className="text-red-700 dark:text-google-red font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800/60">
                <MicOff className="w-3.5 h-3.5" />
                Muted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* GOOGLE MEET BOTTOM FLOATING CALL CONTROL BAR */}
      <div className="py-3 px-6 rounded-full bg-theme-surface border border-theme shadow-lg flex items-center justify-between max-w-2xl mx-auto">
        {/* Left: Meeting Time & Topic */}
        <div className="flex items-center gap-2 text-xs font-medium text-theme-secondary hidden sm:flex">
          <span className="font-mono text-theme-primary">{formatTimer(timeLeftSeconds)}</span>
          <span>•</span>
          <span>
            {interview.interview_style === 'gd' ? 'Group Discussion' : `Question ${currentIdx + 1} of ${questions.length}`}
          </span>
        </div>

        {/* Center: Google Meet Circular Controls */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          {/* Mic Button */}
          <button
            onClick={toggleListening}
            className={`meet-ctrl-btn ${
              isListening ? 'meet-ctrl-normal' : 'meet-ctrl-danger'
            }`}
            title={isListening ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Turn Captions On/Off (CC) */}
          <button
            onClick={() => setCaptionsEnabled(!captionsEnabled)}
            className={`meet-ctrl-btn ${
              captionsEnabled ? 'meet-ctrl-active' : 'meet-ctrl-normal'
            }`}
            title="Toggle closed captions"
          >
            <span className="font-bold text-xs font-mono">CC</span>
          </button>

          {/* Raise Hand / Need Hint */}
          {interview.interview_style !== 'gd' && (
            <button
              onClick={requestHint}
              disabled={isSpeaking || isSubmitting}
              className="meet-ctrl-btn meet-ctrl-normal"
              title="Raise hand for interviewer hint"
            >
              <Hand className="w-5 h-5" />
            </button>
          )}

          {/* Non-conversational mode: Send Turn Button */}
          {interview.interview_mode === 'structured' && interview.interview_style !== 'gd' && (
            <button
              onClick={() => handleSendSpokenResponse()}
              disabled={isSubmitting}
              className="px-4 py-2 bg-google-blue hover:bg-blue-700 text-white rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Submit Answer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* End Call Button (Red Google Meet Pill) */}
          <button
            onClick={() => handleEndInterview()}
            disabled={isSubmitting}
            className="meet-ctrl-btn meet-ctrl-danger"
            title="Leave call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Mode status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-theme-tertiary">
          <span className="w-2 h-2 rounded-full bg-google-green" />
          <span>{interview.interview_style === 'gd' ? '5m GD' : 'Google Meet'}</span>
        </div>
      </div>
    </div>
  );
};
