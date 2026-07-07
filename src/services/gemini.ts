import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Profile, InterviewQuestion } from './supabase';

export const getGeminiApiKey = (): string => {
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey) return localKey;
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
};

export const setGeminiApiKey = (key: string): void => {
  if (key.trim()) {
    localStorage.setItem('gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('gemini_api_key');
  }
};

const getAIInstance = (): GoogleGenerativeAI => {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error('Gemini API key is missing. Please set it in Settings.');
  }
  return new GoogleGenerativeAI(key);
};

export const geminiService = {
  /**
   * Parses resume text to extract structured skills, target roles, experience level, and key improvement areas.
   */
  parseResume: async (
    resumeText: string
  ): Promise<{
    skills: string[];
    experienceLevel: string;
    targetRole: string;
    focusAreas: string[];
  }> => {
    const ai = getAIInstance();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an expert HR recruiter and technical parser. Analyze the following resume text.
      Extract:
      1. Technical and soft skills (limit to top 15 key skills).
      2. Experience level (Choose one of: Junior, Mid-Level, Senior, Lead).
      3. Likely or target job role (e.g., Frontend Developer, Fullstack Engineer, Data Analyst).
      4. Recommended focus areas or weak gaps for interviews.

      Return ONLY a JSON object in this format:
      {
        "skills": ["Skill1", "Skill2"],
        "experienceLevel": "Junior | Mid-Level | Senior | Lead",
        "targetRole": "Role Title",
        "focusAreas": ["Area 1", "Area 2"]
      }

      Resume Text:
      ${resumeText}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  },

  /**
   * Generates tailored interview questions based on the candidate's profile, role, and level.
   */
  generateQuestions: async (
    profile: Profile,
    role: string,
    experienceLevel: string,
    count: number = 5
  ): Promise<string[]> => {
    const ai = getAIInstance();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an experienced HR interviewer from India conducting a mock interview for a ${role} position (${experienceLevel} level).

      CANDIDATE PROFILE:
      - Skills: ${profile.skills.join(', ')}
      - Experience Level: ${profile.experience_level}
      - Focus/Weak Areas: ${profile.focus_areas.join(', ')}

      INSTRUCTIONS:
      1. First, identify the key tools, technologies, and frameworks mentioned in the candidate's skills.
      2. Generate exactly ${count} interview questions that include:
         - 40% Tool/Technology specific questions (ask practical questions about the tools mentioned in their skills, e.g., "How do you optimize React performance?" or "What is the difference between SQL joins?")
         - 30% Technical/Role-specific questions (based on the ${role} position and ${experienceLevel} level)
         - 30% HR/Behavioral questions typical of Indian job interviews (e.g., "Tell me about yourself", "Why do you want to work here?", "What are your strengths and weaknesses?", "Where do you see yourself in 5 years?", "Describe a challenging project")

      Make questions practical, scenario-based, and at the right difficulty level for ${experienceLevel}. Avoid overly complex theoretical questions unless the role specifically requires them.

      Return ONLY a JSON array of strings:
      ["Question 1", "Question 2", ...]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  },

  /**
   * Evaluates the candidate's answer for a specific question.
   */
  evaluateAnswer: async (
    question: string,
    answer: string,
    role: string
  ): Promise<{
    score: number;
    strengths: string;
    weaknesses: string;
    betterAnswer: string;
  }> => {
    const ai = getAIInstance();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are a senior Indian HR interviewer evaluating a candidate for the role of ${role}.

      Question: "${question}"
      Candidate Answer: "${answer}"

      Evaluate the answer based on:
      1. Technical accuracy and depth of knowledge
      2. Practical understanding and real-world application
      3. Communication clarity and structure
      4. Relevance to the question asked

      Be constructive and specific in your feedback. Use an encouraging but honest tone typical of professional Indian interviewers.

      Return a JSON object with:
      1. A score between 0 and 100.
      2. Key strengths of their answer.
      3. Key weaknesses or missing points.
      4. A model "better answer" demonstrating how a strong candidate would respond.

      Return ONLY a JSON object in this format:
      {
        "score": 85,
        "strengths": "Short summary of strengths",
        "weaknesses": "Short summary of what could be improved",
        "betterAnswer": "How the response should look"
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return {
      score: parsed.score,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      betterAnswer: parsed.betterAnswer,
    };
  },

  /**
   * Generates a final, comprehensive evaluation report after all questions have been answered.
   */
  generateFinalReport: async (
    questions: InterviewQuestion[],
    role: string,
    experienceLevel: string
  ): Promise<{
    overallScore: number;
    generalFeedback: string;
  }> => {
    const ai = getAIInstance();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const QnAs = questions.map((q, idx) => `
      Q${idx + 1}: ${q.question_text}
      A${idx + 1}: ${q.user_answer || 'No answer'}
      Score: ${q.score || 0}
      Feedback: ${q.strengths} | ${q.weaknesses}
    `).join('\n');

    const prompt = `
      You are the head of the interviewing board at an Indian company. Review the candidate's performance in the mock interview for a ${role} (${experienceLevel} level).
      Here are the questions, answers, and individual scores:
      ${QnAs}

      Calculate a final, weighted score (out of 100) and compile a comprehensive final feedback summary detailing:
      1. Overall technical readiness and role fit.
      2. Key areas they excelled in.
      3. Areas needing improvement with specific actionable advice.
      4. Tips for succeeding in actual Indian job interviews (communication style, common pitfalls, etc.)

      Write in a professional, encouraging tone typical of Indian interview panels. Be specific and actionable.

      Return ONLY a JSON object in this format:
      {
        "overallScore": 78,
        "generalFeedback": "Provide detailed summary with bullet points and clear, motivating feedback."
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  },
};
