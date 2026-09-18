import type { Profile, InterviewQuestion, InterviewStyle, DepthLevel } from './supabase';

export const getGroqApiKey = (): string => {
  const localKey = localStorage.getItem('groq_api_key');
  if (localKey) return localKey;
  return (import.meta.env.VITE_GROQ_API_KEY as string) || '';
};

export const setGroqApiKey = (key: string): void => {
  if (key.trim()) {
    localStorage.setItem('groq_api_key', key.trim());
  } else {
    localStorage.removeItem('groq_api_key');
  }
};

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const GROQ_PRIMARY_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'groq/compound-mini',
];

// Helper to call Groq Cloud OpenAI-compatible Chat Completions with model fallback
async function callGroqChat(
  messages: GroqMessage[],
  jsonMode: boolean = false,
  preferredModel?: string
): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Groq API Key is missing. Please enter your Groq API key in Settings.');
  }

  const modelsToTry = preferredModel
    ? [preferredModel, ...GROQ_PRIMARY_MODELS.filter((m) => m !== preferredModel)]
    : GROQ_PRIMARY_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const payload: any = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson?.error?.message || response.statusText;
        } catch {
          errorDetail = response.statusText;
        }
        throw new Error(`Groq API Error (${response.status}) on ${model}: ${errorDetail}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '';
      if (reply) return reply;
    } catch (err: any) {
      console.warn(`Attempt with Groq model ${model} failed:`, err.message);
      lastError = err;
      // continue to next model in fallback list
    }
  }

  throw lastError || new Error('Failed to get response from Groq models.');
}

export interface GeneratedQuestionItem {
  question: string;
  depthLevel: DepthLevel;
}

export const groqService = {
  /**
   * Parse resume text to extract skills, experience level, target role, and focus areas.
   */
  parseResume: async (
    resumeText: string
  ): Promise<{
    skills: string[];
    experienceLevel: string;
    targetRole: string;
    focusAreas: string[];
  }> => {
    const systemPrompt = `You are an executive corporate technical recruiter and hiring panel screener. Analyze the provided resume.
Extract:
1. Technical and domain skills (top 15 distinct skills/technologies).
2. Experience level (Choose strictly one of: Junior, Mid-Level, Senior, Lead).
3. Best matched corporate job role (e.g., Full Stack Engineer, Data Engineer, Product Manager, Frontend Developer).
4. Recommended focus or weak gap areas for mock interview testing.

Return ONLY a JSON object with this exact schema:
{
  "skills": ["Skill1", "Skill2"],
  "experienceLevel": "Junior | Mid-Level | Senior | Lead",
  "targetRole": "Role Name",
  "focusAreas": ["Gap or Topic 1", "Gap or Topic 2"]
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Resume Content:\n${resumeText.slice(0, 7000)}` },
      ],
      true
    );

    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse resume JSON from Groq:', raw);
      throw new Error('Could not parse resume data. Please verify your resume text.');
    }
  },

  /**
   * Generates tailored interview questions across 3 distinct rounds (Technical, Managerial, HR)
   * with automatic tiered depth levels: Low (Fundamentals), Medium (Practical), and High (Scenario/Deep dive).
   */
  generateQuestions: async (
    profile: Profile,
    role: string,
    experienceLevel: string,
    style: InterviewStyle = 'technical',
    count: number = 5
  ): Promise<GeneratedQuestionItem[]> => {
    const roundDescriptions: Record<InterviewStyle, string> = {
      technical: `Technical Round: Focus on core algorithms, code design, data structures, framework architecture, debugging, system scaling, and practical technical depth for ${role}.`,
      managerial: `Managerial / Behavioral Round: Focus on project ownership, cross-functional collaboration, conflict resolution, technical trade-offs, roadmap planning, and handling crises.`,
      hr: `HR & Cultural Fit Round: Focus on candidate background, career goals, culture alignment, ethical dilemmas, teamwork attitude, communication style, and company commitment.`,
    };

    const systemPrompt = `You are a Lead Hiring Committee Interviewer conducting a realistic mock company interview for the position of "${role}" (${experienceLevel} experience level).
Round Type: ${roundDescriptions[style]}

Generate exactly ${count} realistic, conversational interview questions that mock an authentic corporate interview.
CRITICAL DEPTH RULE:
Distribute the questions across 3 depth levels:
- "low": Fundamental principles, baseline definitions, or direct knowledge checks.
- "medium": Practical implementation, tools & libraries usage, and realistic problem-solving.
- "high": Complex system architecture, difficult trade-offs, edge-case debugging, or advanced scenario dilemmas.

Candidate skills: ${profile.skills.join(', ')}
Candidate target areas: ${profile.focus_areas.join(', ')}

Return ONLY a JSON object matching this schema:
{
  "questions": [
    {
      "question": "Question text here...",
      "depthLevel": "low" | "medium" | "high"
    }
  ]
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate ${count} ${style} interview questions for a ${experienceLevel} ${role}. Ensure varied depth levels (low, medium, high).`,
        },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.questions)) {
        return parsed.questions.map((q: any) => ({
          question: q.question || String(q),
          depthLevel: (['low', 'medium', 'high'].includes(q.depthLevel) ? q.depthLevel : 'medium') as DepthLevel,
        }));
      }
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          question: typeof item === 'string' ? item : item.question || `Question ${idx + 1}`,
          depthLevel: (['low', 'medium', 'high'][idx % 3]) as DepthLevel,
        }));
      }
      return [];
    } catch (e) {
      console.error('Failed to parse question generation JSON:', raw);
      throw new Error('Failed to generate interview questions. Please try again.');
    }
  },

  /**
   * Evaluates individual candidate responses for a question.
   */
  evaluateAnswer: async (
    question: string,
    answer: string,
    role: string,
    style: InterviewStyle = 'technical',
    depthLevel: DepthLevel = 'medium'
  ): Promise<{
    score: number;
    strengths: string;
    weaknesses: string;
    betterAnswer: string;
  }> => {
    const systemPrompt = `You are a seasoned hiring interviewer assessing candidate answers for a ${role} position during a ${style} interview round (Question Depth: ${depthLevel}).

Evaluate the candidate's spoken response on:
1. Direct relevance and completeness
2. Subject matter competence / technical accuracy
3. Communication structure (clarity, conciseness, confidence)
4. Practical reasoning

Return ONLY a JSON object in this format:
{
  "score": 82,
  "strengths": "Clear explanation of React reconciliation, highlighted keys and diffing algorithm.",
  "weaknesses": "Did not mention fiber tree or how batching works in React 18.",
  "betterAnswer": "A concise 3-4 sentence exemplary answer demonstrating mastery."
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Question: "${question}"\nCandidate Spoken Answer: "${answer || 'No answer provided'}"`,
        },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 70)),
        strengths: parsed.strengths || 'Articulated core concept clearly.',
        weaknesses: parsed.weaknesses || 'Could provide more concrete examples.',
        betterAnswer: parsed.betterAnswer || 'Recommended answer highlighting industry best practices.',
      };
    } catch (e) {
      console.error('Failed to evaluate answer JSON:', raw);
      return {
        score: 75,
        strengths: 'Relevant response provided.',
        weaknesses: 'Could elaborate on specific architectural trade-offs.',
        betterAnswer: 'Provide a structured STAR-method or system-design explanation.',
      };
    }
  },

  /**
   * Generates conversational transition / interviewer voice reaction to candidate answer.
   * Gives a natural conversational interviewer persona.
   */
  generateInterviewerReaction: async (
    question: string,
    candidateAnswer: string,
    nextQuestion?: string
  ): Promise<string> => {
    const systemPrompt = `You are a polite, professional, yet sharp corporate interviewer conducting a live voice mock interview.
The candidate just answered your question.
Give a brief, natural 1-sentence conversational reaction/acknowledgment (15-25 words max) before transitioning.
Do not repeat the question or give a score. Be conversational like a real human interviewer.
Example reactions:
- "Great point regarding cache invalidation. Let's explore how you handle concurrent data."
- "Thank you for explaining that experience with your team. Let's move on to our next topic."`;

    try {
      const reaction = await callGroqChat(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Question: ${question}\nCandidate Answer: ${candidateAnswer}\nNext Question: ${nextQuestion || 'None'}`,
          },
        ],
        false,
        'openai/gpt-oss-20b'
      );
      return reaction.replace(/^["']|["']$/g, '').trim();
    } catch {
      return "Thank you for that response. Let's proceed to the next question.";
    }
  },

  /**
   * Generates a final, comprehensive hiring report with pass/fail decision,
   * overall score, technical score, communication score, and problem solving score.
   */
  generateFinalReport: async (
    questions: InterviewQuestion[],
    role: string,
    experienceLevel: string,
    style: InterviewStyle = 'technical'
  ): Promise<{
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    passed: boolean;
    generalFeedback: string;
  }> => {
    const transcript = questions
      .map(
        (q, idx) => `
Q${idx + 1} [Depth: ${q.depth_level || 'medium'}]: ${q.question_text}
Candidate Answer: ${q.user_answer || '(No answer provided)'}
Question Score: ${q.score ?? 60}/100
`
      )
      .join('\n');

    const systemPrompt = `You are the Hiring Committee Director for a tier-1 technology company.
Review the candidate's complete mock interview transcript for the role of ${role} (${experienceLevel} level, ${style} round).

Calculate an accurate multi-attribute hiring evaluation:
1. Overall Hiring Readiness Score (0-100)
2. Technical / Domain Knowledge Score (0-100)
3. Communication & Clarity Score (0-100)
4. Problem Solving & Behavioral Fit Score (0-100)
5. Hiring Decision: passed (boolean - true if overallScore >= 70 and communicationScore >= 65, otherwise false)
6. Comprehensive General Feedback with:
   - Executive Summary
   - Key Strengths
   - Critical Missing Areas
   - Concrete Actionable Next Steps to pass a real company interview

Return ONLY a JSON object with this exact schema:
{
  "overallScore": 82,
  "technicalScore": 84,
  "communicationScore": 79,
  "problemSolvingScore": 83,
  "passed": true,
  "generalFeedback": "Executive Summary:\\n...\\n\\nKey Strengths:\\n- ...\\n\\nAreas for Improvement:\\n- ...\\n\\nInterview Preparation Advice:\\n- ..."
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Interview Transcript:\n${transcript}` },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      const overall = Math.min(100, Math.max(0, Number(parsed.overallScore) || 75));
      const tech = Math.min(100, Math.max(0, Number(parsed.technicalScore) || overall));
      const comm = Math.min(100, Math.max(0, Number(parsed.communicationScore) || overall));
      const prob = Math.min(100, Math.max(0, Number(parsed.problemSolvingScore) || overall));
      const passed = typeof parsed.passed === 'boolean' ? parsed.passed : overall >= 70;

      return {
        overallScore: overall,
        technicalScore: tech,
        communicationScore: comm,
        problemSolvingScore: prob,
        passed: passed,
        generalFeedback: parsed.generalFeedback || 'Detailed interview review completed.',
      };
    } catch (e) {
      console.error('Failed to parse final report JSON:', raw);
      const avgScore = Math.round(
        questions.reduce((acc, q) => acc + (q.score || 70), 0) / (questions.length || 1)
      );
      return {
        overallScore: avgScore,
        technicalScore: avgScore,
        communicationScore: Math.min(100, avgScore + 2),
        problemSolvingScore: Math.max(0, avgScore - 2),
        passed: avgScore >= 70,
        generalFeedback:
          'Candidate demonstrated foundational knowledge. Continue practicing concise explanations and structured problem-solving.',
      };
    }
  },
};
